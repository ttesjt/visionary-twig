import { describe, expect, it } from 'vitest';
import { deriveTextContract, parseTextNamespace } from './dictionary.js';
import { ownTextContracts } from './schema.js';
const defaults = { 'home.title': 'Welcome', greeting: 'Hello {name}, {name}' };
describe('default-derived flat contracts', () => {
  it('derives literal dotted keys and unique variable names without a manual schema', () => {
    const contract = deriveTextContract(defaults);
    expect(contract).toEqual({ greeting: { name: true }, 'home.title': {} });
    expect(
      parseTextNamespace(contract, { 'home.title': '你好', greeting: '{name}，你好' })
    ).toEqual({ 'home.title': '你好', greeting: '{name}，你好' });
    expect(parseTextNamespace(contract, { 'home.title': '你好', greeting: '你好' })).toBeDefined();
    expect(() =>
      parseTextNamespace(contract, { ...defaults, greeting: 'Hello {fileName}' })
    ).toThrow('Unknown text variable');
  });
  it('rejects nested values, incomplete/unknown keys and unsafe JSON', () => {
    for (const invalid of [{ x: {} }, { x: [] }, { x: null }, { x: false }, { x: 1 }, null, []])
      expect(() => deriveTextContract(invalid)).toThrow();
    const contract = deriveTextContract(defaults);
    for (const invalid of [
      { greeting: 'Hello' },
      { ...defaults, typo: 'Hello' },
      { home: { title: 'Welcome' }, greeting: 'Hello' },
    ])
      expect(() => parseTextNamespace(contract, invalid)).toThrow();
    expect(() => deriveTextContract(JSON.parse('{"__proto__":"unsafe"}'))).toThrow();
    expect(() => deriveTextContract({ greeting: 'Hello {bad-name}' })).toThrow();
    expect(() => deriveTextContract({ greeting: 'Hello {' })).toThrow();
  });
  it('owns and recursively freezes contracts without widening generated keys', () => {
    const input = { page: { greeting: { name: true } } };
    const owned = ownTextContracts(input);
    input.page.greeting.name = false;
    expect(owned.page.greeting.name).toBe(true);
    expect(Object.isFrozen(owned.page.greeting)).toBe(true);
    expect(() => ownTextContracts({ page: { greeting: { name: false } } })).toThrow();
  });
});

function readonlyContractTypes() {
  const input = { page: { greeting: { name: true } } };
  const owned = ownTextContracts(input);
  input.page.greeting.name = false;
  // @ts-expect-error every owned contract level is readonly
  owned.page = { greeting: { name: true } };
  // @ts-expect-error every owned key definition is readonly
  owned.page.greeting = { name: true };
  // @ts-expect-error owned variable markers are readonly
  owned.page.greeting.name = false;
  const marker: true = owned.page.greeting.name;
  const key: keyof typeof owned.page = 'greeting';
  // @ts-expect-error validated contracts cannot contain false markers
  const invalid: import('./schema.js').TextNamespaceContract = { greeting: { name: false } };
  return { marker, key, invalid };
}
void readonlyContractTypes;
it('rejects writes through reflection and preserves the caller-owned input', () => {
  const input = { page: { greeting: { name: true } } };
  const owned = ownTextContracts(input);
  expect(Reflect.set(owned.page.greeting, 'name', false)).toBe(false);
  expect(owned.page.greeting.name).toBe(true);
  expect(Object.isFrozen(input.page.greeting)).toBe(false);
});
