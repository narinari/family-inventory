/**
 * 招待コードを生成する
 * フォーマット: XXXX-XXXX-XXXX
 */
export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const segments = 3;
  const segmentLength = 4;

  const parts: string[] = [];
  for (let i = 0; i < segments; i++) {
    let segment = '';
    for (let j = 0; j < segmentLength; j++) {
      segment += chars[Math.floor(Math.random() * chars.length)];
    }
    parts.push(segment);
  }

  return parts.join('-');
}

/**
 * 招待コードのフォーマットを検証
 */
export function isValidInviteCodeFormat(code: string): boolean {
  const pattern = /^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/;
  return pattern.test(code.toUpperCase());
}

/**
 * 招待コードを正規化
 */
export function normalizeInviteCode(code: string): string {
  return code.trim().toUpperCase();
}

/**
 * 有効期限を計算
 */
export function calculateExpiryDate(days: number = 7): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

/**
 * 招待コードが期限切れか判定
 */
export function isInviteCodeExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt;
}
