// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as ui from '@frontend/ui';
import * as layout from '@frontend/ui/layout';
import { ThemeSwitcher } from '@frontend/ui/theme-switcher';
import { Dialog } from '@frontend/ui/dialog';

describe('built public entry contracts', () => {
  it('keeps interactive code separate from server-compatible exports', () => {
    expect(ui).not.toHaveProperty('Dialog');
    expect(layout).not.toHaveProperty('Dialog');
    expect(Dialog).toBeTypeOf('function');
    expect(ThemeSwitcher).toBeTypeOf('function');
    for (const entry of ['index.js', 'layout.js']) {
      expect(readFileSync(new URL(`../dist/${entry}`, import.meta.url), 'utf8')).not.toMatch(
        /['"]use client['"]/
      );
    }
    for (const entry of [
      'dialog.js',
      'dialog/dialog.js',
      'theme-switcher.js',
      'theme-switcher/theme-switcher.js',
    ]) {
      expect(
        readFileSync(new URL(`../dist/${entry}`, import.meta.url), 'utf8').trimStart()
      ).toMatch(/^['"]use client['"]/);
    }
  });
});
