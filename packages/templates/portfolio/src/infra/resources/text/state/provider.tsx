'use client';
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import type { ResourceScopeDefinition } from '../../../../site/resource-scopes';
import { DEFAULT_TEXT_LOCALE, type TextLocale } from '../planning/registry';
import { LocaleController, useOptionalTextController } from './locale-controller';
import { PreparedTextScope } from './read-scope';
import { registeredTextNamespaces } from '../planning/plans';

export interface TextProviderProps {
  readonly scope: ResourceScopeDefinition;
  readonly initialSnapshot?: unknown;
  readonly initialLocale?: TextLocale;
  readonly children: ReactNode;
}
/** Each scope owns prepared text; nested providers inherit the parent's reader and language. */
export function TextProvider(props: TextProviderProps) {
  const controller = useOptionalTextController();
  const namespaces = useMemo(() => registeredTextNamespaces(props.scope.text), [props.scope]);
  if (controller) {
    if (props.initialLocale !== undefined && props.initialLocale !== controller.initialLocale)
      throw new Error('Nested TextProvider cannot select an independent initial language.');
    return <PreparedTextScope {...props} />;
  }
  return (
    <LocaleController
      initialLocale={props.initialLocale ?? DEFAULT_TEXT_LOCALE}
      requiredNamespaces={namespaces}
    >
      <PreparedTextScope {...props} />
    </LocaleController>
  );
}
