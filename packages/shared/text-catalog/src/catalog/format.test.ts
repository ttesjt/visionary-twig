import { describe, expect, it } from 'vitest';
import { formatText } from './format.js';
import { textTemplateSchema } from './template-schema.js';
describe('text variables', () => {
  it('validates allowed names before rendering, allowing translations to rearrange or omit values', () => {
    const schema = textTemplateSchema(['filename', 'count']);
    for (const valid of ['Plain title', '{count}: {filename}', '{filename} / {filename}'])
      expect(schema.safeParse(valid).success).toBe(true);
    expect(schema.safeParse('{fileName}').success).toBe(false);
    expect(formatText('{filename}/{filename}', { filename: '{literal}' })).toBe(
      '{literal}/{literal}'
    );
    for (const invalid of [
      '{file-name}',
      '{ filename }',
      '{filename',
      'filename}',
      '{{filename}}',
      '{}',
    ]) {
      expect(schema.safeParse(invalid).success).toBe(false);
      expect(() => formatText(invalid, { filename: 'sample' })).toThrow('Invalid text placeholder');
    }
  });
  it('substitutes only named text values and rejects missing variables', () => {
    expect(formatText('{name}: {count}', { name: '<b>sample</b>', count: 2 })).toBe(
      '<b>sample</b>: 2'
    );
    expect(() => formatText('{missing}', {})).toThrow('missing');
    expect(formatText('plain text', {})).toBe('plain text');
  });
});
