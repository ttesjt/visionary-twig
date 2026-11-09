import { expect, it } from 'vitest';
import { z } from 'zod';
import { JsonResource } from './index.js';
const schemas = {
  app: z.object({ enabled: z.boolean() }),
  catalog: z.object({ items: z.array(z.string()) }).readonly(),
};
it('owns validated values and composes stable scoped readers', () => {
  const input = { items: ['One'] };
  const base = new JsonResource(schemas, [
    { namespace: 'app', version: '1', value: { enabled: true } },
  ]).createView();
  const local = new JsonResource(schemas, [{ namespace: 'catalog', version: '2', value: input }]);
  const reader = local.createView(base);
  input.items.push('Changed');
  expect(reader.get('catalog').items).toEqual(['One']);
  expect(reader.get('app').enabled).toBe(true);
  expect(Object.isFrozen(reader.get('catalog').items)).toBe(true);
  expect(reader.has('catalog', 'wrong')).toBe(false);
  expect(base.has('catalog')).toBe(false);
  expect(() => local.createView(reader)).toThrow(/collision/);
  expect(
    () => new JsonResource(schemas, [{ namespace: 'app', version: '1', value: { enabled: 'yes' } }])
  ).toThrow();
  expect(
    () =>
      new JsonResource(schemas, [
        { namespace: 'app', version: '1', value: { enabled: true } },
        { namespace: 'app', version: '2', value: { enabled: false } },
      ])
  ).toThrow(/Duplicate/);
  expect(() => new JsonResource(schemas, []).createView().get('app')).toThrow(/prepared/);
});
function contract(reader: ReturnType<JsonResource<typeof schemas>['createView']>) {
  // @ts-expect-error heterogeneous schemas retain their own output types
  const enabled: string = reader.get('app').enabled;
  // @ts-expect-error nested arrays are readonly even after shallow schema readonly
  void reader.get('catalog').items.push;
  // @ts-expect-error keys come from schemas
  reader.get('unknown');
  void enabled;
}
void contract;
