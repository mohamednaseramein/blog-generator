/**
 * Validates process env at API startup and logs a non-secret summary.
 * Fails fast with clear errors when values are missing or look like placeholders.
 */

const LOG_PREFIX = '[config]';

const EXAMPLE_JWT_SECRET = 'a-long-random-secret-min-32-chars';

function looksLikePlaceholder(name: string, raw: string): string | null {
  const v = raw.trim();
  const lower = v.toLowerCase();
  if (v.length === 0) return `${name} is empty`;
  if (lower.includes('your-key-here')) return `${name} still contains example text (your-key-here)`;
  if (lower.includes('your-service-role-key')) return `${name} still contains example text`;
  if (lower.includes('your-anon-key')) return `${name} still contains example text`;
  if (lower.includes('your-project-ref')) return `${name} still contains example text (your-project-ref)`;
  if (v === EXAMPLE_JWT_SECRET) return `${name} must not use the example JWT_SECRET from .env.example`;
  if (lower === 'sk-ant-your-key-here') return `${name} must not use the example Anthropic key`;
  return null;
}

function maskSecret(value: string, visibleStart = 8, visibleEnd = 4): string {
  const t = value.trim();
  if (t.length <= visibleStart + visibleEnd) return '(set)';
  return `${t.slice(0, visibleStart)}…${t.slice(-visibleEnd)} (${t.length} chars)`;
}

function parsePort(raw: string | undefined): { port: number; error?: string } {
  if (raw === undefined || raw.trim() === '') return { port: 3000 };
  const n = Number.parseInt(raw, 10);
  if (!Number.isInteger(n) || n < 1 || n > 65535) {
    return { port: NaN, error: `PORT must be an integer 1–65535, got ${JSON.stringify(raw)}` };
  }
  return { port: n };
}

function parseHttpUrl(raw: string | undefined, name: string, allowHttpLocalhost: boolean): { url: string; error?: string } {
  if (!raw?.trim()) return { url: '', error: `${name} is required` };
  const v = raw.trim();
  const ph = looksLikePlaceholder(name, v);
  if (ph) return { url: '', error: ph };
  let u: URL;
  try {
    u = new URL(v);
  } catch {
    return { url: '', error: `${name} must be a valid URL, got ${JSON.stringify(v.slice(0, 80))}` };
  }
  const okHttps = u.protocol === 'https:';
  const okLocalHttp =
    allowHttpLocalhost &&
    u.protocol === 'http:' &&
    (u.hostname === 'localhost' || u.hostname === '127.0.0.1' || u.hostname === '[::1]');
  if (!okHttps && !okLocalHttp) {
    return {
      url: '',
      error: `${name} must use https:// (or http:// for localhost only), got protocol ${u.protocol}`,
    };
  }
  return { url: v };
}

function validateAnthropicKey(raw: string | undefined, nodeEnv: string): { error?: string } {
  if (!raw?.trim()) return { error: 'ANTHROPIC_API_KEY is required' };
  const v = raw.trim();
  const ph = looksLikePlaceholder('ANTHROPIC_API_KEY', v);
  if (ph) return { error: ph };
  if (nodeEnv === 'production' && !v.startsWith('sk-ant-')) {
    return { error: 'ANTHROPIC_API_KEY must start with sk-ant- in production' };
  }
  if (v.length < 10) return { error: 'ANTHROPIC_API_KEY is too short' };
  return {};
}

function validateJwtSecret(raw: string | undefined): { error?: string } {
  if (!raw?.trim()) return { error: 'JWT_SECRET is required' };
  const v = raw.trim();
  const ph = looksLikePlaceholder('JWT_SECRET', v);
  if (ph) return { error: ph };
  if (v.length < 32) return { error: 'JWT_SECRET must be at least 32 characters' };
  return {};
}

function validateSupabaseServiceKey(raw: string | undefined): { error?: string } {
  if (!raw?.trim()) return { error: 'SUPABASE_SERVICE_ROLE_KEY is required' };
  const v = raw.trim();
  const ph = looksLikePlaceholder('SUPABASE_SERVICE_ROLE_KEY', v);
  if (ph) return { error: ph };
  if (!v.startsWith('eyJ')) {
    return { error: 'SUPABASE_SERVICE_ROLE_KEY should be a JWT (starts with eyJ)' };
  }
  if (v.length < 80) return { error: 'SUPABASE_SERVICE_ROLE_KEY looks too short' };
  return {};
}

function validateSupabaseAnonKey(
  raw: string | undefined,
  nodeEnv: string,
): { error?: string; warn?: string } {
  if (!raw?.trim()) {
    if (nodeEnv === 'production') {
      return {
        error:
          'SUPABASE_ANON_KEY is required in production (and in backend/.env for Docker Compose frontend build args)',
      };
    }
    return {
      warn: 'SUPABASE_ANON_KEY is unset — add it before Docker Compose builds; required in production',
    };
  }
  const v = raw.trim();
  const ph = looksLikePlaceholder('SUPABASE_ANON_KEY', v);
  if (ph) return { error: ph };
  if (!v.startsWith('eyJ')) {
    return { error: 'SUPABASE_ANON_KEY should be a JWT (starts with eyJ)' };
  }
  if (v.length < 80) return { error: 'SUPABASE_ANON_KEY looks too short' };
  return {};
}

function validateDbUrl(raw: string | undefined): { error?: string } {
  if (raw === undefined || raw.trim() === '') return {};
  const v = raw.trim();
  const ph = looksLikePlaceholder('SUPABASE_DB_URL', v);
  if (ph) return { error: ph };
  if (!/^postgres(ql)?:\/\//i.test(v)) {
    return { error: 'SUPABASE_DB_URL must start with postgresql:// or postgres://' };
  }
  return {};
}

function validateScrapeTimeout(raw: string | undefined): { error?: string } {
  if (raw === undefined || raw.trim() === '') return {};
  const n = Number.parseInt(raw.trim(), 10);
  if (!Number.isInteger(n) || n < 1_000 || n > 120_000) {
    return { error: 'SCRAPE_TIMEOUT_MS must be an integer between 1000 and 120000 when set' };
  }
  return {};
}

function validateAnthropicModel(raw: string | undefined): { error?: string } {
  if (raw === undefined || raw.trim() === '') return {};
  const v = raw.trim();
  if (/[\r\n]/.test(v)) return { error: 'ANTHROPIC_MODEL must be a single line' };
  if (v.length > 120) return { error: 'ANTHROPIC_MODEL is too long' };
  return {};
}

export interface ValidatedPublicConfig {
  port: number;
  frontendUrl: string;
  nodeEnv: string;
}

/**
 * Validates environment, logs masked summary to stdout, returns public config for Express.
 * @throws Error if validation fails
 */
export function validateAndLogRuntimeEnv(): ValidatedPublicConfig {
  const errors: string[] = [];
  const warnings: string[] = [];

  const nodeEnv = (process.env['NODE_ENV'] ?? 'development').trim() || 'development';

  const { port, error: portErr } = parsePort(process.env['PORT']);
  if (portErr) errors.push(portErr);

  const { url: supabaseUrl, error: supabaseUrlErr } = parseHttpUrl(
    process.env['SUPABASE_URL'],
    'SUPABASE_URL',
    true,
  );
  if (supabaseUrlErr) errors.push(supabaseUrlErr);

  errors.push(
    ...[validateSupabaseServiceKey(process.env['SUPABASE_SERVICE_ROLE_KEY'])]
      .map((r) => r.error)
      .filter((e): e is string => Boolean(e)),
  );

  const anonResult = validateSupabaseAnonKey(process.env['SUPABASE_ANON_KEY'], nodeEnv);
  if (anonResult.error) errors.push(anonResult.error);
  if (anonResult.warn) warnings.push(anonResult.warn);

  errors.push(
    ...[validateAnthropicKey(process.env['ANTHROPIC_API_KEY'], nodeEnv)]
      .map((r) => r.error)
      .filter((e): e is string => Boolean(e)),
  );

  errors.push(
    ...[validateJwtSecret(process.env['JWT_SECRET'])]
      .map((r) => r.error)
      .filter((e): e is string => Boolean(e)),
  );

  errors.push(
    ...[validateDbUrl(process.env['SUPABASE_DB_URL'])]
      .map((r) => r.error)
      .filter((e): e is string => Boolean(e)),
  );

  errors.push(
    ...[validateScrapeTimeout(process.env['SCRAPE_TIMEOUT_MS'])]
      .map((r) => r.error)
      .filter((e): e is string => Boolean(e)),
  );

  errors.push(
    ...[validateAnthropicModel(process.env['ANTHROPIC_MODEL'])]
      .map((r) => r.error)
      .filter((e): e is string => Boolean(e)),
  );

  const frontendDefault = 'http://localhost:5173';
  const frontendRaw = process.env['FRONTEND_URL']?.trim() || frontendDefault;
  const { url: frontendUrl, error: feErr } = parseHttpUrl(frontendRaw, 'FRONTEND_URL', true);
  if (feErr) errors.push(feErr);

  if (errors.length > 0) {
    console.error(`${LOG_PREFIX} Environment validation failed:`);
    for (const e of errors) console.error(`${LOG_PREFIX}   - ${e}`);
    throw new Error(
      `Invalid environment (${errors.length}): ${errors.join('; ')} — fix backend/.env or container env`,
    );
  }

  for (const w of warnings) console.warn(`${LOG_PREFIX} Warning: ${w}`);

  const sk = process.env['SUPABASE_SERVICE_ROLE_KEY']!.trim();
  const ak = process.env['ANTHROPIC_API_KEY']!.trim();
  const jwt = process.env['JWT_SECRET']!.trim();
  const anonKey = process.env['SUPABASE_ANON_KEY']?.trim();

  console.log(`${LOG_PREFIX} Environment OK (summary — secrets masked)`);
  console.log(`${LOG_PREFIX}   NODE_ENV=${nodeEnv}`);
  console.log(`${LOG_PREFIX}   PORT=${port}`);
  console.log(`${LOG_PREFIX}   FRONTEND_URL=${frontendUrl}`);
  try {
    const u = new URL(supabaseUrl);
    console.log(`${LOG_PREFIX}   SUPABASE_URL host=${u.host} scheme=${u.protocol.replace(':', '')}`);
  } catch {
    console.log(`${LOG_PREFIX}   SUPABASE_URL=(set)`);
  }
  console.log(`${LOG_PREFIX}   SUPABASE_SERVICE_ROLE_KEY=${maskSecret(sk)}`);
  if (anonKey) console.log(`${LOG_PREFIX}   SUPABASE_ANON_KEY=${maskSecret(anonKey)}`);
  console.log(`${LOG_PREFIX}   ANTHROPIC_API_KEY=${ak.startsWith('sk-ant-') ? maskSecret(ak, 12, 4) : maskSecret(ak)}`);
  const model = process.env['ANTHROPIC_MODEL']?.trim();
  if (model) console.log(`${LOG_PREFIX}   ANTHROPIC_MODEL=${model}`);
  console.log(`${LOG_PREFIX}   JWT_SECRET length=${jwt.length} (ok)`);
  const dbUrl = process.env['SUPABASE_DB_URL']?.trim();
  if (dbUrl) console.log(`${LOG_PREFIX}   SUPABASE_DB_URL set (migrate CLI)`);
  const scrapeMs = process.env['SCRAPE_TIMEOUT_MS']?.trim();
  if (scrapeMs) console.log(`${LOG_PREFIX}   SCRAPE_TIMEOUT_MS=${scrapeMs}`);

  return { port, frontendUrl, nodeEnv };
}
