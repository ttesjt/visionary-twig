#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import wranglerManifest from 'wrangler/package.json' with { type: 'json' };

// The supplier's exported manifest owns its executable path; no repository layout assumptions.
const executable = fileURLToPath(
  new globalThis.URL(wranglerManifest.bin.wrangler, import.meta.resolve('wrangler/package.json'))
);
const result = spawnSync(process.execPath, [executable, ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: process.env,
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
