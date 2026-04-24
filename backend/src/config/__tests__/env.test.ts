import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const validEnv = () => ({
  NODE_ENV: 'development',
  PORT: '3000',
  SUPABASE_URL: 'https://abc123.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${'x'.repeat(120)}`,
  SUPABASE_ANON_KEY: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${'y'.repeat(120)}`,
  ANTHROPIC_API_KEY: 'sk-ant-api03-test-key-xxxxxxxxxxxxxxxx',
  JWT_SECRET: '0123456789abcdef0123456789abcdef',
  FRONTEND_URL: 'http://localhost:5173',
});

describe('validateAndLogRuntimeEnv', () => {
  const original = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...original };
  });

  afterEach(() => {
    process.env = original;
  });

  async function loadValidate() {
    const { validateAndLogRuntimeEnv } = await import('../env.js');
    return validateAndLogRuntimeEnv;
  }

  it('passes with valid development env', async () => {
    Object.assign(process.env, validEnv());
    const validate = await loadValidate();
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const cfg = validate();
    expect(cfg.port).toBe(3000);
    expect(cfg.frontendUrl).toBe('http://localhost:5173');
    expect(cfg.nodeEnv).toBe('development');
    expect(log.mock.calls.some((c) => String(c[0]).includes('Environment OK'))).toBe(true);
    log.mockRestore();
  });

  it('rejects placeholder Supabase URL', async () => {
    Object.assign(process.env, validEnv(), {
      SUPABASE_URL: 'https://your-project-ref.supabase.co',
    });
    const validate = await loadValidate();
    expect(() => validate()).toThrow(/placeholder|your-project-ref/i);
  });

  it('rejects invalid PORT', async () => {
    Object.assign(process.env, validEnv(), { PORT: '99999' });
    const validate = await loadValidate();
    expect(() => validate()).toThrow(/PORT/);
  });

  it('rejects short JWT_SECRET', async () => {
    Object.assign(process.env, validEnv(), { JWT_SECRET: 'short' });
    const validate = await loadValidate();
    expect(() => validate()).toThrow(/32/);
  });

  it('requires sk-ant- prefix for Anthropic key in production', async () => {
    Object.assign(process.env, validEnv(), {
      NODE_ENV: 'production',
      ANTHROPIC_API_KEY: 'not-a-real-anthropic-key-xxxxxxxx',
    });
    const validate = await loadValidate();
    expect(() => validate()).toThrow(/sk-ant-/);
  });

  it('rejects invalid SCRAPE_TIMEOUT_MS', async () => {
    Object.assign(process.env, validEnv(), { SCRAPE_TIMEOUT_MS: '50' });
    const validate = await loadValidate();
    expect(() => validate()).toThrow(/SCRAPE_TIMEOUT_MS/);
  });

  it('warns when SUPABASE_ANON_KEY is missing in development', async () => {
    const base = { ...validEnv() };
    delete base['SUPABASE_ANON_KEY'];
    Object.assign(process.env, base, { NODE_ENV: 'development' });
    const validate = await loadValidate();
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    validate();
    expect(warn.mock.calls.some((c) => String(c[0]).includes('SUPABASE_ANON_KEY'))).toBe(true);
    log.mockRestore();
    warn.mockRestore();
  });

  it('rejects missing SUPABASE_ANON_KEY in production', async () => {
    const base = { ...validEnv() };
    delete base['SUPABASE_ANON_KEY'];
    Object.assign(process.env, base, { NODE_ENV: 'production' });
    const validate = await loadValidate();
    expect(() => validate()).toThrow(/SUPABASE_ANON_KEY/);
  });
});
