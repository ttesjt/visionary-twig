// @vitest-environment node

import { describe, it, expect } from 'vitest';
import {
  setCatalogValue,
  renameCatalogKey,
  deleteCatalogKey,
  catalogReferences,
  catalogEntries,
} from './operations.js';
import {
  bindProjectField,
  unbindProjectField,
  validateBoundValue,
} from '../bindings/operations.js';
import {
  createProjectHistory,
  commitProject,
  undoProject,
  redoProject,
} from '../session/history.js';
import { parseVariablePath, formatVariablePath } from '../bindings/path-input.js';
import { project, registry } from '../../../test/data/fixture.js';
describe('catalog and layout transactions', () => {
  it('renames every loaded language and binding as one reversible transaction', () => {
    const initial = project();
    const renamed = renameCatalogKey(initial, ['hero', 'title'], ['intro', 'heading'], registry);
    expect(renamed.ok).toBe(true);
    if (!renamed.ok) return;
    expect(renamed.value.catalogs).toMatchObject({
      en: { intro: { heading: 'A quiet place' } },
      zh: { intro: { heading: '安静的地方' } },
    });
    expect(renamed.value.document.bindings?.[0]?.sourcePath).toEqual(['copy', 'intro', 'heading']);
    expect(catalogReferences(renamed.value, ['intro'])).toHaveLength(1);
    const history = commitProject(createProjectHistory(initial), renamed.value);
    expect(undoProject(history).present).toEqual(initial);
    expect(redoProject(undoProject(history)).present).toEqual(renamed.value);
  });
  it('rejects deletion of referenced keys and conflicting rename destinations', () => {
    expect(deleteCatalogKey(project(), ['hero'], registry)).toMatchObject({
      ok: false,
      errors: [{ code: 'referenced-key' }],
    });
    const added = setCatalogValue(project(), 'en', ['existing'], 'keep', registry);
    if (!added.ok) throw new Error('fixture');
    expect(renameCatalogKey(added.value, ['hero'], ['existing'], registry).ok).toBe(false);
  });
  it('creates nested keys without silently populating other languages', () => {
    const result = setCatalogValue(project(), 'fr', ['hero', 'title'], 'Bonjour', registry);
    expect(result).toMatchObject({
      ok: true,
      value: { catalogs: { fr: { hero: { title: 'Bonjour' } } } },
    });
    expect(project().catalogs).not.toHaveProperty('fr');
    expect(
      catalogEntries({ link: { url: '/one' }, list: [1, 2] }).map((entry) => entry.path.join('.'))
    ).toEqual(['link', 'link.url', 'list']);
  });
  it.each([['__proto__'], ['constructor'], ['prototype']])(
    'rejects unsafe key paths %s',
    (segment) => {
      expect(setCatalogValue(project(), 'en', [segment], 'no', registry).ok).toBe(false);
      expect({}).not.toHaveProperty('polluted');
    }
  );
  it('validates structured binding values against their schema', () => {
    expect(validateBoundValue(project(), 'title', ['text'], { bad: true }, 'en', registry).ok).toBe(
      false
    );
    expect(validateBoundValue(project(), 'title', ['text'], 'Fine', 'en', registry)).toEqual({
      ok: true,
      value: 'Fine',
    });
  });
  it('preserves the chosen static value and catalogs when explicitly unbinding', () => {
    const input = project();
    const unbound = unbindProjectField(input, 'title', ['text'], 'zh', registry);
    expect(unbound.ok).toBe(true);
    if (!unbound.ok) return;
    expect(unbound.value.document.bindings).toEqual([]);
    expect(unbound.value.catalogs).toEqual(input.catalogs);
    expect(unbound.value.document.data.content[0]?.props.content).toMatchObject([
      { props: { text: '安静的地方' } },
    ]);
  });
  it('permits an unresolved new source but rejects reserved, missing and slot targets', () => {
    expect(bindProjectField(project(), 'title', ['text'], ['copy', 'new'], registry).ok).toBe(true);
    for (const [node, path] of [
      ['title', 'id'],
      ['layout', 'content'],
      ['unknown', 'text'],
    ])
      expect(bindProjectField(project(), node ?? '', ['' + path], ['copy', 'x'], registry).ok).toBe(
        false
      );
  });
  it('includes context and catalogs in history and clears redo after a new edit', () => {
    const initial = project();
    const changed = { ...initial, context: { value: 'new' } };
    let history = commitProject(createProjectHistory(initial), changed);
    history = undoProject(history);
    expect(history.present).toEqual(initial);
    history = commitProject(history, { ...initial, catalogs: {} });
    expect(history.future).toEqual([]);
    expect(undoProject(history).present).toEqual(initial);
  });
});

it('supports explicit literal-dot segments without guessing keys from text', () => {
  expect(parseVariablePath('["hero.title","text"]')).toEqual({
    ok: true,
    value: ['hero.title', 'text'],
  });
  expect(formatVariablePath(['hero.title', 'text'])).toBe('["hero.title","text"]');
  expect(parseVariablePath('copy..title').ok).toBe(false);
});

it('bounds newly created key paths before recursion and round-trips bracket or whitespace keys', () => {
  expect(
    setCatalogValue(
      project(),
      'en',
      Array.from({ length: 1000 }, () => 'nested'),
      'value',
      registry
    )
  ).toMatchObject({ ok: false, errors: [{ code: 'path-too-long' }] });
  for (const path of [['[literal]', 'title'], [' headline '], ['a.b', 'c']])
    expect(parseVariablePath(formatVariablePath(path))).toEqual({ ok: true, value: path });
});
