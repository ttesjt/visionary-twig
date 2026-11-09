import { createHash } from 'node:crypto';
import { lstat, readFile, realpath, readdir } from 'node:fs/promises';
import path from 'node:path';
import { assertSafeData } from '../index.js';
import type { PreparedDefinition } from './contracts.js';

export const encode = (value: unknown): string => JSON.stringify(value, null, 2) + '\n';
export const hash = (value: string): string => createHash('sha256').update(value).digest('hex');
function within(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative);
}
export function paths(app: string, definition: PreparedDefinition) {
  if (!Number.isSafeInteger(definition.contractVersion) || definition.contractVersion < 1)
    throw new Error('Prepared contract version must be a positive safe integer.');
  if (!path.isAbsolute(app)) throw new Error('Prepared app root must be absolute.');
  if (
    !/^[a-z][a-z0-9-]*$/.test(definition.namespace) ||
    !/^[a-z][a-z0-9-]*\.json$/.test(definition.filename)
  )
    throw new Error('Invalid prepared output name.');
  const generated = path.join(app, '.generated');
  return {
    generated,
    output: path.join(generated, definition.namespace),
    lock: path.join(generated, 'prepare.lock'),
  };
}
export async function safePath(app: string, filename: string): Promise<void> {
  const root = await realpath(app);
  let cursor = filename;
  while (within(app, cursor) && cursor !== app) {
    try {
      const info = await lstat(cursor);
      if (info.isSymbolicLink() || !within(root, await realpath(cursor)))
        throw new Error('Prepared path escapes app or contains a symlink.');
    } catch (error) {
      if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') throw error;
    }
    cursor = path.dirname(cursor);
  }
  if (!within(app, filename)) throw new Error('Prepared path escapes app.');
}
export async function readRaw(app: string, relative: string): Promise<string> {
  const file = path.resolve(app, relative);
  await safePath(app, file);
  if (!(await lstat(file)).isFile())
    throw new Error('Prepared input must be a regular file: ' + relative);
  return readFile(file, 'utf8');
}

/** Portable nested JSON paths; no absolute paths, traversal or reserved manifest. */
export function preparedFiles(
  definition: PreparedDefinition,
  value: unknown
): Readonly<Record<string, string>> {
  const files: Record<string, string> = { [definition.filename]: encode(value) };
  function add(relative: string, content: string, extension: 'json' | 'ts'): void {
    const segments = relative.split('/');
    const filename = segments.pop();
    if (
      !filename ||
      !/^[a-zA-Z0-9][a-zA-Z0-9_-]*\.(json|ts)$/.test(filename) ||
      !filename.endsWith('.' + extension) ||
      segments.some((segment) => !/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(segment)) ||
      relative === 'manifest.json' ||
      Object.hasOwn(files, relative) ||
      typeof content !== 'string'
    )
      throw new Error('Invalid additional prepared file: ' + relative);
    files[relative] = content;
  }
  for (const [relative, data] of Object.entries(definition.additionalFiles?.(value) ?? {})) {
    assertSafeData(data);
    add(relative, encode(data), 'json');
  }
  for (const [relative, source] of Object.entries(definition.additionalModules?.(value) ?? {}))
    add(relative, source, 'ts');
  return files;
}
export async function preparedInventory(
  app: string,
  directory: string
): Promise<readonly string[] | null> {
  await safePath(app, directory);
  try {
    await lstat(directory);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return null;
    throw error;
  }
  const result: string[] = [];
  async function visit(folder: string): Promise<void> {
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      const filename = path.join(folder, entry.name);
      await safePath(app, filename);
      if (entry.isDirectory()) await visit(filename);
      else if (entry.isFile())
        result.push(path.relative(directory, filename).split(path.sep).join('/'));
      else throw new Error('Prepared outputs must be regular files.');
    }
  }
  await visit(directory);
  return result.sort();
}

export function preparedDataRevision(value: unknown): string {
  assertSafeData(value);
  return hash(encode(value));
}
