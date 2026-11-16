'use client';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  ResourceError,
  restoreResourceSnapshot,
  type PreparedResources,
} from '@frontend/resource-runtime';
import { usePrepareResources } from '@frontend/resource-runtime/react';
import { type TextLocale, type Namespace } from '../planning/registry';
import { textNamespacePlan } from '../planning/plans';
type Selection =
  | { readonly status: 'ready'; readonly locale: TextLocale }
  | { readonly status: 'switching'; readonly locale: TextLocale; readonly target: TextLocale }
  | {
      readonly status: 'failed';
      readonly locale: TextLocale;
      readonly target: TextLocale;
      readonly error: ResourceError;
    };
const EMPTY_NAMESPACES: readonly Namespace[] = Object.freeze([]);
interface TextController {
  readonly initialLocale: TextLocale;
  readonly selection: Selection;
  readonly selectLocale: (locale: TextLocale) => void;
  readonly replan: () => void;
  readonly retainScope: (
    id: string,
    namespaces: readonly Namespace[],
    prepare: (prepared: PreparedResources) => () => void
  ) => () => void;
}
const Context = createContext<TextController | undefined>(undefined);
/** Coordinates language transitions; dictionaries belong to the individual scopes. */
export function LocaleController({
  children,
  initialLocale,
  requiredNamespaces = EMPTY_NAMESPACES,
}: {
  readonly children: ReactNode;
  readonly initialLocale: TextLocale;
  readonly requiredNamespaces?: readonly Namespace[];
}) {
  const [state, setState] = useState<{
    readonly origin: TextLocale;
    readonly selection: Selection;
  }>({ origin: initialLocale, selection: { status: 'ready', locale: initialLocale } });
  const scopes = useRef(
    new Map<
      string,
      {
        readonly namespaces: readonly Namespace[];
        readonly prepare: (prepared: PreparedResources) => () => void;
      }
    >()
  );
  const pending = useRef<Extract<Selection, { status: 'switching' }> | undefined>(undefined);
  const prepare = usePrepareResources();
  let active = state;
  if (state.origin !== initialLocale) {
    active = { origin: initialLocale, selection: { status: 'ready', locale: initialLocale } };
    setState(active);
  }
  const selection = active.selection;
  // The selection object is one attempt. Replacing it invalidates both success
  // and failure immediately, even if an obsolete shared request never settles.
  const schedule = useCallback(
    (locale: TextLocale, target: TextLocale) => {
      const attempt = { status: 'switching', locale, target } as const;
      pending.current = attempt;
      setState({ origin: initialLocale, selection: attempt });
    },
    [initialLocale]
  );
  const selectLocale = useCallback(
    (target: TextLocale) => schedule(selection.locale, target),
    [schedule, selection.locale]
  );
  const replan = useCallback(() => {
    const attempt = pending.current;
    if (attempt) schedule(attempt.locale, attempt.target);
  }, [schedule]);
  const retainScope = useCallback(
    (
      id: string,
      namespaces: readonly Namespace[],
      prepare: (prepared: PreparedResources) => () => void
    ) => {
      scopes.current.set(id, { namespaces, prepare });
      replan();
      return () => {
        scopes.current.delete(id);
        replan();
      };
    },
    [replan]
  );
  useLayoutEffect(
    () => () => {
      pending.current = undefined;
    },
    [initialLocale]
  );
  useEffect(() => {
    if (selection.status !== 'switching' || pending.current !== selection) return;
    let observing = true;
    const attempt = selection;
    const isCurrent = () => observing && pending.current === attempt;
    async function change() {
      const owners = [...scopes.current.values()];
      const namespaces = [
        ...new Set([...requiredNamespaces, ...owners.flatMap((scope) => scope.namespaces)]),
      ];
      const plan = textNamespacePlan(attempt.target, namespaces);
      const snapshot = await prepare(plan);
      if (!isCurrent()) return;
      const prepared = restoreResourceSnapshot(plan, snapshot);
      // Validate every active view before publishing any of them.
      const commits = owners.map((scope) => scope.prepare(prepared));
      for (const commit of commits) commit();
      pending.current = undefined;
      setState({ origin: initialLocale, selection: { status: 'ready', locale: attempt.target } });
    }
    void change().catch((cause: unknown) => {
      if (!isCurrent()) return;
      const error =
        cause instanceof ResourceError
          ? cause
          : new ResourceError('invalid-data', 'text', { cause });
      pending.current = undefined;
      setState({ origin: initialLocale, selection: { ...attempt, status: 'failed', error } });
    });
    return () => {
      observing = false;
    };
  }, [selection, prepare, requiredNamespaces, initialLocale]);
  const value = useMemo(
    () => ({ initialLocale, selection, selectLocale, replan, retainScope }),
    [initialLocale, selection, selectLocale, replan, retainScope]
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useTextController(): TextController {
  const value = useContext(Context);
  if (!value) throw new Error('Missing layout TextProvider.');
  return value;
}

export function useOptionalTextController(): TextController | undefined {
  return useContext(Context);
}
export function useTextLocale(): Pick<TextController, 'selection' | 'selectLocale'> {
  const { selection, selectLocale } = useTextController();
  return { selection, selectLocale };
}
