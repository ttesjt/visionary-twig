'use client';
import { useText } from '../infra/resources/client';
import contracts from '../../.generated/text/contracts.json';
import { studioLabels, type AppTextCatalog } from './schema';

const keys = Object.keys(contracts.namespaces.main) as (keyof typeof contracts.namespaces.main)[];
const catalogs = new WeakMap<ReturnType<typeof useText>, AppTextCatalog>();
/** Adapt the prepared flat reader to Studio UI's structured label props, once per reader. */
export function useStudioText(): AppTextCatalog {
  const reader = useText();
  const cached = catalogs.get(reader);
  if (cached) return cached;
  const catalog = studioLabels(keys.map((key) => [key, reader.getText('main', key)] as const));
  catalogs.set(reader, catalog);
  return catalog;
}
