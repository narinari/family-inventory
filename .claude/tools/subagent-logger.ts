#!/usr/bin/env npx tsx
/**
 * Subagent Logger Hook
 *
 * Task ツール呼び出し時にサブエージェントの使用をログに記録します。
 * - 日別のJSONLファイルにログを保存
 * - 統計サマリーを更新
 *
 * Hook Event: PreToolUse (matcher: "Task")
 */

import { join } from 'path';
import type { ToolUseHookInput, TaskToolInput, SubagentLogEntry, SubagentSummary, PreToolUseHookOutput } from './types.js';
import { runHook, ensureLogDir, appendJsonl, readJsonFile, writeJsonFile, getTodayString } from './utils.js';

async function handler(input: ToolUseHookInput): Promise<PreToolUseHookOutput> {
  // Task ツール以外は無視
  if (input.hook_event_name !== 'PreToolUse' || input.tool_name !== 'Task') {
    return {};
  }

  const toolInput = input.tool_input as TaskToolInput;
  const logDir = await ensureLogDir('subagent-logs');

  // ログエントリを作成
  const logEntry: SubagentLogEntry = {
    timestamp: new Date().toISOString(),
    session_id: input.session_id,
    cwd: input.cwd,
    subagent_type: toolInput.subagent_type,
    description: toolInput.description,
    prompt_length: toolInput.prompt?.length || 0,
    prompt: toolInput.prompt,
  };

  // 日別ログファイルに追記
  const today = getTodayString();
  const logFile = join(logDir, `subagent-usage-${today}.jsonl`);
  await appendJsonl(logFile, logEntry);

  // サマリーを更新
  await updateSummary(logDir, logEntry);

  return {
    metadata: {
      source: 'subagent-logger',
      logged: true,
    },
  };
}

async function updateSummary(logDir: string, logEntry: SubagentLogEntry): Promise<void> {
  const summaryFile = join(logDir, 'summary.json');
  const existing = await readJsonFile<SubagentSummary>(summaryFile);

  const summary: SubagentSummary = existing || {
    total_invocations: 0,
    subagent_counts: {},
    first_invocation: null,
    last_invocation: null,
    sessions: [],
    unique_sessions: 0,
  };

  // 統計を更新
  summary.total_invocations += 1;

  if (logEntry.subagent_type) {
    summary.subagent_counts[logEntry.subagent_type] =
      (summary.subagent_counts[logEntry.subagent_type] || 0) + 1;
  }

  if (!summary.first_invocation) {
    summary.first_invocation = logEntry.timestamp;
  }
  summary.last_invocation = logEntry.timestamp;

  if (logEntry.session_id && !summary.sessions.includes(logEntry.session_id)) {
    summary.sessions.push(logEntry.session_id);
  }
  summary.unique_sessions = summary.sessions.length;

  await writeJsonFile(summaryFile, summary);
}

// メイン実行
runHook('subagent-logger', handler, {});
