import type { TextReadView } from './text-view.js';
import type { ParsedTextDictionary } from '../contracts/dictionary.js';
import type { MissingText, TextNamespaceContract, TextContractsInput } from '../contracts/types.js';
export interface TextEntry extends ParsedTextDictionary {
  readonly version: string;
  readonly contract: TextNamespaceContract;
}
export interface TextViewDictionary<C extends TextContractsInput> {
  readonly namespace: keyof C & string;
  readonly dictionary: unknown;
  readonly version: string;
}
export type TextEntries = ReadonlyMap<string, ReadonlyMap<string, TextEntry>>;

export interface TextResourceInput<C extends TextContractsInput> {
  readonly locale: string;
  readonly dictionaries: readonly TextViewDictionary<C>[];
}
export interface TextResourceOptions {
  readonly maxLocales?: number;
  readonly onMissing?: MissingText;
}
export interface TextViewOptions<C extends TextContractsInput> {
  readonly parent?: TextReadView<C>;
  readonly required?: Readonly<Partial<Record<keyof C & string, string>>>;
}
