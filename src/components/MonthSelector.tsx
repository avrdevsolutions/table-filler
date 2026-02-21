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

  const selectStyle = {
    background: 'var(--surface)',
    border: '1.5px solid var(--border)',
    borderRadius: 10,
    padding: '8px 14px',
    fontSize: '0.9rem',
    fontWeight: 600,
    color: 'var(--text-primary)',
    cursor: 'pointer',
    minHeight: 40,
    outline: 'none',
    transition: 'border-color 150ms ease, box-shadow 150ms ease',
    appearance: 'none' as const,
    WebkitAppearance: 'none' as const,
    backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236e6e73' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
    paddingRight: 36,
  };

  return (
    <div className="flex items-center gap-2">
      <select
        value={month}
        onChange={e => onMonthChange(Number(e.target.value))}
        style={selectStyle}
      >
        {MONTHS_RO.map((m, i) => (
          <option key={i} value={i + 1}>{m}</option>
        ))}
      </select>
      <select
        value={year}
        onChange={e => onYearChange(Number(e.target.value))}
        style={selectStyle}
      >
        {years.map(y => <option key={y} value={y}>{y}</option>)}
      </select>
    </div>
  );
}

