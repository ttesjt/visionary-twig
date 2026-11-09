import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { assertSafeData } from '../index.js';
import {
  PREPARED_MANIFEST_VERSION,
  DEFAULT_PREPARED_SOURCE,
  preparedManifestSchema,
  preparedSourceSchema,
  type PreparedDefinition,
  type PreparedSource,
  type ResolvedPrepared,
  type PreparedState,
} from './contracts.js';
import {
  encode,
  hash,
  paths,
  readRaw,
  safePath,
  preparedFiles,
  preparedInventory,
} from './files.js';
import { assertPreparationIdle, assertPreparedState } from './state.js';
export async function readAppInput(app: string, relative: string): Promise<unknown> {
  const value: unknown = JSON.parse(await readRaw(app, relative));
  assertSafeData(value);
  return value;
}
export async function resolvePrepared(
  app: string,
  definition: PreparedDefinition,
  inputSource: PreparedSource = DEFAULT_PREPARED_SOURCE
): Promise<ResolvedPrepared> {
  paths(app, definition);
  const source = preparedSourceSchema.parse(inputSource);
  const inputs: Record<string, string | null> = {};
  const value = await definition.resolve(async (relative, options) => {
    if (options?.format !== undefined && !['json', 'text'].includes(options.format))
      throw new Error('Unsupported prepared input format.');
    let raw: string;
    try {
      raw = await readRaw(app, relative);
    } catch (error) {
      if (
        options?.optional &&
        error instanceof Error &&
        'code' in error &&
        error.code === 'ENOENT'
      ) {
        inputs[relative] = null;
        return undefined;
      }
      throw error;
    }
    inputs[relative] = hash(raw);
    const parsed: unknown = options?.format === 'text' ? raw : JSON.parse(raw);
    assertSafeData(parsed);
    return parsed;
  }, source);
  assertSafeData(value);
  const content = encode(value);
  const files = preparedFiles(definition, value);
  return {
    definition,
    value,
    content,
    manifest: {
      version: PREPARED_MANIFEST_VERSION,
      contractVersion: definition.contractVersion,
      source,
      inputs,
      artifactHash: hash(content),
      ...(definition.additionalFiles || definition.additionalModules
        ? {
            files: Object.fromEntries(
              Object.entries(files).map(([file, body]) => [file, hash(body)])
            ),
          }
        : {}),
    },
  };
}
/** One app lock and rollback-protected directory replacement for all requested artifacts. */
export async function commitPrepared(
  app: string,
  artifacts: readonly ResolvedPrepared[],
  expectedState?: PreparedState
): Promise<void> {
  const first = artifacts[0];
  if (!first) return;
  if (new Set(artifacts.map((item) => item.definition.namespace)).size !== artifacts.length)
    throw new Error('Duplicate prepared namespaces.');
  const { generated, lock } = paths(app, first.definition);
  await safePath(app, generated);
  await mkdir(generated, { recursive: true });
  await mkdir(lock).catch(() => {
    throw new Error('Preparation is already running: ' + app);
  });
  const completed: { output: string; backup: string; existed: boolean }[] = [];
  try {
    if (expectedState) await assertPreparedState(app, expectedState);
    await mkdir(path.join(lock, 'next'));
    await mkdir(path.join(lock, 'previous'));
    for (const item of artifacts) {
      const { output } = paths(app, item.definition);
      await safePath(app, output);
      const stage = path.join(lock, 'next', item.definition.namespace);
      await mkdir(stage);
      for (const [relative, content] of Object.entries(
        preparedFiles(item.definition, item.value)
      )) {
        const file = path.join(stage, relative);
        await mkdir(path.dirname(file), { recursive: true });
        await writeFile(file, content);
      }
      await writeFile(path.join(stage, 'manifest.json'), encode(item.manifest));
    }
    for (const item of artifacts) {
      const { output } = paths(app, item.definition);
      const backup = path.join(lock, 'previous', item.definition.namespace);
      let existed = true;
      try {
        await rename(output, backup);
      } catch (error) {
        if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') throw error;
        existed = false;
      }
      completed.push({ output, backup, existed });
      await rename(path.join(lock, 'next', item.definition.namespace), output);
    }
  } catch (error) {
    for (const item of completed.reverse()) {
      await rm(item.output, { recursive: true, force: true });
      if (item.existed) await rename(item.backup, item.output);
    }
    throw error;
  } finally {
    await rm(lock, { recursive: true, force: true });
  }
}
export async function prepareData(
  app: string,
  definition: PreparedDefinition,
  source: PreparedSource = DEFAULT_PREPARED_SOURCE
): Promise<void> {
  await commitPrepared(app, [await resolvePrepared(app, definition, source)]);
}
export async function readPreparedSource(
  app: string,
  definition: PreparedDefinition
): Promise<PreparedSource> {
  const { output } = paths(app, definition);
  await assertPreparationIdle(app, definition);
  const manifest = preparedManifestSchema.parse(
    await readAppInput(app, path.relative(app, path.join(output, 'manifest.json')))
  );
  if (manifest.contractVersion !== definition.contractVersion)
    throw new Error('Prepared contract version is stale.');
  return manifest.source;
}
export async function checkPrepared(
  app: string,
  definition: PreparedDefinition,
  expectedSource?: PreparedSource
): Promise<PreparedSource> {
  try {
    const source = await readPreparedSource(app, definition);
    if (expectedSource !== undefined && source !== expectedSource)
      throw new Error('Prepared source differs.');
    const resolved = await resolvePrepared(app, definition, source);
    const { output } = paths(app, definition);
    const manifest = await readAppInput(
      app,
      path.relative(app, path.join(output, 'manifest.json'))
    );
    const raw = await readRaw(app, path.relative(app, path.join(output, definition.filename)));
    if (raw !== resolved.content || encode(manifest) !== encode(resolved.manifest))
      throw new Error('Prepared input or artifact is stale/modified.');
    const files = preparedFiles(definition, resolved.value);
    const inventory = await preparedInventory(app, output);
    const expected = [...Object.keys(files), 'manifest.json'].sort();
    if (JSON.stringify(inventory) !== JSON.stringify(expected))
      throw new Error('Prepared output inventory is stale/modified.');
    for (const [relative, content] of Object.entries(files))
      if ((await readRaw(app, path.relative(app, path.join(output, relative)))) !== content)
        throw new Error('Prepared resource is stale/modified: ' + relative);
    return source;
  } catch (error) {
    throw new Error(
      definition.namespace +
        ' is not prepared for ' +
        app +
        '. Run ' +
        definition.namespace +
        ':prepare. ' +
        (error instanceof Error ? error.message : String(error)),
      { cause: error }
    );
  }
}
