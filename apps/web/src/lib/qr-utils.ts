/**
 * QRコードURL生成・パースユーティリティ
 */

const QR_PATH = '/boxes/qr';

export function getBoxQrUrl(boxId: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}${QR_PATH}?id=${encodeURIComponent(boxId)}`;
}

export function parseBoxIdFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.pathname === QR_PATH || parsed.pathname === '/boxes/detail') {
      return parsed.searchParams.get('id');
    }
    return null;
  } catch {
    return null;
  }
}

export function isBoxQrUrl(text: string): boolean {
  return parseBoxIdFromUrl(text) !== null;
}
