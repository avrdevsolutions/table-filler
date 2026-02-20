'use client';
import { useState, useCallback } from 'react';
import { getDaysInMonth, getDemisieCells, calcTotal, countCO, formatDateRO } from '@/lib/schedule';
import type { MonthPlan, Employee, Cell } from '@/types';
import CalendarPopup from './CalendarPopup';
import DemisieDialog from './DemisieDialog';

interface Props {
  plan: MonthPlan;
  employees: Employee[];
  onCellsChange: (employeeId: string, updates: Record<number, string>) => void;
  onEmployeeUpdate: (id: string, data: Partial<Employee>) => void;
  onEmployeeReorder: (ids: string[]) => void;
}

type PopupMode = 'ZL' | 'CO' | 'X';
interface ActivePopup { employeeId: string; mode: PopupMode; }
interface ActiveDemisie { employeeId: string; }

const cellValueStyle: Record<string, React.CSSProperties> = {
  '24': { color: '#0071e3', fontWeight: 700 },
  'CO': { color: '#1a7f3c', fontWeight: 700 },
  'X':  { color: '#c2410c', fontWeight: 700 },
  'D':  { color: '#6e6e73', fontWeight: 600 },
  'E':  { color: '#6e6e73', fontWeight: 600 },
  'M':  { color: '#6e6e73', fontWeight: 600 },
  'I':  { color: '#6e6e73', fontWeight: 600 },
  'S':  { color: '#6e6e73', fontWeight: 600 },
};

export default function ScheduleGrid({ plan, employees, onCellsChange, onEmployeeUpdate, onEmployeeReorder }: Props) {
  const { month, year } = plan;
  const days = getDaysInMonth(year, month);
  const daysArr = Array.from({ length: days }, (_, i) => i + 1);
  const [popup, setPopup] = useState<ActivePopup | null>(null);
  const [demisieDialog, setDemisieDialog] = useState<ActiveDemisie | null>(null);

  const employeeIds: string[] = JSON.parse(plan.employeeIds || '[]');
  const orderedEmployees = employeeIds
    .map(id => employees.find(e => e.id === id))
    .filter(Boolean) as Employee[];

  const cellMap: Record<string, Record<number, string>> = {};
  plan.cells.forEach((c: Cell) => {
    if (!cellMap[c.employeeId]) cellMap[c.employeeId] = {};
    cellMap[c.employeeId][c.day] = c.value;
  });

  function getDow(day: number): string {
    const d = new Date(year, month - 1, day).getDay();
    return ['D','L','M','Mi','J','V','S'][d];
  }
  function isWeekend(day: number): boolean {
    const d = new Date(year, month - 1, day).getDay();
    return d === 0 || d === 6;
  }

  const handleToggle = useCallback((employeeId: string, mode: PopupMode, day: number) => {
    const cells = { ...(cellMap[employeeId] ?? {}) };
    const current = cells[day] ?? '';
    if (mode === 'ZL') cells[day] = current === '24' ? '' : '24';
    else if (mode === 'CO') cells[day] = current === 'CO' ? '' : 'CO';
    else if (mode === 'X') cells[day] = current === 'X' ? '' : 'X';
    onCellsChange(employeeId, { [day]: cells[day] });
  }, [cellMap, onCellsChange]);

  function moveEmployee(idx: number, dir: -1 | 1) {
    const newIds = [...employeeIds];
    const target = idx + dir;
    if (target < 0 || target >= newIds.length) return;
    [newIds[idx], newIds[target]] = [newIds[target], newIds[idx]];
    onEmployeeReorder(newIds);
  }

  const popupEmployee = popup ? employees.find(e => e.id === popup.employeeId) : null;
  const demisieEmployee = demisieDialog ? employees.find(e => e.id === demisieDialog.employeeId) : null;

  return (
    <div className="relative">
      {/* ── Schedule table ── */}
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <table
          style={{
            borderCollapse: 'collapse',
            fontSize: '0.75rem',
            minWidth: 'max-content',
            width: '100%',
          }}
        >
          <thead>
            <tr style={{ background: 'var(--surface-2)' }}>
              {/* Name column */}
              <th style={{
                position: 'sticky', left: 0, zIndex: 20,
                background: 'var(--surface-2)',
                borderBottom: '2px solid var(--border)',
                borderRight: '1px solid var(--border-subtle)',
                padding: '10px 16px',
                textAlign: 'left',
                fontSize: '0.7rem',
                fontWeight: 700,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                color: 'var(--text-secondary)',
                minWidth: 180,
                whiteSpace: 'nowrap',
              }}>
                Angajat
              </th>
              {/* Actions column */}
              <th style={{
                position: 'sticky', left: 180, zIndex: 20,
                background: 'var(--surface-2)',
                borderBottom: '2px solid var(--border)',
                borderRight: '2px solid var(--border)',
                padding: '10px 12px',
                fontSize: '0.7rem',
                fontWeight: 700,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                color: 'var(--text-secondary)',
                minWidth: 120,
                textAlign: 'center',
                whiteSpace: 'nowrap',
              }}>
                Acțiuni
              </th>
              {/* Day columns */}
              {daysArr.map(d => (
                <th key={d} style={{
                  borderBottom: '2px solid var(--border)',
                  borderRight: '1px solid var(--border-subtle)',
                  padding: '6px 2px',
                  textAlign: 'center',
                  width: 36,
                  minWidth: 36,
                  background: isWeekend(d) ? '#fef3e8' : 'var(--surface-2)',
                  userSelect: 'none',
                }}>
                  <div style={{ fontWeight: 700, fontSize: '0.75rem', color: isWeekend(d) ? '#b45309' : 'var(--text-primary)' }}>{d}</div>
                  <div style={{ fontSize: '0.6rem', color: isWeekend(d) ? '#d97706' : 'var(--text-tertiary)', marginTop: 1 }}>{getDow(d)}</div>
                </th>
              ))}
              {/* Total column */}
              <th style={{
                position: 'sticky', right: 0, zIndex: 20,
                background: 'var(--surface-2)',
                borderBottom: '2px solid var(--border)',
                borderLeft: '2px solid var(--border)',
                padding: '10px 12px',
                textAlign: 'center',
                fontSize: '0.7rem',
                fontWeight: 700,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                color: 'var(--text-secondary)',
                minWidth: 60,
                whiteSpace: 'nowrap',
              }}>
                Total
              </th>
            </tr>
          </thead>

          <tbody>
            {orderedEmployees.map((emp, idx) => {
              const cells = cellMap[emp.id] ?? {};
              const demisie = emp.terminationDate ? getDemisieCells(emp.terminationDate, year, month) : {};
              const total = calcTotal(cells);
              const rowBg = idx % 2 === 0 ? 'var(--surface)' : 'var(--surface-2)';

              return (
                <tr key={emp.id} style={{ background: rowBg }}>
                  {/* Name cell */}
                  <td style={{
                    position: 'sticky', left: 0, zIndex: 10,
                    background: rowBg,
                    borderBottom: '1px solid var(--border-subtle)',
                    borderRight: '1px solid var(--border-subtle)',
                    padding: '10px 16px',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    whiteSpace: 'nowrap',
                    color: 'var(--text-primary)',
                  }}>
                    <div className="flex items-center gap-2">
                      <div style={{
                        width: 28, height: 28,
                        borderRadius: '50%',
                        background: 'var(--accent-light)',
                        color: 'var(--accent)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.7rem', fontWeight: 700,
                        flexShrink: 0,
                      }}>
                        {emp.fullName.charAt(0).toUpperCase()}
                      </div>
                      <span>{emp.fullName}</span>
                    </div>
                  </td>

                  {/* Actions cell */}
                  <td style={{
                    position: 'sticky', left: 180, zIndex: 10,
                    background: rowBg,
                    borderBottom: '1px solid var(--border-subtle)',
                    borderRight: '2px solid var(--border)',
                    padding: '6px 8px',
                  }}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
                      {/* ZL */}
                      <button
                        onClick={() => setPopup({ employeeId: emp.id, mode: 'ZL' })}
                        style={{
                          background: '#e8f3ff', color: '#0071e3',
                          padding: '4px 8px', borderRadius: 6,
                          fontSize: '0.7rem', fontWeight: 700,
                          border: 'none', cursor: 'pointer',
                          transition: 'background 150ms',
                          whiteSpace: 'nowrap',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#c8e0ff')}
                        onMouseLeave={e => (e.currentTarget.style.background = '#e8f3ff')}
                      >ZL</button>
                      {/* CO */}
                      <button
                        onClick={() => setPopup({ employeeId: emp.id, mode: 'CO' })}
                        style={{
                          background: '#dcf5e4', color: '#1a7f3c',
                          padding: '4px 8px', borderRadius: 6,
                          fontSize: '0.7rem', fontWeight: 700,
                          border: 'none', cursor: 'pointer',
                          transition: 'background 150ms',
                          whiteSpace: 'nowrap',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#b8e8c9')}
                        onMouseLeave={e => (e.currentTarget.style.background = '#dcf5e4')}
                      >CO</button>
                      {/* X */}
                      <button
                        onClick={() => setPopup({ employeeId: emp.id, mode: 'X' })}
                        style={{
                          background: '#fff0eb', color: '#c2410c',
                          padding: '4px 8px', borderRadius: 6,
                          fontSize: '0.7rem', fontWeight: 700,
                          border: 'none', cursor: 'pointer',
                          transition: 'background 150ms',
                          whiteSpace: 'nowrap',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#fdd9c8')}
                        onMouseLeave={e => (e.currentTarget.style.background = '#fff0eb')}
                      >X</button>
                      {/* Demisie */}
                      <button
                        onClick={() => setDemisieDialog({ employeeId: emp.id })}
                        style={{
                          background: 'var(--warning-light)', color: '#92400e',
                          padding: '4px 8px', borderRadius: 6,
                          fontSize: '0.7rem', fontWeight: 700,
                          border: 'none', cursor: 'pointer',
                          transition: 'background 150ms',
                          whiteSpace: 'nowrap',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#fde68a')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'var(--warning-light)')}
                      >D</button>
                      {/* Move up/down */}
                      <button
                        onClick={() => moveEmployee(idx, -1)}
                        disabled={idx === 0}
                        style={{
                          background: 'transparent', color: 'var(--text-tertiary)',
                          padding: '4px 5px', borderRadius: 6,
                          fontSize: '0.75rem', fontWeight: 600,
                          border: 'none', cursor: idx === 0 ? 'not-allowed' : 'pointer',
                          opacity: idx === 0 ? 0.25 : 1,
                          transition: 'color 150ms',
                        }}
                      >↑</button>
                      <button
                        onClick={() => moveEmployee(idx, 1)}
                        disabled={idx === orderedEmployees.length - 1}
                        style={{
                          background: 'transparent', color: 'var(--text-tertiary)',
                          padding: '4px 5px', borderRadius: 6,
                          fontSize: '0.75rem', fontWeight: 600,
                          border: 'none', cursor: idx === orderedEmployees.length - 1 ? 'not-allowed' : 'pointer',
                          opacity: idx === orderedEmployees.length - 1 ? 0.25 : 1,
                          transition: 'color 150ms',
                        }}
                      >↓</button>
                    </div>
                  </td>

                  {/* Day cells */}
                  {daysArr.map(d => {
                    const val = demisie[d] || cells[d] || '';
                    const isDem = !!demisie[d];
                    const style = cellValueStyle[val] ?? {};
                    return (
                      <td key={d} style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        borderRight: '1px solid var(--border-subtle)',
                        textAlign: 'center',
                        padding: '8px 2px',
                        width: 36,
                        background: isDem
                          ? 'rgba(110,110,115,0.08)'
                          : isWeekend(d)
                          ? 'rgba(255,159,10,0.05)'
                          : 'transparent',
                        fontSize: '0.75rem',
                        ...style,
                      }}>
                        {val}
                      </td>
                    );
                  })}

                  {/* Total cell */}
                  <td style={{
                    position: 'sticky', right: 0, zIndex: 10,
                    background: rowBg,
                    borderBottom: '1px solid var(--border-subtle)',
                    borderLeft: '2px solid var(--border)',
                    padding: '10px 12px',
                    textAlign: 'center',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    color: total ? 'var(--accent)' : 'var(--border)',
                    whiteSpace: 'nowrap',
                  }}>
                    {total || '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Footnotes ── */}
      {(() => {
        const coItems = orderedEmployees.filter(emp => countCO(cellMap[emp.id] ?? {}) > 0);
        const demItems = orderedEmployees.filter(emp => emp.terminationDate);
        if (coItems.length === 0 && demItems.length === 0) return null;
        return (
          <div style={{
            marginTop: 0,
            padding: '16px 20px',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex', gap: 40, flexWrap: 'wrap',
          }}>
            {coItems.length > 0 && (
              <div>
                <p style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-primary)', marginBottom: 6 }}>
                  Concediu de odihnă:
                </p>
                {coItems.map(emp => {
                  const coDays = Object.entries(cellMap[emp.id] ?? {})
                    .filter(([, v]) => v === 'CO')
                    .map(([k]) => Number(k))
                    .sort((a, b) => a - b);
                  return (
                    <p key={emp.id} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 3 }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{emp.fullName}</span>
                      {' — '}{coDays.length} zile ({coDays.join(', ')})
                    </p>
                  );
                })}
              </div>
            )}
            {demItems.length > 0 && (
              <div>
                <p style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-primary)', marginBottom: 6 }}>
                  Demisie:
                </p>
                {demItems.map(emp => {
                  if (!emp.terminationDate) return null;
                  return (
                    <p key={emp.id} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 3 }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{emp.fullName}</span>
                      {' — începând cu '}{formatDateRO(emp.terminationDate)}
                    </p>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* Calendar Popup */}
      {popup && popupEmployee && (
        <CalendarPopup
          year={year} month={month} mode={popup.mode}
          currentCells={cellMap[popup.employeeId] ?? {}}
          demisieDays={popupEmployee.terminationDate ? getDemisieCells(popupEmployee.terminationDate, year, month) : {}}
          onToggle={day => handleToggle(popup.employeeId, popup.mode, day)}
          onClose={() => setPopup(null)}
          employeeName={popupEmployee.fullName}
        />
      )}

      {/* Demisie Dialog */}
      {demisieDialog && demisieEmployee && (
        <DemisieDialog
          year={year} month={month}
          employeeName={demisieEmployee.fullName}
          currentDate={demisieEmployee.terminationDate}
          currentCells={cellMap[demisieEmployee.id] ?? {}}
          onConfirm={date => {
            onEmployeeUpdate(demisieEmployee.id, { terminationDate: date });
            // Clear shift cells that fall within the demisie period so the grid stays consistent
            if (date) {
              const newTermDate = new Date(date);
              const tYear = newTermDate.getFullYear();
              const tMonth = newTermDate.getMonth() + 1;
              const startDay = (tYear === year && tMonth === month) ? newTermDate.getDate() : 1;
              const shouldFill = tYear < year || (tYear === year && tMonth < month) || (tYear === year && tMonth === month);
              if (shouldFill) {
                const clearUpdates: Record<number, string> = {};
                for (let d = startDay; d <= days; d++) {
                  clearUpdates[d] = '';
                }
                if (Object.keys(clearUpdates).length > 0) {
                  onCellsChange(demisieEmployee.id, clearUpdates);
                }
              }
            }
            setDemisieDialog(null);
          }}
          onClose={() => setDemisieDialog(null)}
        />
      )}
    </div>
  );
}

