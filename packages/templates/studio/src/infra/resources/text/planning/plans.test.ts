import { expect, it } from 'vitest';
import { registeredTextNamespaces } from './plans';

it('resolves editable namespace lists against the prepared contract without assuming pages exist', () => {
  expect(registeredTextNamespaces([])).toEqual([]);
  expect(registeredTextNamespaces(['main'])).toEqual(['main']);
  expect(() => registeredTextNamespaces(['unregistered-text'])).toThrow(
    'Unknown text namespace: unregistered-text'
  );
});
