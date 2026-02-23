'use client';
import { useState } from 'react';
import { getDaysInMonth, isWorkHours } from '@/lib/schedule';

interface Props {
  year: number;
  month: number;
  mode: 'ZL' | 'CO' | 'CM' | 'X';
  currentCells: Record<number, string>;
  demisieDays: Record<number, string>;
  onToggle: (day: number, value: string) => void;
  onClose: () => void;
  employeeName: string;
}

const modeConfig = {
  ZL: { label: 'Zile lucrătoare', color: '#0071e3', bg: '#e8f3ff', selectedBg: '#0071e3' },
  CO: { label: 'Concediu de odihnă', color: '#1a7f3c', bg: '#dcf5e4', selectedBg: '#30d158' },
  CM: { label: 'Concediu medical', color: '#b45309', bg: '#fff7ed', selectedBg: '#f59e0b' },
  X:  { label: 'Liber / Absență', color: '#c2410c', bg: '#fff0eb', selectedBg: '#ff6b35' },
};

const ZL_PRESETS = ['8', '12', '24'];

const DOW_LABELS = ['Lu', 'Ma', 'Mi', 'Jo', 'Vi', 'Sâ', 'Du'];

export default function CalendarPopup({ year, month, mode, currentCells, demisieDays, onToggle, onClose, employeeName }: Props) {
  const days = getDaysInMonth(year, month);
  const firstDow = new Date(year, month - 1, 1).getDay();
  const blanks = firstDow === 0 ? 6 : firstDow - 1;
  const cfg = modeConfig[mode];

  const [paintValue, setPaintValue] = useState<string>('24');
  const [showCustom, setShowCustom] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [overrideDay, setOverrideDay] = useState<number | null>(null);

  const [contextMenu, setContextMenu] = useState<{ day: number; x: number; y: number } | null>(null);
  const [longPressTimer, setLongPressTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const isCustomPaint = !ZL_PRESETS.includes(paintValue);
  const customPaintLabel = isCustomPaint ? `Altul (${paintValue}h)` : 'Altul…';

  function getCellState(day: number): { selected: boolean; otherLetter: boolean; diffNumeric: boolean; demisie: boolean; val: string } {
    const val = currentCells[day] ?? '';
    if (demisieDays[day]) return { selected: false, otherLetter: false, diffNumeric: false, demisie: true, val };
    if (mode === 'ZL') {
      const selected = val === paintValue;
      const diffNumeric = !selected && isWorkHours(val);
      const otherLetter = val !== '' && !isWorkHours(val); // CO / CM / X
      return { selected, otherLetter, diffNumeric, demisie: false, val };
    }
    if (val === mode) return { selected: true, otherLetter: false, diffNumeric: false, demisie: false, val };
    if (val !== '') return { selected: false, otherLetter: true, diffNumeric: false, demisie: false, val };
    return { selected: false, otherLetter: false, diffNumeric: false, demisie: false, val };
  }

  function handleDayClick(day: number) {
    onToggle(day, mode === 'ZL' ? paintValue : mode);
  }

  function handleCustomConfirm() {
    const n = parseInt(customInput, 10);
    if (n >= 1 && n <= 48) {
      if (overrideDay !== null) {
        onToggle(overrideDay, String(n));
        setOverrideDay(null);
      } else {
        setPaintValue(String(n));
      }
    }
    setShowCustom(false);
    setCustomInput('');
  }

  function openContextMenu(day: number, x: number, y: number) {
    setContextMenu({ day, x, y });
  }

  function handleContextMenuRight(day: number, e: React.MouseEvent) {
    e.preventDefault();
    openContextMenu(day, e.clientX, e.clientY);
  }

  function handleTouchStart(day: number, e: React.TouchEvent) {
    const touch = e.touches[0];
    const timer = setTimeout(() => {
      openContextMenu(day, touch.clientX, touch.clientY);
    }, 500);
    setLongPressTimer(timer);
  }

  function handleTouchEnd() {
    if (longPressTimer) clearTimeout(longPressTimer);
    setLongPressTimer(null);
  }

  function closeContextMenu() {
    setContextMenu(null);
  }

  return (
    <>
      {/* Main popup backdrop */}
      <div
        className="fixed inset-0 flex items-center justify-center"
        style={{ zIndex: 50, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      >
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'var(--surface)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 8px 20px rgba(0,0,0,0.4)',
            width: 320,
            maxWidth: '95vw',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-5 pt-5 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
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

            {/* ZL hours paint-value selector */}
            {mode === 'ZL' && (
              <div className="flex gap-1.5 mt-3">
                {ZL_PRESETS.map(v => (
                  <button
                    key={v}
                    onClick={() => setPaintValue(v)}
                    style={{
                      flex: 1,
                      padding: '5px 2px',
                      borderRadius: 8,
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                      background: paintValue === v ? '#0071e3' : 'var(--surface-2)',
                      color: paintValue === v ? '#fff' : 'var(--text-secondary)',
                      transition: 'all 0.1s',
                    }}
                  >
                    {v}h
                  </button>
                ))}
                <button
                  onClick={() => { setCustomInput(isCustomPaint ? paintValue : ''); setOverrideDay(null); setShowCustom(true); }}
                  style={{
                    flex: 1.6,
                    padding: '5px 4px',
                    borderRadius: 8,
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    background: isCustomPaint ? '#0071e3' : 'var(--surface-2)',
                    color: isCustomPaint ? '#fff' : 'var(--text-secondary)',
                    transition: 'all 0.1s',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {customPaintLabel}
                </button>
              </div>
            )}
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
                const { selected, otherLetter, diffNumeric, demisie, val } = getCellState(day);
                const disabled = demisie || otherLetter;

                const bgColor = demisie
                  ? 'var(--border-subtle)'
                  : selected
                  ? cfg.selectedBg
                  : diffNumeric
                  ? 'rgba(10,132,255,0.15)'
                  : otherLetter
                  ? 'var(--surface-2)'
                  : 'transparent';

                const textColor = demisie
                  ? 'var(--text-tertiary)'
                  : selected
                  ? '#fff'
                  : 'var(--text-primary)';

                return (
                  <button
                    key={day}
                    onClick={() => !disabled && handleDayClick(day)}
                    onContextMenu={e => !disabled && mode === 'ZL' && handleContextMenuRight(day, e)}
                    onTouchStart={!disabled && mode === 'ZL' ? (e) => handleTouchStart(day, e) : undefined}
                    onTouchEnd={handleTouchEnd}
                    disabled={disabled}
                    className="rounded-lg transition-all duration-100"
                    style={{
                      height: 36,
                      background: bgColor,
                      color: textColor,
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      opacity: demisie || otherLetter ? 0.5 : 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      lineHeight: 1,
                      gap: 1,
                      border: 'none',
                      padding: 0,
                    }}
                    onMouseEnter={e => {
                      if (!disabled && !selected) e.currentTarget.style.background = cfg.bg;
                    }}
                    onMouseLeave={e => {
                      if (!disabled && !selected) {
                        e.currentTarget.style.background = diffNumeric
                          ? 'rgba(10,132,255,0.15)'
                          : otherLetter
                          ? 'var(--surface-2)'
                          : 'transparent';
                      }
                    }}
                  >
                    {/* Show day number; if it has a different numeric value in ZL mode, show the hours too */}
                    <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{day}</span>
                    {mode === 'ZL' && (diffNumeric || (selected && val !== '')) && (
                      <span style={{ fontSize: '0.55rem', fontWeight: 700, color: selected ? 'rgba(255,255,255,0.85)' : 'var(--accent)', lineHeight: 1 }}>
                        {val}h
                      </span>
                    )}
                    {mode === 'ZL' && otherLetter && (
                      <span style={{ fontSize: '0.55rem', fontWeight: 700, color: 'var(--text-tertiary)', lineHeight: 1 }}>
                        {val}
                      </span>
                    )}
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

      {/* Context menu backdrop */}
      {contextMenu && (
        <div
          className="fixed inset-0"
          style={{ zIndex: 55 }}
          onClick={closeContextMenu}
        />
      )}

      {/* Context menu card */}
      {contextMenu && (
        <div
          className="fixed rounded-xl overflow-hidden"
          style={{
            zIndex: 60,
            top: Math.min(contextMenu.y, (typeof window !== 'undefined' ? window.innerHeight : 600) - 180),
            left: Math.min(contextMenu.x, (typeof window !== 'undefined' ? window.innerWidth : 400) - 170),
            background: 'var(--surface)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            minWidth: 160,
          }}
          onClick={e => e.stopPropagation()}
        >
          <div className="px-3 py-2 text-xs font-semibold" style={{ color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border-subtle)' }}>
            Ziua {contextMenu.day}
          </div>
          {ZL_PRESETS.map(v => (
            <button
              key={v}
              onClick={() => { onToggle(contextMenu.day, v); closeContextMenu(); }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '8px 12px', background: 'transparent', border: 'none',
                color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {v}h
            </button>
          ))}
          <button
            onClick={() => {
              setOverrideDay(contextMenu.day);
              setCustomInput('');
              setShowCustom(true);
              closeContextMenu();
            }}
            style={{
              display: 'block', width: '100%', textAlign: 'left',
              padding: '8px 12px', background: 'transparent', border: 'none',
              color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            Altul…
          </button>
          <button
            onClick={() => { onToggle(contextMenu.day, ''); closeContextMenu(); }}
            style={{
              display: 'block', width: '100%', textAlign: 'left',
              padding: '8px 12px', background: 'transparent',
              borderTop: '1px solid var(--border-subtle)',
              color: 'var(--danger)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            Șterge
          </button>
        </div>
      )}

      {/* Custom hours dialog */}
      {showCustom && (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ zIndex: 65, background: 'rgba(0,0,0,0.5)' }}
          onClick={() => { setShowCustom(false); setCustomInput(''); setOverrideDay(null); }}
        >
          <div
            className="rounded-2xl p-5"
            style={{
              background: 'var(--surface)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              width: 240,
              maxWidth: '90vw',
            }}
            onClick={e => e.stopPropagation()}
          >
            <p className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>Ore lucrate</p>
            {overrideDay !== null && (
              <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>Ziua {overrideDay}</p>
            )}
            <input
              type="number"
              min={1}
              max={48}
              value={customInput}
              onChange={e => setCustomInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCustomConfirm(); }}
              placeholder="1–48"
              autoFocus
              className="w-full rounded-lg px-3 py-2 text-sm mb-3"
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                outline: 'none',
                marginTop: 8,
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setShowCustom(false); setCustomInput(''); setOverrideDay(null); }}
                className="flex-1 text-sm py-2 rounded-lg"
                style={{ background: 'var(--surface-2)', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                Anulează
              </button>
              <button
                onClick={handleCustomConfirm}
                className="flex-1 text-sm py-2 rounded-lg btn-primary"
                style={{ minHeight: 36 }}
              >
                Setează
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

