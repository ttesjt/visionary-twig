import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { validateJsonArtifact } from '@frontend/prepared-data/resource';
import {
  createResourcePlan,
  prepareResourcePlan,
  createResourceSnapshot,
  restoreResourceSnapshot,
} from '../index.js';
import { createPreparedJsonResource } from '../json.js';

const sourceSchema = z.strictObject({ count: z.string().transform(Number) });
const schema = z.strictObject({ count: z.number() });
const schemas = { settings: schema };
const definition = {
  id: 'config:settings',
  url: '/settings.json',
  source: 'fixture',
  version: 'v1',
  schemaVersion: 'v1',
  validateArtifact(input: unknown): undefined {
    validateJsonArtifact(schema, input);
  },
};
const plan = createResourcePlan([definition]);
const prepare = async () =>
  restoreResourceSnapshot(
    plan,
    await prepareResourcePlan(plan, () => Promise.resolve(sourceSchema.parse({ count: '7' })))
  );

describe('prepared JSON container bridge', () => {
  it('preserves transformed artifacts through server/browser snapshot round trips', async () => {
    const prepared = await prepare();
    const snapshot = createResourceSnapshot(plan, prepared.resources);
    for (const data of [
      prepared,
      restoreResourceSnapshot(plan, JSON.parse(JSON.stringify(snapshot))),
    ]) {
      expect(
        createPreparedJsonResource(schemas, 'config', data, plan).createView().get('settings')
      ).toEqual({ count: 7 });
    }
  });
  it('rejects a mismatched plan, missing entries, duplicates and a foreign kind', async () => {
    const data = await prepare();
    expect(() =>
      createPreparedJsonResource(schemas, 'config', { ...data, planKey: 'other' }, plan)
    ).toThrow('snapshot');
    expect(() =>
      createPreparedJsonResource(schemas, 'config', { ...data, resources: [] }, plan)
    ).toThrow('snapshot');
    expect(() => createPreparedJsonResource(schemas, 'content', data, plan)).toThrow('definition');
    expect(() =>
      createPreparedJsonResource(
        schemas,
        'config',
        { ...data, resources: [{ key: 'missing', value: {} }] },
        plan
      )
    ).toThrow('snapshot');
    const second = createResourcePlan([
      definition,
      { ...definition, id: 'config:other', url: '/other.json' },
    ]);
    const entry = data.resources[0];
    if (!entry) throw new Error('Expected prepared settings');
    expect(() =>
      createPreparedJsonResource(
        schemas,
        'config',
        { ...data, planKey: second.key, resources: [entry, entry] },
        second
      )
    ).toThrow('snapshot');
  });
});
