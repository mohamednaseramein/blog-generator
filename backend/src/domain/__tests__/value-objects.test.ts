import { describe, it, expect } from 'vitest';
import { WordCountRange, ReferenceUrl, trimInput } from '../value-objects.js';

describe('WordCountRange', () => {
  it('accepts valid min and max', () => {
    const range = new WordCountRange(500, 1500);
    expect(range.min).toBe(500);
    expect(range.max).toBe(1500);
  });

  it('accepts equal min and max', () => {
    const range = new WordCountRange(1000, 1000);
    expect(range.min).toBe(range.max);
  });

  it('throws when min is 0', () => {
    expect(() => new WordCountRange(0, 1000)).toThrow(
      'Minimum word count must be greater than 0',
    );
  });

  it('throws when min is negative', () => {
    expect(() => new WordCountRange(-1, 1000)).toThrow(
      'Minimum word count must be greater than 0',
    );
  });

  it('throws when max is less than min', () => {
    expect(() => new WordCountRange(1000, 500)).toThrow(
      'Maximum word count must be greater than or equal to minimum',
    );
  });
});

describe('ReferenceUrl', () => {
  it('accepts a valid https URL', () => {
    const ref = new ReferenceUrl('https://example.com/article');
    expect(ref.value).toBe('https://example.com/article');
  });

  it('accepts a valid http URL', () => {
    const ref = new ReferenceUrl('http://example.com');
    expect(ref.value).toBe('http://example.com');
  });

  it('throws on malformed URL', () => {
    expect(() => new ReferenceUrl('not a url')).toThrow(
      'Reference URL must be a well-formed URL',
    );
  });

  it('throws on localhost (SSRF)', () => {
    expect(() => new ReferenceUrl('http://localhost:8080/admin')).toThrow(
      'Reference URL must point to a public host',
    );
  });

  it('throws on private IP (SSRF)', () => {
    expect(() => new ReferenceUrl('http://192.168.1.1')).toThrow(
      'Reference URL must point to a public host',
    );
  });

  it('throws on non-http protocol', () => {
    expect(() => new ReferenceUrl('ftp://example.com')).toThrow(
      'Reference URL must use http or https',
    );
  });
});

describe('trimInput', () => {
  it('trims leading and trailing whitespace', () => {
    expect(trimInput('  hello world  ')).toBe('hello world');
  });

  it('returns unchanged string when no whitespace', () => {
    expect(trimInput('hello')).toBe('hello');
  });
});
