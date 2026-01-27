import { z } from 'zod';

/**
 * アイテム種別関連スキーマ
 */

export const createItemTypeSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  manufacturer: z.string().max(100).trim().optional(),
  description: z.string().max(500).trim().optional(),
  tags: z.array(z.string()).optional(),
});

export const updateItemTypeSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  manufacturer: z.string().max(100).trim().optional(),
  description: z.string().max(500).trim().optional(),
  tags: z.array(z.string()).optional(),
});
