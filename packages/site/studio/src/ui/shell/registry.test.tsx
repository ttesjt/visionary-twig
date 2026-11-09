import { expect, it } from 'vitest';
import { createStudioRegistry } from './registry.js';
const component = () => null;
const group = { id: 'tools', label: 'Tools' };
const page = { id: 'notes', title: 'Notes', group: group.id, component };
it('keeps code-defined order and stable identities independently of translated labels', () => {
  const source = { groups: [group], pages: [page, { ...page, id: 'other', title: '另一个页面' }] };
  const registry = createStudioRegistry(source);
  source.pages.reverse();
  for (const item of source.pages) item.title = 'Changed outside the registry';
  expect(registry.pages.map((item) => item.id)).toEqual(['notes', 'other']);
  expect(registry.findPage('other')?.title).toBe('另一个页面');
  expect(registry.findPage('missing')).toBeUndefined();
  expect(Object.isFrozen(registry.pages)).toBe(true);
  expect(Object.isFrozen(registry.findPage('notes'))).toBe(true);
});
it.each([
  { groups: [group], pages: [] },
  { groups: [group, group], pages: [page] },
  { groups: [group], pages: [page, page] },
  { groups: [group], pages: [{ ...page, group: 'missing' }] },
  { groups: [group], pages: [{ ...page, id: 'Bad ID' }] },
  { groups: [group], pages: [{ ...page, title: ' ' }] },
])('rejects ambiguous or incomplete registration before rendering', (input) => {
  expect(() => createStudioRegistry(input)).toThrow();
});

it('registers route-owned navigation entries without an artificial component', () => {
  const registry = createStudioRegistry({
    groups: [group],
    pages: [{ id: 'records', title: 'Records', group: group.id, rendering: 'route' }],
  });
  expect(registry.findPage('records')).toMatchObject({ rendering: 'route' });
  expect(registry.findPage('records')).not.toHaveProperty('component');
});
