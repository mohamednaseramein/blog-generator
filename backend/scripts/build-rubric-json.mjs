/**
 * Emits frontend/src/lib/ai-detector-rubric.generated.json from the YAML rubric.
 * Run from backend/: npm run build:rubric
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const backendRoot = join(__dirname, '..');
const yamlPath = join(backendRoot, 'src/lib/ai-detector-rubric.yaml');
const outPath = join(backendRoot, '../frontend/src/lib/ai-detector-rubric.generated.json');

const doc = parse(readFileSync(yamlPath, 'utf8'));
writeFileSync(outPath, JSON.stringify(doc, null, 2) + '\n', 'utf8');
console.log('[build-rubric-json] wrote', outPath);
