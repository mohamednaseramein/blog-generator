#!/usr/bin/env node
/**
 * Post-build substitution of `{{PUBLIC_URL}}` in `dist/robots.txt` and
 * `dist/sitemap.xml`. The source files in `public/` carry the placeholder
 * so they stay environment-agnostic in version control; the build wires
 * in the real domain from `VITE_PUBLIC_URL` (or a sensible fallback).
 *
 * Per AgDR-0034 and the Group D plan: the placeholder approach keeps the
 * source files identical across environments and pushes the domain into
 * a single env-var-driven step.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, '..', 'dist');

const publicUrl = (process.env['VITE_PUBLIC_URL'] || 'https://blog-generator.example.com').replace(
  /\/$/,
  '',
);

const targets = ['robots.txt', 'sitemap.xml'];

let touched = 0;
for (const name of targets) {
  const path = join(distDir, name);
  if (!existsSync(path)) {
    console.warn(`[build-public-files] ${name} not present in dist — skipping`);
    continue;
  }
  const before = readFileSync(path, 'utf-8');
  const after = before.replaceAll('{{PUBLIC_URL}}', publicUrl);
  if (before !== after) {
    writeFileSync(path, after);
    touched += 1;
    console.log(`[build-public-files] ${name} domain set to ${publicUrl}`);
  }
}

if (touched === 0) {
  console.log('[build-public-files] no substitutions needed');
}
