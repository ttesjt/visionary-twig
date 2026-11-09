'use client';
import { useState } from 'react';
import type { TrackResult } from '@frontend/event-tracking';
import { useText } from '../../../../../infra/resources/client';
import { eventTracker } from '../../../../../infra/event-tracking/client';
import { TRACKING_EVENTS } from '../../../../../site/tracking-events';

export function TrackingExample() {
  const text = useText();
  const [pending, setPending] = useState(false);
  const [attempt, setAttempt] = useState<object | null>(null);
  const [result, setResult] = useState<TrackResult | null>(null);
  async function send(free: boolean) {
    setPending(true);
    const typedData = { itemId: 'sample', source: 'example' as const };
    const freeData = { example: true };
    const data = free ? freeData : typedData;
    setAttempt({
      projectId: free ? 'debug' : 'site',
      event: free ? TRACKING_EVENTS.custom : TRACKING_EVENTS.sampleOpened,
      data,
    });
    const response = free
      ? await eventTracker.track('debug', TRACKING_EVENTS.custom, freeData)
      : await eventTracker.track('site', TRACKING_EVENTS.sampleOpened, typedData);
    setResult(response);
    setPending(false);
  }
  return (
    <div className="example-flow">
      <div className="example-controls">
        <button
          type="button"
          className="ui-button"
          disabled={pending}
          onClick={() => {
            void send(false);
          }}
        >
          {text.getText('main', 'tracking.sendTyped')}
        </button>
        <button
          type="button"
          className="ui-button"
          disabled={pending}
          onClick={() => {
            void send(true);
          }}
        >
          {text.getText('main', 'tracking.sendFree')}
        </button>
      </div>
      <section aria-label={text.getText('main', 'tracking.payload')}>
        <h2>{text.getText('main', 'tracking.payload')}</h2>
        <pre className="example-code">
          {attempt ? JSON.stringify(attempt, null, 2) : text.getText('main', 'tracking.idle')}
        </pre>
      </section>
      <section aria-label={text.getText('main', 'tracking.result')} aria-live="polite">
        <h2>{text.getText('main', 'tracking.result')}</h2>
        <pre className="example-code" data-testid="tracking-result">
          {pending
            ? text.getText('main', 'tracking.pending')
            : result
              ? JSON.stringify(result, null, 2)
              : text.getText('main', 'tracking.idle')}
        </pre>
      </section>
    </div>
  );
}
