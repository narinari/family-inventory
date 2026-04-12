'use client';

import { QrCodeDisplay } from './QrCodeDisplay';
import { getBoxQrUrl } from '@/lib/qr-utils';
import type { Box } from '@family-inventory/shared';

interface BoxQrLabelProps {
  box: Box;
  locationName?: string;
  onClose: () => void;
}

export function BoxQrLabel({ box, locationName, onClose }: BoxQrLabelProps) {
  function handlePrint() {
    window.print();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50 print:hidden" onClick={onClose} />

      <div className="relative bg-white rounded-xl shadow-lg p-6 z-10 max-w-sm w-full mx-4 print:shadow-none print:rounded-none print:p-0 print:m-0 print:max-w-none print:fixed print:inset-0 print:flex print:items-center print:justify-center">
        <div className="print:hidden flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">ラベル印刷</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        <div className="qr-label flex flex-col items-center gap-2 py-4">
          <p className="text-lg font-bold text-gray-900 text-center">{box.name}</p>
          <QrCodeDisplay value={getBoxQrUrl(box.id)} size={150} />
          {locationName && (
            <p className="text-sm text-gray-600 text-center">{locationName}</p>
          )}
        </div>

        <div className="print:hidden flex gap-3 justify-end mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            閉じる
          </button>
          <button
            onClick={handlePrint}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            印刷
          </button>
        </div>
      </div>
    </div>
  );
}
