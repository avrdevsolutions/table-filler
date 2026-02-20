export const MONTHS_RO = [
  'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
  'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie',
];

export const DEMISIE_PATTERN = ['D', 'E', 'M', 'I', 'S', 'I', 'E'];

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function getDemisieCells(
  terminationDate: string,
  year: number,
  month: number
): Record<number, string> {
  const result: Record<number, string> = {};
  const date = new Date(terminationDate);
  const tYear = date.getFullYear();
  const tMonth = date.getMonth() + 1;
  if (tYear !== year || tMonth !== month) {
    // If termination is in a past month, fill entire month
    if (tYear < year || (tYear === year && tMonth < month)) {
      const days = getDaysInMonth(year, month);
      for (let d = 1; d <= days; d++) {
        result[d] = DEMISIE_PATTERN[(d - 1) % 7];
      }
    }
    return result;
  }
  const startDay = date.getDate();
  const days = getDaysInMonth(year, month);
  for (let d = startDay; d <= days; d++) {
    result[d] = DEMISIE_PATTERN[(d - startDay) % 7];
  }
  return result;
}

export function calcTotal(cells: Record<number, string>): number {
  return Object.values(cells).filter(v => v === '24').length * 24;
}

export function countCO(cells: Record<number, string>): number {
  return Object.values(cells).filter(v => v === 'CO').length;
}
