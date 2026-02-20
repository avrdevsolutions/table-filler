'use client';
import { getDaysInMonth } from '@/lib/schedule';

interface Props {
  year: number;
  month: number;
  mode: 'ZL' | 'CO' | 'X';
  currentCells: Record<number, string>;
  demisieDays: Record<number, string>;
  onToggle: (day: number) => void;
  onClose: () => void;
  employeeName: string;
}

export default function CalendarPopup({ year, month, mode, currentCells, demisieDays, onToggle, onClose, employeeName }: Props) {
  const days = getDaysInMonth(year, month);
  const firstDow = new Date(year, month - 1, 1).getDay();
  const blanks = firstDow === 0 ? 6 : firstDow - 1;

  function getCellStyle(day: number): string {
    const val = currentCells[day] ?? '';
    if (demisieDays[day]) return 'bg-gray-300 cursor-not-allowed text-gray-500';
    if (mode === 'ZL' && val === '24') return 'bg-blue-500 text-white cursor-pointer';
    if (mode === 'CO' && val === 'CO') return 'bg-green-500 text-white cursor-pointer';
    if (mode === 'X' && val === 'X') return 'bg-red-400 text-white cursor-pointer';
    return 'bg-white hover:bg-gray-100 cursor-pointer';
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl p-4 w-80" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-sm">{employeeName} — {mode === 'ZL' ? 'Zile lucrătoare' : mode === 'CO' ? 'Concediu' : 'Liber'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-lg leading-none">×</button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-xs text-center mb-1">
          {['Lu','Ma','Mi','Jo','Vi','Sâ','Du'].map(d => (
            <div key={d} className="font-medium text-gray-500">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: blanks }).map((_, i) => <div key={`b${i}`} />)}
          {Array.from({ length: days }, (_, i) => i + 1).map(day => (
            <button
              key={day}
              onClick={() => !demisieDays[day] && onToggle(day)}
              className={`rounded text-xs py-1 font-medium ${getCellStyle(day)}`}
              disabled={!!demisieDays[day]}
            >
              {day}
            </button>
          ))}
        </div>
        <div className="mt-3 flex justify-end">
          <button onClick={onClose} className="bg-gray-200 px-3 py-1 rounded text-sm hover:bg-gray-300">Închide</button>
        </div>
      </div>
    </div>
  );
}
