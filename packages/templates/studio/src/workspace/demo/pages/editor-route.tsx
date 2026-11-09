'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { useStudioPathname } from '../../navigation/use-studio-pathname';
import { useSearchParams } from 'next/navigation';
import { StudioLink } from '../../navigation/studio-link';
import { createProject } from '@frontend/studio/data';
import { useStudioText } from '../../../text/use-studio-text';
import { useDemoData } from '../data/demo-provider';
import { DEMO_ROUTES, demoEditingRoute } from '../demo-routes';
import { demoIdentitySchema } from '../demo-record';
import type { DemoPage } from './contracts';
import { DemoPageSession } from './page-session';
type EditorLoad =
  | { readonly status: 'loading' | 'missing' | 'failed'; readonly key: string }
  | { readonly status: 'ready'; readonly key: string; readonly page: DemoPage };
export function DemoEditorRoute({ children }: { readonly children: ReactNode }) {
  const path = useStudioPathname();
  const params = useSearchParams();
  const route = demoEditingRoute(path);
  const base = route?.base ?? '';
  const newPage = base === DEMO_ROUTES.newPage;
  const pageId = newPage ? null : base.split('/')[3];
  const itemId = newPage ? params.get('item') : null;
  const key = base + ':' + (itemId ?? '');
  const { scope } = useDemoData();
  const componentText = useStudioText().workspace.demo.pages;
  const [state, setState] = useState<EditorLoad>({ status: 'loading', key });
  useEffect(() => {
    const controller = new AbortController();
    async function open() {
      setState({ status: 'loading', key });
      if (
        (!newPage && !demoIdentitySchema.safeParse(pageId).success) ||
        (itemId !== null && !demoIdentitySchema.safeParse(itemId).success)
      ) {
        setState({ status: 'missing', key });
        return;
      }
      try {
        if (newPage) {
          const item = itemId
            ? scope.records.getSnapshot().find((record) => record.id === itemId)
            : null;
          if (itemId && (!item || item.pageId)) {
            if (!controller.signal.aborted) setState({ status: 'missing', key });
            return;
          }
          const id = scope.createId();
          if (!controller.signal.aborted)
            setState({
              status: 'ready',
              key,
              page: {
                id,
                title: componentText.untitled,
                revision: 0,
                project: createProject(id),
                itemId,
              },
            });
        } else if (pageId) {
          const result = await scope.pages.load(pageId, controller.signal);
          if (controller.signal.aborted) return;
          setState(
            result.status === 'found'
              ? { status: 'ready', key, page: result.page }
              : { status: result.status === 'not-found' ? 'missing' : 'failed', key }
          );
        }
      } catch {
        if (!controller.signal.aborted) setState({ status: 'failed', key });
      }
    }
    void open();
    return () => controller.abort();
  }, [scope, key, newPage, pageId, itemId, componentText.untitled]);
  if (state.status !== 'ready' || state.key !== key)
    return (
      <section className="ui-studio-surface ui-studio-flow">
        <p role="status">
          {
            componentText.load[
              state.key === key && state.status !== 'ready' ? state.status : 'loading'
            ]
          }
        </p>
        <StudioLink href={DEMO_ROUTES.pages}>{componentText.back}</StudioLink>
      </section>
    );
  return (
    <DemoPageSession
      key={key}
      initial={state.page}
      base={base}
      search={itemId ? '?item=' + encodeURIComponent(itemId) : ''}
    >
      {children}
    </DemoPageSession>
  );
}
