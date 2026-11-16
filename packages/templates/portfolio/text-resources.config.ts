import type { TextResourceConfiguration } from '@frontend/text-catalog/resource/node';
import {
  TEXT_LOCALES,
  TEXT_CONTENT_VERSION,
  TEXT_NAMESPACES,
  TEXT_PREPARATION_VERSION,
} from './src/site/text.ts';
export default {
  version: TEXT_PREPARATION_VERSION,
  contentVersion: TEXT_CONTENT_VERSION,
  referenceLocale: 'en',
  missingKeys: 'inherit-reference',
  locales: TEXT_LOCALES,
  namespaces: TEXT_NAMESPACES,
} satisfies TextResourceConfiguration;
