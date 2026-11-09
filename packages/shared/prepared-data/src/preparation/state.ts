import { lstat } from 'node:fs/promises';
import path from 'node:path';
import type { PreparedDefinition, PreparedState, ResolvedPrepared } from './contracts.js';
import { encode, hash, paths, readRaw, safePath, preparedInventory } from './files.js';

export async function assertPreparationIdle(
  app: string,
  definition: PreparedDefinition
): Promise<void> {
  const { lock } = paths(app, definition);
  await safePath(app, lock);
  try {
    await lstat(lock);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return;
    throw error;
  }
  throw new Error('Preparation is in progress.');
}
async function fileHash(app: string, relative: string): Promise<string | null> {
  try {
    return hash(await readRaw(app, relative));
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return null;
    throw error;
  }
}
/** Capture before reading/validating a combination; commit rechecks it under the app lock. */
export async function capturePreparedState(
  app: string,
  definitions: readonly PreparedDefinition[]
): Promise<PreparedState> {
  const first = definitions[0];
  if (!first) throw new Error('Prepared state requires at least one definition.');
  await assertPreparationIdle(app, first);
  const files: Record<string, string | null> = {};
  const inventories: Record<string, readonly string[] | null> = {};
  for (const definition of definitions) {
    const { output } = paths(app, definition);
    const inventory = await preparedInventory(app, output);
    inventories[path.relative(app, output)] = inventory;
    for (const filename of new Set([definition.filename, 'manifest.json', ...(inventory ?? [])])) {
      const relative = path.relative(app, path.join(output, filename));
      files[relative] = await fileHash(app, relative);
    }
  }
  await assertPreparationIdle(app, first);
  return { app, files, inventories };
}
/** Bind unchanged resolved values to the snapshot, even if another writer changed then restored a namespace. */
export function assertPreparedBasis(
  state: PreparedState,
  artifacts: readonly ResolvedPrepared[]
): void {
  for (const artifact of artifacts) {
    const { output } = paths(state.app, artifact.definition);
    const content =
      state.files[path.relative(state.app, path.join(output, artifact.definition.filename))];
    const manifest = state.files[path.relative(state.app, path.join(output, 'manifest.json'))];
    // Never-prepared counterparts use resolved defaults; commit still guards their absence.
    if (content === null && manifest === null) continue;
    if (content !== hash(artifact.content) || manifest !== hash(encode(artifact.manifest)))
      throw new Error('Prepared inputs changed during resolution. Run preparation again.');
  }
}
/** Called only after acquiring the app-wide commit lock, before staging any output. */
export async function assertPreparedState(app: string, state: PreparedState): Promise<void> {
  if (state.app !== app) throw new Error('Prepared state belongs to a different app.');
  for (const [directory, expected] of Object.entries(state.inventories ?? {}))
    if (
      JSON.stringify(await preparedInventory(app, path.join(app, directory))) !==
      JSON.stringify(expected)
    )
      throw new Error('Prepared outputs changed during validation. Run preparation again.');
  for (const [relative, expected] of Object.entries(state.files)) {
    if ((await fileHash(app, relative)) !== expected)
      throw new Error('Prepared inputs changed during validation. Run preparation again.');
  }
}
