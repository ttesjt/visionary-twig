import { z } from 'zod';
import path from 'node:path';
import { readJson, writeJson } from '../templates/files.mjs';
import { WORKSPACE_CONTRACT_VERSION, WORKSPACE_RECORD } from '../templates/delivery.mjs';
import { NODE_PRESET } from '../templates/presets.mjs';
import { packageScope } from '../templates/identities.mjs';
import { sourceIdentity } from './git.mjs';
import { safeTargetPath } from './paths.mjs';

const sourceSchema = z.object({
  revision: z.string().regex(/^[a-f0-9]{40,64}$/u),
  dirty: z.boolean(),
});
const packageSchema = z.object({ name: z.string(), destination: z.string(), version: z.string() });
const recordSchema = z.object({
  version: z.literal(WORKSPACE_CONTRACT_VERSION),
  preset: z.literal(NODE_PRESET).optional(),
  projectName: z.string(),
  scope: z.string(),
  source: sourceSchema,
  packages: z.record(z.string(), packageSchema),
  applications: z.array(
    z.object({
      id: z.string(),
      template: z.string(),
      destination: z.string(),
      source: sourceSchema,
    })
  ),
});
export function readWorkspaceRecord(root) {
  const value = recordSchema.parse(readJson(safeTargetPath(root, WORKSPACE_RECORD)));
  const manifest = readJson(safeTargetPath(root, 'package.json'));
  if (value.projectName !== manifest.name || value.scope !== packageScope(manifest.name))
    throw new Error('Target workspace identity disagrees with its generation record.');
  return value;
}
export function createWorkspaceRecord(source, destination, plan) {
  const identity = sourceIdentity(source);
  const record = {
    version: WORKSPACE_CONTRACT_VERSION,
    ...(plan.preset === NODE_PRESET ? { preset: NODE_PRESET } : {}),
    projectName: plan.name,
    scope: plan.scope,
    source: identity,
    packages: Object.fromEntries(
      plan.packages.map((entry) => [
        entry.manifest.name,
        {
          name: entry.packageName,
          destination: entry.destination,
          version: entry.manifest.version,
        },
      ])
    ),
    applications: plan.templates
      .filter((entry) => entry.type === 'app')
      .map((entry) => ({
        id: entry.appId,
        template: entry.id,
        destination: entry.destination,
        source: identity,
      })),
  };
  writeJson(path.join(destination, WORKSPACE_RECORD), recordSchema.parse(record));
  return record;
}
export function appendWorkspaceRecord(source, destination, record, plan) {
  const identity = sourceIdentity(source);
  for (const entry of plan.packages)
    record.packages[entry.manifest.name] = {
      name: entry.packageName,
      destination: entry.destination,
      version: entry.manifest.version,
    };
  for (const entry of plan.templates.filter((entry) => entry.type === 'library'))
    record.packages[entry.manifest.name] = {
      name: entry.packageName,
      destination: entry.destination,
      version: entry.manifest.version,
    };
  for (const entry of plan.templates.filter((entry) => entry.type === 'app'))
    record.applications.push({
      id: entry.appId,
      template: entry.id,
      destination: entry.destination,
      source: identity,
    });
  writeJson(path.join(destination, WORKSPACE_RECORD), recordSchema.parse(record));
}
