import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { z } from 'zod';
import { resolveDocument } from '@frontend/ui-document';
import { createNavigationCatalog, defineNavigationPreset } from '@frontend/content-blocks/schema';
import {
  NavigationPresentationProvider,
  createNavigationPresentationRegistry,
} from '@frontend/content-blocks';
import { ContentRender, InvalidContentDocument } from '../render/content-render.js';
import { createContentRegistry } from './content-registry.js';
import { collectContentMedia } from './content-media.js';
const optionsSchema = z.strictObject({ logo: z.string().startsWith('/') });
const catalog = createNavigationCatalog({
  parts: {
    title: {
      logo: {
        schema: optionsSchema,
        mediaSources: (options) => [optionsSchema.parse(options).logo],
      },
    },
    item: {},
    progress: {},
  },
  presets: {
    logo: defineNavigationPreset(optionsSchema, (options) => ({
      title: { id: 'logo', options },
      item: { id: 'default' },
      progress: { id: 'default' },
    })),
  },
});
const registry = createContentRegistry({ navigationPresentations: catalog });
function document() {
  return {
    schemaVersion: 1,
    revision: 1,
    documentId: 'modular-reading',
    variables: { logo: '/resolved.svg' },
    bindings: [
      {
        nodeId: 'navigation',
        targetPath: ['presentation', 'options', 'logo'],
        sourcePath: ['logo'],
      },
    ],
    data: {
      root: {},
      content: [
        {
          type: 'ContentNavigation',
          props: {
            id: 'navigation',
            label: 'Chapters',
            title: 'Small worlds',
            progressLabel: 'Progress',
            items: [{ label: 'Overview', href: '#overview' }],
            presentation: { preset: 'logo', options: { logo: '/raw.svg' } },
            content: [
              {
                type: 'Anchor',
                props: {
                  id: 'overview-anchor',
                  name: 'overview',
                  content: [
                    { type: 'Heading', props: { id: 'overview-heading', text: 'Overview' } },
                  ],
                },
              },
            ],
          },
        },
      ],
    },
  };
}
it('resolves nested option bindings before catalog validation and inspects only consumed resources', () => {
  const input = document();
  expect(resolveDocument(input, registry).ok).toBe(true);
  expect(collectContentMedia(input, { navigationPresentations: catalog })).toEqual({
    ok: true,
    value: ['/resolved.svg'],
  });
  expect(input.data.content[0]?.props.presentation.options.logo).toBe('/raw.svg');
  const presentations = createNavigationPresentationRegistry(catalog, {
    title: {
      logo: ({ options }) => <img src={optionsSchema.parse(options).logo} alt="A small world" />,
    },
    item: {},
    progress: {},
  });
  const html = renderToStaticMarkup(
    <NavigationPresentationProvider registry={presentations}>
      <ContentRender
        document={input}
        navigationPresentations={catalog}
        navigationScope="embedded"
      />
    </NavigationPresentationProvider>
  );
  expect(html).toContain('src="/resolved.svg"');
  expect(html).toContain('href="#embedded--overview"');
  expect(html).not.toContain('style=');
});
it('rejects a missing host catalog and invalid resolved options before rendering', () => {
  expect(() => ContentRender({ document: document() })).toThrow(InvalidContentDocument);
  const input = document();
  input.variables.logo = 'not-a-resource';
  const result = resolveDocument(input, registry);
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error('Expected invalid presentation');
  expect(result.errors.some((issue) => issue.path.includes('logo'))).toBe(true);
});
