import { useEffect, useRef, useState } from 'react';
import { preparePublication } from '@frontend/studio/data';
import type { ProjectSession } from '@frontend/studio/session';
import { contentRegistry } from '@frontend/puck-adapter/schema';
import type { DemoPage, DemoPageAdapter } from './contracts';
import { DEMO_PAGE_TARGET } from './contracts';
import { demoPageTitleSchema } from './page-validation';
export type PageOperationStatus =
  'idle' | 'published' | 'unlinked' | 'conflict' | 'failed' | 'invalid';
export function usePageOperation(
  session: ProjectSession,
  pages: DemoPageAdapter,
  initial: DemoPage,
  pendingItemId: string | null = initial.itemId
) {
  const [resource, setResource] = useState(initial);
  const [title, setTitle] = useState(initial.title);
  const [itemId, setItemId] = useState<string | null>(pendingItemId);
  const [status, setStatus] = useState<PageOperationStatus>('idle');
  const [busy, setBusy] = useState(false);
  const active = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      active.current?.abort();
      active.current = null;
    },
    []
  );
  async function execute(kind: 'publish' | 'unlink') {
    if (active.current) return;
    const current = session.latest.current;
    const titleResult = demoPageTitleSchema.safeParse(title);
    if (kind === 'publish' && (!titleResult.success || !current.flags.canSave)) {
      setStatus('invalid');
      return;
    }
    if (kind === 'unlink' && resource.itemId === null) return;
    const snapshot =
      kind === 'publish'
        ? preparePublication(current.project, contentRegistry, [
            ...new Set([
              current.project.metadata.defaultLocale,
              ...Object.keys(current.project.catalogs),
            ]),
          ])
        : null;
    if (snapshot && !snapshot.ok) {
      session.setIssues(snapshot.errors);
      setStatus('invalid');
      return;
    }
    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    try {
      const result =
        kind === 'publish' && snapshot?.ok && titleResult.success
          ? await pages.publish(
              {
                id: resource.id,
                title: titleResult.data,
                expectedRevision: resource.revision,
                expectedItemId: resource.itemId,
                itemId,
                project: snapshot.value.project,
                locales: snapshot.value.locales,
              },
              controller.signal
            )
          : resource.itemId !== null
            ? await pages.unlink(
                {
                  id: resource.id,
                  expectedRevision: resource.revision,
                  expectedItemId: resource.itemId,
                },
                controller.signal
              )
            : null;
      if (active.current !== controller || controller.signal.aborted || !result) return;
      if (result.status === 'found') {
        setResource(result.page);
        if (kind === 'publish')
          setTitle((latest) => (latest === title ? result.page.title : latest));
        setItemId(result.page.itemId);
        const target = {
          targetId: DEMO_PAGE_TARGET,
          key: resource.id,
          version: { revision: result.page.revision },
        };
        if (kind === 'publish')
          session.acknowledgePublication(current.project, current.state.generation, target);
        // Imported content can have a newer generation; identity advances without acknowledging its content.
        session.dispatch({ type: 'target', target });
        setStatus(kind === 'publish' ? 'published' : 'unlinked');
      } else if (result.status === 'invalid') {
        session.setIssues(result.errors);
        setStatus('invalid');
      } else if (result.status !== 'cancelled')
        setStatus(result.status === 'conflict' ? 'conflict' : 'failed');
    } catch {
      if (active.current === controller && !controller.signal.aborted) setStatus('failed');
    } finally {
      if (active.current === controller) {
        active.current = null;
        setBusy(false);
      }
    }
  }
  return { resource, title, setTitle, itemId, setItemId, status, busy, execute };
}
