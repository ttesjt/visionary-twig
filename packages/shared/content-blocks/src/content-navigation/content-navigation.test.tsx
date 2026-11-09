import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { ContentNavigation } from './content-navigation.js';
import { contentNavigationPropsSchema } from './content-navigation.schema.js';
import { contentWidthSchema } from '../shared/presentation.schema.js';
import { createReadingStore } from './reading-store.js';
const props = {
  label: 'In this study',
  title: 'Paper Atlas',
  progressLabel: 'Reading progress',
  items: [{ label: 'Overview', href: '#overview' }],
};
it('keeps native links and original content readable on the server without a Header provider', () => {
  const html = renderToStaticMarkup(
    <ContentNavigation {...props}>
      <section id="overview">
        <h2>Overview</h2>
      </section>
    </ContentNavigation>
  );
  expect(html).toContain('href="#overview"');
  expect(html).toContain('<h2>Overview</h2>');
  expect(html).toContain('data-docked="false"');
  expect(html).toContain('class="ui-container ui-content-navigation-origin"');
  expect(html).toContain('data-width="content"');
  expect(html).toContain('<div class="ui-content-navigation-body">');
  expect(html).not.toContain('style=');
  expect(html).not.toContain('inert=""');
});
it('limits navigation to explicit local destinations and serializable configuration', () => {
  expect(contentNavigationPropsSchema.safeParse(props).success).toBe(true);
  for (const value of [
    { ...props, items: [] },
    { ...props, items: [...props.items, ...props.items] },
    { ...props, items: [{ label: 'Bad', href: 'https://example.test' }] },
    { ...props, headerTarget: '#header' },
    { ...props, inlineWidth: 'viewport' },
    { ...props, style: { position: 'fixed' } },
  ])
    expect(contentNavigationPropsSchema.safeParse(value).success).toBe(false);
});
it('deduplicates external-store notifications and releases subscribers without losing reading state', () => {
  const store = createReadingStore('#overview');
  const notify = vi.fn();
  const release = store.subscribe(notify);
  store.publish({ href: '#overview', progress: 0 });
  expect(notify).not.toHaveBeenCalled();
  store.publish({ href: '#overview', progress: 0.5 });
  expect(notify).toHaveBeenCalledTimes(1);
  release();
  store.publish({ href: '#details', progress: 1 });
  expect(notify).toHaveBeenCalledTimes(1);
  expect(store.snapshot()).toEqual({ href: '#details', progress: 1 });
  expect(store.serverSnapshot()).toEqual({ href: '#overview', progress: 0 });
});

it.each(contentWidthSchema.options)(
  'sizes only the inline origin with the %s container contract',
  (inlineWidth) => {
    const html = renderToStaticMarkup(
      <ContentNavigation {...props} inlineWidth={inlineWidth}>
        <section id="overview">A full reading region</section>
      </ContentNavigation>
    );
    expect(html).toContain(`data-width="${inlineWidth}"`);
    expect(html).toContain('<div class="ui-content-navigation-body"><section');
  }
);
