import { z } from 'zod';
import { assertSafeData, freezePreparedData } from '@frontend/prepared-data';
import { TEXT_VARIABLE_NAME } from '../../catalog/template.js';
import { textLocaleSchema } from '../../locale.js';
import { TEXT_CONTRACT_VERSION } from './constants.js';
export const namespaceNameSchema = z.string().regex(/^[a-z][a-z0-9-]*$/);
export const namespaceContractSchema = z.record(
  z.string().min(1),
  z.record(z.string().regex(TEXT_VARIABLE_NAME), z.boolean().pipe(z.literal(true)))
);
const namespacesSchema = z
  .record(namespaceNameSchema, namespaceContractSchema)
  .refine((value) => Object.keys(value).length > 0, 'Declare text namespaces.');
export const textContractSchema = z.strictObject({
  version: z.literal(TEXT_CONTRACT_VERSION),
  referenceLocale: textLocaleSchema,
  namespaces: namespacesSchema,
});
export type GeneratedTextContract = z.infer<typeof textContractSchema>;
/** JSON imports widen marker literals to boolean. Only validated output promises true. */
export type TextContractsInput = z.input<typeof namespacesSchema>;
export type TextNamespaceContract = Readonly<{
  [K in keyof z.output<typeof namespaceContractSchema>]: Readonly<
    z.output<typeof namespaceContractSchema>[K]
  >;
}>;
export type TextContracts = Readonly<{
  [N in keyof z.output<typeof namespacesSchema>]: TextNamespaceContract;
}>;
/** Preserve generated key names while expressing every owned level as readonly. */
export type OwnedTextContracts<C extends TextContractsInput> = {
  readonly [N in keyof C]: {
    readonly [K in keyof C[N]]: {
      readonly [V in keyof C[N][K]]: z.output<typeof namespaceContractSchema>[string][string];
    };
  };
};
/** The only raw-to-owned adapter. Parsing does not rename or add contract keys. */
export function ownTextContracts<C extends TextContractsInput>(input: C): OwnedTextContracts<C> {
  assertSafeData(input);
  const owned = namespacesSchema.parse(input);
  freezePreparedData(owned);
  return owned as OwnedTextContracts<C>;
}
