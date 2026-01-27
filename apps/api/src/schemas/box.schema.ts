import { z } from 'zod';

/**
 * 箱関連スキーマ
 */

export const createBoxSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  locationId: z.string().optional(),
  description: z.string().max(500).trim().optional(),
  tags: z.array(z.string()).optional(),
});

export const updateBoxSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  locationId: z.string().optional(),
  description: z.string().max(500).trim().optional(),
  tags: z.array(z.string()).optional(),
});
