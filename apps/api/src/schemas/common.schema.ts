import { z } from 'zod';

/**
 * 共通スキーマ
 * Bot API で共通して使用されるスキーマ
 */

// Agent操作で使用する空ボディ用スキーマ
// 注: discordId は移行期間のため optional として残す (TASK-4 で削除予定)
export const statusActionSchema = z.object({
  discordId: z.string().optional(),
});
