import { describe, expect, it } from 'vitest';
import { studioTextCatalogSchema, DEFAULT_STUDIO_TEXT } from '../text-catalog.js';
describe('Studio interpolation contracts', () => {
  it('rejects unknown names on each formatted field', () => {
    for (const key of [
      'identity',
      'status',
      'reading',
      'exporting',
      'invalidDrafts',
      'exportFinished',
      'viewportOption',
      'resolvedValue',
    ] as const)
      expect(
        studioTextCatalogSchema.safeParse({ ...DEFAULT_STUDIO_TEXT, [key]: '{fileName}' }).success
      ).toBe(false);
    expect(
      studioTextCatalogSchema.safeParse({ ...DEFAULT_STUDIO_TEXT, reading: 'Datei {filename}' })
        .success
    ).toBe(true);
  });
});
