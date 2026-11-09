import { expect, it } from 'vitest';
import { z } from 'zod';
import {
  createNavigationCatalog,
  defineNavigationPreset,
  inspectNavigationPresentation,
  resolveNavigationPresentation,
  navigationPresentationMedia,
} from './catalog.js';
const title = z.strictObject({ text: z.string().min(1) });
const icon = z.strictObject({ url: z.string().startsWith('/') });
const empty = z.strictObject({});
const catalog = createNavigationCatalog({
  parts: {
    title: {
      word: { schema: title },
      icon: { schema: icon, mediaSources: (options) => [icon.parse(options).url] },
    },
    item: {},
    progress: {},
  },
  presets: {
    study: defineNavigationPreset(title, (options) => ({
      title: { id: 'word', options },
      item: { id: 'default' },
      progress: { id: 'default' },
    })),
  },
});
it('retains the neutral fallback and resolves code-owned presets without changing caller data', () => {
  expect(resolveNavigationPresentation(undefined, catalog).preset).toBe('default');
  const input = { preset: 'study', options: { text: 'Fieldnotes' } };
  const before = JSON.stringify(input);
  expect(resolveNavigationPresentation(input, catalog).parts.title).toEqual({
    id: 'word',
    options: { text: 'Fieldnotes' },
  });
  expect(JSON.stringify(input)).toBe(before);
});
it('replaces one part while keeping the preset selection for other slots', () => {
  const input = {
    preset: 'study',
    options: { text: 'Fieldnotes' },
    parts: { title: { id: 'icon', options: { url: '/mark.svg' } } },
  };
  const resolved = resolveNavigationPresentation(input, catalog);
  expect(resolved.parts.title).toEqual({ id: 'icon', options: { url: '/mark.svg' } });
  expect(resolved.parts.item.id).toBe('default');
  expect(resolved.parts.progress.id).toBe('default');
  expect(navigationPresentationMedia(input, catalog)).toEqual(['/mark.svg']);
});
it('rejects unknown presets, slots, options and prototype keys instead of silently falling back', () => {
  for (const input of [
    { preset: 'missing' },
    { preset: 'constructor' },
    { preset: 'study', options: { typo: 'Fieldnotes' } },
    { parts: { title: { id: 'word' } } },
    { parts: { item: { id: 'word', options: { text: 'Wrong slot' } } } },
    { parts: { progress: { id: 'default', options: { color: 'red' } } } },
  ])
    expect(inspectNavigationPresentation(input, catalog).ok).toBe(false);
  const result = inspectNavigationPresentation({ parts: { title: { id: 'word' } } }, catalog);
  if (result.ok) throw new Error('Expected invalid title');
  expect(result.issues[0]?.path).toEqual(['parts', 'title', 'options', 'text']);
});
it('does not grant media access to superseded visual parts or unused options', () => {
  const input = { parts: { title: { id: 'icon', options: { url: '/used.svg' } } } };
  expect(navigationPresentationMedia(input, catalog)).toEqual(['/used.svg']);
  expect(
    navigationPresentationMedia({ preset: 'study', options: { text: '/not-media.svg' } }, catalog)
  ).toEqual([]);
});
it('reserves default definitions so site extension cannot replace shared behavior', () => {
  expect(() =>
    createNavigationCatalog({
      parts: { title: { default: { schema: empty } }, item: {}, progress: {} },
      presets: {},
    })
  ).toThrow('reserved');
});

it('accepts preset transforms without revalidating their output as raw input', () => {
  const count = z.strictObject({ count: z.string().transform(Number) });
  const extended = createNavigationCatalog({
    parts: { title: { word: { schema: title } }, item: {}, progress: {} },
    presets: {
      counted: defineNavigationPreset(count, ({ count }) => ({
        title: { id: 'word', options: { text: String(count) } },
        item: { id: 'default' },
        progress: { id: 'default' },
      })),
    },
  });
  expect(
    resolveNavigationPresentation({ preset: 'counted', options: { count: '4' } }, extended).parts
      .title.options
  ).toEqual({ text: '4' });
});
