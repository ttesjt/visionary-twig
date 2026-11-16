'use client';
import { useCallback } from 'react';
import {
  createResourcePlan,
  resourceKey,
  restoreResourceEntries,
} from '@frontend/resource-runtime';
import { selectPreparedResources } from '../preparation/prepared';
import { type configSchemas, type contentSchemas, jsonDefinition } from '../json/registry';
import { useConfigScope, useContentScope } from '../json/provider';
import { textDefinition, type Namespace, type TextLocale } from '../text';
import { useOptionalTextScope } from '../text/client';

type NamespaceInput = { readonly value: unknown } & (
  | { readonly kind: 'text'; readonly namespace: Namespace; readonly locale: TextLocale }
  | { readonly kind: 'config'; readonly namespace: keyof typeof configSchemas }
  | { readonly kind: 'content'; readonly namespace: keyof typeof contentSchemas }
);
/** Install an independently loaded artifact into the nearest Provider of its kind. */
export function useAppendNamespace() {
  const text = useOptionalTextScope();
  const config = useConfigScope();
  const content = useContentScope();
  const publishText = text?.preparePublication;
  const publishConfig = config?.preparePublication;
  const publishContent = content?.preparePublication;
  return useCallback(
    (input: NamespaceInput) => {
      const publish =
        input.kind === 'text'
          ? publishText
          : input.kind === 'config'
            ? publishConfig
            : publishContent;
      if (!publish) throw new Error('Missing resource Provider for ' + input.kind);
      const definition =
        input.kind === 'text'
          ? textDefinition(input.namespace, input.locale)
          : jsonDefinition(input.kind, input.namespace);
      const plan = createResourcePlan(
        [definition],
        input.kind === 'text' ? { locale: input.locale } : {}
      );
      const entries = restoreResourceEntries(plan, [
        { key: resourceKey(definition), value: input.value },
      ]);
      publish(selectPreparedResources(plan, entries), plan)();
    },
    [publishText, publishConfig, publishContent]
  );
}
