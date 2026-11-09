import type { TextContractsInput } from './schema.js';
export type {
  TextContracts,
  TextContractsInput,
  TextNamespaceContract,
  OwnedTextContracts,
} from './schema.js';
export type TextKey<C extends TextContractsInput, N extends keyof C> = keyof C[N] & string;
type Variables<
  C extends TextContractsInput,
  N extends keyof C,
  K extends keyof C[N],
> = keyof C[N][K] & string;
export type TextValues<C extends TextContractsInput, N extends keyof C, K extends keyof C[N]> = [
  Variables<C, N, K>,
] extends [never]
  ? Readonly<Record<string, never>>
  : Readonly<Record<Variables<C, N, K>, string | number>>;
export interface TextReadOptions {
  readonly locale?: string;
}
export type TextArguments<C extends TextContractsInput, N extends keyof C, K extends keyof C[N]> = [
  values?: TextValues<C, N, K>,
  options?: TextReadOptions,
];
export type MissingText = (namespace: string, key: string, locale: string) => void;
