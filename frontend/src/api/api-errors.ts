import type { QuotaMetric } from './subscription-api.js';

export interface QuotaExceededDetails {
  metric: QuotaMetric;
  limit: number;
  usage: number;
}

export class QuotaApiError extends Error {
  readonly code = 'QUOTA_EXCEEDED';
  readonly metric: QuotaMetric;
  readonly limit: number;
  readonly usage: number;

  constructor(message: string, details: QuotaExceededDetails) {
    super(message);
    this.name = 'QuotaApiError';
    this.metric = details.metric;
    this.limit = details.limit;
    this.usage = details.usage;
  }
}

export interface ParsedApiError {
  message: string;
  code?: string;
  quota?: QuotaExceededDetails;
}

function isQuotaMetric(value: unknown): value is QuotaMetric {
  return (
    value === 'blogs' ||
    value === 'ai_checks' ||
    value === 'author_profiles' ||
    value === 'reference_extractions'
  );
}

function parseQuotaDetails(details: unknown): QuotaExceededDetails | undefined {
  if (!details || typeof details !== 'object') return undefined;
  const d = details as Record<string, unknown>;
  if (!isQuotaMetric(d.metric)) return undefined;
  if (typeof d.limit !== 'number' || typeof d.usage !== 'number') return undefined;
  return { metric: d.metric, limit: d.limit, usage: d.usage };
}

export function parseApiError(body: unknown, status: number): ParsedApiError {
  if (!body || typeof body !== 'object') {
    return { message: 'Request failed' };
  }

  const err = (body as { error?: unknown }).error;
  if (!err || typeof err !== 'object' || err === null) {
    return { message: 'Request failed' };
  }

  const e = err as {
    message?: unknown;
    code?: unknown;
    details?: unknown;
  };

  const message = typeof e.message === 'string' ? e.message : 'Request failed';
  const code = typeof e.code === 'string' ? e.code : undefined;
  const quota =
    status === 402 && code === 'QUOTA_EXCEEDED' ? parseQuotaDetails(e.details) : undefined;

  return { message, code, quota };
}

export function throwForApiResponse(_status: number, parsed: ParsedApiError): never {
  if (parsed.quota) {
    throw new QuotaApiError(parsed.message, parsed.quota);
  }
  throw new Error(parsed.message);
}
