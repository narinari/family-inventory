/**
 * Claude Code Hook Types
 * フック間で共有される型定義
 */

// ============================================================
// 入力型
// ============================================================

/** 共通のフック入力フィールド */
export interface BaseHookInput {
  hook_event_name: string;
  session_id?: string;
  cwd?: string;
  transcript_path?: string;
}

/** PreToolUse / PostToolUse のツール情報 */
export interface ToolUseHookInput extends BaseHookInput {
  tool_name: string;
  tool_input: Record<string, unknown>;
}

/** Task ツール固有の入力 */
export interface TaskToolInput {
  subagent_type?: string;
  description?: string;
  prompt?: string;
  model?: string;
  run_in_background?: boolean;
}

/** SessionStart フックの入力 */
export interface SessionStartHookInput extends BaseHookInput {
  prompt?: string;
}

/** Stop / SubagentStop フックの入力 */
export interface StopHookInput extends BaseHookInput {
  transcript_path?: string;
  stop_reason?: string;
}

/** PreCompact フックの入力 */
export interface PreCompactHookInput extends BaseHookInput {
  trigger?: 'manual' | 'auto';
  custom_instructions?: string;
}

/** PostToolUse のメッセージ構造 */
export interface PostToolUseMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | ContentBlock[];
}

export interface ContentBlock {
  type: 'text' | 'tool_use' | 'tool_result' | 'thinking';
  text?: string;
  name?: string;
  id?: string;
  input?: Record<string, unknown>;
  tool_use_id?: string;
  is_error?: boolean;
  content?: string;
}

export interface PostToolUseHookInput extends ToolUseHookInput {
  message?: PostToolUseMessage;
}

// ============================================================
// 出力型
// ============================================================

/** フック出力のメタデータ */
export interface HookMetadata {
  source?: string;
  [key: string]: unknown;
}

/** 基本的なフック出力 */
export interface BaseHookOutput {
  metadata?: HookMetadata;
}

/** PreToolUse フックの出力（ブロック可能） */
export interface PreToolUseHookOutput extends BaseHookOutput {
  decision?: 'block' | 'allow';
  reason?: string;
}

/** SessionStart フックの出力（コンテキスト注入） */
export interface SessionStartHookOutput extends BaseHookOutput {
  additionalContext?: string;
}

/** PostToolUse フックの出力（警告表示） */
export interface PostToolUseHookOutput extends BaseHookOutput {
  warning?: string;
}

/** PreCompact フックの出力 */
export interface PreCompactHookOutput extends BaseHookOutput {
  continue?: boolean;
  suppressOutput?: boolean;
  systemMessage?: string;
}

// ============================================================
// トランスクリプト型
// ============================================================

/** JSONL トランスクリプトのエントリ */
export interface TranscriptEntry {
  type: 'user' | 'assistant' | 'system' | 'summary' | 'meta';
  subtype?: string;
  timestamp?: string;
  message?: {
    role: 'user' | 'assistant';
    content: string | ContentBlock[];
  };
  content?: string;
}

// ============================================================
// メモリシステム型
// ============================================================

/** 抽出されたメモリ */
export interface Memory {
  id: string;
  content: string;
  category: string;
  createdAt: string;
  sessionId?: string;
  relevance?: number;
}

/** メモリ検索結果 */
export interface MemorySearchResult {
  memory: Memory;
  score: number;
}

// ============================================================
// サブエージェントログ型
// ============================================================

/** サブエージェント呼び出しログ */
export interface SubagentLogEntry {
  timestamp: string;
  session_id?: string;
  cwd?: string;
  subagent_type?: string;
  description?: string;
  prompt_length: number;
  prompt?: string;
}

/** サブエージェント統計サマリー */
export interface SubagentSummary {
  total_invocations: number;
  subagent_counts: Record<string, number>;
  first_invocation: string | null;
  last_invocation: string | null;
  sessions: string[];
  unique_sessions: number;
}
