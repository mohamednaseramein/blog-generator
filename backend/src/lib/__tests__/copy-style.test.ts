import { describe, expect, it } from 'vitest';
import { stripEmDashes, stripEmDashesDeep } from '../copy-style.js';

describe('stripEmDashes', () => {
  it('replaces U+2014 with spaced hyphen (may double adjacent spaces)', () => {
    const inStr = 'foo \u2014 bar';
    expect(stripEmDashes(inStr)).toBe('foo  -  bar');
  });

  it('is a no-op when no em dash', () => {
    expect(stripEmDashes('a–b')).toBe('a–b');
  });
});

describe('stripEmDashesDeep', () => {
  it('strips in nested object strings', () => {
    const o = { a: 'x \u2014 y', b: { c: 'z \u2014 w' } };
    const out = stripEmDashesDeep(o);
    expect(out.a).toBe('x  -  y');
    expect(out.b.c).toBe('z  -  w');
  });
});
