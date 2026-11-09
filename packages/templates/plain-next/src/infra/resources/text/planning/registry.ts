import {
  parseTextNamespace,
  ownTextContracts,
  textContractSchema,
  textResourceManifestSchema,
} from '@frontend/text-catalog/resource';
import type { ResourceDefinition } from '@frontend/resource-runtime';
import generated from '../../../../../.generated/text/resources.json';
import contracts from '../../../../../.generated/text/contracts.json';
import { TEXT_SOURCE } from '../configuration';
import type { TextLocale } from '../configuration';
export { TEXT_LOCALES, DEFAULT_TEXT_LOCALE, TEXT_NAMESPACES, textLocale } from '../configuration';
export type { TextLocale } from '../configuration';
// Only generated key/variable/identity metadata enters client JS, never dictionary payloads.
const manifest = textResourceManifestSchema.parse(generated);
textContractSchema.parse(contracts);
if (
  manifest.contractVersion !== contracts.version ||
  JSON.stringify([...manifest.namespaces].sort()) !==
    JSON.stringify(Object.keys(contracts.namespaces).sort())
)
  throw new Error('Prepared text contract identity mismatch.');
export const namespaceRegistry = ownTextContracts(contracts.namespaces);
export type TextNamespaces = typeof namespaceRegistry;
export type Namespace = keyof TextNamespaces;
export function isTextNamespace(input: string): input is Namespace {
  return Object.hasOwn(namespaceRegistry, input);
}
export const TEXT_RESOURCE_VERSION = `${manifest.contentVersion}-${manifest.revision}`;
export function textDefinition(namespace: Namespace, locale: TextLocale): ResourceDefinition {
  return {
    id: namespace,
    url: `/resources/text/${TEXT_RESOURCE_VERSION}/${locale}/${namespace}.json`,
    version: TEXT_RESOURCE_VERSION,
    schemaVersion: `${manifest.contractVersion}-${manifest.contractRevision}`,
    source: TEXT_SOURCE,
    validateArtifact(input: unknown): undefined {
      parseTextNamespace(namespaceRegistry[namespace], input);
    },
  };
}
