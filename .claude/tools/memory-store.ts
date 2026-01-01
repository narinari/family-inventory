/**
 * Memory Store
 *
 * セッション間で持続するメモリ（知識・コンテキスト）を管理します。
 * シンプルなJSONファイルベースのストレージを使用。
 */

import { join } from 'path';
import type { Memory, MemorySearchResult } from './types.js';
import { ensureDataDir, readJsonFile, writeJsonFile, generateId } from './utils.js';

const MEMORY_FILE = 'memories.json';
const MAX_MEMORIES = 1000;

interface MemoryDatabase {
  memories: Memory[];
  version: number;
}

/**
 * メモリストアを取得
 */
async function getMemoryFile(): Promise<string> {
  const dataDir = await ensureDataDir('memory');
  return join(dataDir, MEMORY_FILE);
}

/**
 * 全メモリを取得
 */
export async function getAllMemories(): Promise<Memory[]> {
  const file = await getMemoryFile();
  const db = await readJsonFile<MemoryDatabase>(file);
  return db?.memories || [];
}

/**
 * メモリを追加
 */
export async function addMemory(
  content: string,
  category: string,
  sessionId?: string
): Promise<Memory> {
  const file = await getMemoryFile();
  const db = (await readJsonFile<MemoryDatabase>(file)) || { memories: [], version: 1 };

  const memory: Memory = {
    id: generateId(),
    content,
    category,
    createdAt: new Date().toISOString(),
    sessionId,
  };

  db.memories.push(memory);

  // 古いメモリを削除（最大数を超えた場合）
  if (db.memories.length > MAX_MEMORIES) {
    db.memories = db.memories.slice(-MAX_MEMORIES);
  }

  await writeJsonFile(file, db);
  return memory;
}

/**
 * 複数のメモリを一括追加
 */
export async function addMemories(
  items: Array<{ content: string; category: string }>,
  sessionId?: string
): Promise<Memory[]> {
  const file = await getMemoryFile();
  const db = (await readJsonFile<MemoryDatabase>(file)) || { memories: [], version: 1 };

  const newMemories: Memory[] = items.map((item) => ({
    id: generateId(),
    content: item.content,
    category: item.category,
    createdAt: new Date().toISOString(),
    sessionId,
  }));

  db.memories.push(...newMemories);

  // 古いメモリを削除
  if (db.memories.length > MAX_MEMORIES) {
    db.memories = db.memories.slice(-MAX_MEMORIES);
  }

  await writeJsonFile(file, db);
  return newMemories;
}

/**
 * 最近のメモリを取得
 */
export async function getRecentMemories(limit: number = 5): Promise<Memory[]> {
  const memories = await getAllMemories();
  return memories.slice(-limit).reverse();
}

/**
 * キーワードでメモリを検索（シンプルな部分一致検索）
 */
export async function searchMemories(
  query: string,
  limit: number = 5
): Promise<MemorySearchResult[]> {
  const memories = await getAllMemories();
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter((w) => w.length > 1);

  const results: MemorySearchResult[] = [];

  for (const memory of memories) {
    const contentLower = memory.content.toLowerCase();
    const categoryLower = memory.category.toLowerCase();

    // スコア計算（単純な単語マッチ）
    let score = 0;
    for (const word of queryWords) {
      if (contentLower.includes(word)) score += 1;
      if (categoryLower.includes(word)) score += 0.5;
    }

    // 完全一致のボーナス
    if (contentLower.includes(queryLower)) {
      score += 2;
    }

    if (score > 0) {
      results.push({
        memory,
        score: score / queryWords.length, // 正規化
      });
    }
  }

  // スコア順にソート
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

/**
 * カテゴリでメモリをフィルタ
 */
export async function getMemoriesByCategory(category: string): Promise<Memory[]> {
  const memories = await getAllMemories();
  return memories.filter((m) => m.category === category);
}

/**
 * メモリを削除
 */
export async function deleteMemory(id: string): Promise<boolean> {
  const file = await getMemoryFile();
  const db = await readJsonFile<MemoryDatabase>(file);
  if (!db) return false;

  const index = db.memories.findIndex((m) => m.id === id);
  if (index === -1) return false;

  db.memories.splice(index, 1);
  await writeJsonFile(file, db);
  return true;
}

/**
 * 全メモリをクリア
 */
export async function clearMemories(): Promise<void> {
  const file = await getMemoryFile();
  await writeJsonFile(file, { memories: [], version: 1 });
}
