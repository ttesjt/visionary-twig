import { mkdtemp, mkdir, writeFile, readFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { expect, it } from 'vitest';
import { z } from 'zod';
import { prepareAppConfig, checkPreparedAppConfig } from './node.js';

it('merges optional overrides, tracks changes and preserves valid output on invalid input', async () => {
  const app = await mkdtemp(path.join(tmpdir(), 'auto-inputs-'));
  const write = async (relative: string, value: unknown) => {
    const file = path.join(app, relative);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, JSON.stringify(value));
  };
  try {
    const configuration = {
      version: 1,
      schema: z.strictObject({
        enabled: z.boolean(),
        nested: z.strictObject({ first: z.string(), second: z.string() }),
      }),
    };
    await write('config/default/app.json', {
      enabled: true,
      nested: { first: 'one', second: 'two' },
    });
    const prepare = (source?: 'auto' | 'default' | 'custom') =>
      prepareAppConfig(app, configuration, source);
    const check = () => checkPreparedAppConfig(app, configuration);
    const relative = '.local/config/app.json';
    const artifact = '.generated/config/app.json';
    await prepare();
    await write(relative, { nested: { first: 'changed' } });
    await expect(check()).rejects.toThrow(/stale/);
    await prepare();
    expect(JSON.parse(await readFile(path.join(app, artifact), 'utf8'))).toEqual({
      enabled: true,
      nested: { first: 'changed', second: 'two' },
    });
    await write(relative, {});
    await prepare();
    const before = await readFile(path.join(app, artifact), 'utf8');
    await write(relative, { unknown: true });
    await expect(prepare()).rejects.toThrow();
    expect(await readFile(path.join(app, artifact), 'utf8')).toBe(before);
    await prepare('default');
    expect(await check()).toBe('default');
    await rm(path.join(app, relative));
    await prepare();
    expect(await check()).toBe('auto');
    await expect(prepare('custom')).rejects.toThrow(/ENOENT/);
    await symlink(path.join(app, 'missing.json'), path.join(app, relative));
    await expect(prepare()).rejects.toThrow(/symlink/);
  } finally {
    await rm(app, { recursive: true, force: true });
  }
});
