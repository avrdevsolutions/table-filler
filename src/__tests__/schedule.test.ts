import { getDemisieCells, calcTotal, countCO, getDaysInMonth } from '@/lib/schedule';

describe('getDaysInMonth', () => {
  it('returns 31 for January', () => expect(getDaysInMonth(2024, 1)).toBe(31));
  it('returns 29 for Feb 2024 (leap)', () => expect(getDaysInMonth(2024, 2)).toBe(29));
  it('returns 28 for Feb 2023', () => expect(getDaysInMonth(2023, 2)).toBe(28));
});

describe('getDemisieCells', () => {
  it('fills from start day to end of month', () => {
    const cells = getDemisieCells('2024-01-25', 2024, 1);
    expect(cells[25]).toBe('D');
    expect(cells[26]).toBe('E');
    expect(cells[27]).toBe('M');
    expect(cells[28]).toBe('I');
    expect(cells[29]).toBe('S');
    expect(cells[30]).toBe('I');
    expect(cells[31]).toBe('E');
  });
  it('returns empty for future months', () => {
    const cells = getDemisieCells('2024-03-01', 2024, 1);
    expect(Object.keys(cells).length).toBe(0);
  });
  it('fills entire month if termination was prior month', () => {
    const cells = getDemisieCells('2024-01-01', 2024, 2);
    expect(Object.keys(cells).length).toBe(29);
    expect(cells[1]).toBe('D');
    expect(cells[2]).toBe('E');
  });
});

describe('calcTotal', () => {
  it('sums 24*count', () => {
    expect(calcTotal({ 1: '24', 2: '24', 3: '24' })).toBe(72);
  });
  it('ignores non-24 values', () => {
    expect(calcTotal({ 1: 'CO', 2: 'X', 3: '24' })).toBe(24);
  });
  it('returns 0 for empty', () => {
    expect(calcTotal({})).toBe(0);
  });
});

describe('countCO', () => {
  it('counts CO cells', () => {
    expect(countCO({ 1: 'CO', 2: 'CO', 3: '24' })).toBe(2);
  });
});
