import { useEffect, useRef, useState } from 'react';
import type { ContentIssue } from '@frontend/ui-document';
import type { StudioPreviewAdapter, StudioPreviewInput } from './preview-contract.js';

type PreviewState =
  | { readonly status: 'idle' }
  | {
      readonly status: 'loading';
      readonly fingerprint: string;
      readonly sessionKey: string | number;
    }
  | {
      readonly status: 'ready';
      readonly url: string;
      readonly fingerprint: string;
      readonly sessionKey: string | number;
    }
  | {
      readonly status: 'failed';
      readonly errors: readonly ContentIssue[];
      readonly fingerprint: string;
      readonly sessionKey: string | number;
    };
export function usePreview(
  adapter: StudioPreviewAdapter | undefined,
  input: StudioPreviewInput,
  sessionKey: string | number,
  enabled: boolean,
  automatic = false
) {
  const [state, setState] = useState<PreviewState>({ status: 'idle' });
  const active = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const fingerprint = JSON.stringify(input);
  // Every input change invalidates in-flight requests, even when an adapter ignores abort.
  useEffect(() => {
    generation.current += 1;
    active.current?.abort();
    // Cancellation is a lifecycle transition: returning to the same input must not revive a loading state.
    setState((current) =>
      current.status === 'loading' || current.status === 'failed' ? { status: 'idle' } : current
    );
    if (automatic && adapter && enabled) void request();
    return () => {
      generation.current += 1;
      active.current?.abort();
    };
  }, [fingerprint, sessionKey, enabled, adapter, automatic]);
  async function request(): Promise<void> {
    if (!adapter || !enabled) return;
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    const requestGeneration = ++generation.current;
    setState({ status: 'loading', fingerprint, sessionKey });
    try {
      const result = await adapter(input, controller.signal);
      if (controller.signal.aborted || requestGeneration !== generation.current) return;
      setState(
        result.ok
          ? { status: 'ready', url: result.url, fingerprint, sessionKey }
          : { status: 'failed', errors: result.errors, fingerprint, sessionKey }
      );
    } catch {
      if (!controller.signal.aborted && requestGeneration === generation.current)
        setState({
          status: 'failed',
          fingerprint,
          sessionKey,
          errors: [
            {
              code: 'preview-unavailable',
              path: [],
              message: 'Local preview failed. Retry when the Studio server is available.',
            },
          ],
        });
    } finally {
      if (active.current === controller) active.current = null;
    }
  }
  return {
    state:
      (state.status === 'loading' || state.status === 'failed') &&
      (state.fingerprint !== fingerprint || state.sessionKey !== sessionKey || !enabled)
        ? { status: 'idle' as const }
        : state,
    request,
    stale:
      state.status === 'ready' &&
      (state.fingerprint !== fingerprint || state.sessionKey !== sessionKey || !enabled),
  };
}
