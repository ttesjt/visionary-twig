import { TEXT_LOCALES, type TextLocale } from '../../../site/text';
export * from '../../../site/text';

export function textLocale(input: unknown): TextLocale {
  const locale = TEXT_LOCALES.find((value) => value === input);
  if (!locale) throw new Error('Unsupported text locale.');
  return locale;
}
