// @vitest-environment node
import { expect, it } from 'vitest';
import { jsonResourcesDefinition } from '@frontend/prepared-data/resource/node';
import configuration from '../../content-resources.config';
import defaults from '../../content/default/data/base.json';
import { DEMO_TITLE_MAX_LENGTH, DEMO_SUMMARY_MAX_LENGTH } from '../workspace/demo/demo-record';

const definition = jsonResourcesDefinition({ ...configuration, kind: 'content' });
function prepare(patch: Record<string, string>) {
  return definition.resolve(
    (path) => Promise.resolve(path.startsWith('.local/') ? { 'field-guide': patch } : defaults),
    'custom'
  );
}
it.each([
  ['title', '   '],
  ['title', 'x'.repeat(DEMO_TITLE_MAX_LENGTH + 1)],
  ['summary', 'x'.repeat(DEMO_SUMMARY_MAX_LENGTH + 1)],
] as const)(
  'rejects an invalid %s at preparation with the record and field path',
  async (field, value) => {
    await expect(prepare({ [field]: value })).rejects.toThrow(
      new RegExp('field-guide[\\s\\S]*' + field)
    );
  }
);
it('normalizes the title once at preparation and accepts the editor limits', async () => {
  const title = 'x'.repeat(DEMO_TITLE_MAX_LENGTH);
  const summary = 'y'.repeat(DEMO_SUMMARY_MAX_LENGTH);
  await expect(prepare({ title: ' ' + title + ' ', summary })).resolves.toMatchObject({
    values: { base: { 'field-guide': { title, summary } } },
  });
});
