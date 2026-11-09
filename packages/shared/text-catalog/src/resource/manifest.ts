import { z } from 'zod';
import { textLocaleSchema } from '../locale.js';
import { namespaceNameSchema } from './contracts/schema.js';
import { TEXT_CONTRACT_VERSION } from './contracts/constants.js';
export const TEXT_RESOURCE_MANIFEST_VERSION = 2;
const revisionSchema = z.string().regex(/^[a-f0-9]{64}$/);
export const textResourceManifestSchema = z.strictObject({
  version: z.literal(TEXT_RESOURCE_MANIFEST_VERSION),
  contentVersion: z.string().min(1),
  revision: revisionSchema,
  contractVersion: z.literal(TEXT_CONTRACT_VERSION),
  contractRevision: revisionSchema,
  locales: z.array(textLocaleSchema).min(1),
  namespaces: z.array(namespaceNameSchema).min(1),
});
