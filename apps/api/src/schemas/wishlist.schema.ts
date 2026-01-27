import { z } from 'zod';

/**
 * 購入予定関連スキーマ
 */

// 標準API用スキーマ
export const createWishlistSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  itemTypeId: z.string().optional(),
  requesterId: z.string().optional(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
  priceRange: z.string().max(100).optional(),
  deadline: z.coerce.date().optional(),
  url: z.string().url().max(500).optional(),
  tags: z.array(z.string()).optional(),
  memo: z.string().max(1000).optional(),
});

export const updateWishlistSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  itemTypeId: z.string().optional(),
  requesterId: z.string().optional(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
  priceRange: z.string().max(100).optional(),
  deadline: z.coerce.date().optional(),
  url: z.string().url().max(500).optional(),
  tags: z.array(z.string()).optional(),
  memo: z.string().max(1000).optional(),
});

// Bot API用スキーマ
export const botCreateWishlistSchema = z.object({
  discordId: z.string().min(1),
  name: z.string().min(1).max(200).trim(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
  priceRange: z.string().max(100).optional(),
  url: z.string().url().max(500).optional(),
  memo: z.string().max(1000).optional(),
});
