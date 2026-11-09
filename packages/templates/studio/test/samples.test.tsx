import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ContentRender } from '@frontend/puck-adapter';
import { resolveDocument } from '@frontend/ui-document';
import { contentRegistry } from '@frontend/puck-adapter/schema';
import { sampleDocument } from '../src/samples/sample-document';
import { SampleJsx } from './fixtures/sample-jsx';

describe('neutral sample migration', () => {
  it('retains real schema validity and the same ordinary JSX content/slots', () => {
    expect(resolveDocument(sampleDocument, contentRegistry).ok).toBe(true);
    const puck = new DOMParser().parseFromString(
      renderToStaticMarkup(<ContentRender document={sampleDocument} />),
      'text/html'
    );
    const jsx = new DOMParser().parseFromString(renderToStaticMarkup(<SampleJsx />), 'text/html');
    expect([...puck.querySelectorAll('.ui-heading')].map((node) => node.textContent)).toEqual(
      [...jsx.querySelectorAll('.ui-heading')].map((node) => node.textContent)
    );
    expect(
      puck.querySelectorAll('.ui-row > .ui-column > .ui-grid > .ui-media-figure')
    ).toHaveLength(6);
    expect(puck.querySelectorAll('img').length).toBe(jsx.querySelectorAll('img').length);
    expect(puck.body.textContent).toBe(jsx.body.textContent);
  });
});
