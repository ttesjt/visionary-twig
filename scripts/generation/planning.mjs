import { existsSync, lstatSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { discoverApps, MAX_TCP_PORT } from '../../tooling/workspace-apps.ts';
import { WORKSPACE_GROUPS } from '../lib/workspace-layers.mjs';
import { DEPENDENCY_GROUPS, NODE_WORKSPACE_GROUPS } from '../lib/workspace-discovery.mjs';
import { NODE_PRESET } from '../templates/presets.mjs';
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
  for (const group of DEPENDENCY_GROUPS)
    if (output[group])
      output[group] = Object.fromEntries(
        Object.entries(output[group]).map(([key, value]) => [mapping[key] ?? key, value])
      );
  return output;
}
export async function planTemplateAddition(source, target, options) {
  const kind = options.kind ?? 'app';
  if (!['app', 'library'].includes(kind)) throw new Error('Unsupported template task kind.');
  if (kind === 'app') assertAppName(options.appName);
  const record = readWorkspaceRecord(target);
  const node = record.preset === NODE_PRESET;
  if (node && kind === 'app')
    throw new Error(
      'App templates require a frontend workspace. This target uses the Node preset.'
    );
  safeTargetPath(target, 'pnpm-workspace.yaml');
  const plan = await planProject(source, {
    name: record.projectName,
    preset: record.preset,
    templates: [options.template ?? DEFAULT_APP_TEMPLATE],
    ...(kind === 'app'
      ? { appNames: { [options.template ?? DEFAULT_APP_TEMPLATE]: options.appName } }
      : {}),
  });
  if (plan.templates.length !== 1 || plan.templates[0].type !== kind)
    throw new Error('Choose one app template; library templates use library:clone.');
  const selection = plan.templates[0];
  const location = safeTargetPath(target, selection.destination);
  if (lstatSync(location, { throwIfNoEntry: false }))
    throw new Error('Template destination already exists: ' + selection.destination);
  const names = new Set([readJson(path.join(target, 'package.json')).name]);
  const groups = node
    ? NODE_WORKSPACE_GROUPS
    : WORKSPACE_GROUPS.filter(({ layer }) => layer !== 'template');
  for (const { parent } of groups) {
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
  if (names.has(selection.packageName))
    throw new Error('Package name already exists: ' + selection.packageName);
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
  if (kind === 'app') {
    const used = new Set(discoverApps(target).flatMap((entry) => [entry.devPort, entry.testPort]));
    selection.config = {
      ...selection.config,
      app: {
        ...selection.config.app,
        devPort: allocatePort(FIRST_DEV_PORT, used),
        testPort: allocatePort(FIRST_TEST_PORT, used),
      },
    };
  }
  return { plan, newPackages, record };
}
