#!/usr/bin/env npx tsx
/**
 * Pre-Compact Hook
 *
 * コンパクション前に会話のトランスクリプトをテキストファイルとしてエクスポートします。
 * 後から参照できるように保存します。
 *
 * Hook Event: PreCompact
 */

import { writeFile } from 'fs/promises';
import { join } from 'path';
import type { PreCompactHookInput, PreCompactHookOutput, TranscriptEntry, ContentBlock } from './types.js';
import { runHook, readTranscript, ensureDataDir, getTimestampString, extractTextFromContent } from './utils.js';

/**
 * メッセージを読みやすいテキスト形式にフォーマット
 */
function formatMessage(entry: TranscriptEntry): string {
  const lines: string[] = [];
  const role = (entry.type || 'unknown').toUpperCase();

  lines.push(`[${role}]:`);

  if (entry.message?.content) {
    const content = entry.message.content;

    if (typeof content === 'string') {
      lines.push(content);
    } else if (Array.isArray(content)) {
      for (const block of content as ContentBlock[]) {
        switch (block.type) {
          case 'text':
            if (block.text) lines.push(block.text);
            break;
          case 'thinking':
            if (block.text) {
              lines.push('');
              lines.push('[THINKING]:');
              lines.push(block.text);
              lines.push('[/THINKING]');
              lines.push('');
            }
            break;
          case 'tool_use':
            lines.push('');
            lines.push(`[TOOL USE: ${block.name}] (ID: ${block.id?.slice(0, 20)}...)`);
            if (block.input) {
              try {
                const inputStr = JSON.stringify(block.input, null, 2);
                for (const line of inputStr.split('\n')) {
                  lines.push(`  ${line}`);
                }
              } catch {
                lines.push(`  ${String(block.input)}`);
              }
            }
            lines.push('');
            break;
          case 'tool_result':
            lines.push('');
            const errorMarker = block.is_error ? ' [ERROR]' : '';
            lines.push(`[TOOL RESULT${errorMarker}] (ID: ${block.tool_use_id?.slice(0, 20)}...)`);
            if (block.content) {
              const resultLines = block.content.split('\n');
              if (resultLines.length > 100) {
                // 長い出力は省略
                for (const line of resultLines.slice(0, 50)) {
                  lines.push(`  ${line}`);
                }
                lines.push(`  ... (${resultLines.length - 70} lines omitted) ...`);
                for (const line of resultLines.slice(-20)) {
                  lines.push(`  ${line}`);
                }
              } else {
                for (const line of resultLines) {
                  lines.push(`  ${line}`);
                }
              }
            }
            lines.push('');
            break;
          default:
            lines.push(`[${block.type.toUpperCase()}]: ${JSON.stringify(block)}`);
        }
      }
    }
  } else if (entry.content) {
    lines.push(entry.content);
  }

  return lines.join('\n') + '\n';
}

/**
 * トランスクリプトをテキストファイルにエクスポート
 */
async function exportTranscript(
  transcriptPath: string,
  trigger: string,
  sessionId: string,
  customInstructions?: string
): Promise<string> {
  const storageDir = await ensureDataDir('transcripts');
  const timestamp = getTimestampString();
  const outputFilename = `compact_${timestamp}_${sessionId}.txt`;
  const outputPath = join(storageDir, outputFilename);

  // トランスクリプトを読み込み
  const entries = await readTranscript(transcriptPath);

  // テキストファイルを構築
  const lines: string[] = [];

  // ヘッダー
  lines.push('='.repeat(80));
  lines.push('CLAUDE CODE CONVERSATION TRANSCRIPT');
  lines.push(`Exported: ${new Date().toISOString()}`);
  lines.push(`Session ID: ${sessionId}`);
  lines.push(`Compact Trigger: ${trigger}`);
  if (customInstructions) {
    lines.push(`Custom Instructions: ${customInstructions}`);
  }
  lines.push(`Total Entries: ${entries.length}`);
  lines.push('='.repeat(80));
  lines.push('');

  // メッセージを出力
  let messageNum = 0;
  for (const entry of entries) {
    if (entry.type === 'user' || entry.type === 'assistant') {
      messageNum++;
      lines.push('');
      lines.push(`--- Message ${messageNum} (${entry.type}) ---`);
      lines.push(formatMessage(entry));
    } else if (entry.type === 'system') {
      lines.push('');
      lines.push('--- System Event ---');
      lines.push(`[SYSTEM]: ${entry.subtype || ''} ${entry.content || ''}`);
      if (entry.timestamp) {
        lines.push(`Timestamp: ${entry.timestamp}`);
      }
    } else if (entry.type === 'summary' || entry.type === 'meta') {
      lines.push('');
      lines.push(`--- ${entry.type.charAt(0).toUpperCase() + entry.type.slice(1)} ---`);
      lines.push(`[${entry.type.toUpperCase()}]: ${entry.content || ''}`);
    }
    lines.push('');
  }

  // フッター
  lines.push('='.repeat(80));
  lines.push('END OF TRANSCRIPT');
  lines.push(`File: ${outputFilename}`);
  lines.push('='.repeat(80));

  // ファイルに書き込み
  await writeFile(outputPath, lines.join('\n'), 'utf-8');

  return outputPath;
}

async function handler(input: PreCompactHookInput): Promise<PreCompactHookOutput> {
  const transcriptPath = input.transcript_path;
  if (!transcriptPath) {
    return {
      continue: true,
      suppressOutput: true,
      metadata: {
        source: 'pre-compact',
        transcript_exported: false,
        error: 'no_transcript_path',
      },
    };
  }

  try {
    const trigger = input.trigger || 'unknown';
    const sessionId = input.session_id || 'unknown';
    const customInstructions = input.custom_instructions;

    const exportedPath = await exportTranscript(
      transcriptPath,
      trigger,
      sessionId,
      customInstructions
    );

    const filename = exportedPath.split('/').pop() || exportedPath;

    return {
      continue: true,
      suppressOutput: true,
      systemMessage: `Transcript exported to .data/transcripts/${filename}`,
      metadata: {
        source: 'pre-compact',
        transcript_exported: true,
        export_path: exportedPath,
        trigger,
      },
    };
  } catch (error) {
    return {
      continue: true,
      suppressOutput: true,
      metadata: {
        source: 'pre-compact',
        transcript_exported: false,
        error: String(error),
      },
    };
  }
}

// メイン実行
runHook('pre-compact', handler, {
  continue: true,
  suppressOutput: true,
  metadata: {
    source: 'pre-compact',
    transcript_exported: false,
  },
});
