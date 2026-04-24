/**
 * Bump root semver, then run sync-version.mjs so backend/frontend match.
 *
 * Usage:
 *   node scripts/bump-version.mjs patch|minor|major
 *   node scripts/bump-version.mjs --infer [--dry-run]
 *
 * --infer: inspects git commits in range v<package.json version>..HEAD, else
 * latest v* tag..HEAD (see docs/releases.md). No tag anchor → exits with guidance.
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function readRootVersion() {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const v = pkg.version;
  if (typeof v !== 'string' || !/^\d+\.\d+\.\d+/.test(v)) {
    throw new Error(`Root package.json needs semver "version" (got ${String(v)})`);
  }
  return { pkg, version: v };
}

function parseSemver(v) {
  const m = v.match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+([0-9A-Za-z.-]+))?$/);
  if (!m) throw new Error(`Not a simple semver X.Y.Z: ${v}`);
  return { major: +m[1], minor: +m[2], patch: +m[3], pre: m[4], build: m[5] };
}

function formatSemver(p, pre, build) {
  let s = `${p.major}.${p.minor}.${p.patch}`;
  if (pre) s += `-${pre}`;
  if (build) s += `+${build}`;
  return s;
}

function bumpLevel(parts, level) {
  const { major, minor, patch, pre, build } = parts;
  if (pre || build) {
    throw new Error(`Bump script only supports simple X.Y.Z without pre-release (got ${formatSemver(parts, pre, build)})`);
  }
  if (level === 'major') return { major: major + 1, minor: 0, patch: 0 };
  if (level === 'minor') return { major, minor: minor + 1, patch: 0 };
  if (level === 'patch') return { major, minor, patch: patch + 1 };
  throw new Error(`Invalid level: ${level}`);
}

function runSync() {
  execSync('node scripts/sync-version.mjs', { cwd: root, stdio: 'inherit' });
}

function git(args, { allowFail = false } = {}) {
  try {
    return execSync(`git ${args}`, {
      cwd: root,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch {
    if (allowFail) return '';
    throw new Error(`git ${args} failed`);
  }
}

/**
 * @returns {string|null} rev range for git log, e.g. "v0.1.0..HEAD"
 */
function getLogRange() {
  const { version } = readRootVersion();
  const exact = `v${version}`;
  if (git(`rev-parse -q --verify "refs/tags/${exact}"`, { allowFail: true })) {
    return `${exact}..HEAD`;
  }
  const latest = git('describe --tags --abbrev=0 --match "v[0-9]*"', { allowFail: true });
  if (latest) return `${latest}..HEAD`;
  return null;
}

/**
 * @param {string} subject first line of commit message
 * @param {string} body rest of commit message
 * @returns {'major'|'minor'|'patch'|'none'}
 */
function bumpFromCommit(subject, body) {
  const text = `${subject}\n${body}`;
  if (
    /^BREAKING CHANGE:/m.test(body) ||
    /^BREAKING CHANGE(\s|$)/m.test(body) ||
    /^BREAKING-CHANGE:/m.test(body) ||
    /^BREAKING-CHANGE(\s|$)/m.test(body)
  ) {
    return 'major';
  }
  // feat(api)!: or fix!: in subject
  const header = subject.trim();
  if (/^[a-z]+(?:\([^)]*\))?!:/i.test(header)) {
    return 'major';
  }

  const typeMatch = header.match(/^([a-z]+)(?:\([^)]*\))?:\s/i);
  if (!typeMatch) return 'patch';
  const type = typeMatch[1].toLowerCase();

  if (type === 'feat' || type === 'feature') return 'minor';
  if (
    type === 'fix' ||
    type === 'perf' ||
    type === 'refactor' ||
    type === 'revert'
  ) {
    return 'patch';
  }
  // Non-user-facing — no product version impact when alone
  if (
    type === 'docs' ||
    type === 'chore' ||
    type === 'style' ||
    type === 'test' ||
    type === 'build' ||
    type === 'ci'
  ) {
    return 'none';
  }
  // Unknown types: conservative patch
  return 'patch';
}

function rank(b) {
  if (b === 'major') return 3;
  if (b === 'minor') return 2;
  if (b === 'patch') return 1;
  return 0;
}

function inferBump() {
  const range = getLogRange();
  if (!range) {
    const { version } = readRootVersion();
    return {
      level: null,
      reason: `No git tag anchor found. Create tag v${version} (or an older v* release tag), push it, then retry — or bump explicitly: node scripts/bump-version.mjs patch|minor|major`,
    };
  }
  let raw;
  try {
    raw = git(`log ${range} --pretty=format:%H%x1f%s%x1f%b%x1e`);
  } catch {
    return { level: null, reason: 'No commits in range.' };
  }
  if (!raw) {
    return { level: null, reason: `No commits since ${range.replace(/\.\.HEAD$/, '')}.` };
  }

  const chunks = raw.split('\x1e').filter(Boolean);
  let best = 0;
  const counts = { major: 0, minor: 0, patch: 0, none: 0 };

  for (const chunk of chunks) {
    const [hash, subject, body = ''] = chunk.split('\x1f');
    if (!hash) continue;
    const b = bumpFromCommit(subject || '', body || '');
    counts[b === 'none' ? 'none' : b]++;
    best = Math.max(best, rank(b));
  }

  if (best === 0) {
    return {
      level: null,
      reason: `Only non-shipping types (docs/chore/ci/…) in ${range}; no semver bump.`,
      range,
      counts,
    };
  }

  const level = best === 3 ? 'major' : best === 2 ? 'minor' : 'patch';
  return { level, reason: `Inferred ${level} from conventional commits (${range}).`, range, counts };
}

function writeRootVersion(newVersion) {
  const { pkg } = readRootVersion();
  pkg.version = newVersion;
  writeFileSync(join(root, 'package.json'), `${JSON.stringify(pkg, null, 2)}\n`);
}

function main() {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes('--dry-run');
  const args = argv.filter((a) => a !== '--dry-run');

  if (args.length === 1 && args[0] === '--infer') {
    const { level, reason, counts } = inferBump();
    process.stdout.write(`${reason}\n`);
    if (counts) process.stdout.write(`Breakdown: ${JSON.stringify(counts)}\n`);
    if (!level) {
      process.exit(0);
    }
    if (dryRun) {
      const { version } = readRootVersion();
      const next = formatSemver(bumpLevel(parseSemver(version), level));
      process.stdout.write(`Would bump ${version} → ${next}\n`);
      process.exit(0);
    }
    const { version } = readRootVersion();
    const next = formatSemver(bumpLevel(parseSemver(version), level));
    writeRootVersion(next);
    runSync();
    process.stdout.write(`Bumped ${version} → ${next} (workspace synced)\n`);
    process.exit(0);
  }

  if (args.length === 1 && /^(patch|minor|major)$/.test(args[0])) {
    const level = args[0];
    const { version } = readRootVersion();
    const next = formatSemver(bumpLevel(parseSemver(version), level));
    if (dryRun) {
      process.stdout.write(`Would bump ${version} → ${next}\n`);
      process.exit(0);
    }
    writeRootVersion(next);
    runSync();
    process.stdout.write(`Bumped ${version} → ${next} (workspace synced)\n`);
    process.exit(0);
  }

  process.stderr.write(`Usage:
  node scripts/bump-version.mjs patch|minor|major [--dry-run]
  node scripts/bump-version.mjs --infer [--dry-run]

Rules for --infer are documented in docs/releases.md (conventional commits → semver).
`);
  process.exit(1);
}

main();
