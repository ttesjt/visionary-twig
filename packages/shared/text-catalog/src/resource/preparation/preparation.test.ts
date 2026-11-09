import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { expect, it } from 'vitest';
import {
  prepareData,
  checkPrepared,
  capturePreparedState,
  resolvePrepared,
  commitPrepared,
} from '@frontend/prepared-data/node';
import { textContractSchema } from '../contracts/schema.js';
import { textResourceManifestSchema } from '../manifest.js';
import type { InheritedTextKeys } from './resolve-locales.js';
import { textResourcesDefinition } from './definition.js';
const configuration = {
  version: 1,
  contentVersion: 'v1',
  referenceLocale: 'en',
  locales: ['en', 'zh'],
  namespaces: ['main', 'demo'],
};
async function fixture(
  run: (
    app: string,
    write: (relative: string, value: unknown) => Promise<void>,
    read: (relative: string) => Promise<unknown>
  ) => Promise<void>
) {
  const app = await mkdtemp(path.join(tmpdir(), 'flat-text-'));
  const write = async (relative: string, value: unknown) => {
    const file = path.join(app, relative);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, JSON.stringify(value));
  };
  const read = async (relative: string): Promise<unknown> =>
    JSON.parse(await readFile(path.join(app, relative), 'utf8'));
  try {
    for (const locale of configuration.locales) {
      await write(`content/default/text/${locale}/main.json`, {
        'home.title': locale + ' default',
      });
      await write(`content/default/text/${locale}/demo.json`, {
        title: locale + ' demo',
        greeting: 'Hello {name}',
      });
    }
    await run(app, write, read);
  } finally {
    await rm(app, { recursive: true, force: true });
  }
}
it('prepares contracts from defaults and keeps custom changes out of the contract', async () =>
  fixture(async (app, write, read) => {
    const definition = textResourcesDefinition(configuration);
    await prepareData(app, definition);
    const contract = await read('.generated/text/contracts.json');
    expect(contract).toEqual({
      version: 1,
      referenceLocale: 'en',
      namespaces: { main: { 'home.title': {} }, demo: { greeting: { name: true }, title: {} } },
    });
    const original = textResourceManifestSchema.parse(await read('.generated/text/resources.json'));
    expect(await checkPrepared(app, definition)).toBe('auto');
    await write('.local/content/text/en/demo.json', { title: 'Custom' });
    await expect(checkPrepared(app, definition)).rejects.toThrow(/stale/);
    await prepareData(app, definition);
    expect(await read('.generated/text/en/demo.json')).toEqual({
      title: 'Custom',
      greeting: 'Hello {name}',
    });
    expect(await read('.generated/text/contracts.json')).toEqual(contract);
    const changed = textResourceManifestSchema.parse(await read('.generated/text/resources.json'));
    expect(changed.revision).not.toBe(original.revision);
    expect(changed.contractRevision).toBe(original.contractRevision);
    for (const invalid of [
      { typo: 'Unknown' },
      { greeting: 'Hello {fileName}' },
      { greeting: { nested: 'Wrong' } },
    ]) {
      const before = await readFile(path.join(app, '.generated/text/catalog.json'), 'utf8');
      await write('.local/content/text/en/demo.json', invalid);
      await expect(prepareData(app, definition)).rejects.toThrow(/demo\/en/);
      expect(await readFile(path.join(app, '.generated/text/catalog.json'), 'utf8')).toBe(before);
      expect(await read('.generated/text/contracts.json')).toEqual(contract);
      expect(await read('.generated/text/resources.json')).toEqual(changed);
    }
    await prepareData(app, definition, 'default');
    expect(await read('.generated/text/resources.json')).toEqual(original);
    await expect(prepareData(app, definition, 'custom')).rejects.toThrow();
    for (const locale of configuration.locales)
      for (const namespace of configuration.namespaces)
        await write(`.local/content/text/${locale}/${namespace}.json`, {});
    await prepareData(app, definition, 'custom');
    expect(await checkPrepared(app, definition, 'custom')).toBe('custom');
    expect(await read('.local/content/text/en/demo.json')).toEqual({});
  }));
it('derives new keys and variables after changing only tracked JSON defaults', async () =>
  fixture(async (app, write, read) => {
    const definition = textResourcesDefinition(configuration);
    await prepareData(app, definition);
    const before = textResourceManifestSchema.parse(await read('.generated/text/resources.json'));
    for (const locale of configuration.locales)
      await write(`content/default/text/${locale}/demo.json`, {
        title: locale,
        greeting: 'Hello {reader}',
        'added.key': 'New {count}',
      });
    await expect(checkPrepared(app, definition)).rejects.toThrow(/stale/);
    await prepareData(app, definition);
    const contracts = textContractSchema.parse(await read('.generated/text/contracts.json'));
    expect(contracts.namespaces.demo).toEqual({
      'added.key': { count: true },
      greeting: { reader: true },
      title: {},
    });
    expect(
      textResourceManifestSchema.parse(await read('.generated/text/resources.json'))
        .contractRevision
    ).not.toBe(before.contractRevision);
  }));
it('validates tracked translations before overrides, including keys and variable spelling', async () =>
  fixture(async (app, write) => {
    const definition = textResourcesDefinition(configuration);
    await prepareData(app, definition);
    const valid = await readFile(path.join(app, '.generated/text/contracts.json'), 'utf8');
    for (const invalid of [
      { title: 0 },
      { title: 'Title', greeting: 'Hello {bad-name}' },
      { title: 'Title', greetnig: 'Typo' },
      { title: 'Title', greeting: 'Hello {fileName}' },
      { title: 'Title', greeting: 'Hello', extra: 'Unknown' },
    ]) {
      await write('content/default/text/zh/demo.json', invalid);
      await write('.local/content/text/zh/demo.json', {
        title: 'Repaired',
        greeting: 'Hello {name}',
      });
      await expect(prepareData(app, definition)).rejects.toThrow(/demo\/zh/);
      expect(await readFile(path.join(app, '.generated/text/contracts.json'), 'utf8')).toBe(valid);
    }
  }));
it('checks contract contents and complete output inventories without rewriting them', async () =>
  fixture(async (app, write) => {
    const definition = textResourcesDefinition(configuration);
    for (const operation of ['modified', 'missing', 'extra']) {
      await prepareData(app, definition);
      if (operation === 'modified') await write('.generated/text/contracts.json', {});
      if (operation === 'missing') await rm(path.join(app, '.generated/text/en/main.json'));
      if (operation === 'extra') await write('.generated/text/old.json', {});
      await expect(checkPrepared(app, definition)).rejects.toThrow();
    }
  }));
it('keeps contract and dictionaries paired when two resolved preparations race', async () =>
  fixture(async (app, write, read) => {
    const definition = textResourcesDefinition(configuration);
    const expected = await capturePreparedState(app, [definition]);
    const first = await resolvePrepared(app, definition);
    for (const locale of configuration.locales)
      await write(`content/default/text/${locale}/main.json`, {
        'home.title': locale,
        new: 'New key',
      });
    const second = await resolvePrepared(app, definition);
    await commitPrepared(app, [first], expected);
    await expect(commitPrepared(app, [second], expected)).rejects.toThrow();
    expect(
      textContractSchema.parse(await read('.generated/text/contracts.json')).namespaces.main
    ).toEqual({ 'home.title': {} });
    expect(await read('.generated/text/en/main.json')).toEqual({ 'home.title': 'en default' });
  }));
it('rejects malformed preparation declarations without requiring generated output', () => {
  for (const invalid of [
    { ...configuration, missingKeys: 'unknown' },
    { ...configuration, namespaces: [] },
    { ...configuration, namespaces: ['main', 'main'] },
    { ...configuration, locales: ['en', 'en'] },
    { ...configuration, referenceLocale: 'fr' },
    { ...configuration, namespaces: ['../escape'] },
    { ...configuration, contentVersion: '../v1' },
  ])
    expect(() => textResourcesDefinition(invalid)).toThrow();
});

it('regenerates server imports from the manifest when languages and namespaces change', async () =>
  fixture(async (app, write) => {
    for (const locale of ['en', 'zh', 'fr']) {
      await write('content/default/text/' + locale + '/extra.json', { title: 'Extra' });
      if (locale === 'fr') {
        await write('content/default/text/fr/main.json', { 'home.title': 'Bienvenue' });
        await write('content/default/text/fr/demo.json', {
          title: 'Demo',
          greeting: 'Hello {name}',
        });
      }
    }
    const expanded = textResourcesDefinition({
      ...configuration,
      locales: ['en', 'zh', 'fr'],
      namespaces: ['main', 'demo', 'extra'],
    });
    await prepareData(app, expanded);
    const file = path.join(app, '.generated/text/server-imports.ts');
    const source = await readFile(file, 'utf8');
    expect(source).toContain('import("./fr/extra.json")');
    await writeFile(file, source + '// modified');
    await expect(checkPrepared(app, expanded)).rejects.toThrow(/modified/);
    await prepareData(app, textResourcesDefinition(configuration));
    expect(await readFile(file, 'utf8')).not.toContain('fr/');
    await expect(readFile(path.join(app, '.generated/text/fr/extra.json'))).rejects.toThrow(
      /ENOENT/
    );
  }));
it('fills only absent keys from the effective English reference and reports them in order', async () =>
  fixture(async (app, write, read) => {
    const report: InheritedTextKeys[] = [];
    const definition = textResourcesDefinition(
      { version: 1, contentVersion: 'v1', locales: ['zh', 'en'], namespaces: ['demo', 'main'] },
      (entry) => report.push(entry)
    );
    await write('content/default/text/en/demo.json', {
      z: 'Untranslated',
      title: 'Same',
      greeting: 'Hello {name}',
      a: 'First',
    });
    await write('content/default/text/zh/demo.json', { title: 'Same' });
    await write('.local/content/text/en/demo.json', { greeting: 'Welcome {name}', a: 'Custom' });
    await write('.local/content/text/zh/demo.json', { a: '本地' });

    await prepareData(app, definition);
    expect(await read('.generated/text/zh/demo.json')).toEqual({
      title: 'Same',
      greeting: 'Welcome {name}',
      z: 'Untranslated',
      a: '本地',
    });
    expect(report).toEqual([
      { referenceLocale: 'en', locale: 'zh', namespace: 'demo', keys: ['greeting', 'z'] },
    ]);
    report.length = 0;
    await prepareData(app, definition, 'default');
    expect(await read('.generated/text/zh/demo.json')).toEqual({
      title: 'Same',
      greeting: 'Hello {name}',
      a: 'First',
      z: 'Untranslated',
    });
    expect(report[0]?.keys).toEqual(['a', 'greeting', 'z']);
    expect(await read('content/default/text/zh/demo.json')).toEqual({ title: 'Same' });
    await write('content/default/text/en/demo.json', {
      z: 'Changed',
      title: 'Same',
      greeting: 'Hello {name}',
      a: 'First',
    });
    await expect(checkPrepared(app, definition)).rejects.toThrow(/stale/);
  }));

it('supports a different reference locale and an explicitly empty translated namespace', async () =>
  fixture(async (app, write, read) => {
    const definition = textResourcesDefinition({ ...configuration, referenceLocale: 'zh' });
    await write('content/default/text/en/demo.json', {});
    for (const locale of configuration.locales)
      for (const namespace of configuration.namespaces)
        await write(`.local/content/text/${locale}/${namespace}.json`, {});
    await write('.local/content/text/zh/demo.json', { title: '参考文案' });
    await prepareData(app, definition, 'custom');
    expect(await read('.generated/text/en/demo.json')).toEqual({
      title: '参考文案',
      greeting: 'Hello {name}',
    });
    await rm(path.join(app, 'content/default/text/en/demo.json'));
    await expect(prepareData(app, definition)).rejects.toThrow(/demo\/en/);
  }));

it('strict mode rejects missing tracked keys even when the target custom fills the gap', async () =>
  fixture(async (app, write, read) => {
    const definition = textResourcesDefinition({ ...configuration, missingKeys: 'error' });
    await write('content/default/text/zh/demo.json', { title: '标题' });
    await write('.local/content/text/zh/demo.json', { greeting: '你好 {name}' });
    await expect(prepareData(app, definition)).rejects.toThrow(/Missing text keys: greeting/);
    await write('content/default/text/zh/demo.json', { title: '标题', greeting: '您好' });
    await prepareData(app, definition);
    expect(await read('.generated/text/zh/demo.json')).toEqual({
      title: '标题',
      greeting: '你好 {name}',
    });
  }));
