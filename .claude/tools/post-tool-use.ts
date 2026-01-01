#!/usr/bin/env npx tsx
/**
 * Post Tool Use Hook
 *
 * ツール使用後にアシスタントの発言を過去のメモリと照合し、
 * 矛盾がある場合は警告を表示します。
 *
 * Hook Event: PostToolUse
 */

import type { PostToolUseHookInput, PostToolUseHookOutput } from './types.js';
import { runHook, extractTextFromContent } from './utils.js';
import { getAllMemories, searchMemories } from './memory-store.js';

// 環境変数でメモリシステムを有効/無効化
const MEMORY_ENABLED = process.env.MEMORY_SYSTEM_ENABLED?.toLowerCase() === 'true';

// 矛盾検出のキーワードペア
const CONTRADICTION_PAIRS: Array<[string[], string[]]> = [
  [['使用する', 'を使う', '採用する', 'use', 'using'], ['使用しない', '使わない', 'avoid', 'don\'t use']],
  [['有効', 'enable', 'true'], ['無効', 'disable', 'false']],
  [['必要', 'required', 'must'], ['不要', 'optional', 'unnecessary']],
  [['推奨', 'recommended', 'prefer'], ['非推奨', 'deprecated', 'avoid']],
];

interface Claim {
  text: string;
  contradicts: boolean;
  evidence?: string;
  confidence: number;
}

/**
 * テキストから主張を抽出
 */
function extractClaims(text: string): string[] {
  const claims: string[] = [];
  const sentences = text.split(/[。．.!！?？\n]/).filter((s) => s.trim().length > 10);

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    // 主張らしい文を抽出（動詞や形容詞を含む文）
    if (
      trimmed.match(/(?:です|ます|した|する|できる|べき|should|is|are|was|will|can|must)/i)
    ) {
      claims.push(trimmed);
    }
  }

  return claims.slice(0, 10); // 最大10件
}

/**
 * 主張とメモリの矛盾をチェック
 */
function checkContradiction(claim: string, memoryContent: string): { contradicts: boolean; confidence: number } {
  const claimLower = claim.toLowerCase();
  const memoryLower = memoryContent.toLowerCase();

  // 同じトピックについて述べているか確認
  const claimWords = new Set(claimLower.split(/\s+/).filter((w) => w.length > 2));
  const memoryWords = new Set(memoryLower.split(/\s+/).filter((w) => w.length > 2));
  const overlap = [...claimWords].filter((w) => memoryWords.has(w)).length;

  if (overlap < 2) {
    return { contradicts: false, confidence: 0 };
  }

  // 矛盾キーワードをチェック
  for (const [positive, negative] of CONTRADICTION_PAIRS) {
    const claimHasPositive = positive.some((p) => claimLower.includes(p));
    const claimHasNegative = negative.some((n) => claimLower.includes(n));
    const memoryHasPositive = positive.some((p) => memoryLower.includes(p));
    const memoryHasNegative = negative.some((n) => memoryLower.includes(n));

    if ((claimHasPositive && memoryHasNegative) || (claimHasNegative && memoryHasPositive)) {
      return { contradicts: true, confidence: 0.7 + (overlap * 0.05) };
    }
  }

  return { contradicts: false, confidence: 0 };
}

/**
 * テキストの主張を検証
 */
async function validateClaims(text: string): Promise<{
  claims: Claim[];
  hasContradictions: boolean;
}> {
  const memories = await getAllMemories();
  const claims = extractClaims(text);
  const validatedClaims: Claim[] = [];
  let hasContradictions = false;

  for (const claimText of claims) {
    let claim: Claim = {
      text: claimText,
      contradicts: false,
      confidence: 0,
    };

    for (const memory of memories) {
      const result = checkContradiction(claimText, memory.content);
      if (result.contradicts && result.confidence > claim.confidence) {
        claim = {
          text: claimText,
          contradicts: true,
          evidence: memory.content,
          confidence: result.confidence,
        };
        hasContradictions = true;
      }
    }

    if (claim.contradicts) {
      validatedClaims.push(claim);
    }
  }

  return { claims: validatedClaims, hasContradictions };
}

async function handler(input: PostToolUseHookInput): Promise<PostToolUseHookOutput> {
  // メモリシステムが無効の場合はスキップ
  if (!MEMORY_ENABLED) {
    return {};
  }

  // メッセージがない、またはアシスタント以外の場合はスキップ
  const message = input.message;
  if (!message || message.role !== 'assistant') {
    return {};
  }

  const content = extractTextFromContent(message.content);
  if (!content || content.length < 50) {
    return {};
  }

  try {
    const { claims, hasContradictions } = await validateClaims(content);

    if (!hasContradictions) {
      return {
        metadata: {
          source: 'post-tool-use',
          claimsChecked: claims.length,
          contradictionsFound: 0,
        },
      };
    }

    // 警告メッセージを構築
    const warnings: string[] = [];
    for (const claim of claims.filter((c) => c.contradicts && c.confidence > 0.6)) {
      const claimPreview = claim.text.slice(0, 100);
      warnings.push(`Claim may contradict memory: "${claimPreview}..."`);
      if (claim.evidence) {
        const evidencePreview = claim.evidence.slice(0, 150);
        warnings.push(`  Memory says: ${evidencePreview}`);
      }
    }

    return {
      warning: warnings.join('\n'),
      metadata: {
        source: 'post-tool-use',
        claimsChecked: claims.length,
        contradictionsFound: claims.filter((c) => c.contradicts).length,
      },
    };
  } catch (error) {
    return {
      metadata: {
        source: 'post-tool-use',
        error: String(error),
      },
    };
  }
}

// メイン実行
runHook('post-tool-use', handler, {});
