#!/usr/bin/env npx tsx
/**
 * Session Start Hook
 *
 * セッション開始時に関連するメモリを検索し、コンテキストとして注入します。
 *
 * Hook Event: SessionStart
 */

import type { SessionStartHookInput, SessionStartHookOutput } from './types.js';
import { runHook } from './utils.js';
import { searchMemories, getRecentMemories } from './memory-store.js';

// 環境変数でメモリシステムを有効/無効化
const MEMORY_ENABLED = process.env.MEMORY_SYSTEM_ENABLED?.toLowerCase() === 'true';

async function handler(input: SessionStartHookInput): Promise<SessionStartHookOutput> {
  // メモリシステムが無効の場合はスキップ
  if (!MEMORY_ENABLED) {
    return {
      metadata: {
        source: 'session-start',
        disabled: true,
      },
    };
  }

  const prompt = input.prompt;
  if (!prompt) {
    return {
      metadata: {
        source: 'session-start',
        memoriesLoaded: 0,
      },
    };
  }

  // 関連するメモリを検索
  const relevantResults = await searchMemories(prompt, 5);
  const recentMemories = await getRecentMemories(3);

  // 既に表示されたメモリIDを追跡
  const seenIds = new Set(relevantResults.map((r) => r.memory.id));
  const uniqueRecent = recentMemories.filter((m) => !seenIds.has(m.id));

  // コンテキストがない場合
  if (relevantResults.length === 0 && uniqueRecent.length === 0) {
    return {
      metadata: {
        source: 'session-start',
        memoriesLoaded: 0,
      },
    };
  }

  // コンテキストを構築
  const contextParts: string[] = ['## Relevant Context from Memory System\n'];

  if (relevantResults.length > 0) {
    contextParts.push('### Relevant Memories');
    for (const result of relevantResults.slice(0, 3)) {
      const { memory, score } = result;
      contextParts.push(`- **${memory.category}** (relevance: ${score.toFixed(2)}): ${memory.content}`);
    }
  }

  if (uniqueRecent.length > 0) {
    contextParts.push('\n### Recent Context');
    for (const memory of uniqueRecent.slice(0, 2)) {
      contextParts.push(`- ${memory.category}: ${memory.content}`);
    }
  }

  const memoriesLoaded = relevantResults.length + uniqueRecent.length;

  return {
    additionalContext: contextParts.join('\n'),
    metadata: {
      source: 'session-start',
      memoriesLoaded,
    },
  };
}

// メイン実行
runHook('session-start', handler, {});
