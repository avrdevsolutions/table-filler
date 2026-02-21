'use client';
import { useState } from 'react';
import { getDaysInMonth } from '@/lib/schedule';
import { parseLocalDate } from '@/lib/validation';

const MONTHS_RO = [
  'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
  'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie',
];
const DOW_LABELS = ['Lu', 'Ma', 'Mi', 'Jo', 'Vi', 'Sâ', 'Du'];

interface Props {
  /** Currently selected date as 'YYYY-MM-DD', or '' */
  value: string;
  /** Earliest selectable date as 'YYYY-MM-DD' (inclusive) */
  minDate?: string;
  /** Called with 'YYYY-MM-DD' immediately on day selection */
  onSelect: (date: string) => void;
  onClose: () => void;
}

function pad2(n: number) { return String(n).padStart(2, '0'); }

export default function DatePickerModal({ value, minDate, onSelect, onClose }: Props) {
  const today = new Date();
  // Use parseLocalDate to avoid timezone-shift when determining initial view month
  const initial = value ? parseLocalDate(value) : today;
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth() + 1); // 1-12

  const minParsed = minDate ? parseLocalDate(minDate) : null;

  const days = getDaysInMonth(viewYear, viewMonth);
  const firstDow = new Date(viewYear, viewMonth - 1, 1).getDay();
  const blanks = firstDow === 0 ? 6 : firstDow - 1;

  function prevMonth() {
    if (viewMonth === 1) { setViewMonth(12); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 12) { setViewMonth(1); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  function isDisabled(day: number): boolean {
    if (!minParsed) return false;
    const d = new Date(viewYear, viewMonth - 1, day);
    return d < minParsed;
  }

  function isSelected(day: number): boolean {
    return value === `${viewYear}-${pad2(viewMonth)}-${pad2(day)}`;
  }

  function isToday(day: number): boolean {
    return (
      today.getFullYear() === viewYear &&
      today.getMonth() + 1 === viewMonth &&
      today.getDate() === day
    );
  }

  function handleDayClick(day: number) {
    if (isDisabled(day)) return;
    onSelect(`${viewYear}-${pad2(viewMonth)}-${pad2(day)}`);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', zIndex: 9999 }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 8px 20px rgba(0,0,0,0.4)',
          width: 300,
          maxWidth: '95vw',
          animation: 'sheetIn 200ms cubic-bezier(0.2,0,0,1)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Month/year navigation */}
        <div
          className="flex items-center justify-between px-4 pt-4 pb-3"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <button
            onClick={prevMonth}
            className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors duration-150"
            style={{ color: 'var(--text-secondary)', background: 'transparent', border: 'none', cursor: 'pointer' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {MONTHS_RO[viewMonth - 1]} {viewYear}
          </span>
          <button
            onClick={nextMonth}
            className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors duration-150"
            style={{ color: 'var(--text-secondary)', background: 'transparent', border: 'none', cursor: 'pointer' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>

        {/* Calendar grid */}
        <div className="p-3">
          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 mb-1">
            {DOW_LABELS.map(d => (
              <div key={d} className="text-center text-xs font-semibold py-1" style={{ color: 'var(--text-tertiary)' }}>
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: blanks }).map((_, i) => <div key={`b${i}`} />)}
            {Array.from({ length: days }, (_, i) => i + 1).map(day => {
              const disabled = isDisabled(day);
              const selected = isSelected(day);
              const todayCell = isToday(day);
              return (
                <button
                  key={day}
                  onClick={() => handleDayClick(day)}
                  disabled={disabled}
                  style={{
                    height: 36,
                    borderRadius: 8,
                    fontSize: '0.875rem',
                    fontWeight: todayCell ? 700 : 500,
                    background: selected ? 'var(--accent)' : 'transparent',
                    color: selected ? '#fff' : disabled ? 'var(--text-tertiary)' : 'var(--text-primary)',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    opacity: disabled ? 0.35 : 1,
                    border: todayCell && !selected ? '1px solid var(--border)' : '1px solid transparent',
                    transition: 'background 100ms ease',
                  }}
                  onMouseEnter={e => {
                    if (!disabled && !selected) e.currentTarget.style.background = 'var(--surface-2)';
                  }}
                  onMouseLeave={e => {
                    if (!disabled && !selected) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
