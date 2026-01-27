import { z } from 'zod';

/**
 * アイテム（持ち物）関連スキーマ
 */

// 標準API用スキーマ
export const createItemSchema = z.object({
  itemTypeId: z.string().min(1),
  ownerId: z.string().optional(),
  boxId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  memo: z.string().max(1000).optional(),
  purchasedAt: z.coerce.date().optional(),
});

export const updateItemSchema = z.object({
  ownerId: z.string().optional(),
  boxId: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  memo: z.string().max(1000).optional(),
  purchasedAt: z.coerce.date().optional(),
});

export const consumeItemSchema = z.object({
  consumedAt: z.coerce.date().optional(),
});

export const giveItemSchema = z.object({
  givenTo: z.string().min(1),
  givenAt: z.coerce.date().optional(),
});

export const sellItemSchema = z.object({
  soldTo: z.string().optional(),
  soldPrice: z.number().min(0).optional(),
  soldAt: z.coerce.date().optional(),
});

export const verifyItemSchema = z.object({
  verifyAt: z.coerce.date().optional(),
});

export const batchVerifyItemsSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
  verifyAt: z.coerce.date().optional(),
});

// Bot API用スキーマ
export const botCreateItemSchema = z
  .object({
    discordId: z.string().min(1),
    itemTypeId: z.string().min(1).optional(),
    itemTypeName: z.string().min(1).optional(),
    boxId: z.string().optional(),
    memo: z.string().max(1000).optional(),
  })
  .refine((data) => data.itemTypeId || data.itemTypeName, {
    message: 'itemTypeId または itemTypeName が必要です',
  });

export const botGiveItemSchema = z.object({
  discordId: z.string().min(1),
  givenTo: z.string().min(1),
});

export const botSellItemSchema = z.object({
  discordId: z.string().min(1),
  soldTo: z.string().optional(),
  soldPrice: z.number().min(0).optional(),
});
