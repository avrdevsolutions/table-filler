import { isValidEmail, parseLocalDate } from '@/lib/validation';

describe('isValidEmail', () => {
  it('accepts a standard email', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
  });
  it('accepts email with subdomain', () => {
    expect(isValidEmail('user@mail.example.com')).toBe(true);
  });
  it('rejects missing @', () => {
    expect(isValidEmail('userexample.com')).toBe(false);
  });
  it('rejects missing domain', () => {
    expect(isValidEmail('user@')).toBe(false);
  });
  it('rejects empty string', () => {
    expect(isValidEmail('')).toBe(false);
  });
  it('rejects email with spaces', () => {
    expect(isValidEmail('user @example.com')).toBe(false);
  });
  it('rejects missing TLD', () => {
    expect(isValidEmail('user@example')).toBe(false);
  });
});

describe('parseLocalDate', () => {
  it('parses YYYY-MM-DD without timezone shift', () => {
    const d = parseLocalDate('2024-03-15');
    expect(d.getFullYear()).toBe(2024);
    expect(d.getMonth()).toBe(2); // 0-indexed March
    expect(d.getDate()).toBe(15);
  });
  it('parses the first day of a month correctly', () => {
    const d = parseLocalDate('2024-01-01');
    expect(d.getFullYear()).toBe(2024);
    expect(d.getMonth()).toBe(0);
    expect(d.getDate()).toBe(1);
  });
  it('parses the last day of a leap-year February', () => {
    const d = parseLocalDate('2024-02-29');
    expect(d.getFullYear()).toBe(2024);
    expect(d.getMonth()).toBe(1);
    expect(d.getDate()).toBe(29);
  });
  it('correctly orders two dates', () => {
    const a = parseLocalDate('2024-03-01');
    const b = parseLocalDate('2024-03-15');
    expect(a < b).toBe(true);
  });
});
