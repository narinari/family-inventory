import type { Request, Response } from 'express';
import type { User } from '@family-inventory/shared';
import { ErrorCodes } from '@family-inventory/shared';
import { getUserByDiscordId } from '../../services/auth.service.js';
import { sendError, sendNotFound } from '../../utils/response.js';

/**
 * Discord IDからユーザーを取得
 * ユーザーが見つからない場合は404レスポンスを送信しnullを返す
 */
export async function requireDiscordUser(
  discordId: string | undefined,
  res: Response
): Promise<User | null> {
  if (!discordId) {
    sendError(res, ErrorCodes.VALIDATION_ERROR, 'discordId が必要です', 400);
    return null;
  }

  const user = await getUserByDiscordId(discordId);
  if (!user) {
    sendNotFound(res, 'Discord連携されていないユーザー', ErrorCodes.USER_NOT_FOUND);
    return null;
  }

  return user;
}

/**
 * クエリパラメータからdiscordIdを取得しユーザーを検証
 */
export async function requireDiscordUserFromQuery(
  req: Request,
  res: Response
): Promise<User | null> {
  return requireDiscordUser(req.query.discordId as string | undefined, res);
}
