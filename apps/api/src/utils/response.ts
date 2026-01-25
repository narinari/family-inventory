import type { Response } from 'express';
import { ErrorCodes } from '@family-inventory/shared';

/**
 * 成功レスポンス（200）を送信
 */
export function sendSuccess<T>(res: Response, data: T): void {
  res.json({ success: true, data });
}

/**
 * 作成成功レスポンス（201）を送信
 */
export function sendCreated<T>(res: Response, data: T): void {
  res.status(201).json({ success: true, data });
}

/**
 * エラーレスポンスを送信
 */
export function sendError(
  res: Response,
  code: string,
  message: string,
  status: number = 500,
  details?: unknown
): void {
  const error: { code: string; message: string; details?: unknown } = { code, message };
  if (details !== undefined) {
    error.details = details;
  }
  res.status(status).json({ success: false, error });
}

/**
 * 404 Not Found レスポンスを送信
 */
export function sendNotFound(res: Response, entityName: string, code?: string): void {
  const errorCode = code ?? `${entityName.toUpperCase().replace(/\s+/g, '_')}_NOT_FOUND`;
  sendError(res, errorCode, `${entityName}が見つかりません`, 404);
}

/**
 * バリデーションエラーレスポンス（400）を送信
 */
export function sendValidationError(res: Response, details: unknown): void {
  sendError(res, ErrorCodes.VALIDATION_ERROR, '入力内容を確認してください', 400, details);
}

/**
 * メッセージ付き成功レスポンスを送信
 */
export function sendMessage(res: Response, message: string): void {
  res.json({ success: true, data: { message } });
}
