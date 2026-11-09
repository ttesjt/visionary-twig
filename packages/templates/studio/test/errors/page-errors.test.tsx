import { expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import GlobalError from '../../src/app/global-error';
import { PageStatusView } from '../../src/infra/errors/status-view';
import { errorDigest } from '../../src/infra/errors/diagnostics';

it('renders the global fallback without any resource Provider or downloaded dictionary', () => {
  const secret = 'private-exception-detail';
  const error = Object.assign(new Error(secret), { digest: 'test-digest' });
  const html = renderToStaticMarkup(<GlobalError error={error} />);
  expect(html).toContain('<html lang="en">');
  expect(html).toContain('This page could not load');
  expect(html).toContain('Reload page');
  expect(html).toContain('test-digest');
  expect(html).not.toContain(secret);
});

it('does not inspect thrown messages or invoke an accessor while finding a diagnostic reference', () => {
  expect(errorDigest(new Error('private detail'))).toBeUndefined();
  expect(errorDigest(null)).toBeUndefined();
  expect(errorDigest({ digest: '<script>' })).toBeUndefined();
  expect(errorDigest({ digest: 'x'.repeat(129) })).toBeUndefined();
  expect(
    errorDigest({
      get digest() {
        throw new Error('Accessor must not run');
      },
    })
  ).toBeUndefined();
  expect(errorDigest({ digest: '123-abc' })).toBe('123-abc');
});

it('renders ready text and a real home link even when JavaScript is unavailable', () => {
  const html = renderToStaticMarkup(
    <PageStatusView
      text={{ title: 'Missing', description: 'Unavailable page.', home: 'Home' }}
      homeHref="/?lang=zh"
    />
  );
  expect(html).toContain('href="/?lang=zh"');
  expect(html).toContain('<h1>Missing</h1>');
  expect(html).not.toContain('<button');
});
