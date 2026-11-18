import { z } from 'zod';
import { textLocaleSchema } from '../../locale.js';
import { namespaceNameSchema } from '../contracts/schema.js';
export const textResourceConfigurationSchema = z
  .strictObject({
    version: z.number().int().positive(),
    contentVersion: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/),
    referenceLocale: textLocaleSchema.default('en'),
    defaultDirectories: z
      .record(
        namespaceNameSchema,
        z
          .string()
          .min(1)
          .refine(
            (directory) =>
              !directory.startsWith('/') &&
              !directory.includes('\\') &&
              !directory.includes(':') &&
              directory.split('/').every((part) => part !== '..' && part !== '' && part !== '.'),
            'Expected a bounded relative default directory.'
          )
      )
      .default({}),
    missingKeys: z.enum(['inherit-reference', 'error']).default('inherit-reference'),
    locales: z
      .array(textLocaleSchema)
      .min(1)
      .refine((values) => new Set(values).size === values.length, 'Duplicate locales.')
      .readonly(),
    namespaces: z
      .array(namespaceNameSchema)
      .min(1)
      .refine((values) => new Set(values).size === values.length, 'Duplicate namespaces.')
      .readonly(),
  })
  .refine(
    (value) => value.locales.includes(value.referenceLocale),
    'Reference locale must be declared.'
  )
  .refine(
    (value) =>
      Object.keys(value.defaultDirectories).every((name) => value.namespaces.includes(name)),
    'Default directories must belong to declared namespaces.'
  );
export type ResolvedTextConfiguration = z.output<typeof textResourceConfigurationSchema>;
type DefaultedOptions = 'referenceLocale' | 'missingKeys' | 'defaultDirectories';
export type TextResourceConfiguration = Omit<ResolvedTextConfiguration, DefaultedOptions> &
  Partial<Pick<ResolvedTextConfiguration, DefaultedOptions>>;
