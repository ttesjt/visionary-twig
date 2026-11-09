import 'server-only';
import type { Metadata } from 'next';
import type { MetadataInput } from './schemas';
import { buildMetadata } from './build';

export interface MetadataDefinition<Context> {
  readonly enabled: boolean;
  readonly load: (context: Context) => MetadataInput | Promise<MetadataInput>;
}

/** Disabled metadata never invokes its source, including environment/resource reads. */
export async function prepareMetadata<Context>(
  definition: MetadataDefinition<Context>,
  context: Context
): Promise<Metadata> {
  if (!definition.enabled) return {};
  return buildMetadata(await definition.load(context));
}
