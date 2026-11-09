// @vitest-environment jsdom
import { createElement } from 'react';
import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { TextResource } from './state/text-resource.js';
import { createTextResourceContext } from './react.js';
const registry = { page: { title: {} } };
const { TextProvider, useText } = createTextResourceContext<typeof registry>();
function Title() {
  return createElement('h1', null, useText().getText('page', 'title'));
}
it('provides already prepared views and updates consumers without remounting', () => {
  const text = new TextResource(registry, [
    {
      locale: 'en',
      dictionaries: [{ namespace: 'page', dictionary: { title: 'Example' }, version: '1' }],
    },
    {
      locale: 'zh',
      dictionaries: [{ namespace: 'page', dictionary: { title: '\u793a\u4f8b' }, version: '1' }],
    },
  ]);
  const { rerender } = render(
    createElement(TextProvider, { value: text.createView('en'), children: createElement(Title) })
  );
  expect(screen.getByRole('heading').textContent).toBe('Example');
  rerender(
    createElement(TextProvider, { value: text.createView('zh'), children: createElement(Title) })
  );
  expect(screen.getByRole('heading').textContent).toBe('示例');
});
