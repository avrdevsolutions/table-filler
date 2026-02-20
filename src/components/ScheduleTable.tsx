import { MONTHS_RO, getDaysInMonth, getDemisieCells, calcTotal, countCO, formatDateRO } from '@/lib/schedule';
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

  const coList = orderedEmployees.filter(emp => countCO(cellMap[emp.id] ?? {}) > 0);
  const demisieList = orderedEmployees.filter(emp => emp.terminationDate);

  function getDow(day: number): string {
    return ['D', 'L', 'M', 'Mi', 'J', 'V', 'S'][new Date(year, month - 1, day).getDay()];
  }
  function isWeekend(day: number): boolean {
    const d = new Date(year, month - 1, day).getDay();
    return d === 0 || d === 6;
  }

  // ── Layout maths for exactly 1920 × 1080 ─────────────────────────────────
  const W = 1920;
  const H = 1080;
  const PAD = 18;                          // outer padding (both sides)
  const TITLE_H = 78;                      // title + subtitle + location block
  const HEADER_H = 44;                     // thead row height
  const HAS_FOOTNOTES = coList.length > 0 || demisieList.length > 0;
  const FOOTNOTE_H = HAS_FOOTNOTES ? 92 : 0;
  // height available for all data rows
  const TABLE_BODY_H = H - PAD * 2 - TITLE_H - 8 - HEADER_H - FOOTNOTE_H - 4;
  const numRows = Math.max(1, orderedEmployees.length);
  const rowH = Math.floor(TABLE_BODY_H / numRows);
  const fontSize = Math.min(16, Math.max(10, Math.floor(rowH * 0.30)));

  // Column widths
  const innerW = W - PAD * 2;
  const NAME_COL = 180;
  const TOTAL_COL = 62;
  const dayColW = Math.floor((innerW - NAME_COL - TOTAL_COL) / days);

  return (
    <div style={{
      width: W, height: H,
      backgroundColor: 'white',
      padding: PAD,
      fontFamily: 'Arial, Helvetica, sans-serif',
      boxSizing: 'border-box',
      overflow: 'hidden',
    }}>
      {/* ── Title block ── */}
      <div style={{
        height: TITLE_H,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 8,
      }}>
        <div style={{ fontSize: 20, fontWeight: 'bold', letterSpacing: 2 }}>
          PLANIFICAREA SERVICIILOR
        </div>
        <div style={{ fontSize: 14, marginTop: 4 }}>
          pe luna <strong>{MONTHS_RO[month - 1]}</strong> {year}
        </div>
        <div style={{ fontSize: 12, marginTop: 3, color: '#555' }}>
          {locationName || plan.locationName}
        </div>
      </div>

      {/* ── Schedule table ── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: NAME_COL }} />
          {daysArr.map(d => <col key={d} style={{ width: dayColW }} />)}
          <col style={{ width: TOTAL_COL }} />
        </colgroup>
        <thead>
          <tr style={{ height: HEADER_H }}>
            <th style={{
              border: '1px solid #444', padding: '3px 6px',
              textAlign: 'left', backgroundColor: '#d1d5db',
              fontSize: 12, fontWeight: 'bold',
            }}>Angajat</th>
            {daysArr.map(d => (
              <th key={d} style={{
                border: '1px solid #444', padding: '2px 1px', textAlign: 'center',
                backgroundColor: isWeekend(d) ? '#fbbf24' : '#d1d5db',
                fontSize: 10,
              }}>
                <div style={{ fontWeight: 'bold', lineHeight: '1.3' }}>{d}</div>
                <div style={{ fontSize: 8, fontWeight: 'normal', color: '#555', lineHeight: '1' }}>{getDow(d)}</div>
              </th>
            ))}
            <th style={{
              border: '1px solid #444', padding: '2px 3px',
              textAlign: 'center', backgroundColor: '#d1d5db',
              fontSize: 11, fontWeight: 'bold',
            }}>TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {orderedEmployees.map((emp, idx) => {
            const cells = cellMap[emp.id] ?? {};
            const demisie = emp.terminationDate
              ? getDemisieCells(emp.terminationDate, year, month)
              : {};
            const total = calcTotal(cells);
            return (
              <tr key={emp.id} style={{
                height: rowH,
                backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f3f4f6',
              }}>
                <td style={{
                  border: '1px solid #bbb', padding: '2px 6px',
                  fontWeight: 600, fontSize,
                  overflow: 'hidden', whiteSpace: 'nowrap',
                  verticalAlign: 'middle',
                }}>{emp.fullName}</td>

                {daysArr.map(d => {
                  const val = demisie[d] || cells[d] || '';
                  const isDem = !!demisie[d];
                  return (
                    <td key={d} style={{
                      border: '1px solid #ccc', textAlign: 'center', fontSize,
                      verticalAlign: 'middle',
                      backgroundColor: isDem ? '#9ca3af' : isWeekend(d) ? '#fef3c7' : undefined,
                      color: val === 'CO' ? '#065f46'
                        : val === 'X' ? '#dc2626'
                        : isDem ? '#374151'
                        : '#111827',
                      fontWeight: val ? 600 : 400,
                    }}>{val}</td>
                  );
                })}

                <td style={{
                  border: '1px solid #bbb', textAlign: 'center',
                  fontWeight: 'bold', fontSize: Math.min(fontSize + 2, 18),
                  verticalAlign: 'middle',
                  color: total ? '#1e3a8a' : '#e5e7eb',
                }}>{total || ''}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* ── Footnotes ── */}
      {HAS_FOOTNOTES && (
        <div style={{ marginTop: 12, display: 'flex', gap: 60, fontSize: 12 }}>
          {coList.length > 0 && (
            <div>
              <div style={{ fontWeight: 'bold', marginBottom: 4, fontSize: 13 }}>
                Concediu de odihnă:
              </div>
              {coList.map(emp => (
                <div key={emp.id} style={{ marginBottom: 2 }}>
                  {emp.fullName} — {countCO(cellMap[emp.id] ?? {})} zile
                </div>
              ))}
            </div>
          )}
          {demisieList.length > 0 && (
            <div>
              <div style={{ fontWeight: 'bold', marginBottom: 4, fontSize: 13 }}>Demisie:</div>
              {demisieList.map(emp => {
                if (!emp.terminationDate) return null;
                return (
                  <div key={emp.id} style={{ marginBottom: 2 }}>
                    {emp.fullName} — începând cu {formatDateRO(emp.terminationDate)}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
