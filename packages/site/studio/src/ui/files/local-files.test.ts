import { describe, it, expect } from 'vitest';
import { MAX_STUDIO_PROJECT_BYTES } from '../../data/index.js';
import { jsonFilename, readLocalJson } from './local-files.js';
function file(bytes: Uint8Array): File {
  const input = new File(['data'], 'data.txt');
  Object.defineProperty(input, 'arrayBuffer', { value: () => Promise.resolve(bytes.buffer) });
  return input;
}
describe('project file boundaries', () => {
  it('validates UTF-8, byte limits and reads independently of extension', async () => {
    expect(await readLocalJson(file(new TextEncoder().encode('{}')))).toEqual({
      ok: true,
      value: '{}',
    });
    expect((await readLocalJson(file(new Uint8Array([255])))).ok).toBe(false);
    const oversized = file(new Uint8Array());
    Object.defineProperty(oversized, 'size', { value: MAX_STUDIO_PROJECT_BYTES + 1 });
    expect((await readLocalJson(oversized)).ok).toBe(false);
  });
  it('normalizes filenames without changing a user-selected native file location', () => {
    expect(jsonFilename('../../hello world.json')).toBe('hello-world.json');
    expect(jsonFilename('文档.json')).toBe('文档.json');
  });
});
