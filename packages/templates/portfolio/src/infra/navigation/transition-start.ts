let revision = 0;
const listeners = new Set<() => void>();

/** Called by Next's client instrumentation before a push, replace or history traversal commits. */
export function notifyNavigationStart(): void {
  revision++;
  for (const notify of listeners) notify();
}

export function getNavigationRevision(): number {
  return revision;
}

export function subscribeToNavigationStart(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
