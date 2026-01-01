#!/usr/bin/env npx tsx
/**
 * Session Stop Hook
 *
 * セッション終了時（Stop / SubagentStop）に会話からメモリを抽出して保存します。
 *
 * Hook Event: Stop, SubagentStop
 */

import type { StopHookInput, BaseHookOutput, TranscriptEntry } from './types.js';
import { runHook, readTranscript, extractMessages } from './utils.js';
import { extractAndStore } from './memory-extractor.js';

// 環境変数でメモリシステムを有効/無効化
const MEMORY_ENABLED = process.env.MEMORY_SYSTEM_ENABLED?.toLowerCase() === 'true';

async function handler(input: StopHookInput): Promise<BaseHookOutput> {
  // メモリシステムが無効の場合はスキップ
  if (!MEMORY_ENABLED) {
    return {
      metadata: {
        source: 'session-stop',
        disabled: true,
        memoriesExtracted: 0,
      },
    };
  }

  const transcriptPath = input.transcript_path;
  if (!transcriptPath) {
    return {
      metadata: {
        source: 'session-stop',
        memoriesExtracted: 0,
        error: 'no_transcript_path',
      },
    };
  }

  try {
    // トランスクリプトを読み込み
    const entries = await readTranscript(transcriptPath);
    if (entries.length === 0) {
      return {
        metadata: {
          source: 'session-stop',
          memoriesExtracted: 0,
          error: 'empty_transcript',
        },
      };
    }

    // 会話メッセージを抽出
    const messages = extractMessages(entries);
    if (messages.length === 0) {
      return {
        metadata: {
          source: 'session-stop',
          memoriesExtracted: 0,
          error: 'no_messages',
        },
      };
    }

    // メモリを抽出して保存
    const memories = await extractAndStore(messages, input.session_id);

    return {
      metadata: {
        source: 'session-stop',
        memoriesExtracted: memories.length,
        categories: [...new Set(memories.map((m) => m.category))],
      },
    };
  } catch (error) {
    return {
      metadata: {
        source: 'session-stop',
        memoriesExtracted: 0,
        error: String(error),
      },
    };
  }
}

// メイン実行
runHook('session-stop', handler, {
  metadata: {
    source: 'session-stop',
    memoriesExtracted: 0,
  },
});
