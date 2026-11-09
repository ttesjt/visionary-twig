'use client';
import type { ReactNode } from 'react';
import { ResourceBoundary } from '@frontend/resource-runtime/react';
import type { ResourceScopeDefinition } from '../../../site/resource-scopes';
import { useResourceScopeBindings } from '../state/scope-bindings';
import { RESOURCE_STARTUP_TEXT } from '../../../site/startup-text';

/** Explicit scope -> one plan -> the generic loader; provider glue only publishes results. */
export function ResourceScope({
  scope,
  children,
}: {
  readonly scope: ResourceScopeDefinition;
  readonly children: ReactNode;
}) {
  const binding = useResourceScopeBindings(scope);
  const pending = <p role="status">{RESOURCE_STARTUP_TEXT.pending}</p>;
  return (
    <ResourceBoundary
      plan={binding.plan}
      initialResources={binding.initialResources}
      publication={binding}
      pending={pending}
      failure={(error, retry) => (
        <p role="alert">
          {RESOURCE_STARTUP_TEXT.failed} ({error.kind}).{' '}
          <button onClick={retry}>{RESOURCE_STARTUP_TEXT.retry}</button>
        </p>
      )}
    >
      {() => children}
    </ResourceBoundary>
  );
}
