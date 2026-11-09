import { ownTextContracts } from '../contracts/schema.js';
import { parseTextDictionary } from '../contracts/dictionary.js';
import type {
  TextEntry,
  TextResourceInput,
  TextResourceOptions,
  TextViewOptions,
} from './types.js';
import { textLocaleSchema } from '../../locale.js';
import type { MissingText, TextContractsInput } from '../contracts/types.js';
import { composeTextViews, createTextReadView, type TextReadView } from './text-view.js';
export const DEFAULT_TEXT_LOCALE_CAPACITY = 32;
/** An immutable prepared scope, usable on servers and without React.
 * Loading and UI publication belong to the caller. Parent readers are composed,
 * never installed into this container. New data requires a new resource.
 */
export class TextResource<R extends TextContractsInput> {
  private readonly entries = new Map<string, Map<string, TextEntry>>();
  private readonly missing: MissingText | undefined;
  constructor(
    registry: R,
    inputs: readonly TextResourceInput<R>[],
    options: TextResourceOptions = {}
  ) {
    const contracts = ownTextContracts(registry);
    this.missing = options.onMissing;
    const capacity = options.maxLocales ?? DEFAULT_TEXT_LOCALE_CAPACITY;
    if (!Number.isSafeInteger(capacity) || capacity <= 0)
      throw new RangeError('maxLocales must be a positive integer.');
    const locales = new Set<string>();
    for (const input of inputs) {
      const locale = textLocaleSchema.parse(input.locale);
      for (const { namespace, dictionary, version } of input.dictionaries) {
        if (!locales.has(locale) && locales.size >= capacity)
          throw new Error('Text locale capacity exceeded.');
        const languages = this.entries.get(namespace) ?? new Map<string, TextEntry>();
        if (languages.has(locale)) throw new Error('Duplicate text namespace: ' + namespace);
        const definition = Object.hasOwn(contracts, namespace) ? contracts[namespace] : undefined;
        if (!definition) throw new Error('Unknown text namespace: ' + namespace);
        if (!version.trim()) throw new Error('Text version is required.');
        const entry = Object.freeze({
          version,
          contract: definition,
          ...parseTextDictionary(definition, dictionary),
        });
        languages.set(locale, entry);
        this.entries.set(namespace, languages);
        locales.add(locale);
      }
    }
  }
  /** Checks only this scope; no parent lookup or loading. */
  hasText<N extends keyof R & string>(namespace: N, locale: string, version?: string): boolean {
    const entry = this.entries.get(namespace)?.get(locale);
    return entry !== undefined && (version === undefined || entry.version === version);
  }
  /** Binds a language and validates local requirements before inheriting a parent.
   * Duplicate namespaces and different parent languages reject.
   */
  createView(locale: string, options: TextViewOptions<R> = {}): TextReadView<R> {
    textLocaleSchema.parse(locale);
    for (const [namespace, version] of Object.entries(options.required ?? {}))
      if (!this.hasText(namespace, locale, version))
        throw new Error('Text namespace is not prepared: ' + namespace);
    const local = createTextReadView<R>(locale, this.entries, this.missing);
    return options.parent ? composeTextViews(options.parent, local) : local;
  }
}
