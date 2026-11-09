import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { textResourcesDefinition } from '@frontend/text-catalog/resource/node';
import { prepareAppConfig, appConfigDefinition } from '@frontend/app-config/node';
import {
  commitPrepared,
  prepareData,
  resolvePrepared,
  readPreparedSource,
  checkPrepared,
} from '@frontend/prepared-data/node';
import { prepareInputs } from '../workspace/inputs.mjs';
const root = path.resolve(import.meta.dirname, '../..');
function fixture(context) {
  mkdirSync(path.join(root, 'test-results'), { recursive: true });
  const app = mkdtempSync(path.join(root, 'test-results/prepared-inputs-'));
  context.after(() => rmSync(app, { recursive: true, force: true }));
  const write = (file, value) => {
    const target = path.join(app, file);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, typeof value === 'string' ? value : JSON.stringify(value));
  };
  write(
    'text-resources.config.ts',
    "export default { version: 1, contentVersion: 'v1', locales: ['en', 'zh'], namespaces: ['main'] };"
  );
  write(
    'config.config.ts',
    `import { z } from 'zod'; export default {version:1,schema:z.strictObject({mode:z.enum(['text','image']),image:z.string().optional(),destination:z.string().optional()}).refine(v=>v.mode==='text'||!!v.image)};`
  );
  for (const locale of ['en', 'zh'])
    write('content/default/text/' + locale + '/main.json', {
      label: locale === 'en' ? 'Default' : '默认',
      opened: 'Opened {filename}',
    });
  write('config/default/app.json', { mode: 'text' });
  const load = async (name) => (await import(pathToFileURL(path.join(app, name)).href)).default;
  return { app, write, load };
}
test('text/config sources stay independent, optional schema fields may be added, failed preparation keeps both outputs', async (context) => {
  const f = fixture(context),
    text = textResourcesDefinition(await f.load('text-resources.config.ts')),
    config = await f.load('config.config.ts');
  await prepareData(f.app, text, 'default');
  await prepareAppConfig(f.app, config, 'default');
  f.write('.local/config/app.json', { mode: 'image', image: '/neutral.svg' });
  await prepareAppConfig(f.app, config, 'custom');
  await prepareData(f.app, text, 'default');
  assert.equal(await readPreparedSource(f.app, appConfigDefinition(config)), 'custom');
  assert.equal(await readPreparedSource(f.app, text), 'default');
  const old = readFileSync(path.join(f.app, '.generated/config/app.json'), 'utf8');
  f.write('.local/config/app.json', { mode: 'image', typo: true });
  await assert.rejects(prepareAppConfig(f.app, config, 'custom'));
  assert.equal(readFileSync(path.join(f.app, '.generated/config/app.json'), 'utf8'), old);
  f.write('.local/content/text/en/main.json', { opened: 'Opened {fileName}' });
  f.write('.local/content/text/zh/main.json', {});
  await assert.rejects(resolvePrepared(f.app, text, 'custom'));
  assert.equal(await checkPrepared(f.app, text), 'default');
});
test('combined commit accepts validated artifacts, changing a declared locale/default hash invalidates checks', async (context) => {
  const f = fixture(context),
    text = textResourcesDefinition(await f.load('text-resources.config.ts')),
    config = await f.load('config.config.ts');
  await commitPrepared(f.app, [
    await resolvePrepared(f.app, text),
    await resolvePrepared(f.app, appConfigDefinition(config)),
  ]);
  f.write('content/default/text/zh/main.json', { label: 'Changed', opened: '{filename}' });
  await assert.rejects(checkPrepared(f.app, text), /stale/);
});

test('three-kind preparation validates combinations and preserves previous artifacts on failure', async (context) => {
  const f = fixture(context);
  f.write(
    'content-resources.config.ts',
    `import { z } from 'zod'; export default {
    version:1,kind:'content',resources:{
      base:{schema:z.strictObject({items:z.array(z.string())}),schemaVersion:'1',defaults:'content/default/data/base.json',custom:'.local/content/data/base.json'},
      detail:{schema:z.strictObject({label:z.string()}),schemaVersion:'1',defaults:'content/default/data/detail.json',custom:'.local/content/data/detail.json'}
    }};`
  );
  f.write('content/default/data/base.json', { items: ['One'] });
  f.write('content/default/data/detail.json', { label: 'Detail' });
  f.write(
    'app-inputs.config.ts',
    `export default {validate(text,config,content) {
    if(config.mode==='image' && !content.values.base.items.length) throw new Error('Images require content');
  }};`
  );
  const { prepareInputs } = await import('../workspace/inputs.mjs');
  const targets = [{ id: 'sample', directory: f.app }];
  await prepareInputs(targets, { source: 'default' });
  await prepareInputs(targets, { check: true });
  f.write('.local/content/data/base.json', { items: [] });
  await prepareInputs(targets, { kind: 'content', source: 'auto' });
  assert.deepEqual(
    JSON.parse(readFileSync(path.join(f.app, '.generated/content/base.json'), 'utf8')),
    { items: [] }
  );
  const oldConfig = readFileSync(path.join(f.app, '.generated/config/app.json'), 'utf8');
  const oldContent = readFileSync(path.join(f.app, '.generated/content/prepared.json'), 'utf8');
  f.write('.local/config/app.json', { mode: 'image', image: '/neutral.svg' });
  await assert.rejects(
    prepareInputs(targets, { kind: 'config', source: 'custom' }),
    /Images require content/
  );
  assert.equal(readFileSync(path.join(f.app, '.generated/config/app.json'), 'utf8'), oldConfig);
  await assert.rejects(prepareInputs(targets, { kind: 'content', source: 'custom' }), {
    code: 'ENOENT',
  });
  assert.equal(
    readFileSync(path.join(f.app, '.generated/content/prepared.json'), 'utf8'),
    oldContent
  );
  f.write('.local/content/data/detail.json', { label: 'Custom' });
  await prepareInputs(targets, { kind: 'content', source: 'custom' });
  await prepareInputs(targets, { check: true });
  assert.deepEqual(
    JSON.parse(readFileSync(path.join(f.app, '.local/content/data/base.json'), 'utf8')),
    { items: [] }
  );
  f.write('content/default/data/detail.json', { label: 'Changed' });
  await assert.rejects(prepareInputs(targets, { check: true }), /stale/);
});

test('namespace paths are checked by the actual format adapter without requiring an app namespace', async (context) => {
  const f = fixture(context);
  rmSync(path.join(f.app, 'config/default/app.json'));
  f.write('config.config.ts', `export {default} from './settings.config.ts';`);
  f.write(
    'settings.config.ts',
    `import {z} from 'zod'; export default {version:1,resources:{
    settings:{schema:z.strictObject({enabled:z.boolean()}),schemaVersion:'1',defaults:'resources/default/settings.json',custom:'.local/settings.json'}
  }};`
  );
  f.write('resources/default/settings.json', { enabled: true });
  const { prepareInputs } = await import('../workspace/inputs.mjs');
  const target = [{ id: 'settings', directory: f.app }];
  await prepareInputs(target, { source: 'default' });
  await prepareInputs(target, { check: true });
  assert.equal(existsSync(path.join(f.app, '.generated/config/app.json')), false);
  assert.deepEqual(
    JSON.parse(readFileSync(path.join(f.app, '.generated/config/settings.json'), 'utf8')),
    { enabled: true }
  );
  await prepareInputs(target, { kind: 'config', source: 'auto' });
  f.write('.local/settings.json', { enabled: false });
  await assert.rejects(prepareInputs(target, { check: true }), /stale/);
  await prepareInputs(target, { kind: 'config', source: 'auto' });
  await prepareInputs(target, { check: true });
  assert.deepEqual(
    JSON.parse(readFileSync(path.join(f.app, '.generated/config/settings.json'), 'utf8')),
    { enabled: false }
  );
  rmSync(path.join(f.app, 'resources/default/settings.json'));
  await assert.rejects(
    prepareInputs(target, { check: true }),
    (error) =>
      error.cause?.code === 'ENOENT' && error.message.includes('resources/default/settings.json')
  );
  const legacy = fixture(context);
  rmSync(path.join(legacy.app, 'config/default/app.json'));
  await assert.rejects(
    prepareInputs([{ id: 'legacy', directory: legacy.app }], { source: 'default' }),
    { code: 'ENOENT' }
  );
});

test('successful text and app preparation print only effective inherited keys, checks stay quiet', async (context) => {
  const { app, write } = fixture(context);
  write('content/default/text/en/main.json', { title: 'Heading', save: 'Save', close: 'Close' });
  write('content/default/text/zh/main.json', {});
  write('.local/content/text/zh/main.json', { title: '标题' });
  const apps = [{ id: 'sample', directory: app }];
  const log = context.mock.method(console, 'log', () => {});
  const reports = () =>
    log.mock.calls
      .map((call) => call.arguments[0])
      .filter((line) => line.includes('inherited from'));
  const expected = ['sample: zh/main inherited from en: ["close","save"]'];
  for (const kind of ['app', 'text']) {
    log.mock.resetCalls();
    await prepareInputs(apps, { kind });
    assert.deepEqual(reports(), expected);
  }
  log.mock.resetCalls();
  await prepareInputs(apps, { kind: 'text', check: true });
  await prepareInputs(apps, { kind: 'config' });
  assert.deepEqual(reports(), []);
  write('config/default/app.json', { mode: 'bad' });
  await assert.rejects(prepareInputs(apps, { kind: 'app' }));
  assert.deepEqual(reports(), []);
  write('config/default/app.json', { mode: 'text' });
  write('content/default/text/zh/main.json', { close: '关闭', save: '保存', title: '标题' });
  await prepareInputs(apps, { kind: 'app' });
  assert.deepEqual(reports(), []);
});
test('app-owned prepared server artifacts share source selection and freshness without replacing text/config', async (context) => {
  const f = fixture(context);
  f.write('notes.md', 'Default server notes.');
  f.write(
    'app-inputs.config.ts',
    `export default { validate() {}, prepared: [{ namespace:'notes', filename:'notes.json', contractVersion:1, async resolve(read,source) { const defaults=await read('notes.md',{format:'text'}); const custom=source==='default'?undefined:await read('.local/notes.md',{format:'text',optional:source==='auto'}); return {text:custom??defaults}; } }] };`
  );
  const apps = [{ id: 'sample', directory: f.app }];
  await prepareInputs(apps, { source: 'auto' });
  assert.deepEqual(
    JSON.parse(readFileSync(path.join(f.app, '.generated/notes/notes.json'), 'utf8')),
    { text: 'Default server notes.' }
  );
  f.write('.local/notes.md', 'Local server notes.');
  await assert.rejects(prepareInputs(apps, { check: true }), /stale/i);
  await prepareInputs(apps, { source: 'auto' });
  await prepareInputs(apps, { kind: 'text', source: 'default' });
  assert.equal(
    JSON.parse(readFileSync(path.join(f.app, '.generated/notes/notes.json'), 'utf8')).text,
    'Local server notes.'
  );
  await prepareInputs(apps, { source: 'default' });
  assert.equal(
    JSON.parse(readFileSync(path.join(f.app, '.generated/notes/notes.json'), 'utf8')).text,
    'Default server notes.'
  );
});
for (const [name, definition, error] of [
  [
    'duplicate namespace',
    "[{namespace:'text',filename:'notes.json',contractVersion:1,async resolve(){return {}}}]",
    /duplicate prepared namespace/,
  ],
  ['non-array definitions', '{}', /must be an array/],
  ['invalid definition', '[{namespace:42}]', /invalid prepared definition/],
])
  test('app preparation rejects ' + name + ' before writing artifacts', async (context) => {
    const f = fixture(context);
    f.write('app-inputs.config.ts', `export default {validate(){},prepared:${definition}};`);
    await assert.rejects(
      prepareInputs([{ id: 'sample', directory: f.app }], { source: 'default' }),
      error
    );
    assert.equal(existsSync(path.join(f.app, '.generated')), false);
  });
