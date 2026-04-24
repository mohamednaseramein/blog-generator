/**
 * House style: the Unicode em dash (U+2014) is not used in product copy or in AI
 * output. Replace with a spaced hyphen so breaks stay readable in Markdown and JSON.
 */
const EM_DASH = '\u2014';

/** Instruction fragment for LLM user prompts. Do not use U+2014 in this string. */
export const PROMPT_EMDASH_BAN = `Never use the Unicode em dash character (U+2014) in your output. If you need a break or aside, use a spaced hyphen: space, hyphen, space, like " - " instead.`;

/**
 * Replaces every U+2014 (em dash) with ` - ` (spaced hyphen). Does not change en dashes.
 */
export function stripEmDashes(text: string): string {
  if (!text.includes(EM_DASH)) return text;
  return text.replaceAll(EM_DASH, ' - ');
}

/**
 * Recursively strips em dashes from all string values (objects and arrays). Used
 * for JSON shapes returned by the model before persistence or response.
 */
export function stripEmDashesDeep<T>(value: T): T {
  if (typeof value === 'string') {
    return stripEmDashes(value) as T;
  }
  if (Array.isArray(value)) {
    return value.map((v) => stripEmDashesDeep(v)) as T;
  }
  if (value && typeof value === 'object') {
    const o = value as Record<string, unknown>;
    const next: Record<string, unknown> = {};
    for (const k of Object.keys(o)) {
      next[k] = stripEmDashesDeep(o[k]);
    }
    return next as T;
  }
  return value;
}
