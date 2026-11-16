// @vitest-environment node
import { runInNewContext } from 'node:vm';
import { expect, it } from 'vitest';
import type { ThemePreference } from '@frontend/ui/theme';
import { themeRepairScript } from './bootstrap';

function restore(saved: string | null, fallback: ThemePreference = 'system', writable = true) {
  const key = 'test-theme';
  const store = new Map(saved === null ? [] : [[key, saved]]);
  const attributes = new Map([['data-theme', 'from-library']]);
  runInNewContext(themeRepairScript(key, fallback), {
    localStorage: {
      getItem: (name: string) => store.get(name) ?? null,
      setItem(name: string, value: string) {
        if (!writable) throw new Error('Storage is read-only');
        store.set(name, value);
      },
    },
    window: { matchMedia: () => ({ matches: true }) },
    document: {
      documentElement: {
        setAttribute: (name: string, value: string) => attributes.set(name, value),
      },
    },
  });
  return { saved: store.get(key), theme: attributes.get('data-theme') };
}

it('repairs unsupported and empty values using the default policy before visible content', () => {
  for (const value of ['sepia', '', 'LIGHT']) {
    expect(restore(value)).toEqual({ saved: 'system', theme: 'dark' });
    expect(restore(value, 'light')).toEqual({ saved: 'light', theme: 'light' });
  }
});

it('leaves valid values and absent preferences to the library', () => {
  for (const value of ['light', 'dark', 'system', null])
    expect(restore(value)).toEqual({ saved: value ?? undefined, theme: 'from-library' });
});

it('repairs the visible scheme even when an invalid value cannot be overwritten', () => {
  expect(restore('sepia', 'system', false)).toEqual({ saved: 'sepia', theme: 'dark' });
});

it('escapes a configurable key without changing its storage identity', () => {
  const key = '</script><script>unexpected';
  const script = themeRepairScript(key, 'light');
  expect(script).not.toContain('</script>');
  const store = new Map([[key, 'sepia']]);
  runInNewContext(script, {
    localStorage: {
      getItem: (name: string) => store.get(name),
      setItem: (name: string, value: string) => store.set(name, value),
    },
    document: { documentElement: { setAttribute() {} } },
  });
  expect(store.get(key)).toBe('light');
});

it('leaves the server policy available when storage cannot be read', () => {
  const attributes: string[] = [];
  runInNewContext(themeRepairScript('test-theme', 'system'), {
    localStorage: {
      getItem() {
        throw new Error('Storage unavailable');
      },
    },
    document: { documentElement: { setAttribute: () => attributes.push('unexpected') } },
  });
  expect(attributes).toEqual([]);
});
