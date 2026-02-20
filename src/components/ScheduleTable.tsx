import { MONTHS_RO, getDaysInMonth, getDemisieCells, calcTotal, countCO, formatDateRO } from '@/lib/schedule';
import type { MonthPlan, Employee, Cell } from '@/types';

interface Props {
  plan: MonthPlan;
  employees: Employee[];
  locationName?: string;
  businessName?: string;
}

export default function ScheduleTable({ plan, employees, locationName, businessName }: Props) {
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

  // ── Auto-sizing layout ──────────────────────────────────────────────────────
  const PAD = 20;
  const NAME_COL = 190;
  const TOTAL_COL = 66;
  const DAY_COL_W = 34;         // per day column
  const ROW_H = 34;
  const HEADER_H = 46;
  const fontSize = 11;
  const HAS_FOOTNOTES = coList.length > 0 || demisieList.length > 0;
  // Total table width: fits all days
  const tableW = NAME_COL + days * DAY_COL_W + TOTAL_COL;

  return (
    <div style={{
      display: 'inline-block',
      width: tableW + PAD * 2,
      backgroundColor: 'white',
      padding: PAD,
      fontFamily: 'Arial, Helvetica, sans-serif',
      boxSizing: 'border-box',
    }}>
      {/* ── Title block ── */}
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 10,
      }}>
        {businessName && (
          <div style={{ fontSize: 13, fontWeight: 'bold', marginBottom: 2, color: '#1e3a8a' }}>
            {businessName}
          </div>
        )}
        <div style={{ fontSize: 16, fontWeight: 'bold', letterSpacing: 2 }}>
          PLANIFICAREA SERVICIILOR
        </div>
        <div style={{ fontSize: 12, marginTop: 3 }}>
          pe luna <strong>{MONTHS_RO[month - 1]}</strong> {year}
        </div>
        {(locationName || plan.locationName) && (
          <div style={{ fontSize: 11, marginTop: 2, color: '#555' }}>
            {locationName || plan.locationName}
          </div>
        )}
      </div>

      {/* ── Schedule table ── */}
      <table style={{ width: tableW, borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: NAME_COL }} />
          {daysArr.map(d => <col key={d} style={{ width: DAY_COL_W }} />)}
          <col style={{ width: TOTAL_COL }} />
        </colgroup>
        <thead>
          <tr style={{ height: HEADER_H }}>
            <th style={{
              border: '1px solid #444', padding: '3px 6px',
              textAlign: 'left', backgroundColor: '#d1d5db',
              fontSize: 11, fontWeight: 'bold',
            }}>Angajat</th>
            {daysArr.map(d => (
              <th key={d} style={{
                border: '1px solid #444', padding: '2px 1px', textAlign: 'center',
                backgroundColor: isWeekend(d) ? '#fbbf24' : '#d1d5db',
                fontSize: 9,
              }}>
                <div style={{ fontWeight: 'bold', lineHeight: '1.3' }}>{d}</div>
                <div style={{ fontSize: 7, fontWeight: 'normal', color: '#555', lineHeight: '1' }}>{getDow(d)}</div>
              </th>
            ))}
            <th style={{
              border: '1px solid #444', padding: '2px 3px',
              textAlign: 'center', backgroundColor: '#d1d5db',
              fontSize: 10, fontWeight: 'bold',
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
                height: ROW_H,
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
                  fontWeight: 'bold', fontSize: fontSize + 1,
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
        <div style={{ marginTop: 10, display: 'flex', gap: 48, fontSize: 11 }}>
          {coList.length > 0 && (
            <div>
              <div style={{ fontWeight: 'bold', marginBottom: 3, fontSize: 12 }}>
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
              <div style={{ fontWeight: 'bold', marginBottom: 3, fontSize: 12 }}>Demisie:</div>
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

