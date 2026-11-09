import { expect, it, vi } from 'vitest';
import { TextResource } from './text-resource.js';
const contracts = { main: { title: {}, greeting: { name: true } }, demo: { title: {} } };
function main(title = 'Welcome') {
  return {
    namespace: 'main',
    version: '1',
    dictionary: { title, greeting: 'Hello {name}' },
  } as const;
}
const demo = { namespace: 'demo', version: '2', dictionary: { title: 'Example' } } as const;
it('constructs actual scoped containers and composes their readers without copying the parent', () => {
  const root = new TextResource(contracts, [{ locale: 'en', dictionaries: [main()] }]);
  const page = new TextResource(contracts, [{ locale: 'en', dictionaries: [demo] }]);
  const parent = root.createView('en', { required: { main: '1' } });
  const reader = page.createView('en', { required: { demo: '2' }, parent });
  expect(page.hasText('demo', 'en', '2')).toBe(true);
  expect(page.hasText('main', 'en')).toBe(false);
  expect(root.hasText('demo', 'en')).toBe(false);
  expect(reader.getText('main', 'greeting', { name: 0 })).toBe('Hello 0');
  expect(reader.getText('demo', 'title')).toBe('Example');
  expect(reader.namespaces).toEqual(['main', 'demo']);
  expect(Object.isFrozen(reader)).toBe(true);
  const next = new TextResource(contracts, [{ locale: 'en', dictionaries: [main('New')] }]);
  const updated = page.createView('en', { parent: next.createView('en') });
  expect(updated.getText('main', 'title')).toBe('New');
  expect(reader.getText('main', 'title')).toBe('Welcome');
});
it('validates every prepared input and requires local versions before inheritance', () => {
  expect(
    () => new TextResource(contracts, [{ locale: 'en', dictionaries: [main(), main()] }])
  ).toThrow(/Duplicate/);
  expect(
    () =>
      new TextResource(contracts, [
        { locale: 'en', dictionaries: [main()] },
        { locale: 'en', dictionaries: [main()] },
      ])
  ).toThrow(/Duplicate/);
  expect(
    () =>
      new TextResource(contracts, [
        { locale: 'en', dictionaries: [main(), { ...demo, dictionary: { title: 42 } }] },
      ])
  ).toThrow();
  const root = new TextResource(contracts, [{ locale: 'en', dictionaries: [main()] }]);
  const page = new TextResource(contracts, [{ locale: 'en', dictionaries: [demo] }]);
  expect(() =>
    page.createView('en', { required: { main: '1' }, parent: root.createView('en') })
  ).toThrow(/prepared/);
  expect(() => page.createView('en', { required: { demo: 'wrong' } })).toThrow(/prepared/);
  expect(() => root.createView('en', { parent: root.createView('en') })).toThrow(/inherited/);
  expect(() => page.createView('zh', { parent: root.createView('en') })).toThrow(/locale/);
});
it('owns inputs, supports prepared language overrides and diagnoses missing values', () => {
  const input = main();
  const missing = vi.fn();
  const resource = new TextResource(
    contracts,
    [
      { locale: 'en', dictionaries: [input] },
      {
        locale: 'zh',
        dictionaries: [{ ...main(), dictionary: { title: 'Other', greeting: 'Hi {name}' } }],
      },
    ],
    { onMissing: missing }
  );
  // Mutation of caller-owned input cannot change prepared text.
  Reflect.set(input.dictionary, 'title', 'Changed');
  const reader = resource.createView('en');
  expect(reader.getText('main', 'title')).toBe('Welcome');
  expect(reader.getText('main', 'title', undefined, { locale: 'zh' })).toBe('Other');
  expect(reader.getText('demo', 'title')).toBe('demo.title');
  expect(missing).toHaveBeenCalledWith('demo', 'title', 'en');
});
it('preserves constructor bounds, invalid inputs, and empty scope semantics', () => {
  expect(() => new TextResource(contracts, [], { maxLocales: 0 })).toThrow(RangeError);
  expect(
    () =>
      new TextResource(
        contracts,
        [
          { locale: 'en', dictionaries: [main()] },
          { locale: 'zh', dictionaries: [main()] },
        ],
        { maxLocales: 1 }
      )
  ).toThrow(/capacity/);
  expect(() => new TextResource(contracts, [{ locale: '', dictionaries: [] }])).toThrow();
  expect(
    () =>
      new TextResource(contracts, [{ locale: 'en', dictionaries: [{ ...main(), version: '' }] }])
  ).toThrow(/version/);
  expect(
    () =>
      new TextResource(contracts, [
        {
          locale: 'en',
          dictionaries: [{ ...main(), dictionary: { title: 'x', greeting: '{wrong}' } }],
        },
      ])
  ).toThrow();
  const empty = new TextResource(contracts, []);
  expect(empty.hasText('main', 'en')).toBe(false);
  expect(() => empty.createView('en', { required: { main: '1' } })).toThrow(/prepared/);
});
