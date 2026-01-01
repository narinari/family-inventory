import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateInviteCode,
  isValidInviteCodeFormat,
  normalizeInviteCode,
  calculateExpiryDate,
  isInviteCodeExpired,
} from './invite-code.js';

describe('invite-code', () => {
  describe('generateInviteCode', () => {
    it('should generate a code in XXXX-XXXX-XXXX format', () => {
      const code = generateInviteCode();
      expect(code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    });

    it('should generate unique codes', () => {
      const codes = new Set<string>();
      for (let i = 0; i < 100; i++) {
        codes.add(generateInviteCode());
      }
      expect(codes.size).toBe(100);
    });

    it('should not contain ambiguous characters (0, 1, I, O)', () => {
      for (let i = 0; i < 50; i++) {
        const code = generateInviteCode();
        expect(code).not.toMatch(/[01IO]/);
      }
    });
  });

  describe('isValidInviteCodeFormat', () => {
    it('should return true for valid format', () => {
      expect(isValidInviteCodeFormat('ABCD-EFGH-2345')).toBe(true);
      expect(isValidInviteCodeFormat('XXXX-YYYY-ZZZZ')).toBe(true);
    });

    it('should return true for lowercase input (case insensitive)', () => {
      expect(isValidInviteCodeFormat('abcd-efgh-2345')).toBe(true);
    });

    it('should return false for invalid format', () => {
      expect(isValidInviteCodeFormat('ABCD-EFGH')).toBe(false);
      expect(isValidInviteCodeFormat('ABCDEFGH2345')).toBe(false);
      expect(isValidInviteCodeFormat('ABCD-EFGH-234')).toBe(false);
      expect(isValidInviteCodeFormat('')).toBe(false);
    });

    it('should return false for codes with ambiguous characters', () => {
      expect(isValidInviteCodeFormat('ABCD-EF0H-2345')).toBe(false);
      expect(isValidInviteCodeFormat('ABCD-EF1H-2345')).toBe(false);
    });
  });

  describe('normalizeInviteCode', () => {
    it('should trim whitespace', () => {
      expect(normalizeInviteCode('  ABCD-EFGH-2345  ')).toBe('ABCD-EFGH-2345');
    });

    it('should convert to uppercase', () => {
      expect(normalizeInviteCode('abcd-efgh-2345')).toBe('ABCD-EFGH-2345');
    });
  });

  describe('calculateExpiryDate', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should default to 7 days', () => {
      const expiry = calculateExpiryDate();
      expect(expiry.toISOString()).toBe('2024-01-22T12:00:00.000Z');
    });

    it('should calculate expiry for specified days', () => {
      const expiry = calculateExpiryDate(3);
      expect(expiry.toISOString()).toBe('2024-01-18T12:00:00.000Z');
    });
  });

  describe('isInviteCodeExpired', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return false for future date', () => {
      const futureDate = new Date('2024-01-20T12:00:00Z');
      expect(isInviteCodeExpired(futureDate)).toBe(false);
    });

    it('should return true for past date', () => {
      const pastDate = new Date('2024-01-10T12:00:00Z');
      expect(isInviteCodeExpired(pastDate)).toBe(true);
    });

    it('should return true for current time (edge case)', () => {
      const now = new Date('2024-01-15T12:00:00Z');
      expect(isInviteCodeExpired(now)).toBe(false);
    });
  });
});
