import { useEffect, useRef, useState } from 'react';
import type { DemoRecord } from '../demo-record';
import { useDemoData } from '../data/demo-provider';
import { createDemoPublisher, type DemoPublisher, type DemoPublishStage } from './publish-record';
type PublishState =
  | { readonly status: 'idle' }
  | { readonly status: 'publishing'; readonly stage: DemoPublishStage }
  | { readonly status: 'invalid' }
  | { readonly status: 'failed'; readonly stage: DemoPublishStage };
export function usePublishRecord(onCreated: (record: DemoRecord) => void) {
  const { scope } = useDemoData();
  const [state, setState] = useState<PublishState>({ status: 'idle' });
  const active = useRef<AbortController | null>(null);
  const publisher = useRef<DemoPublisher | null>(null);
  useEffect(
    () => () => {
      active.current?.abort();
      active.current = null;
      publisher.current?.dispose();
      publisher.current = null;
    },
    [scope]
  );
  async function publish(input: unknown) {
    if (active.current) return;
    const controller = new AbortController();
    active.current = controller;
    publisher.current ??= createDemoPublisher(scope);
    setState({ status: 'publishing', stage: 'image' });
    try {
      const result = await publisher.current.publish(input, controller.signal, (stage) => {
        if (active.current === controller) setState({ status: 'publishing', stage });
      });
      if (active.current !== controller || controller.signal.aborted) return;
      if (result.status === 'created') onCreated(result.record);
      else if (result.status === 'failed') setState(result);
      else if (result.status === 'invalid') setState(result);
      else setState({ status: 'idle' });
    } finally {
      if (active.current === controller) active.current = null;
    }
  }
  return { state, publish };
}
