'use client';
import { MONTHS_RO } from '@/lib/schedule';

interface Props {
  month: number;
  year: number;
  onMonthChange: (m: number) => void;
  onYearChange: (y: number) => void;
}

export default function MonthSelector({ month, year, onMonthChange, onYearChange }: Props) {
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <select
        value={month}
        onChange={e => onMonthChange(Number(e.target.value))}
        className="border rounded px-3 py-2 text-sm"
      >
        {MONTHS_RO.map((m, i) => (
          <option key={i} value={i + 1}>{m}</option>
        ))}
      </select>
      <select
        value={year}
        onChange={e => onYearChange(Number(e.target.value))}
        className="border rounded px-3 py-2 text-sm"
      >
        {years.map(y => <option key={y} value={y}>{y}</option>)}
      </select>
    </div>
  );
}
