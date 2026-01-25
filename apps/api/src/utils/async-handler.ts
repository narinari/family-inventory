import type { Request, Response } from 'express';
import { ErrorCodes } from '@family-inventory/shared';
import { sendError } from './response.js';

type AsyncRouteHandler = (req: Request, res: Response) => Promise<void>;

/**
 * 非同期ルートハンドラのラッパー
 * try-catchを自動化し、未処理エラーを500レスポンスに変換
 */
export function asyncHandler(fn: AsyncRouteHandler, errorMessage: string): AsyncRouteHandler {
  return async (req, res) => {
    try {
      await fn(req, res);
    } catch (error) {
      console.error(`${errorMessage}:`, error);
      sendError(res, ErrorCodes.INTERNAL_ERROR, errorMessage, 500);
    }
  };
}
