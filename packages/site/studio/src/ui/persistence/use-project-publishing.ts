import { useEffect, useRef, useState } from 'react';
import { preparePublication, publicationTargetSchema } from '../../data/index.js';
import type { StudioPublishing, PublicationTarget, PublicationChoice } from '../../data/index.js';
import { contentRegistry } from '@frontend/puck-adapter/schema';
import type { ProjectSession } from '../session/use-project-session.js';
export function useProjectPublishing(session: ProjectSession, publishing?: StudioPublishing) {
  const initial = session.project.publishing?.target;
  const [targetId, setTargetId] = useState(initial?.targetId ?? publishing?.targets[0]?.id ?? '');
  const [key, setKey] = useState(initial?.key ?? '');
  const [locales, setLocales] = useState<readonly string[]>([
    session.project.metadata.defaultLocale,
  ]);
  const [choices, setChoices] = useState<readonly PublicationChoice[]>([]);
  const [status, setStatus] = useState<
    'idle' | 'loaded' | 'attached' | 'published' | 'conflict' | 'not-found' | 'failed' | 'invalid'
  >('idle');
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState('');
  const pending = useRef<AbortController | null>(null);
  useEffect(() => {
    setKey(
      session.project.publishing?.target?.key ?? session.project.publishing?.source?.key ?? ''
    );
    setTargetId(session.project.publishing?.target?.targetId ?? publishing?.targets[0]?.id ?? '');
    setLocales([session.project.metadata.defaultLocale]);
    setStatus('idle');
    setDetail('');
    return () => {
      pending.current?.abort();
      pending.current = null;
      setBusy(false);
    };
  }, [session.state.generation, publishing]);
  useEffect(() => {
    setLocales((current) => [...new Set([session.project.metadata.defaultLocale, ...current])]);
  }, [session.project.metadata.defaultLocale]);
  useEffect(() => {
    if (!publishing?.list || !targetId) return;
    const controller = new AbortController();
    setChoices([]);
    void publishing
      .list(targetId, controller.signal)
      .then((items) => {
        if (!controller.signal.aborted) setChoices(items);
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus('failed');
      });
    return () => controller.abort();
  }, [publishing, targetId]);
  function target(project = session.latest.current.project): PublicationTarget {
    const association = project.publishing?.target;
    return {
      targetId,
      key,
      ...(association?.targetId === targetId &&
      association.key === key.trim() &&
      association.version
        ? { version: association.version }
        : { version: { revision: 0 } }),
    };
  }
  async function execute(action: 'load' | 'inspect' | 'publish') {
    if (!publishing || pending.current) return;
    const parsed = publicationTargetSchema.safeParse(target());
    setDetail('');
    if (
      !parsed.success ||
      !publishing.targets.some((target) => target.id === parsed.data.targetId)
    ) {
      setStatus('invalid');
      return;
    }
    const selected = parsed.data;
    const current = session.latest.current;
    const generation = current.state.generation;
    const snapshot =
      action === 'publish' ? preparePublication(current.project, contentRegistry, locales) : null;
    if (action === 'publish' && (!current.flags.canSave || !snapshot?.ok)) {
      if (snapshot && !snapshot.ok) session.setIssues(snapshot.errors);
      setStatus('invalid');
      return;
    }
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    try {
      if (action === 'load' || action === 'inspect') {
        const result = await publishing.load(selected, controller.signal);
        if (controller.signal.aborted || session.latest.current.state.generation !== generation)
          return;
        if (result.status === 'found') {
          const project = {
            ...result.project,
            publishing: {
              ...result.project.publishing,
              source: { ...selected, version: result.version },
              target: { ...selected, version: result.version },
            },
          };
          if (action === 'inspect') {
            session.dispatch({ type: 'target', target: { ...selected, version: result.version } });
            setStatus('attached');
          } else {
            session.requestReplace({
              project,
              filename: project.document.documentId + '.studio.json',
              published: result.published ?? true,
            });
            setStatus('loaded');
          }
        } else {
          if (result.status === 'unavailable') setDetail(result.message);
          if (result.status === 'invalid') session.setIssues(result.errors);
          if (action === 'inspect' && result.status === 'not-found') {
            session.dispatch({ type: 'target', target: { ...selected, version: { revision: 0 } } });
            setStatus('attached');
          } else setStatus(result.status === 'not-found' ? 'not-found' : 'failed');
        }
      } else if (snapshot?.ok) {
        const result = await publishing.publish(selected, snapshot.value, controller.signal);
        if (controller.signal.aborted || session.latest.current.state.generation !== generation)
          return;
        if (result.status === 'published') {
          session.acknowledgePublication(current.project, generation, {
            ...selected,
            version: result.version,
          });
          setStatus('published');
        } else if (result.status === 'conflict') setStatus('conflict');
        else {
          if (result.status === 'unavailable') setDetail(result.message);
          if (result.status === 'invalid') session.setIssues(result.errors);
          setStatus('failed');
        }
      }
    } catch {
      if (!controller.signal.aborted) setStatus('failed');
    } finally {
      if (pending.current === controller) {
        pending.current = null;
        setBusy(false);
      }
    }
  }
  return {
    targetId,
    key,
    version: target(session.project).version?.revision ?? 0,
    locales,
    choices,
    busy,
    status,
    detail,
    setTargetId,
    setKey,
    setLocales,
    execute,
  };
}
