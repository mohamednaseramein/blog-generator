import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import type { AiDetectorMode } from '../domain/ai-check-types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface RubricRuleRow {
  id: string;
  name: string;
  weight_min: number;
  weight_max: number;
  definition: string;
  ai_example: string;
  human_example: string;
  fix_tip: string;
}

export interface RubricDoc {
  version: string;
  last_updated: string;
  language: string;
  initial_score: number;
  mode_thresholds: Record<string, { min?: number; max?: number }>;
  short_post_words: number;
  long_post_words: number;
  excluded_segments: { type: string; description: string }[];
  rules: {
    ai_like: RubricRuleRow[];
    human_like: RubricRuleRow[];
  };
}

let cached: RubricDoc | null = null;

function rubricPath(): string {
  return join(__dirname, 'ai-detector-rubric.yaml');
}

export function loadRubricDoc(): RubricDoc {
  if (cached) return cached;
  const raw = readFileSync(rubricPath(), 'utf8');
  cached = parseYaml(raw) as RubricDoc;
  return cached;
}

export function getRubricVersion(): string {
  return loadRubricDoc().version;
}

export function getJsonSchemaPromptChunk(initialScore: number): string {
  return `
Return ONLY valid JSON (no markdown fences) with this exact shape:
{
  "ai_likelihood_percent": number (0-100),
  "human_likelihood_percent": number (0-100),
  "uncertainty_percent": number (0-100),
  "top_signals": {
    "ai_like": [{ "signal": string, "weight": number, "evidence_snippets": string[] }],
    "human_like": [{ "signal": string, "weight": number (negative), "evidence_snippets": string[] }]
  },
  "rule_breakdown": [{
    "rule_id": string,
    "direction": "ai_like" | "human_like",
    "points_applied": number,
    "evidence_snippet": string (must quote ≤20 words from the scored input),
    "section": string (e.g. "Intro", "H2: Title", or "Section 2"),
    "field": "body" | "seo_title" | "meta_description",
    "suggested_fix": string
  }],
  "section_scores": [{ "section": string, "ai_likelihood_percent": number, "notes": string }],
  "creator_tips": string[] (3-5 short actionable tips tied to rules that fired)
}

Rules:
- Start from mental baseline ${initialScore} for AI-likeness; adjust using the rubric.
- Every rule_breakdown item MUST include evidence_snippet copied verbatim from the scored text (body, SEO title, or meta).
- If no rule applies, omit it — never invent evidence.
- Section_scores: for posts under 300 words after exclusions, return a single section "Full post". Otherwise split by H2 when present; if no H2, bucket into ~200-word windows labelled Section 1..N.
- If signals strongly conflict, push uncertainty_percent toward 50+.
`.trim();
}

export function getSystemPrompt(): string {
  const doc = loadRubricDoc();
  const aiRules = doc.rules.ai_like
    .map(
      (r) =>
        `- [${r.id}] (${r.weight_min}..${r.weight_max}) ${r.name}: ${r.definition.trim()}`,
    )
    .join('\n');
  const humanRules = doc.rules.human_like
    .map(
      (r) =>
        `- [${r.id}] (${r.weight_min}..${r.weight_max}) ${r.name}: ${r.definition.trim()}`,
    )
    .join('\n');

  return [
    `You are a transparent AI-writing-style analyst. Rubric version ${doc.version}.`,
    'You judge how much the prose resembles generic AI drafting versus human editing.',
    'You are not a forensic detector — be calibrated, conservative, and educational.',
    '',
    'AI-like signals (increase ai_likelihood_percent):',
    aiRules,
    '',
    'Human-like signals (decrease ai_likelihood_percent):',
    humanRules,
    '',
    getJsonSchemaPromptChunk(doc.initial_score),
  ].join('\n');
}

export function getRulesForHelpPage(): RubricDoc {
  return loadRubricDoc();
}

export function deriveModeFromScore(aiLikelihood: number): AiDetectorMode {
  if (aiLikelihood <= 24) return 'pure_human';
  if (aiLikelihood <= 49) return 'human_polish';
  if (aiLikelihood <= 79) return 'ai_assisted';
  return 'pure_ai';
}
