import path from 'node:path';
import { pnpmCommand, runProcesses } from './lib/processes.mjs';

const root = path.resolve(import.meta.dirname, '..');
// Fixed test cases stay independent of the policy resolver being verified.
const FIXED_THEME_POLICIES = ['light', 'dark'];
for (const scheme of FIXED_THEME_POLICIES) {
  console.log(`Verifying fixed ${scheme} policy across existing apps.`);
  const code = await runProcesses(
    [pnpmCommand(['test:e2e', '--all', '--grep', 'fixed theme policy'])],
    { cwd: root, env: { ...process.env, UI_THEME_POLICY: scheme } }
  );
  if (code !== 0) {
    process.exitCode = code;
    break;
  }
}
