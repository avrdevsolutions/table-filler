'use client';
import { useState } from 'react';
import { getDaysInMonth } from '@/lib/schedule';

interface Props {
  year: number;
  month: number;
  employeeName: string;
  currentDate?: string | null;
  currentCells?: Record<number, string>;
  onConfirm: (date: string | null) => void;
  onClose: () => void;
}

export default function DemisieDialog({ year, month, employeeName, currentDate, currentCells, onConfirm, onClose }: Props) {
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
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: 'var(--surface)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 8px 20px rgba(0,0,0,0.4)',
          width: 300,
          maxWidth: '95vw',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Demisie</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{employeeName}</p>
            </div>
            <button
              onClick={onClose}
              className="flex items-center justify-center w-7 h-7 rounded-full"
              style={{ color: 'var(--text-tertiary)', background: 'var(--surface-2)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--border)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface-2)')}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4">
          <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
            Selectează ziua de începere a demisiei:
          </p>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: days }, (_, i) => i + 1).map(day => {
              const isSelected = selectedDay === day;
              // Gray out days that already have a schedule value (ZL/CO/X), same as CalendarPopup
              const existingVal = currentCells?.[day] ?? '';
              const hasValue = existingVal !== '';

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className="text-xs font-medium rounded-lg transition-all duration-100"
                  style={{
                    height: 34,
                    background: isSelected
                      ? 'var(--warning)'
                      : hasValue
                      ? 'var(--surface-2)'
                      : 'var(--surface-2)',
                    color: isSelected
                      ? '#1a1a1a'   /* dark text on --warning yellow for strong contrast */
                      : hasValue
                      ? 'var(--text-tertiary)'
                      : 'var(--text-primary)',
                    border: isSelected
                      ? 'none'
                      : hasValue
                      ? '1px solid var(--border-subtle)'
                      : '1px solid var(--border)',
                    opacity: hasValue && !isSelected ? 0.45 : 1,
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => {
                    if (!isSelected) e.currentTarget.style.background = 'var(--warning-light)';
                  }}
                  onMouseLeave={e => {
                    if (!isSelected) e.currentTarget.style.background = 'var(--surface-2)';
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>
          {/* Legend */}
          {currentCells && Object.values(currentCells).some(v => v !== '') && (
            <p className="text-xs mt-3" style={{ color: 'var(--text-tertiary)' }}>
              Zilele estompate au valori deja setate (ZL/CO/X).
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 pb-4 flex items-center gap-2" style={{ paddingTop: 0 }}>
          {currentDate && (
            <button
              onClick={() => onConfirm(null)}
              className="text-xs font-medium mr-auto"
              style={{ color: 'var(--danger)' }}
            >
              Elimină demisia
            </button>
          )}
          <button onClick={onClose} className="btn-ghost text-xs px-4 py-2" style={{ minHeight: 36 }}>
            Anulează
          </button>
          <button
            onClick={handleConfirm}
            className="text-xs font-semibold px-4 py-2 rounded-lg transition-colors duration-150"
            style={{ background: 'var(--warning)', color: '#1a1a1a', minHeight: 36, fontWeight: 700 }}
            onMouseEnter={e => (e.currentTarget.style.background = '#e6c000')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--warning)')}
          >
            Confirmă
          </button>
        </div>
      </div>
    </div>
  );
}

