import type { Request, Response } from 'express';
import type { User } from '@family-inventory/shared';
import { ErrorCodes } from '@family-inventory/shared';
import { getUserByUid } from '../services/auth.service.js';
import { sendNotFound, sendError } from './response.js';

/**
 * 認証済みユーザーを取得
 * ユーザーが見つからない場合は404レスポンスを送信しnullを返す
 */
export async function requireUser(req: Request, res: Response): Promise<User | null> {
  const authUser = req.authUser!;
  const user = await getUserByUid(authUser.uid);
  if (!user) {
    sendNotFound(res, 'ユーザー', ErrorCodes.USER_NOT_FOUND);
    return null;
  }
  return user;
}

/**
 * 管理者権限をチェック
 * 管理者でない場合は403レスポンスを送信しfalseを返す
 */
export function requireAdmin(user: User, res: Response): boolean {
  if (user.role !== 'admin') {
    sendError(res, ErrorCodes.NOT_ADMIN, '管理者権限が必要です', 403);
    return false;
  }
  return true;
}
