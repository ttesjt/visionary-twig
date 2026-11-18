import {
  resolvePreparedJson,
  type PreparedInputReader,
  type PreparedSource,
} from '@frontend/prepared-data/node';
import {
  deriveTextContract,
  parseTextDictionary,
  parseTextNamespace,
  type TextDictionary,
} from '../contracts/dictionary.js';
import type { TextNamespaceContract } from '../contracts/types.js';
import type { ResolvedTextConfiguration } from './configuration.js';

export interface InheritedTextKeys {
  readonly referenceLocale: string;
  readonly locale: string;
  readonly namespace: string;
  readonly keys: readonly string[];
}

function defaultPath(config: ResolvedTextConfiguration, locale: string, namespace: string): string {
  return (
    (config.defaultDirectories[namespace] ?? 'content/default/text') +
    '/' +
    locale +
    '/' +
    namespace +
    '.json'
  );
}

export async function resolveLocaleDictionaries(
  config: ResolvedTextConfiguration,
  read: PreparedInputReader,
  source: PreparedSource,
  onInheritedKeys?: (entry: InheritedTextKeys) => void
) {
  const contracts: Record<string, TextNamespaceContract> = {};
  function parseInput(locale: string, namespace: string, value: unknown): TextDictionary {
    const contract = contracts[namespace];
    if (!contract) throw new Error('Missing default text contract: ' + namespace);
    const partial = locale !== config.referenceLocale && config.missingKeys === 'inherit-reference';
    return parseTextDictionary(contract, value, partial ? 'partial' : 'complete').dictionary;
  }
  const defaults = new Map<string, TextDictionary>();
  for (const namespace of [...config.namespaces].sort()) {
    const relative = defaultPath(config, config.referenceLocale, namespace);
    const input = await read(relative);
    const contract = deriveTextContract(input);
    contracts[namespace] = contract;
    defaults.set(relative, parseTextNamespace(contract, input));
  }
  const locales: Record<string, Record<string, TextDictionary>> = {};
  // Each tracked default is validated before custom can override it.
  for (const locale of [...config.locales].sort())
    for (const namespace of [...config.namespaces].sort()) {
      const relative = defaultPath(config, locale, namespace);
      if (defaults.has(relative)) continue;
      try {
        defaults.set(relative, parseInput(locale, namespace, await read(relative)));
      } catch (error) {
        throw new Error(
          `Invalid default text ${namespace}/${locale}: ${error instanceof Error ? error.message : 'invalid data'}`,
          { cause: error }
        );
      }
    }
  const snapshotRead: PreparedInputReader = async (relative, options) =>
    defaults.has(relative) ? defaults.get(relative) : read(relative, options);
  for (const locale of [...config.locales].sort()) {
    const dictionaries: Record<string, TextDictionary> = {};
    for (const namespace of [...config.namespaces].sort()) {
      try {
        dictionaries[namespace] = await resolvePreparedJson(snapshotRead, source, {
          defaults: defaultPath(config, locale, namespace),
          custom: `.local/content/text/${locale}/${namespace}.json`,
          parse: (value) => parseInput(locale, namespace, value),
        });
      } catch (error) {
        throw new Error(
          `Invalid prepared text ${namespace}/${locale}: ${error instanceof Error ? error.message : 'invalid data'}`,
          { cause: error }
        );
      }
    }
    locales[locale] = dictionaries;
  }

  // Only authored keys count as translated, even when their value equals the reference.
  const reference = locales[config.referenceLocale];
  if (!reference) throw new Error('Missing prepared reference locale: ' + config.referenceLocale);
  for (const [locale, dictionaries] of Object.entries(locales)) {
    if (locale === config.referenceLocale) continue;
    for (const [namespace, dictionary] of Object.entries(dictionaries)) {
      const fallback = reference[namespace];
      if (!fallback) throw new Error('Missing prepared reference namespace: ' + namespace);
      const keys = Object.keys(fallback)
        .filter((key) => !Object.hasOwn(dictionary, key))
        .sort();
      if (!keys.length) continue;
      dictionaries[namespace] = { ...fallback, ...dictionary };
      onInheritedKeys?.({ referenceLocale: config.referenceLocale, locale, namespace, keys });
    }
  }
  return { contracts, locales };
}
