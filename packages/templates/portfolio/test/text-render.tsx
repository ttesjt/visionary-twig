import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { ReactNode } from 'react';
import { render } from '@testing-library/react';
import { prepareResourcePlan } from '@frontend/resource-runtime';
import { createHttpResourceReader } from '@frontend/resource-runtime/http';
import { ResourceRuntimeProvider } from '@frontend/resource-runtime/react';
import {
  TextProvider,
  ResourceScope,
  AppConfigProvider,
  ContentProvider,
} from '../src/infra/resources/client';
import {
  planResourceScope,
  RESOURCE_SCOPES,
  type ResourceScopeDefinition,
} from '../src/infra/resources/index';
import type { TextLocale } from '../src/infra/resources/index';
import { jsonSnapshots } from './json-resources';
export async function renderWithText(
  ui: ReactNode,
  scope: ResourceScopeDefinition = RESOURCE_SCOPES.metadata,
  locale: TextLocale = 'en'
) {
  const textPlan = planResourceScope(scope, locale).parts.find(
    (part) => part.kind === 'text'
  )?.plan;
  if (!textPlan) throw new Error('Test UI needs a Text scope.');
  const snapshot = await prepareResourcePlan(textPlan, (resource) =>
    Promise.resolve(
      JSON.parse(
        readFileSync(
          path.resolve(import.meta.dirname, '../.generated/text', locale, resource.id + '.json'),
          'utf8'
        )
      ) as unknown
    )
  );
  const parts = planResourceScope(RESOURCE_SCOPES.layout, locale).parts;
  const configPlan = parts.find((part) => part.kind === 'config')?.plan;
  const contentPlan = parts.find((part) => part.kind === 'content')?.plan;
  if (!configPlan || !contentPlan) throw new Error('Test layout needs Config and Content.');
  const json = await jsonSnapshots(configPlan, contentPlan);
  return render(
    <ResourceRuntimeProvider reader={createHttpResourceReader()}>
      <TextProvider initialLocale={locale} scope={scope} initialSnapshot={snapshot}>
        <AppConfigProvider scope={RESOURCE_SCOPES.layout} initialSnapshot={json.config}>
          <ContentProvider scope={RESOURCE_SCOPES.layout} initialSnapshot={json.content}>
            <ResourceScope scope={RESOURCE_SCOPES.layout}>{ui}</ResourceScope>
          </ContentProvider>
        </AppConfigProvider>
      </TextProvider>
    </ResourceRuntimeProvider>
  );
}
