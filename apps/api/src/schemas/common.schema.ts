import { z } from 'zod';

/**
 * 共通スキーマ
 * Bot API で共通して使用されるスキーマ
 */

// Bot操作で使用する discordId のみを持つスキーマ
export const statusActionSchema = z.object({
  discordId: z.string().min(1),
});
