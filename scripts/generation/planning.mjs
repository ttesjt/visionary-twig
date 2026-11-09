import { existsSync, lstatSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { discoverApps, MAX_TCP_PORT } from '../../tooling/workspace-apps.ts';
import { planProject } from '../templates/plan.mjs';
import { readJson } from '../templates/files.mjs';
import { assertAppName, DEFAULT_APP_TEMPLATE } from '../templates/identities.mjs';
import { checkReusablePackage } from '../templates/packages.mjs';
import { safeTargetPath } from './paths.mjs';
import { readWorkspaceRecord } from './record.mjs';

const FIRST_DEV_PORT = 3000;
const FIRST_TEST_PORT = 3100;
function allocatePort(first, used) {
  for (let port = first; port <= MAX_TCP_PORT; port++)
    if (!used.has(port)) {
      used.add(port);
      return port;
    }
  throw new Error('No unused workspace port is available.');
}
function mappedManifest(manifest, mapping) {
  const output = globalThis.structuredClone(manifest);
  output.name = mapping[manifest.name] ?? manifest.name;
  for (const group of [
    'dependencies',
    'devDependencies',
    'peerDependencies',
    'optionalDependencies',
  ])
    if (output[group])
      output[group] = Object.fromEntries(
        Object.entries(output[group]).map(([key, value]) => [mapping[key] ?? key, value])
      );
  return output;
}
export async function planTemplateAddition(source, target, options) {
  assertAppName(options.appName);
  const record = readWorkspaceRecord(target);
  safeTargetPath(target, 'pnpm-workspace.yaml');
  const plan = await planProject(source, {
    name: record.projectName,
    templates: [options.template ?? DEFAULT_APP_TEMPLATE],
    appNames: { [options.template ?? DEFAULT_APP_TEMPLATE]: options.appName },
  });
  if (plan.templates.length !== 1 || plan.templates[0].type !== 'app')
    throw new Error('Choose one app template; library templates use library:clone.');
  const app = plan.templates[0];
  const location = safeTargetPath(target, app.destination);
  if (lstatSync(location, { throwIfNoEntry: false }))
    throw new Error('App destination already exists: ' + app.destination);
  const names = new Set([readJson(path.join(target, 'package.json')).name]);
  for (const parent of ['apps', 'packages/shared', 'packages/site', 'packages/adapters']) {
    const folder = safeTargetPath(target, parent);
    if (!existsSync(folder)) continue;
    for (const directory of readdirSync(folder, { withFileTypes: true })) {
      if (directory.isSymbolicLink())
        throw new Error('Target workspace symlinks are unsupported: ' + directory.name);
      if (!directory.isDirectory()) continue;
      const file = safeTargetPath(target, parent + '/' + directory.name + '/package.json');
      if (existsSync(file)) names.add(readJson(file).name);
    }
  }
  if (names.has(app.packageName))
    throw new Error('Package name already exists: ' + app.packageName);
  const newPackages = [];
  const directories = { ...plan.mapping.directories };
  for (const entry of plan.packages) {
    const known = record.packages[entry.manifest.name];
    let existing = safeTargetPath(target, entry.destination);
    // A previously delivered shared package can stay at its recorded path after moving to site.
    if (
      entry.layer === 'site' &&
      known?.destination === 'packages/shared/' + path.posix.basename(entry.destination) &&
      !lstatSync(existing, { throwIfNoEntry: false })
    ) {
      const previous = safeTargetPath(target, known.destination);
      if (lstatSync(previous, { throwIfNoEntry: false })) {
        const sourceDirectory = path.relative(source, entry.source).split(path.sep).join('/');
        entry.destination = known.destination;
        directories[sourceDirectory] = entry.destination;
        existing = previous;
      }
    }
    if (lstatSync(existing, { throwIfNoEntry: false })) {
      if (!known || known.destination !== entry.destination || known.name !== entry.packageName)
        throw new Error('Existing package has unknown provenance: ' + entry.destination);
      checkReusablePackage(existing, entry, mappedManifest(entry.manifest, plan.mapping.packages));
    } else {
      if (names.has(entry.packageName))
        throw new Error('Package name already exists: ' + entry.packageName);
      newPackages.push(entry);
    }
  }
  plan.mapping = Object.freeze({ ...plan.mapping, directories: Object.freeze(directories) });
  const used = new Set(discoverApps(target).flatMap((entry) => [entry.devPort, entry.testPort]));
  app.config = {
    ...app.config,
    app: {
      ...app.config.app,
      devPort: allocatePort(FIRST_DEV_PORT, used),
      testPort: allocatePort(FIRST_TEST_PORT, used),
    },
  };
  return { plan, newPackages, record };
}
