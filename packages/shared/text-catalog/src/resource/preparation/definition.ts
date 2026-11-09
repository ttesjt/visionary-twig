import { z } from 'zod';
import {
  preparedDataRevision,
  createServerImportMap,
  type PreparedDefinition,
} from '@frontend/prepared-data/node';
import { resolveLocaleDictionaries, type InheritedTextKeys } from './resolve-locales.js';
import { textContractSchema } from '../contracts/schema.js';
import { TEXT_CONTRACT_VERSION } from '../contracts/constants.js';
import { textResourceManifestSchema, TEXT_RESOURCE_MANIFEST_VERSION } from '../manifest.js';
import { textResourceConfigurationSchema } from './configuration.js';
const generatedSchema = z.strictObject({
  contentVersion: z.string(),
  contracts: textContractSchema,
  locales: z.record(z.string(), z.record(z.string(), z.unknown())),
});
function manifestFor(value: unknown): z.output<typeof textResourceManifestSchema> {
  const input = generatedSchema.parse(value);
  const locales = Object.keys(input.locales).sort();
  const namespaces = Object.keys(input.contracts.namespaces).sort();
  return {
    version: TEXT_RESOURCE_MANIFEST_VERSION,
    contentVersion: input.contentVersion,
    revision: preparedDataRevision(input),
    contractVersion: TEXT_CONTRACT_VERSION,
    contractRevision: preparedDataRevision(input.contracts),
    locales,
    namespaces,
  };
}

/** Defaults define contracts. Every artifact still uses the existing source policy and transaction. */
export function textResourcesDefinition(
  configuration: unknown,
  onInheritedKeys?: (entry: InheritedTextKeys) => void
): PreparedDefinition {
  const config = textResourceConfigurationSchema.parse(configuration);
  return {
    namespace: 'text',
    filename: 'catalog.json',
    contractVersion: config.version,
    async resolve(read, source) {
      const { contracts, locales } = await resolveLocaleDictionaries(
        config,
        read,
        source,
        onInheritedKeys
      );
      return {
        contentVersion: config.contentVersion,
        contracts: {
          version: TEXT_CONTRACT_VERSION,
          referenceLocale: config.referenceLocale,
          namespaces: contracts,
        },
        locales,
      };
    },
    additionalModules(value) {
      const manifest = manifestFor(value);
      return {
        'server-imports.ts': createServerImportMap(
          manifest.locales.flatMap((locale) =>
            manifest.namespaces.map((namespace) => locale + '/' + namespace + '.json')
          )
        ),
      };
    },
    additionalFiles(value) {
      const input = generatedSchema.parse(value);
      const files: Record<string, unknown> = { 'contracts.json': input.contracts };
      const locales = Object.keys(input.locales).sort();
      for (const locale of locales)
        for (const [namespace, dictionary] of Object.entries(input.locales[locale] ?? {}))
          files[`${locale}/${namespace}.json`] = dictionary;
      files['resources.json'] = manifestFor(input);
      return files;
    },
  };
}
