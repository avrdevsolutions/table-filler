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
  '24': { color: 'var(--accent)', fontWeight: 700 },
  'CO': { color: 'var(--success)', fontWeight: 700 },
  'X':  { color: 'var(--danger)', fontWeight: 700 },
  'D':  { color: '#6e6e73', fontWeight: 600 },
  'E':  { color: '#6e6e73', fontWeight: 600 },
  'M':  { color: '#6e6e73', fontWeight: 600 },
  'I':  { color: '#6e6e73', fontWeight: 600 },
  'S':  { color: '#6e6e73', fontWeight: 600 },
};

const cellBg: Record<string, string> = {
  '24': 'rgba(10,132,255,0.11)',
  'CO': 'rgba(50,215,75,0.11)',
  'X':  'rgba(255,69,58,0.11)',
  'D':  'rgba(110,110,115,0.07)',
  'E':  'rgba(110,110,115,0.07)',
  'M':  'rgba(110,110,115,0.07)',
  'I':  'rgba(110,110,115,0.07)',
  'S':  'rgba(110,110,115,0.07)',
};

const WEEKEND_BG = 'rgba(255,214,10,0.04)';

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
                borderBottom: '1px solid var(--border)',
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
              {/* Day columns */}
              {daysArr.map(d => (
                <th key={d} style={{
                  borderBottom: '1px solid var(--border)',
                  borderRight: '1px solid var(--border-subtle)',
                  padding: '6px 2px',
                  textAlign: 'center',
                  width: 36,
                  minWidth: 36,
                  background: isWeekend(d) ? 'rgba(255,214,10,0.06)' : 'var(--surface-2)',
                  userSelect: 'none',
                }}>
                  <div style={{ fontWeight: 700, fontSize: '0.75rem', color: isWeekend(d) ? 'var(--text-secondary)' : 'var(--text-primary)' }}>{d}</div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)', marginTop: 1 }}>{getDow(d)}</div>
                </th>
              ))}
              {/* Total column */}
              <th style={{
                position: 'sticky', right: 0, zIndex: 20,
                background: 'var(--surface-2)',
                borderBottom: '1px solid var(--border)',
                borderLeft: '1px solid var(--border)',
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
              const rowBg = idx % 2 === 0 ? '#1c1c1e' : '#2a2a2e';

              return (
                <tr key={emp.id} style={{ background: rowBg }}>
                  {/* Name + actions cell */}
                  <td style={{
                    position: 'sticky', left: 0, zIndex: 10,
                    background: rowBg,
                    borderBottom: '1px solid var(--border)',
                    borderRight: '1px solid var(--border)',
                    padding: '8px 12px',
                    minWidth: 180,
                  }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                      {/* Reorder arrows */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, flexShrink: 0, paddingTop: 2 }}>
                        <button
                          onClick={() => moveEmployee(idx, -1)}
                          disabled={idx === 0}
                          style={{
                            background: 'transparent', color: 'var(--text-tertiary)',
                            padding: '1px 3px', borderRadius: 3,
                            fontSize: '0.6rem', fontWeight: 600,
                            border: 'none', cursor: idx === 0 ? 'not-allowed' : 'pointer',
                            opacity: idx === 0 ? 0.2 : 0.55,
                            lineHeight: 1, outline: 'none',
                          }}
                        >▲</button>
                        <button
                          onClick={() => moveEmployee(idx, 1)}
                          disabled={idx === orderedEmployees.length - 1}
                          style={{
                            background: 'transparent', color: 'var(--text-tertiary)',
                            padding: '1px 3px', borderRadius: 3,
                            fontSize: '0.6rem', fontWeight: 600,
                            border: 'none', cursor: idx === orderedEmployees.length - 1 ? 'not-allowed' : 'pointer',
                            opacity: idx === orderedEmployees.length - 1 ? 0.2 : 0.55,
                            lineHeight: 1, outline: 'none',
                          }}
                        >▼</button>
                      </div>
                      {/* Name + action chips */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
                        <span style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 130 }}>
                          {emp.fullName}
                        </span>
                        <div style={{ display: 'flex', gap: 3 }}>
                          <button
                            onClick={() => setPopup({ employeeId: emp.id, mode: 'ZL' })}
                            style={{ background: 'rgba(10,132,255,0.13)', color: 'var(--accent)', padding: '2px 7px', borderRadius: 5, fontSize: '0.65rem', fontWeight: 700, border: 'none', cursor: 'pointer', outline: 'none' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(10,132,255,0.24)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(10,132,255,0.13)')}
                          >ZL</button>
                          <button
                            onClick={() => setPopup({ employeeId: emp.id, mode: 'CO' })}
                            style={{ background: 'rgba(50,215,75,0.13)', color: 'var(--success)', padding: '2px 7px', borderRadius: 5, fontSize: '0.65rem', fontWeight: 700, border: 'none', cursor: 'pointer', outline: 'none' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(50,215,75,0.24)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(50,215,75,0.13)')}
                          >CO</button>
                          <button
                            onClick={() => setPopup({ employeeId: emp.id, mode: 'X' })}
                            style={{ background: 'rgba(255,69,58,0.13)', color: 'var(--danger)', padding: '2px 7px', borderRadius: 5, fontSize: '0.65rem', fontWeight: 700, border: 'none', cursor: 'pointer', outline: 'none' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,69,58,0.24)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,69,58,0.13)')}
                          >X</button>
                          <button
                            onClick={() => setDemisieDialog({ employeeId: emp.id })}
                            style={{ background: 'rgba(255,214,10,0.12)', color: 'var(--warning)', padding: '2px 7px', borderRadius: 5, fontSize: '0.65rem', fontWeight: 700, border: 'none', cursor: 'pointer', outline: 'none' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,214,10,0.22)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,214,10,0.12)')}
                          >D</button>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Day cells */}
                  {daysArr.map(d => {
                    const val = demisie[d] || cells[d] || '';
                    const style = cellValueStyle[val] ?? {};
                    const bg = cellBg[val] ?? (isWeekend(d) ? WEEKEND_BG : 'transparent');
                    return (
                      <td key={d} style={{
                        borderBottom: '1px solid var(--border)',
                        borderRight: '1px solid var(--border-subtle)',
                        textAlign: 'center',
                        padding: '8px 2px',
                        width: 36,
                        background: bg,
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
                    borderBottom: '1px solid var(--border)',
                    borderLeft: '1px solid var(--border)',
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

