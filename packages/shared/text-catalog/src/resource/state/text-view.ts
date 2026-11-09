import type {
  MissingText,
  TextArguments,
  TextKey,
  TextContractsInput,
} from '../contracts/types.js';
import type { TextEntries } from './types.js';
import { interpolateText } from './interpolation.js';
export interface TextReadView<C extends TextContractsInput> {
  readonly locale: string;
  readonly namespaces: readonly string[];
  hasText(namespace: string, locale?: string, version?: string): boolean;
  getText<N extends keyof C & string, K extends TextKey<C, N>>(
    namespace: N,
    key: K,
    ...args: TextArguments<C, N, K>
  ): string;
}
export function readText(
  entries: TextEntries,
  namespace: string,
  key: string,
  locale: string,
  values: Readonly<Record<string, string | number>> | undefined,
  missing: MissingText | undefined
): string {
  const entry = entries.get(namespace)?.get(locale);
  if (!entry || !Object.hasOwn(entry.dictionary, key)) {
    missing?.(namespace, key, locale);
    return `${namespace}.${key}`;
  }
  const raw = entry.dictionary[key];
  if (raw === undefined) throw new Error('Missing installed text.');
  if (values === undefined) return raw;
  const parts = entry.templates.get(key);
  const allowed = entry.contract[key];
  if (!parts || !allowed) throw new Error('Missing installed text template.');
  return interpolateText(parts, allowed, values, namespace, key, locale);
}
export function createTextReadView<C extends TextContractsInput>(
  locale: string,
  entries: TextEntries,
  missing: MissingText | undefined
): TextReadView<C> {
  const owned = new Map(
    [...entries].map(([namespace, languages]) => [namespace, new Map(languages)])
  );
  return Object.freeze({
    locale,
    namespaces: Object.freeze([...owned.keys()]),
    hasText(namespace: string, language = locale, version?: string): boolean {
      const entry = owned.get(namespace)?.get(language);
      return entry !== undefined && (version === undefined || entry.version === version);
    },
    getText<N extends keyof C & string, K extends TextKey<C, N>>(
      namespace: N,
      key: K,
      ...args: TextArguments<C, N, K>
    ): string {
      return readText(owned, namespace, key, args[1]?.locale ?? locale, args[0], missing);
    },
  });
}
/** Pure read inheritance. Reuses both immutable views without reparsing/copying dictionaries. */
export function composeTextViews<C extends TextContractsInput>(
  parent: TextReadView<C>,
  local: TextReadView<C>
): TextReadView<C> {
  if (parent.locale !== local.locale) throw new Error('Inherited text locale mismatch.');
  const namespaces = new Set(local.namespaces);
  for (const namespace of namespaces)
    if (parent.namespaces.includes(namespace))
      throw new Error(`Cannot replace inherited text namespace: ${namespace}`);
  return Object.freeze({
    locale: local.locale,
    namespaces: Object.freeze([...parent.namespaces, ...local.namespaces]),
    hasText(namespace: string, locale = local.locale, version?: string): boolean {
      return (namespaces.has(namespace) ? local : parent).hasText(namespace, locale, version);
    },
    getText<N extends keyof C & string, K extends TextKey<C, N>>(
      namespace: N,
      key: K,
      ...args: TextArguments<C, N, K>
    ): string {
      return (namespaces.has(namespace) ? local : parent).getText(namespace, key, ...args);
    },
  });
}
