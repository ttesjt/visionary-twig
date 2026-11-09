// @vitest-environment node
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import * as ui from '@frontend/ui';
import * as shell from '@frontend/ui/web-shell';
import { SiteHeader } from '@frontend/ui/web-shell/header';
import {
  HeaderExtensionProvider,
  HeaderExtension,
  HeaderExtensionPopover,
} from '@frontend/ui/web-shell/header-extension';

const shellOutput = new URL('.', import.meta.resolve('@frontend/ui/web-shell'));

describe('built shell entries', () => {
  it('keeps the shell and its styles separate from the foundation entries', () => {
    expect(ui).not.toHaveProperty('SiteFrame');
    expect(ui).not.toHaveProperty('SiteHeader');
    const foundation = readFileSync(
      new URL(import.meta.resolve('@frontend/ui/default.css')),
      'utf8'
    );
    expect(foundation).not.toContain('web-shell');
    const styles = readFileSync(new URL(import.meta.resolve('@frontend/ui/web-shell.css')), 'utf8');
    expect(styles).toContain('.ui-site-frame');
  });

  it('keeps Header client code outside the static public entry', () => {
    expect(shell).not.toHaveProperty('SiteHeader');
    expect(shell.HEADER_EXTENSION_DENSITIES).toEqual(['compact', 'comfortable', 'flush']);
    expect(shell.DEFAULT_HEADER_EXTENSION_DENSITY).toBe('compact');
    expect(SiteHeader).toBeTypeOf('function');
    expect(HeaderExtensionProvider).toBeTypeOf('function');
    expect(HeaderExtension).toBeTypeOf('function');
    expect(HeaderExtensionPopover).toBeTypeOf('function');
    expect(readFileSync(new URL('index.js', shellOutput), 'utf8')).not.toContain('use client');
    for (const file of [
      'header.js',
      'header/site-header.js',
      'header-extension.js',
      'header-extension/provider.js',
      'header-extension/popover.js',
    ]) {
      expect(readFileSync(new URL(file, shellOutput), 'utf8').trimStart()).toMatch(
        /^['"]use client['"]/
      );
    }
  });
  it('renders links and status content on the server', () => {
    const html = renderToStaticMarkup(
      createElement(shell.SiteNavigation, {
        label: 'Main',
        items: [{ id: 'home', href: '/', label: 'Home' }],
      })
    );
    expect(html).toContain('href="/"');
    expect(html).toContain('Home');
    expect(
      renderToStaticMarkup(createElement(shell.PageStatus, { kind: 'error', title: 'Unavailable' }))
    ).toContain('Unavailable');
  });
});
