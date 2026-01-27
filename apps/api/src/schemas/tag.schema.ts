import { z } from 'zod';

/**
 * タグ関連スキーマ
 */

export const createTagSchema = z.object({
  name: z.string().min(1).max(50).trim(),
  color: z.string().max(20).trim().optional(),
});

export const updateTagSchema = z.object({
  name: z.string().min(1).max(50).trim().optional(),
  color: z.string().max(20).trim().optional(),
});
