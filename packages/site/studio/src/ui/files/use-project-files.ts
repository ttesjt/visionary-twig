import { useEffect, useRef, useState } from 'react';
import { encodeProject } from '../../data/index.js';
import type { ProjectSession } from '../session/use-project-session.js';
import type { StudioFileAdapter, StudioFileLocation } from './file-adapter.js';
import { readLocalJson, jsonFilename } from './local-files.js';
export function useProjectFiles(session: ProjectSession, adapter: StudioFileAdapter) {
  const [locations, setLocations] = useState<
    readonly { generation: number; location: StudioFileLocation }[]
  >([]);
  const location =
    locations.find((entry) => entry.generation === session.state.generation)?.location ?? null;
  function rememberLocation(generation: number, location: StudioFileLocation) {
    setLocations((current) => [
      ...current.filter(
        (entry) =>
          (entry.generation === session.latest.current.state.generation ||
            entry.generation === session.pending?.generation) &&
          entry.generation !== generation
      ),
      { generation, location },
    ]);
  }
  const pending = useRef(false);
  const request = useRef(0);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saved' | 'downloaded' | 'failed'>('idle');
  useEffect(
    () => () => {
      request.current += 1;
    },
    []
  );
  useEffect(() => {
    request.current += 1;
    setStatus('idle');
  }, [session.state.generation]);
  async function importFile(file: File) {
    const generation = session.latest.current.state.generation;
    const id = ++request.current;
    const result = await readLocalJson(file);
    if (id !== request.current || session.latest.current.state.generation !== generation) return;
    if (result.ok) session.open(result.value, { filename: file.name, saved: false });
    else session.setIssues(result.errors);
  }
  async function open() {
    if (!adapter.open || pending.current) return;
    const generation = session.latest.current.state.generation;
    const id = ++request.current;
    try {
      const result = await adapter.open();
      if (id !== request.current || session.latest.current.state.generation !== generation) return;
      if (result.status === 'opened') {
        const next = session.open(result.text, { filename: result.filename, saved: true });
        if (next !== false) rememberLocation(next, result.location);
      }
    } catch {
      if (id === request.current && session.latest.current.state.generation === generation)
        setStatus('failed');
    }
  }
  async function save(asNew = false) {
    const current = session.latest.current;
    if (pending.current || !current.flags.canSave) return;
    const generation = current.state.generation;
    const snapshot = current.project;
    const writable = locations.find((entry) => entry.generation === generation)?.location;
    pending.current = true;
    setBusy(true);
    const id = ++request.current;
    try {
      const text = encodeProject(snapshot);
      const result =
        !asNew && writable
          ? (await writable.write(text), { status: 'saved' as const, location: writable })
          : await adapter.saveAs({ filename: jsonFilename(current.state.filename), text });
      if (id !== request.current || session.latest.current.state.generation !== generation) return;
      if (result.status === 'saved') {
        rememberLocation(generation, result.location);
        session.acknowledgeSave(snapshot, generation, result.location.name);
        setStatus('saved');
      } else if (result.status === 'downloaded') setStatus('downloaded');
    } catch {
      if (id === request.current) setStatus('failed');
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return { busy, status, location, canOpen: Boolean(adapter.open), importFile, open, save };
}

export type ProjectFiles = ReturnType<typeof useProjectFiles>;
