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

const modeConfig = {
  ZL: { label: 'Zile lucrătoare', color: '#0071e3', bg: '#e8f3ff', selectedBg: '#0071e3' },
  CO: { label: 'Concediu de odihnă', color: '#1a7f3c', bg: '#dcf5e4', selectedBg: '#30d158' },
  X:  { label: 'Liber / Absență', color: '#c2410c', bg: '#fff0eb', selectedBg: '#ff6b35' },
};

const DOW_LABELS = ['Lu', 'Ma', 'Mi', 'Jo', 'Vi', 'Sâ', 'Du'];

export default function CalendarPopup({ year, month, mode, currentCells, demisieDays, onToggle, onClose, employeeName }: Props) {
  const days = getDaysInMonth(year, month);
  const firstDow = new Date(year, month - 1, 1).getDay();
  const blanks = firstDow === 0 ? 6 : firstDow - 1;
  const cfg = modeConfig[mode];

  function getCellState(day: number): { selected: boolean; otherMode: boolean; demisie: boolean } {
    const val = currentCells[day] ?? '';
    if (demisieDays[day]) return { selected: false, otherMode: false, demisie: true };
    if (mode === 'ZL' && val === '24') return { selected: true, otherMode: false, demisie: false };
    if (mode === 'CO' && val === 'CO') return { selected: true, otherMode: false, demisie: false };
    if (mode === 'X' && val === 'X') return { selected: true, otherMode: false, demisie: false };
    if (val !== '') return { selected: false, otherMode: true, demisie: false };
    return { selected: false, otherMode: false, demisie: false };
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: 'var(--surface)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2), 0 8px 20px rgba(0,0,0,0.1)',
          width: 320,
          maxWidth: '95vw',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{employeeName}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="inline-block w-2 h-2 rounded-full" style={{ background: cfg.selectedBg }} />
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{cfg.label}</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex items-center justify-center w-7 h-7 rounded-full transition-colors duration-150"
              style={{ color: 'var(--text-tertiary)', background: 'var(--surface-2)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--border-subtle)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface-2)')}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Calendar grid */}
        <div className="p-4">
          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DOW_LABELS.map(d => (
              <div key={d} className="text-center text-xs font-semibold" style={{ color: 'var(--text-tertiary)' }}>{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: blanks }).map((_, i) => <div key={`b${i}`} />)}
            {Array.from({ length: days }, (_, i) => i + 1).map(day => {
              const { selected, otherMode, demisie } = getCellState(day);
              const disabled = demisie || otherMode;
              return (
                <button
                  key={day}
                  onClick={() => !disabled && onToggle(day)}
                  disabled={disabled}
                  className="text-sm font-medium rounded-lg transition-all duration-100"
                  style={{
                    height: 36,
                    background: demisie
                      ? 'var(--border-subtle)'
                      : otherMode
                      ? 'var(--surface-2)'
                      : selected
                      ? cfg.selectedBg
                      : 'transparent',
                    color: demisie
                      ? 'var(--text-tertiary)'
                      : otherMode
                      ? 'var(--text-tertiary)'
                      : selected
                      ? '#fff'
                      : 'var(--text-primary)',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    opacity: demisie || otherMode ? 0.5 : 1,
                  }}
                  onMouseEnter={e => {
                    if (!disabled && !selected) e.currentTarget.style.background = cfg.bg;
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

        {/* Footer */}
        <div className="px-4 pb-4 flex justify-end" style={{ paddingTop: 0 }}>
          <button
            onClick={onClose}
            className="btn-primary text-sm px-5 py-2"
            style={{ minHeight: 38 }}
          >
            Închide
          </button>
        </div>
      </div>
    </div>
  );
}

