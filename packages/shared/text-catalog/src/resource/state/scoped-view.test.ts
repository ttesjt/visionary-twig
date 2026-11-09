import { describe, expect, it } from 'vitest';
import { TextResource } from './text-resource.js';
import type { TextViewDictionary } from './types.js';

const contracts = { main: { title: {} }, page: { title: {}, greeting: { name: true } } };
const global = [{ namespace: 'main', dictionary: { title: 'Main' }, version: '1' }] as const;
const page = [
  { namespace: 'page', dictionary: { title: 'Page', greeting: 'Hello {name}' }, version: '1' },
] as const;

function resource(dictionaries: readonly TextViewDictionary<typeof contracts>[], locale = 'en') {
  return new TextResource(contracts, [{ locale, dictionaries }]);
}

describe('scoped text views', () => {
  it('composes independently owned page text without changing its parent', () => {
    const owner = resource(global);
    const parent = owner.createView('en');
    const local = resource(page).createView('en', { parent });
    expect(local.getText('main', 'title')).toBe('Main');
    expect(local.getText('page', 'greeting', { name: 'Reader' })).toBe('Hello Reader');
    expect(local.hasText('page', 'en', '1')).toBe(true);
    expect(local.hasText('page', 'zh', '1')).toBe(false);
    expect(local.hasText('page', 'en', '2')).toBe(false);
    expect(parent.hasText('page', 'en')).toBe(false);
    expect(owner.hasText('main', 'en')).toBe(true);
    expect(owner.hasText('page', 'en')).toBe(false);
    expect(Object.isFrozen(local)).toBe(true);
  });

  it('pins old readers, inherits a newly published parent, and owns caller inputs', () => {
    const owner = resource(global);
    const parent = owner.createView('en');
    const input = { title: 'Page', greeting: 'Hello {name}' };
    const before = resource([{ namespace: 'page', dictionary: input, version: '1' }]).createView(
      'en',
      { parent }
    );
    input.title = 'Changed';
    const nextParent = resource([
      { namespace: 'main', dictionary: { title: 'Updated main' }, version: '2' },
    ]).createView('en');
    const after = resource(page).createView('en', { parent: nextParent });
    expect(before.getText('page', 'title')).toBe('Page');
    expect(before.getText('main', 'title')).toBe('Main');
    expect(after.getText('main', 'title')).toBe('Updated main');
  });

  it('rejects inherited namespace collisions, duplicate namespaces, mixed locales and incomplete batches', () => {
    const owner = resource(global);
    const parent = owner.createView('en');
    expect(() => resource(global).createView('en', { parent })).toThrow(/inherited/);
    expect(() => resource([...page, ...page]).createView('en', { parent })).toThrow(/Duplicate/);
    expect(() => resource(page, 'zh').createView('zh', { parent })).toThrow(/locale/);
    expect(() =>
      resource([...global, { namespace: 'page', dictionary: {}, version: '1' }])
    ).toThrow();
    expect(parent.getText('main', 'title')).toBe('Main');
    expect(owner.hasText('main', 'en')).toBe(true);
  });
});
