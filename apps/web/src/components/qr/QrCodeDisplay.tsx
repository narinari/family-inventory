'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface QrCodeDisplayProps {
  value: string;
  size?: number;
  className?: string;
}

export function QrCodeDisplay({ value, size = 200, className }: QrCodeDisplayProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(value, {
      width: size,
      margin: 2,
      errorCorrectionLevel: 'M',
    }).then((url) => {
      if (!cancelled) setDataUrl(url);
    });
    return () => { cancelled = true; };
  }, [value, size]);

  if (!dataUrl) {
    return (
      <div
        className={className}
        style={{ width: size, height: size }}
        aria-label="QRコード生成中"
      />
    );
  }

  return (
    <img
      src={dataUrl}
      alt="QRコード"
      width={size}
      height={size}
      className={className}
    />
  );
}
