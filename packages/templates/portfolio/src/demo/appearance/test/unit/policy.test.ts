import { runInNewContext } from 'node:vm';
import { expect, it } from 'vitest';
import { appearanceBootstrapScript, resolveAppearance } from '../../policy';

const policy = {
  presets: ['paper', 'ink'],
  defaultPreset: 'paper',
  storageKey: 'fixture-appearance',
} as const;
it('applies saved, invalid, missing and inaccessible preferences before render', () => {
  for (const saved of ['ink', 'obsolete', null]) {
    const root = {
      dataset: { stylePreview: '' },
      setAttribute(_name: string, value: string) {
        this.dataset.stylePreview = value;
      },
    };
    runInNewContext(appearanceBootstrapScript(policy), {
      document: { documentElement: root },
      localStorage: { getItem: () => saved },
    });
    expect(root.dataset).toEqual({ stylePreview: saved === 'ink' ? 'ink' : 'paper' });
  }
  const root = {
    dataset: { stylePreview: '' },
    setAttribute(_name: string, value: string) {
      this.dataset.stylePreview = value;
    },
  };
  runInNewContext(appearanceBootstrapScript(policy), {
    document: { documentElement: root },
    get localStorage() {
      throw new Error('Denied');
    },
  });
  expect(root.dataset).toEqual({ stylePreview: 'paper' });
  expect(resolveAppearance('obsolete', policy.presets, policy.defaultPreset)).toBe('paper');
});
it('escapes HTML delimiters and rejects invalid policies', () => {
  expect(appearanceBootstrapScript({ ...policy, storageKey: '</script>' })).not.toContain(
    '</script>'
  );
  expect(() => appearanceBootstrapScript({ ...policy, presets: [] })).toThrow(RangeError);
  expect(() => appearanceBootstrapScript({ ...policy, presets: ['ink'] })).toThrow(RangeError);
});
