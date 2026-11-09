import { mkdir, readFile, realpath, rename, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { assertObjectKey, assertObjectSize, type ObjectStorage } from '@frontend/storage';
function missing(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}
export function createFileObjectStorage(directory: string): ObjectStorage {
  if (!path.isAbsolute(directory)) throw new Error('Media directory must be absolute.');
  async function location(key: string, write = false) {
    assertObjectKey(key);
    if (write) await mkdir(directory, { recursive: true });
    const root = await realpath(directory);
    const file = path.join(root, key);
    if (write) await mkdir(path.dirname(file), { recursive: true });
    const resolved = await realpath(write ? path.dirname(file) : file);
    const relative = path.relative(root, resolved);
    if (relative.startsWith('..') || path.isAbsolute(relative))
      throw new Error('Media path escaped its configured root.');
    return file;
  }
  return {
    async get(key) {
      try {
        const file = await location(key);
        assertObjectSize((await stat(file)).size);
        const bytes = new Uint8Array(await readFile(file));
        assertObjectSize(bytes.byteLength);
        const metadata: unknown = JSON.parse(await readFile(file + '.json', 'utf8'));
        if (
          typeof metadata !== 'object' ||
          metadata === null ||
          !('contentType' in metadata) ||
          typeof metadata.contentType !== 'string'
        )
          throw new Error('Invalid object metadata.');
        return { bytes, contentType: metadata.contentType };
      } catch (error) {
        if (missing(error)) return null;
        throw error;
      }
    },
    async put(key, object) {
      assertObjectSize(object.bytes.byteLength);
      const file = await location(key, true);
      const temporary = file + '.' + randomUUID() + '.tmp';
      await writeFile(temporary, object.bytes, { flag: 'wx' });
      await rename(temporary, file);
      await writeFile(file + '.json', JSON.stringify({ contentType: object.contentType }));
    },
  };
}
