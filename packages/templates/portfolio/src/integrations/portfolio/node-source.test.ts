import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { expect, it, vi } from 'vitest';
import { createNodePortfolioSource } from './node-source';

it('identifies and opens the same configuration bytes even after the original changes', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'portfolio-source-'));
  try {
    const configPath = join(directory, 'wrangler.toml');
    const original = 'name = "first"';
    const changed = 'name = "second"';
    await writeFile(configPath, original);
    const openCloud = vi.fn(async (path: string) => {
      expect(dirname(path)).toBe(directory);
      expect(await readFile(path, 'utf8')).toBe(original);
      throw new Error('Connector unavailable');
    });
    const create = () =>
      createNodePortfolioSource({
        configuration: () => ({ kind: 'cloudflare', configPath }),
        openLocal: vi.fn(),
        openCloud,
      });
    const source = create();
    const first = await source();
    await writeFile(configPath, changed);
    expect(await source()).toBe(first);
    await expect(first.open()).rejects.toThrow('Connector unavailable');
    expect(await readdir(directory)).toEqual(['wrangler.toml']);
    expect((await create()()).id).not.toBe(first.id);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
