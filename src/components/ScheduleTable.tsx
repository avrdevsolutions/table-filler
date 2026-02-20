import { MONTHS_RO, getDaysInMonth, getDemisieCells, calcTotal, countCO } from '@/lib/schedule';
import type { MonthPlan, Employee, Cell } from '@/types';

interface Props {
  plan: MonthPlan;
  employees: Employee[];
  locationName?: string;
}

export default function ScheduleTable({ plan, employees, locationName }: Props) {
  const { month, year } = plan;
  const days = getDaysInMonth(year, month);
  const daysArr = Array.from({ length: days }, (_, i) => i + 1);
  const cellMap: Record<string, Record<number, string>> = {};

  plan.cells.forEach((c: Cell) => {
    if (!cellMap[c.employeeId]) cellMap[c.employeeId] = {};
    cellMap[c.employeeId][c.day] = c.value;
  });

  const employeeIds: string[] = JSON.parse(plan.employeeIds || '[]');
  const orderedEmployees = employeeIds
    .map(id => employees.find(e => e.id === id))
    .filter(Boolean) as Employee[];

  const coList = orderedEmployees.filter(emp => {
    const cells = cellMap[emp.id] ?? {};
    return countCO(cells) > 0;
  });

  const demisieList = orderedEmployees.filter(emp => emp.terminationDate);

  function getDow(day: number): string {
    const d = new Date(year, month - 1, day).getDay();
    return ['D', 'L', 'M', 'Mi', 'J', 'V', 'S'][d];
  }

  function isWeekend(day: number): boolean {
    const d = new Date(year, month - 1, day).getDay();
    return d === 0 || d === 6;
  }

  return (
    <div style={{ width: 1920, height: 1080, backgroundColor: 'white', padding: '16px', fontFamily: 'Arial, sans-serif', fontSize: 11, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 'bold' }}>PONTAJ LUNAR</div>
        <div style={{ fontSize: 12 }}>{locationName || plan.locationName} — {MONTHS_RO[month - 1]} {year}</div>
      </div>

      {/* Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #333', padding: '2px 4px', width: 160, textAlign: 'left', backgroundColor: '#e5e7eb' }}>Angajat</th>
            {daysArr.map(d => (
              <th key={d} style={{
                border: '1px solid #333', padding: '2px 2px', textAlign: 'center', width: 36,
                backgroundColor: isWeekend(d) ? '#fde68a' : '#e5e7eb'
              }}>
                <div>{d}</div>
                <div style={{ fontSize: 9, color: '#666' }}>{getDow(d)}</div>
              </th>
            ))}
            <th style={{ border: '1px solid #333', padding: '2px 4px', width: 50, textAlign: 'center', backgroundColor: '#e5e7eb' }}>TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {orderedEmployees.map((emp, idx) => {
            const cells = cellMap[emp.id] ?? {};
            const demisie = emp.terminationDate ? getDemisieCells(emp.terminationDate, year, month) : {};
            const total = calcTotal(cells);
            return (
              <tr key={emp.id} style={{ backgroundColor: idx % 2 === 0 ? 'white' : '#f9fafb' }}>
                <td style={{ border: '1px solid #ccc', padding: '2px 4px', fontWeight: 500 }}>{emp.fullName}</td>
                {daysArr.map(d => {
                  const val = demisie[d] || cells[d] || '';
                  return (
                    <td key={d} style={{
                      border: '1px solid #ccc', textAlign: 'center', padding: '2px',
                      backgroundColor: demisie[d] ? '#d1d5db' : isWeekend(d) ? '#fef3c7' : undefined,
                      color: val === 'CO' ? '#059669' : val === 'X' ? '#dc2626' : demisie[d] ? '#6b7280' : undefined,
                      fontWeight: val ? 500 : undefined,
                    }}>
                      {val}
                    </td>
                  );
                })}
                <td style={{ border: '1px solid #ccc', textAlign: 'center', fontWeight: 'bold' }}>{total || ''}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Footnotes */}
      {(coList.length > 0 || demisieList.length > 0) && (
        <div style={{ marginTop: 12, display: 'flex', gap: 40 }}>
          {coList.length > 0 && (
            <div>
              <div style={{ fontWeight: 'bold', marginBottom: 4 }}>Concediu de odihnă:</div>
              {coList.map(emp => (
                <div key={emp.id}>{emp.fullName} — {countCO(cellMap[emp.id] ?? {})} zile</div>
              ))}
            </div>
          )}
          {demisieList.length > 0 && (
            <div>
              <div style={{ fontWeight: 'bold', marginBottom: 4 }}>Demisie:</div>
              {demisieList.map(emp => {
                if (!emp.terminationDate) return null;
                const d = new Date(emp.terminationDate);
                return (
                  <div key={emp.id}>{emp.fullName} — începând cu {d.getDate().toString().padStart(2,'0')}.{(d.getMonth()+1).toString().padStart(2,'0')}.{d.getFullYear()}</div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
