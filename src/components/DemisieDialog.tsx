'use client';
import { useState } from 'react';
import { getDaysInMonth } from '@/lib/schedule';

interface Props {
  year: number;
  month: number;
  employeeName: string;
  currentDate?: string | null;
  onConfirm: (date: string | null) => void;
  onClose: () => void;
}

export default function DemisieDialog({ year, month, employeeName, currentDate, onConfirm, onClose }: Props) {
  const days = getDaysInMonth(year, month);
  const [selectedDay, setSelectedDay] = useState<number | null>(
    currentDate ? new Date(currentDate).getDate() : null
  );

  function handleConfirm() {
    if (selectedDay === null) { onConfirm(null); return; }
    const mm = String(month).padStart(2, '0');
    const dd = String(selectedDay).padStart(2, '0');
    onConfirm(`${year}-${mm}-${dd}`);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl p-4 w-72" onClick={e => e.stopPropagation()}>
        <h3 className="font-semibold mb-3 text-sm">Demisie — {employeeName}</h3>
        <p className="text-xs text-gray-600 mb-2">Selectați ziua de începere a demisiei:</p>
        <div className="grid grid-cols-7 gap-1 mb-3">
          {Array.from({ length: days }, (_, i) => i + 1).map(day => (
            <button
              key={day}
              onClick={() => setSelectedDay(selectedDay === day ? null : day)}
              className={`rounded text-xs py-1 font-medium ${selectedDay === day ? 'bg-orange-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
            >
              {day}
            </button>
          ))}
        </div>
        <div className="flex gap-2 justify-end">
          {currentDate && (
            <button onClick={() => onConfirm(null)} className="text-xs text-red-500 hover:underline mr-auto">Elimină demisie</button>
          )}
          <button onClick={onClose} className="bg-gray-200 px-3 py-1 rounded text-sm hover:bg-gray-300">Anulează</button>
          <button onClick={handleConfirm} className="bg-orange-500 text-white px-3 py-1 rounded text-sm hover:bg-orange-600">Confirmă</button>
        </div>
      </div>
    </div>
  );
}
