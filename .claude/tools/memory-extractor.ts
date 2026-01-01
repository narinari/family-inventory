/**
 * Memory Extractor
 *
 * 会話からメモリ（知識・決定事項・発見）を抽出します。
 * パターンマッチングによるシンプルな実装です。
 */

import type { Memory } from './types.js';
import { addMemories } from './memory-store.js';

interface ExtractedMemory {
  content: string;
  category: string;
}

// 抽出パターン定義
const PATTERNS: Array<{
  category: string;
  patterns: RegExp[];
}> = [
  {
    category: 'decision',
    patterns: [
      /(?:決定|決めた|することにした|採用した|選択した)[：:]?\s*(.+)/,
      /(?:we decided|decided to|going with|chose to)[：:]?\s*(.+)/i,
    ],
  },
  {
    category: 'discovery',
    patterns: [
      /(?:発見|わかった|判明した|見つけた)[：:]?\s*(.+)/,
      /(?:discovered|found that|realized|turns out)[：:]?\s*(.+)/i,
    ],
  },
  {
    category: 'problem',
    patterns: [
      /(?:問題|課題|エラー|バグ)[：:]?\s*(.+)/,
      /(?:problem|issue|error|bug)[：:]?\s*(.+)/i,
    ],
  },
  {
    category: 'solution',
    patterns: [
      /(?:解決|修正|対処|対応)[：:]?\s*(.+)/,
      /(?:fixed|solved|resolved|workaround)[：:]?\s*(.+)/i,
    ],
  },
  {
    category: 'preference',
    patterns: [
      /(?:好み|こだわり|ルール)[：:]?\s*(.+)/,
      /(?:prefer|always use|convention)[：:]?\s*(.+)/i,
    ],
  },
  {
    category: 'architecture',
    patterns: [
      /(?:アーキテクチャ|設計|構造)[：:]?\s*(.+)/,
      /(?:architecture|design pattern|structure)[：:]?\s*(.+)/i,
    ],
  },
  {
    category: 'todo',
    patterns: [
      /(?:TODO|FIXME|後で|あとで)[：:]?\s*(.+)/,
      /(?:todo|fixme|later|need to)[：:]?\s*(.+)/i,
    ],
  },
];

/**
 * テキストからメモリを抽出
 */
export function extractFromText(text: string): ExtractedMemory[] {
  const memories: ExtractedMemory[] = [];
  const lines = text.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 10) continue;

    for (const { category, patterns } of PATTERNS) {
      for (const pattern of patterns) {
        const match = trimmed.match(pattern);
        if (match && match[1]) {
          const content = match[1].trim();
          if (content.length >= 5 && content.length <= 500) {
            memories.push({ content, category });
            break;
          }
        }
      }
    }
  }

  // 重複を除去
  const unique = new Map<string, ExtractedMemory>();
  for (const memory of memories) {
    const key = `${memory.category}:${memory.content}`;
    if (!unique.has(key)) {
      unique.set(key, memory);
    }
  }

  return Array.from(unique.values());
}

/**
 * 会話メッセージからメモリを抽出
 */
export function extractFromMessages(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
): ExtractedMemory[] {
  const allMemories: ExtractedMemory[] = [];

  for (const message of messages) {
    // アシスタントのメッセージからのみ抽出（より信頼性が高い）
    if (message.role === 'assistant') {
      const extracted = extractFromText(message.content);
      allMemories.push(...extracted);
    }
  }

  // 重複を除去
  const unique = new Map<string, ExtractedMemory>();
  for (const memory of allMemories) {
    const key = `${memory.category}:${memory.content}`;
    if (!unique.has(key)) {
      unique.set(key, memory);
    }
  }

  return Array.from(unique.values());
}

/**
 * 会話からメモリを抽出してストアに保存
 */
export async function extractAndStore(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  sessionId?: string
): Promise<Memory[]> {
  const extracted = extractFromMessages(messages);

  if (extracted.length === 0) {
    return [];
  }

  return addMemories(extracted, sessionId);
}
