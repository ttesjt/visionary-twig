'use client';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { useContent } from '../../../infra/resources/client';
import { createDemoScope } from '../../../site/demo-adapters';
import { DEMO_RECORD_IDS } from '../demo-record';
import type { DemoScope } from './demo-scope';
interface DemoContextValue {
  readonly scope: DemoScope;
  readonly selectedId: string;
  readonly select: (id: string) => void;
}
const DemoContext = createContext<DemoContextValue | null>(null);
export function DemoProvider({ children }: { readonly children: ReactNode }) {
  const records = useContent().get('base');
  const [scope] = useState(() => createDemoScope(records));
  const [selectedId, select] = useState<string>(DEMO_RECORD_IDS[0]);
  useEffect(() => () => scope.dispose(), [scope]);
  return <DemoContext value={{ scope, selectedId, select }}>{children}</DemoContext>;
}
export function useDemoData(): DemoContextValue {
  const value = useContext(DemoContext);
  if (!value) throw new Error('Demo resources require the shared workbench data scope.');
  return value;
}
export function useDemoRecords() {
  const { scope } = useDemoData();
  return useSyncExternalStore(
    scope.records.subscribe,
    scope.records.getSnapshot,
    scope.records.getSnapshot
  );
}

export function useDemoPages() {
  const { scope } = useDemoData();
  return useSyncExternalStore(
    scope.pages.subscribe,
    scope.pages.getSnapshot,
    scope.pages.getSnapshot
  );
}
