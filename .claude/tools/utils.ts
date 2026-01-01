/**
 * Claude Code Hook Utilities
 * フック間で共有されるユーティリティ関数
 */

import { stdin, stdout } from 'process';
import { readFile, writeFile, mkdir, appendFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import type { BaseHookInput, BaseHookOutput, TranscriptEntry, ContentBlock } from './types.js';

// ============================================================
// 入出力ヘルパー
// ============================================================

/**
 * 標準入力からJSONを読み取る
 */
export async function readInput<T extends BaseHookInput>(): Promise<T> {
  const chunks: Buffer[] = [];
  for await (const chunk of stdin) {
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString()) as T;
}

/**
 * 標準出力にJSONを書き込む
 */
export function writeOutput(output: BaseHookOutput): void {
  stdout.write(JSON.stringify(output));
}

/**
 * フックを実行するラッパー
 * エラーハンドリングとログ出力を統一
 */
export async function runHook<TInput extends BaseHookInput, TOutput extends BaseHookOutput>(
  name: string,
  handler: (input: TInput) => Promise<TOutput>,
  defaultOutput: TOutput = {} as TOutput
): Promise<void> {
  try {
    const input = await readInput<TInput>();
    const output = await handler(input);
    writeOutput(output);
  } catch (err) {
    console.error(`[${name}] Error:`, err);
    writeOutput(defaultOutput);
  }
  process.exit(0);
}

// ============================================================
// ファイル操作ヘルパー
// ============================================================

/**
 * プロジェクトルートを取得
 */
export function getProjectDir(): string {
  return process.env.CLAUDE_PROJECT_DIR || process.cwd();
}

/**
 * ログディレクトリを取得（存在しなければ作成）
 */
export async function ensureLogDir(subdir?: string): Promise<string> {
  const projectDir = getProjectDir();
  const logDir = subdir
    ? join(projectDir, '.claude', 'logs', subdir)
    : join(projectDir, '.claude', 'logs');

  if (!existsSync(logDir)) {
    await mkdir(logDir, { recursive: true });
  }
  return logDir;
}

/**
 * データディレクトリを取得（存在しなければ作成）
 */
export async function ensureDataDir(subdir?: string): Promise<string> {
  const projectDir = getProjectDir();
  const dataDir = subdir
    ? join(projectDir, '.data', subdir)
    : join(projectDir, '.data');

  if (!existsSync(dataDir)) {
    await mkdir(dataDir, { recursive: true });
  }
  return dataDir;
}

/**
 * JSONファイルを読み込む
 */
export async function readJsonFile<T>(path: string): Promise<T | null> {
  try {
    if (!existsSync(path)) return null;
    const content = await readFile(path, 'utf-8');
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

/**
 * JSONファイルを書き込む
 */
export async function writeJsonFile(path: string, data: unknown): Promise<void> {
  const dir = dirname(path);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
  await writeFile(path, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * JSONLファイルに追記
 */
export async function appendJsonl(path: string, data: unknown): Promise<void> {
  const dir = dirname(path);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
  await appendFile(path, JSON.stringify(data) + '\n', 'utf-8');
}

/**
 * JSONLファイルを読み込む
 */
export async function readJsonlFile<T>(path: string): Promise<T[]> {
  try {
    if (!existsSync(path)) return [];
    const content = await readFile(path, 'utf-8');
    return content
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line) as T);
  } catch {
    return [];
  }
}

// ============================================================
// トランスクリプト処理
// ============================================================

/**
 * トランスクリプトファイルを読み込んでパース
 */
export async function readTranscript(path: string): Promise<TranscriptEntry[]> {
  return readJsonlFile<TranscriptEntry>(path);
}

/**
 * コンテンツブロックからテキストを抽出
 */
export function extractTextFromContent(content: string | ContentBlock[]): string {
  if (typeof content === 'string') {
    return content;
  }

  return content
    .filter((block): block is ContentBlock & { type: 'text' } => block.type === 'text')
    .map((block) => block.text || '')
    .join(' ');
}

/**
 * トランスクリプトから会話メッセージを抽出
 */
export function extractMessages(
  entries: TranscriptEntry[]
): Array<{ role: 'user' | 'assistant'; content: string }> {
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  for (const entry of entries) {
    if (entry.type === 'system' || entry.type === 'summary' || entry.type === 'meta') {
      continue;
    }

    if (entry.message && entry.message.role) {
      const content = extractTextFromContent(entry.message.content);
      if (content) {
        messages.push({ role: entry.message.role, content });
      }
    }
  }

  return messages;
}

// ============================================================
// 日付ヘルパー
// ============================================================

/**
 * 今日の日付を YYYY-MM-DD 形式で取得
 */
export function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * タイムスタンプを YYYYMMDD_HHMMSS 形式で取得
 */
export function getTimestampString(): string {
  const now = new Date();
  const date = now.toISOString().split('T')[0].replace(/-/g, '');
  const time = now.toTimeString().split(' ')[0].replace(/:/g, '');
  return `${date}_${time}`;
}

// ============================================================
// 文字列ヘルパー
// ============================================================

/**
 * 文字列を指定長で切り詰める
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

/**
 * ユニークIDを生成
 */
export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}
