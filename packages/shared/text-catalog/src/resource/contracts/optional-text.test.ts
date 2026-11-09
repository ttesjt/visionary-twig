import { expect, it } from 'vitest';
import { deriveTextContract, parseTextDictionary } from './dictionary.js';
it('preserves explicitly blank optional text while requiring keys and string values', () => {
  const contract = deriveTextContract({ title: 'Heading', subtitle: '' });
  const parsed = parseTextDictionary(contract, { title: 'Heading', subtitle: '' });
  expect(parsed.dictionary.subtitle).toBe('');
  expect(parsed.templates.get('subtitle')).toEqual([{ kind: 'text', value: '' }]);
  expect(() => deriveTextContract({ '': 'value' })).toThrow();
  expect(() => parseTextDictionary(contract, { title: 'Heading', subtitle: null })).toThrow();
  expect(() => parseTextDictionary(contract, { title: 'Heading' })).toThrow(/Missing text keys/);
});
