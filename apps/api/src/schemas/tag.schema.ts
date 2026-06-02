import { z } from 'zod';
import type { HexColor } from '@family-inventory/shared';

/**
 * タグ関連スキーマ
 */

/**
 * CSS HEX カラーコード (`#RGB` または `#RRGGBB`)。
 *
 * 大文字小文字どちらも許容。`#fff` / `#FF8800` など。
 * パース後は branded `HexColor` 型として下流に伝播する。
 */
export const hexColorSchema = z
  .string()
  .regex(
    /^#(?:[0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/,
    'CSS HEX カラーコード (#RGB または #RRGGBB) で指定してください'
  )
  .transform((v) => v as HexColor);

export const createTagSchema = z.object({
  name: z.string().min(1).max(50).trim(),
  color: hexColorSchema.optional(),
});

export const updateTagSchema = z.object({
  name: z.string().min(1).max(50).trim().optional(),
  color: hexColorSchema.optional(),
});
