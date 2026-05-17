import { z } from 'zod';

/**
 * 共通スキーマ
 * Agent API で共通して使用されるスキーマ
 */

// Agent操作で使用する空ボディ用スキーマ
export const statusActionSchema = z.object({});
