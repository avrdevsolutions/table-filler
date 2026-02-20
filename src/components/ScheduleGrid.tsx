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
      <div className="overflow-x-auto">
        <table className="border-collapse text-xs min-w-max">
          <thead>
            <tr className="bg-gray-100">
              <th className="sticky left-0 z-10 bg-gray-100 border border-gray-300 px-2 py-1 text-left min-w-[180px]">Angajat</th>
              <th className="border border-gray-300 px-1 py-1 min-w-[90px] text-center bg-gray-100">Acțiuni</th>
              {daysArr.map(d => (
                <th key={d} className={`border border-gray-300 px-1 py-1 w-8 text-center ${isWeekend(d) ? 'bg-yellow-100' : 'bg-gray-100'}`}>
                  <div>{d}</div>
                  <div className="text-gray-400 text-[9px]">{getDow(d)}</div>
                </th>
              ))}
              <th className="sticky right-0 bg-gray-100 border border-gray-300 px-2 py-1 text-center min-w-[56px]">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {orderedEmployees.map((emp, idx) => {
              const cells = cellMap[emp.id] ?? {};
              const demisie = emp.terminationDate ? getDemisieCells(emp.terminationDate, year, month) : {};
              const total = calcTotal(cells);
              return (
                <tr key={emp.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="sticky left-0 z-10 bg-inherit border border-gray-300 px-2 py-1 font-medium whitespace-nowrap">
                    {emp.fullName}
                  </td>
                  <td className="border border-gray-300 px-1 py-1">
                    <div className="flex gap-1 flex-wrap justify-center">
                      <button onClick={() => setPopup({ employeeId: emp.id, mode: 'ZL' })} className="bg-blue-100 hover:bg-blue-200 text-blue-800 px-1 py-0.5 rounded text-[10px] font-medium">ZL</button>
                      <button onClick={() => setPopup({ employeeId: emp.id, mode: 'CO' })} className="bg-green-100 hover:bg-green-200 text-green-800 px-1 py-0.5 rounded text-[10px] font-medium">CO</button>
                      <button onClick={() => setPopup({ employeeId: emp.id, mode: 'X' })} className="bg-red-100 hover:bg-red-200 text-red-800 px-1 py-0.5 rounded text-[10px] font-medium">X</button>
                      <button onClick={() => setDemisieDialog({ employeeId: emp.id })} className="bg-orange-100 hover:bg-orange-200 text-orange-800 px-1 py-0.5 rounded text-[10px] font-medium">D</button>
                      <button onClick={() => moveEmployee(idx, -1)} disabled={idx === 0} className="text-gray-400 hover:text-gray-700 disabled:opacity-20 px-0.5">↑</button>
                      <button onClick={() => moveEmployee(idx, 1)} disabled={idx === orderedEmployees.length - 1} className="text-gray-400 hover:text-gray-700 disabled:opacity-20 px-0.5">↓</button>
                    </div>
                  </td>
                  {daysArr.map(d => {
                    const val = demisie[d] || cells[d] || '';
                    return (
                      <td key={d} className={`border border-gray-200 text-center py-1 w-8 ${demisie[d] ? 'bg-gray-200 text-gray-500' : isWeekend(d) ? 'bg-yellow-50' : ''}`}>
                        <span className={val === 'CO' ? 'text-green-600 font-medium' : val === 'X' ? 'text-red-500 font-medium' : val === '24' ? 'text-blue-700 font-medium' : 'text-gray-500 font-medium'}>
                          {val}
                        </span>
                      </td>
                    );
                  })}
                  <td className="sticky right-0 bg-inherit border border-gray-300 px-2 py-1 text-center font-bold text-blue-800">
                    {total || ''}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footnotes */}
      <div className="mt-4 flex gap-8 flex-wrap text-sm">
        {(() => {
          const coItems = orderedEmployees.filter(emp => countCO(cellMap[emp.id] ?? {}) > 0);
          return coItems.length > 0 ? (
            <div>
              <p className="font-semibold mb-1">Concediu de odihnă:</p>
              {coItems.map(emp => (
                <p key={emp.id} className="text-gray-700">{emp.fullName} — {countCO(cellMap[emp.id] ?? {})} zile</p>
              ))}
            </div>
          ) : null;
        })()}
        {(() => {
          const demItems = orderedEmployees.filter(emp => emp.terminationDate);
          return demItems.length > 0 ? (
            <div>
              <p className="font-semibold mb-1">Demisie:</p>
              {demItems.map(emp => {
                if (!emp.terminationDate) return null;
                return (
                  <p key={emp.id} className="text-gray-700">
                    {emp.fullName} — începând cu {formatDateRO(emp.terminationDate)}
                  </p>
                );
              })}
            </div>
          ) : null;
        })()}
      </div>

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
          onConfirm={date => {
            onEmployeeUpdate(demisieEmployee.id, { terminationDate: date });
            // Clear shift cells that fall within the demisie period
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
