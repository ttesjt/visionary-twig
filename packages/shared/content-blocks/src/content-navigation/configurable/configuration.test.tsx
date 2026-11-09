import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ConfigurableNavigationTitle } from './title.js';
import { ConfigurableNavigationItem } from './item.js';
import {
  configurableTitleSchema,
  configurableItemSchema,
  configurableProgressSchema,
} from './schema.js';
import { resolveItemDesign, resolveProgressDesign } from './resolve.js';
import { navigationPosition } from '../reading-store.js';
import { configurableNavigationDefinitions } from './definitions.js';
import type { NavigationPartProps } from '../presentation/parts.js';
const navigation = {
  label: 'Sections',
  title: 'A field guide',
  progressLabel: 'Progress',
  items: [
    { label: 'First', href: '#first' },
    { label: 'Last', href: '#last' },
  ],
};
const props: NavigationPartProps = {
  navigation,
  reading: { href: '#first', progress: 0.25 },
  currentIndex: 0,
  itemCount: 2,
  placement: 'header',
  active: true,
  interactive: true,
  options: {},
};
describe('configurable navigation', () => {
  it('keeps text-first defaults neutral and validates explicit media modes', () => {
    const html = renderToStaticMarkup(<ConfigurableNavigationTitle {...props} />);
    expect(html).toContain('data-display="text"');
    expect(html).toContain('data-color="inherit"');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('style=');
    const logo = renderToStaticMarkup(
      <ConfigurableNavigationTitle
        {...props}
        options={{
          display: 'media',
          media: { kind: 'image', src: '/wordmark.svg' },
          mediaShape: 'intrinsic',
        }}
      />
    );
    expect(logo).toContain('data-media-shape="intrinsic"');
    for (const display of ['media', 'media-text']) {
      expect(configurableTitleSchema.safeParse({ display }).success).toBe(false);
      expect(configurableItemSchema.safeParse({ representation: { display } }).success).toBe(false);
      const image = { kind: 'image', src: '/mark.svg' };
      const value = { display, media: image };
      expect(configurableTitleSchema.safeParse(value).success).toBe(true);
      const title = renderToStaticMarkup(
        <ConfigurableNavigationTitle {...props} options={value} />
      );
      expect(title).toContain('aria-label="A field guide"');
      expect(title).toContain('alt=""');
    }
    for (const value of [
      { compact: 'media' },
      { style: { color: 'red' } },
      { appearance: { palette: 'bad; color:red' } },
      { media: { kind: 'image', src: 'javascript:alert(1)' } },
    ])
      expect(configurableTitleSchema.safeParse(value).success).toBe(false);
  });
  it('merges states independently, cycles by index and applies stable anchor overrides last', () => {
    const options = {
      base: { color: 'muted', radius: 'soft' },
      selected: { underline: true, color: 'accent' },
      cycle: [{ base: { palette: 'one' } }, { base: { palette: 'two' } }],
      overrides: { '#last': { selected: { background: 'accent-soft', underline: false } } },
    };
    expect(resolveItemDesign(options, '#last', 1, true).appearance).toEqual({
      color: 'accent',
      radius: 'soft',
      underline: false,
      palette: 'two',
      background: 'accent-soft',
    });
    expect(resolveItemDesign(options, '#last', 2, false).appearance).toEqual({
      color: 'muted',
      radius: 'soft',
      palette: 'one',
    });
    expect(resolveItemDesign(options, '#last', 0, true).appearance.background).toBe('accent-soft');
    const html = renderToStaticMarkup(
      <ConfigurableNavigationItem
        {...props}
        item={{ label: 'First', href: '#first' }}
        index={0}
        current
        options={{
          representation: { display: 'media', media: { kind: 'icon', name: 'bird' } },
          selected: { borderWidth: 'thick' },
        }}
      />
    );
    expect(html).toContain('data-placement="header"');
    expect(html).toContain('data-display="media"');
    expect(html).toContain('data-border-width="thick"');
    expect(html).not.toContain('href=');
  });
  it('changes representation independently in selected/unselected states and validates every state', () => {
    const options = {
      representation: { display: 'text' },
      selected: {
        representation: { display: 'media', media: { kind: 'image', src: '/selected.svg' } },
      },
    };
    expect(resolveItemDesign(options, '#first', 0, false).representation.display).toBe('text');
    expect(resolveItemDesign(options, '#first', 0, true).representation.media).toEqual({
      kind: 'image',
      src: '/selected.svg',
    });
    expect(configurableNavigationDefinitions.item.configurable.mediaSources(options)).toEqual([
      '/selected.svg',
    ]);
    expect(
      configurableItemSchema.safeParse({ selected: { representation: { display: 'media' } } })
        .success
    ).toBe(false);
  });
  it('selects progress appearance by section and continuous progress, with bounded geometry', () => {
    const options = {
      color: 'ink',
      cycle: [{ palette: 'one' }, { palette: 'two' }],
      stages: [{ at: 0.5, design: { color: 'accent', marker: { kind: 'icon', name: 'bird' } } }],
      sections: { '#last': { height: 8 } },
    };
    expect(resolveProgressDesign(options, '#last', 1, 0.6)).toMatchObject({
      color: 'accent',
      palette: 'two',
      height: 8,
      markerSize: 16,
    });
    expect(resolveProgressDesign(options, '#first', 0, 0.1)).toMatchObject({
      color: 'ink',
      height: 2,
    });
    expect(navigationPosition(navigation, { href: '#last', progress: 0.01 })).toEqual({
      currentIndex: 1,
      itemCount: 2,
    });
    for (const value of [
      { height: 0 },
      { markerSize: 1000 },
      {
        stages: [
          { at: 0.8, design: {} },
          { at: 0.2, design: {} },
        ],
      },
      {
        stages: [
          { at: 0.5, design: {} },
          { at: 0.5, design: {} },
        ],
      },
      { sections: { '/other': {} } },
    ])
      expect(configurableProgressSchema.safeParse(value).success).toBe(false);
  });
  it('declares resources from base, cycles, per-anchor overrides and progress stages', () => {
    const item = configurableNavigationDefinitions.item.configurable;
    expect(
      item?.mediaSources?.({
        representation: { display: 'media-text', media: { kind: 'image', src: '/one.svg' } },
        cycle: [{ representation: { media: { kind: 'image', src: '/two.svg' } } }],
        overrides: { '#last': { representation: { media: { kind: 'image', src: '/three.svg' } } } },
      })
    ).toEqual(['/two.svg', '/three.svg']);
    expect(
      configurableNavigationDefinitions.progress.configurable?.mediaSources?.({
        marker: { kind: 'image', src: '/start.svg' },
        stages: [{ at: 0.5, design: { marker: { kind: 'image', src: '/end.svg' } } }],
      })
    ).toEqual(['/start.svg', '/end.svg']);
  });
});
