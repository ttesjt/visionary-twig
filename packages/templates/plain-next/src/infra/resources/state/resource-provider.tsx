'use client';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { ResourcePublisher } from '../preparation/prepared';
import type { NamespaceClaims } from './namespace-claims';

export interface ResourceProviderScope<R, V> extends ResourcePublisher {
  readonly resource: R | undefined;
  readonly reader: V | undefined;
  readonly claims: NamespaceClaims;
}

/** One Context per resource kind. Each mounted Provider owns its scope and inherits its parent. */
export function createResourceProvider<S, R, V>(
  useOwner: (
    scope: S,
    initialSnapshot: unknown,
    parent: ResourceProviderScope<R, V> | undefined
  ) => ResourceProviderScope<R, V>,
  errors: { readonly unready: string; readonly missing?: string }
) {
  const Context = createContext<ResourceProviderScope<R, V> | undefined>(undefined);

  function useOptionalScope() {
    return useContext(Context);
  }

  function Provider({
    scope,
    initialSnapshot,
    children,
  }: {
    readonly scope: S;
    readonly initialSnapshot?: unknown;
    readonly children: ReactNode;
  }) {
    const parent = useOptionalScope();
    const { plan, resource, reader, prepared, preparePublication, claims } = useOwner(
      scope,
      initialSnapshot,
      parent
    );
    const value = useMemo(
      () => ({ plan, resource, reader, prepared, preparePublication, claims }),
      [plan, resource, reader, prepared, preparePublication, claims]
    );
    return <Context.Provider value={value}>{children}</Context.Provider>;
  }

  function useScope() {
    const scope = useOptionalScope();
    if (!scope) throw new Error(errors.missing ?? errors.unready);
    return scope;
  }

  function useReader(): V {
    const { reader } = useScope();
    if (reader === undefined) throw new Error(errors.unready);
    return reader;
  }

  return { Provider, useOptionalScope, useScope, useReader };
}
