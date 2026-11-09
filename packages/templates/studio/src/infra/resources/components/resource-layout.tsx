'use client';
import { useLayoutEffect, type ReactNode } from 'react';
import { ResourceRuntimeProvider } from '@frontend/resource-runtime/react';
import { createHttpResourceReader } from '@frontend/resource-runtime/http';
import type { ResourceReader } from '@frontend/resource-runtime';
import { DEFAULT_TEXT_LOCALE, type TextLocale } from '../text';
import { TextProvider, useText, useTextLocale } from '../text/client';
import { AppConfigProvider, ContentProvider } from '../json/provider';
import type { ScopeSnapshots } from '../planning/snapshots';
import { RESOURCE_SCOPES } from '../../../site/resource-scopes';
import { ResourceScope } from './resource-scope';
import { RESOURCE_STARTUP_TEXT } from '../../../site/startup-text';
const defaultReader = createHttpResourceReader();
function LocaleFailure() {
  const { selection, selectLocale } = useTextLocale();
  if (selection.status !== 'failed') return null;
  return (
    <p role="alert">
      {RESOURCE_STARTUP_TEXT.failed} ({selection.error.kind}).{' '}
      <button onClick={() => selectLocale(selection.target)}>{RESOURCE_STARTUP_TEXT.retry}</button>
    </p>
  );
}
function DocumentLanguage() {
  const text = useText();
  useLayoutEffect(() => {
    document.documentElement.lang = text.locale;
  }, [text.locale]);
  return null;
}
/** Root Layout owns lifetime; this boundary gates only its chosen visual subtree. */
export function ResourceLayout({
  initialSnapshots,
  reader = defaultReader,
  initialLocale = DEFAULT_TEXT_LOCALE,
  children,
}: {
  readonly initialSnapshots?: ScopeSnapshots;
  readonly reader?: ResourceReader;
  readonly initialLocale?: TextLocale;
  readonly children: ReactNode;
}) {
  return (
    <ResourceRuntimeProvider reader={reader}>
      <TextProvider
        initialLocale={initialLocale}
        scope={RESOURCE_SCOPES.layout}
        initialSnapshot={initialSnapshots?.text}
      >
        <AppConfigProvider
          scope={RESOURCE_SCOPES.layout}
          initialSnapshot={initialSnapshots?.config}
        >
          <ContentProvider
            scope={RESOURCE_SCOPES.layout}
            initialSnapshot={initialSnapshots?.content}
          >
            <ResourceScope scope={RESOURCE_SCOPES.layout}>
              <DocumentLanguage />
              {children}
            </ResourceScope>
            <LocaleFailure />
          </ContentProvider>
        </AppConfigProvider>
      </TextProvider>
    </ResourceRuntimeProvider>
  );
}
