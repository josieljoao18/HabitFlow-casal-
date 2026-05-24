import { describe, it, expect } from 'vitest';
import { getToday, formatDate } from './dateHelpers';

describe('dateHelpers', () => {
  it('getToday returns a string in YYYY-MM-DD format', () => {
    const today = getToday();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('formatDate formats YYYY-MM-DD correctly to DD/MM', () => {
    expect(formatDate('2026-05-21')).toBe('21/05');
    expect(formatDate('2024-12-01')).toBe('01/12');
  });

  it('formatDate returns empty string for empty input', () => {
    expect(formatDate('')).toBe('');
  });
});
