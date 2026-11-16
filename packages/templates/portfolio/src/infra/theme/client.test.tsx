// @vitest-environment node
import { renderToString } from 'react-dom/server';
import { expect, it } from 'vitest';
import { ThemeProvider, useThemePreference } from './client';

function ReadPreference() {
  const { preference } = useThemePreference();
  return <output>{preference ?? 'pending'}</output>;
}

it('server rendering keeps preference-dependent content neutral without blocking other content', () => {
  const html = renderToString(
    <ThemeProvider>
      <h1>Ready content</h1>
      <ReadPreference />
    </ThemeProvider>
  );
  expect(html).toContain('<h1>Ready content</h1>');
  expect(html).toContain('<output>pending</output>');
});

it('reports a missing root provider instead of offering a setter that silently does nothing', () => {
  expect(() => renderToString(<ReadPreference />)).toThrow('ThemeProvider');
});

it('forwards the CSP nonce to both early scripts', () => {
  const html = renderToString(
    <ThemeProvider nonce="test-nonce">
      <ReadPreference />
    </ThemeProvider>
  );
  const scripts = [...html.matchAll(/<script([^>]*)>/g)];
  expect(scripts).toHaveLength(2);
  for (const script of scripts) expect(script[1]).toContain('nonce="test-nonce"');
});
