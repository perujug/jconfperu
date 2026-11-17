import { spawnSync } from 'node:child_process';

// picomatch <=4.0.7 is the latest release and has no patched version.
// Every high finding in this tree is that advisory, reached through Astro.
// Downgrading to astro@5.3.0 still installs picomatch and breaks @astrojs/mdx.
const UNFIXED = new Set(['GHSA-fc5q-39xc-vjpf']);

const result = spawnSync('npm', ['audit', '--json'], { encoding: 'utf8' });
let report;
try {
  report = JSON.parse(result.stdout);
} catch {
  process.stderr.write(result.stderr || result.stdout || 'npm audit did not return JSON\n');
  process.exit(result.status === 0 ? 1 : result.status || 1);
}

function advisoryIds(packageName, seen = new Set()) {
  if (seen.has(packageName)) return [];
  seen.add(packageName);
  const vulnerability = report.vulnerabilities?.[packageName];
  if (!vulnerability) return [];

  const ids = [];
  for (const via of vulnerability.via ?? []) {
    if (typeof via === 'string') {
      ids.push(...advisoryIds(via, seen));
    } else if (via?.url) {
      ids.push(via.url.split('/').pop());
    }
  }
  return ids;
}

const blocking = [];
for (const [packageName, vulnerability] of Object.entries(report.vulnerabilities ?? {})) {
  if (vulnerability.severity !== 'high' && vulnerability.severity !== 'critical') continue;
  const ids = [...new Set(advisoryIds(packageName))];
  const unresolved = ids.filter((id) => !UNFIXED.has(id));
  if (ids.length === 0 || unresolved.length > 0) {
    blocking.push(`${vulnerability.severity} ${packageName}: ${unresolved.join(', ') || 'unmapped advisory'}`);
  }
}

if (blocking.length > 0) {
  console.error('High or critical advisories:');
  for (const line of blocking) console.error(`- ${line}`);
  process.exit(1);
}

const present = [...UNFIXED].filter((id) => result.stdout.includes(id));
if (present.length > 0) {
  console.log(`No blocking advisories. Unfixed upstream advisory still present: ${present.join(', ')}`);
} else {
  console.log('No high or critical advisories.');
}
