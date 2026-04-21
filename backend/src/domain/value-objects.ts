export class WordCountRange {
  readonly min: number;
  readonly max: number;

  constructor(min: number, max: number) {
    if (!Number.isInteger(min) || min <= 0) {
      throw new Error('Minimum word count must be greater than 0');
    }
    if (!Number.isInteger(max) || max < min) {
      throw new Error('Maximum word count must be greater than or equal to minimum');
    }
    this.min = min;
    this.max = max;
  }
}

export class ReferenceUrl {
  readonly value: string;

  constructor(raw: string) {
    let parsed: URL;
    try {
      parsed = new URL(raw);
    } catch {
      throw new Error('Reference URL must be a well-formed URL');
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Reference URL must use http or https');
    }
    // SSRF: block private/loopback IP ranges
    const host = parsed.hostname;
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host.startsWith('192.168.') ||
      host.startsWith('10.') ||
      host.startsWith('172.16.') ||
      host === '0.0.0.0' ||
      host === '[::1]'
    ) {
      throw new Error('Reference URL must point to a public host');
    }
    this.value = raw;
  }
}

export function trimInput(value: string): string {
  return value.trim();
}
