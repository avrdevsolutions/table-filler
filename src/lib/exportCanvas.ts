/**
 * Pure canvas-based PNG export for the schedule table.
 * Does NOT use html2canvas or DOM rendering — draws directly with Canvas 2D API.
 * This guarantees correct output on any device/browser/viewport size.
 */
import {
  getDaysInMonth,
  getDemisieCells,
  calcTotal,
  countCO,
  formatDateRO,
  MONTHS_RO,
} from './schedule';
import type { MonthPlan, Employee } from '@/types';

export function buildSchedulePNG(
  plan: MonthPlan,
  employees: Employee[],
  businessName?: string,
  locationName?: string,
): string {
  const { month, year } = plan;
  const days = getDaysInMonth(year, month);
  const daysArr = Array.from({ length: days }, (_, i) => i + 1);

  // Build cell map
  const cellMap: Record<string, Record<number, string>> = {};
  plan.cells.forEach(c => {
    if (!cellMap[c.employeeId]) cellMap[c.employeeId] = {};
    cellMap[c.employeeId][c.day] = c.value;
  });

  const employeeIds: string[] = JSON.parse(plan.employeeIds || '[]');
  const orderedEmployees = employeeIds
    .map(id => employees.find(e => e.id === id))
    .filter(Boolean) as Employee[];

  const coList = orderedEmployees.filter(emp => countCO(cellMap[emp.id] ?? {}) > 0);
  const demisieList = orderedEmployees.filter(emp => emp.terminationDate);
  const HAS_FOOTNOTES = coList.length > 0 || demisieList.length > 0;

  function getDow(day: number): string {
    return ['D', 'L', 'M', 'Mi', 'J', 'V', 'S'][new Date(year, month - 1, day).getDay()];
  }
  function isWeekend(day: number): boolean {
    const d = new Date(year, month - 1, day).getDay();
    return d === 0 || d === 6;
  }

  // ── Layout constants (logical px at 1x; rendered at SCALE for HiDPI) ────────
  const SCALE = 2;
  const PAD = 28;
  const NR_W = 38;
  const NAME_W = 190;
  const DAY_W = 34;
  const TOTAL_W = 70;
  const HEADER_H = 40;
  const ROW_H = 28;
  const FONT = 'Arial, Helvetica, sans-serif';

  // Title height computation
  const titleItems: { text: string; bold: boolean; underline: boolean; size: number; align: 'left' | 'center' }[] = [];
  if (businessName) titleItems.push({ text: businessName, bold: true, underline: false, size: 13, align: 'left' });
  titleItems.push({ text: 'PLANIFICAREA  SERVICIILOR', bold: true, underline: false, size: 16, align: 'center' });
  titleItems.push({ text: `pe luna ${MONTHS_RO[month - 1]} ${year}`, bold: false, underline: true, size: 13, align: 'center' });
  if (locationName) titleItems.push({ text: locationName, bold: true, underline: false, size: 12, align: 'center' });
  const TITLE_LINE_H = 20;
  const TITLE_H = titleItems.length * TITLE_LINE_H + 8;

  const maxFootLines = Math.max(coList.length, demisieList.length);
  const FOOTNOTE_H = HAS_FOOTNOTES ? 18 + maxFootLines * 16 + 10 : 0;

  const tableW = NR_W + NAME_W + days * DAY_W + TOTAL_W;
  const canvasW = PAD * 2 + tableW;
  const tableH = HEADER_H + orderedEmployees.length * ROW_H;
  const canvasH = PAD + TITLE_H + 12 + tableH + FOOTNOTE_H + PAD;

  const canvas = document.createElement('canvas');
  canvas.width = canvasW * SCALE;
  canvas.height = canvasH * SCALE;

  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  // Use non-null assertion alias so TypeScript is happy in nested closures
  const c = ctx as CanvasRenderingContext2D;

  c.scale(SCALE, SCALE);

  // White background
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, canvasW, canvasH);

  // ── Title block ─────────────────────────────────────────────────────────────
  let ty = PAD;
  for (const item of titleItems) {
    const fontStr = `${item.bold ? 'bold ' : ''}${item.size}px ${FONT}`;
    c.font = fontStr;
    c.fillStyle = '#111111';
    const tx = item.align === 'left' ? PAD : canvasW / 2;
    c.textAlign = item.align === 'left' ? 'left' : 'center';
    c.fillText(item.text, tx, ty + item.size);
    if (item.underline) {
      const w = c.measureText(item.text).width;
      const cx = item.align === 'left' ? PAD + w / 2 : canvasW / 2;
      c.strokeStyle = '#111111';
      c.lineWidth = 0.8;
      c.beginPath();
      c.moveTo(cx - w / 2, ty + item.size + 2);
      c.lineTo(cx + w / 2, ty + item.size + 2);
      c.stroke();
    }
    ty += TITLE_LINE_H;
  }

  // ── Table ───────────────────────────────────────────────────────────────────
  const tableX = PAD;
  const tableY = PAD + TITLE_H + 12;

  function drawCell(x: number, y: number, w: number, h: number, bg: string) {
    c.fillStyle = bg;
    c.fillRect(x, y, w, h);
    c.strokeStyle = '#555555';
    c.lineWidth = 0.5;
    c.strokeRect(x + 0.25, y + 0.25, w - 0.5, h - 0.5);
  }

  function drawText(t: string, x: number, y: number, align: CanvasTextAlign, color: string, font: string) {
    c.font = font;
    c.fillStyle = color;
    c.textAlign = align;
    c.fillText(t, x, y);
  }

  // Header row
  let hx = tableX;
  const HEADER_BG = '#d1d5db';

  drawCell(hx, tableY, NR_W, HEADER_H, HEADER_BG);
  drawText('POST', hx + NR_W / 2, tableY + HEADER_H / 2 - 2, 'center', '#111', `bold 8px ${FONT}`);
  drawText('NR',   hx + NR_W / 2, tableY + HEADER_H / 2 + 8, 'center', '#111', `bold 8px ${FONT}`);
  hx += NR_W;

  drawCell(hx, tableY, NAME_W, HEADER_H, HEADER_BG);
  drawText('Numele și prenumele', hx + 6, tableY + HEADER_H / 2 + 4, 'left', '#111', `bold 10px ${FONT}`);
  hx += NAME_W;

  for (const d of daysArr) {
    const bg = isWeekend(d) ? '#fbbf24' : HEADER_BG;
    drawCell(hx, tableY, DAY_W, HEADER_H, bg);
    drawText(String(d),  hx + DAY_W / 2, tableY + HEADER_H / 2 - 2, 'center', '#111', `bold 9px ${FONT}`);
    drawText(getDow(d),  hx + DAY_W / 2, tableY + HEADER_H / 2 + 9, 'center', '#555', `7px ${FONT}`);
    hx += DAY_W;
  }

  drawCell(hx, tableY, TOTAL_W, HEADER_H, HEADER_BG);
  drawText('TOTAL', hx + TOTAL_W / 2, tableY + HEADER_H / 2 + 4, 'center', '#111', `bold 9px ${FONT}`);

  // Data rows
  orderedEmployees.forEach((emp, idx) => {
    const ry = tableY + HEADER_H + idx * ROW_H;
    const cells = cellMap[emp.id] ?? {};
    const demisie = emp.terminationDate
      ? getDemisieCells(emp.terminationDate, year, month)
      : {};
    const total = calcTotal(cells);
    const rowBg = idx % 2 === 0 ? '#ffffff' : '#f3f4f6';

    let rx = tableX;

    // POST NR
    drawCell(rx, ry, NR_W, ROW_H, rowBg);
    drawText(String(idx + 1), rx + NR_W / 2, ry + ROW_H / 2 + 4, 'center', '#333', `bold 10px ${FONT}`);
    rx += NR_W;

    // Name (clipped)
    drawCell(rx, ry, NAME_W, ROW_H, rowBg);
    c.save();
    c.beginPath();
    c.rect(rx + 1, ry + 1, NAME_W - 2, ROW_H - 2);
    c.clip();
    drawText(emp.fullName, rx + 6, ry + ROW_H / 2 + 4, 'left', '#111', `bold 10px ${FONT}`);
    c.restore();
    rx += NAME_W;

    // Day cells
    for (const d of daysArr) {
      const val = demisie[d] || cells[d] || '';
      const isDem = !!demisie[d];
      const bg = isDem ? '#9ca3af' : isWeekend(d) ? '#fef3c7' : rowBg;
      drawCell(rx, ry, DAY_W, ROW_H, bg);
      if (val) {
        const color = val === 'CO' ? '#065f46'
          : val === 'X'  ? '#dc2626'
          : isDem        ? '#374151'
          : '#111827';
        drawText(val, rx + DAY_W / 2, ry + ROW_H / 2 + 4, 'center', color, `bold 10px ${FONT}`);
      }
      rx += DAY_W;
    }

    // Total
    drawCell(rx, ry, TOTAL_W, ROW_H, rowBg);
    if (total) {
      drawText(String(total), rx + TOTAL_W / 2, ry + ROW_H / 2 + 4, 'center', '#1e3a8a', `bold 11px ${FONT}`);
    }
  });

  // ── Footnotes ───────────────────────────────────────────────────────────────
  if (HAS_FOOTNOTES) {
    const fy = tableY + tableH + 14;
    const midX = tableX + tableW / 2;

    if (coList.length > 0) {
      drawText('Concediu de odihnă:', tableX, fy + 12, 'left', '#111', `bold 11px ${FONT}`);
      coList.forEach((emp, i) => {
        const coDays = Object.entries(cellMap[emp.id] ?? {})
          .filter(([, v]) => v === 'CO')
          .map(([k]) => Number(k))
          .sort((a, b) => a - b);
        drawText(
          `${emp.fullName} = ${coDays.length} zile (${coDays.join(', ')})`,
          tableX, fy + 26 + i * 15, 'left', '#333', `10px ${FONT}`,
        );
      });
    }

    if (demisieList.length > 0) {
      drawText('Demisie:', midX, fy + 12, 'left', '#111', `bold 11px ${FONT}`);
      demisieList.forEach((emp, i) => {
        if (!emp.terminationDate) return;
        drawText(
          `${emp.fullName} — începând cu ${formatDateRO(emp.terminationDate)}`,
          midX, fy + 26 + i * 15, 'left', '#333', `10px ${FONT}`,
        );
      });
    }
  }

  return canvas.toDataURL('image/png');
}
