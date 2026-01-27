import { z } from 'zod';

/**
 * 保管場所関連スキーマ
 */

export const createLocationSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  address: z.string().max(200).trim().optional(),
  description: z.string().max(500).trim().optional(),
  tags: z.array(z.string()).optional(),
});

export const updateLocationSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  address: z.string().max(200).trim().optional(),
  description: z.string().max(500).trim().optional(),
  tags: z.array(z.string()).optional(),
});
