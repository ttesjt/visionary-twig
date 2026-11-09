import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type {
  StudioRecordSession,
  StudioRecordSessionOptions,
  StudioRecordSaveState,
} from './contracts.js';
/** Applied record state, independently of page JSON, publication, resource schema or transport. */
export function useStudioRecordSession<Row>(
  options: StudioRecordSessionOptions<Row>
): StudioRecordSession<Row> {
  const [values, setValues] = useState(() => ({
    draft: structuredClone(options.initial),
    baseline: structuredClone(options.initial),
  }));
  const [state, setState] = useState<StudioRecordSaveState>({ status: 'idle' });
  const latest = useRef({ options, values });
  useLayoutEffect(() => {
    latest.current = { options, values };
  });
  const active = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      active.current?.abort();
      active.current = null;
    },
    []
  );
  async function save() {
    if (active.current) return;
    const controller = new AbortController();
    active.current = controller;
    const current = latest.current;
    setState({ status: 'saving' });
    try {
      const parsed = current.options.validate(current.values.draft);
      if (!parsed.ok) {
        setState({ status: 'invalid', errors: parsed.errors });
        return;
      }
      const submitted = structuredClone(parsed.value);
      const submittedFingerprint = current.options.fingerprint(current.values.draft);
      const result = await current.options.adapter.update(
        submitted,
        controller.signal,
        structuredClone(current.values.baseline)
      );
      if (active.current !== controller || controller.signal.aborted) return;
      if (result.status === 'saved') {
        const checked = current.options.validate(result.record);
        if (
          !checked.ok ||
          current.options.identity(checked.value) !== current.options.identity(submitted)
        ) {
          setState({ status: 'unavailable' });
          return;
        }
        const accepted = structuredClone(checked.value);
        setValues((previous) => ({
          baseline: accepted,
          draft:
            current.options.fingerprint(previous.draft) === submittedFingerprint
              ? accepted
              : previous.draft,
        }));
        setState({ status: 'saved' });
      } else if (result.status === 'invalid') setState(result);
      else setState({ status: result.status === 'cancelled' ? 'idle' : result.status });
    } catch {
      if (active.current === controller && !controller.signal.aborted)
        setState({ status: 'unavailable' });
    } finally {
      if (active.current === controller) active.current = null;
    }
  }
  return {
    ...values,
    dirty: options.fingerprint(values.draft) !== options.fingerprint(values.baseline),
    busy: state.status === 'saving',
    state,
    setDraft: (draft) => {
      setValues((previous) => ({ ...previous, draft }));
      setState((previous) => (previous.status === 'saving' ? previous : { status: 'idle' }));
    },
    save,
    open: (record) => {
      active.current?.abort();
      active.current = null;
      setValues({ draft: structuredClone(record), baseline: structuredClone(record) });
      setState({ status: 'idle' });
    },
    reset: () => {
      if (!active.current) {
        setValues((previous) => ({ ...previous, draft: structuredClone(previous.baseline) }));
        setState({ status: 'idle' });
      }
    },
  };
}
