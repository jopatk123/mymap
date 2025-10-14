import { describe, it, expect } from 'vitest';
import { bilinearInterpolation, formatCoordinate, roundElevation } from '../interpolation.js';

describe('bilinearInterpolation', () => {
  it('returns null when grid is invalid', () => {
    expect(bilinearInterpolation(0.5, 0.5, [1, 2, 3], null)).toBeNull();
  });

  it('falls back to average when some neighbors are missing', () => {
    const result = bilinearInterpolation(0.5, 0.5, [100, null, 200, null], null);
    expect(result).toBe(150);
  });

  it('ignores noData values', () => {
    const result = bilinearInterpolation(0.5, 0.5, [100, -32768, 200, 220], -32768);
    expect(result).toBeGreaterThan(150);
    expect(result).toBeLessThan(220);
  });

  it('produces expected value for regular grid', () => {
  const result = bilinearInterpolation(0.25, 0.5, [100, 200, 150, 250], null);
  expect(result).toBeCloseTo(150, 5);
  });
});

describe('formatCoordinate', () => {
  it('rounds coordinates to six decimals', () => {
    expect(formatCoordinate(30.1234567)).toBeCloseTo(30.123457, 6);
  });

  it('returns null for invalid input', () => {
    expect(formatCoordinate(undefined)).toBeNull();
    expect(formatCoordinate(NaN)).toBeNull();
  });
});

describe('roundElevation', () => {
  it('rounds to nearest integer', () => {
    expect(roundElevation(123.6)).toBe(124);
  });

  it('returns null for missing values', () => {
    expect(roundElevation(null)).toBeNull();
  });
});
