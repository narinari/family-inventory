'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

type ScannerState = 'idle' | 'requesting' | 'active' | 'denied' | 'error';

interface QrScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
  active: boolean;
}

export function QrScanner({ onScan, onClose, active }: QrScannerProps) {
  const [state, setState] = useState<ScannerState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active) {
      stopScanner();
      setState('idle');
      return;
    }

    startScanner();

    return () => {
      stopScanner();
    };
  }, [active]);

  async function startScanner() {
    if (!containerRef.current) return;

    setState('requesting');

    try {
      const scanner = new Html5Qrcode('qr-scanner-container');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          onScan(decodedText);
        },
        () => {
          // QR not found in frame — ignore
        },
      );

      setState('active');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('NotAllowedError') || message.includes('Permission')) {
        setState('denied');
        setErrorMessage('カメラへのアクセスが許可されていません。ブラウザの設定からカメラへのアクセスを許可してください。');
      } else {
        setState('error');
        setErrorMessage(`カメラを起動できませんでした: ${message}`);
      }
    }
  }

  async function stopScanner() {
    const scanner = scannerRef.current;
    if (scanner) {
      try {
        const state = scanner.getState();
        if (state === 2 /* SCANNING */ || state === 3 /* PAUSED */) {
          await scanner.stop();
        }
      } catch {
        // already stopped
      }
      scannerRef.current = null;
    }
  }

  if (!active) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex items-center justify-between p-4 bg-black/80">
        <h2 className="text-white font-semibold">QRコードをスキャン</h2>
        <button
          onClick={onClose}
          className="text-white text-2xl leading-none px-2"
        >
          &times;
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center relative">
        <div
          id="qr-scanner-container"
          ref={containerRef}
          className="w-full h-full"
        />

        {state === 'requesting' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <div className="text-center text-white">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-white border-t-transparent mx-auto mb-4" />
              <p>カメラを起動中...</p>
            </div>
          </div>
        )}

        {(state === 'denied' || state === 'error') && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <div className="text-center text-white px-8">
              <p className="text-lg mb-4">{errorMessage}</p>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-white text-gray-900 rounded-lg"
              >
                閉じる
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
