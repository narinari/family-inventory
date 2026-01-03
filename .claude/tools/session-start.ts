#!/usr/bin/env npx tsx
/**
 * Session Start Hook
 *
 * セッション開始時に関連するメモリを検索し、コンテキストとして注入します。
 * また、mainブランチにいる場合は警告を表示します。
 *
 * Hook Event: SessionStart
 */

import { execSync } from 'child_process';
import type { SessionStartHookInput, SessionStartHookOutput } from './types.js';
import { runHook } from './utils.js';
import { searchMemories, getRecentMemories } from './memory-store.js';

// 環境変数でメモリシステムを有効/無効化
const MEMORY_ENABLED = process.env.MEMORY_SYSTEM_ENABLED?.toLowerCase() === 'true';

/**
 * 現在のgitブランチを取得
 */
function getCurrentBranch(): string | null {
  try {
    const branch = execSync('git branch --show-current', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    return branch || null;
  } catch {
    return null;
  }
}

/**
 * mainブランチにいる場合の警告メッセージを生成
 */
function getMainBranchWarning(branch: string | null): string | null {
  if (branch === 'main' || branch === 'master') {
    return `⚠️ 現在 ${branch} ブランチにいます。
${branch} ブランチへの直接コミットはできません。
作業を開始する前に新しいブランチを作成してください。

例: git checkout -b feat/your-feature-name`;
  }
  return null;
}

/**
 * TASK-XXX パターンを検出してリマインダーを生成
 */
function getTaskReminder(prompt: string): string | null {
  const taskPattern = /TASK-\d+/gi;
  const matches = prompt.match(taskPattern);

  if (matches && matches.length > 0) {
    const uniqueTasks = [...new Set(matches.map((m) => m.toUpperCase()))];
    return `📋 タスク実装リマインダー (${uniqueTasks.join(', ')})

**実装前**: \`docs/TASK_TICKETS.md\` でタスク詳細を確認
**実装中**: 新機能・API変更にはテストを追加
**実装後**:
  - \`docs/TASK_TICKETS.md\` のステータスを「完了」に更新
  - 詳細タスクのチェックボックスを更新 (\`[ ]\` → \`[x]\`)
  - テスト実行: \`pnpm --filter api test\`
  - 型チェック: \`pnpm type-check\``;
  }
  return null;
}

/**
 * 複数のコンテキストメッセージを結合
 */
function combineContexts(...contexts: (string | null | undefined)[]): string | undefined {
  const validContexts = contexts.filter((c): c is string => !!c);
  return validContexts.length > 0 ? validContexts.join('\n\n') : undefined;
}

async function handler(input: SessionStartHookInput): Promise<SessionStartHookOutput> {
  // ブランチ警告をチェック（メモリシステムの有効/無効に関わらず実行）
  const currentBranch = getCurrentBranch();
  const branchWarning = getMainBranchWarning(currentBranch);

  // タスクリマインダーをチェック（メモリシステムの有効/無効に関わらず実行）
  const prompt = input.prompt || '';
  const taskReminder = getTaskReminder(prompt);

  // メモリシステムが無効の場合
  if (!MEMORY_ENABLED) {
    return {
      additionalContext: combineContexts(branchWarning, taskReminder),
      metadata: {
        source: 'session-start',
        disabled: true,
        currentBranch,
        branchWarning: !!branchWarning,
        taskReminder: !!taskReminder,
      },
    };
  }

  if (!prompt) {
    return {
      additionalContext: combineContexts(branchWarning, taskReminder),
      metadata: {
        source: 'session-start',
        memoriesLoaded: 0,
        currentBranch,
        branchWarning: !!branchWarning,
        taskReminder: !!taskReminder,
      },
    };
  }

  // 関連するメモリを検索
  const relevantResults = await searchMemories(prompt, 5);
  const recentMemories = await getRecentMemories(3);

  // 既に表示されたメモリIDを追跡
  const seenIds = new Set(relevantResults.map((r) => r.memory.id));
  const uniqueRecent = recentMemories.filter((m) => !seenIds.has(m.id));

  // メモリコンテキストを構築
  let memoryContext: string | null = null;
  if (relevantResults.length > 0 || uniqueRecent.length > 0) {
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

    memoryContext = contextParts.join('\n');
  }

  const memoriesLoaded = relevantResults.length + uniqueRecent.length;

  return {
    additionalContext: combineContexts(branchWarning, taskReminder, memoryContext),
    metadata: {
      source: 'session-start',
      memoriesLoaded,
      currentBranch,
      branchWarning: !!branchWarning,
      taskReminder: !!taskReminder,
    },
  };
}

// メイン実行
runHook('session-start', handler, {});
