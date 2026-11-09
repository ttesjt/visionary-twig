import { describe, it, expect } from 'vitest';
import text from '../../content/default/text/en/main.json';
import validation from '../../app-inputs.config';

describe('prepared Studio editor labels', () => {
  it('validates the shared editor contract while allowing other site labels', () => {
    expect(() =>
      validation.validate({ locales: { en: { main: { ...text, 'custom.title': 'Custom' } } } })
    ).not.toThrow();
  });
  it('rejects incompatible reference or secondary locales before publication', () => {
    for (const patch of [{ 'workbench.reading': 'Opening {wrong}' }, { 'workspace.brand': '' }]) {
      expect(() =>
        validation.validate({
          locales: { en: { main: text }, another: { main: { ...text, ...patch } } },
        })
      ).toThrow();
    }
  });
});
