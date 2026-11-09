import { describe, it, expect, vi } from 'vitest';
import { act as reactAct, renderHook } from '@testing-library/react';
import { createProject, parseProject, contentFingerprint } from '../../data/index.js';
import type { StudioFileLocation, StudioFileAdapter } from '../files/file-adapter.js';
import type {
  StudioPublishing,
  ProjectLoadResult,
  ProjectPublishResult,
} from '../../data/index.js';
import { contentRegistry } from '@frontend/puck-adapter/schema';
import { useProjectSession } from './use-project-session.js';
import { useProjectFiles } from '../files/use-project-files.js';
import { useProjectPublishing } from '../persistence/use-project-publishing.js';
function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>((finish) => {
    resolve = finish;
  });
  return { promise, resolve };
}
const initial = () => ({
  ...createProject('neutral'),
  catalogs: { en: { title: 'Hello' }, zh: { title: '你好' } },
  context: { settings: { compact: true } },
  publishing: {
    source: { targetId: 'source', key: 'origin', version: { revision: 9 } },
    target: { targetId: 'local', key: 'destination', version: { revision: 2 } },
  },
});
function adapter(
  write: StudioFileLocation['write'] = vi.fn<StudioFileLocation['write']>(() => Promise.resolve())
) {
  const location: StudioFileLocation = { name: 'working.studio.json', write };
  return {
    location,
    files: {
      saveAs: vi.fn<StudioFileAdapter['saveAs']>(() =>
        Promise.resolve({ status: 'saved', location })
      ),
    },
  };
}
function setup(files: StudioFileAdapter, publishing?: StudioPublishing) {
  return renderHook(() => {
    const session = useProjectSession();
    return {
      session,
      files: useProjectFiles(session, files),
      publication: useProjectPublishing(session, publishing),
    };
  });
}
describe('complete Studio project session', () => {
  it('saves all languages, bindings, context and associations to one file; Save As retains the target', async () => {
    const port = adapter();
    const { result } = setup(port.files);
    await update(() => result.current.session.open(initial(), { filename: 'remote.studio.json' }));
    await update(() => result.current.files.save(true));
    expect(port.files.saveAs).toHaveBeenCalledOnce();
    const text = port.files.saveAs.mock.calls[0]?.[0].text;
    expect(JSON.parse(text ?? '{}')).toEqual(initial());
    expect(result.current.session.flags.localDirty).toBe(false);
    expect(result.current.files.location).toBe(port.location);
    expect(result.current.session.project.publishing?.target?.key).toBe('destination');
    await update(() =>
      result.current.session.run(
        parseProject({ ...result.current.session.project, context: {} }, contentRegistry)
      )
    );
    expect(result.current.session.flags.localDirty).toBe(true);
    await update(() => result.current.files.save());
    expect(port.location.write).toHaveBeenCalledOnce();
    expect(result.current.session.flags.localDirty).toBe(false);
  });
  it('saves structurally valid work with unresolved dependencies', async () => {
    const port = adapter();
    const { result } = setup(port.files);
    const project = {
      ...initial(),
      document: {
        ...initial().document,
        data: { root: {}, content: [{ type: 'Heading', props: { id: 'title', text: '' } }] },
        bindings: [{ nodeId: 'title', targetPath: ['text'], sourcePath: ['copy', 'missing'] }],
      },
    };
    await update(() => result.current.session.open(project, { filename: 'incomplete.json' }));
    expect(result.current.session.errors.length).toBeGreaterThan(0);
    expect(result.current.session.flags.canSave).toBe(true);
    await update(() => result.current.files.save());
    expect(port.files.saveAs).toHaveBeenCalledOnce();
    expect(result.current.session.flags.localDirty).toBe(false);
  });
  it('does not mark newer edits saved when a native write finishes late', async () => {
    const writing = deferred<void>();
    const write = vi.fn<StudioFileLocation['write']>(() => writing.promise);
    const port = adapter(write);
    const { result } = setup(port.files);
    await update(() =>
      result.current.session.open(initial(), {
        filename: 'working.json',
        saved: true,
      })
    );
    await update(() => result.current.files.save(true));
    let pending = Promise.resolve();
    await update(() => {
      pending = result.current.files.save();
    });
    await update(() =>
      result.current.session.run(
        parseProject(
          { ...result.current.session.project, context: { newer: true } },
          contentRegistry
        )
      )
    );
    await update(async () => {
      writing.resolve();
      await pending;
    });
    expect(result.current.session.flags.localDirty).toBe(true);
    expect(parseProject(write.mock.calls[0]?.[0] ?? '{}', contentRegistry)).toMatchObject({
      ok: true,
      value: { context: initial().context },
    });
  });
  it('does not pretend download is durable save or remember an unwritable location', async () => {
    const files: StudioFileAdapter = { saveAs: () => Promise.resolve({ status: 'downloaded' }) };
    const { result } = setup(files);
    await update(() => result.current.session.open(initial(), { filename: 'file.json' }));
    await update(() => result.current.files.save());
    expect(result.current.files.status).toBe('downloaded');
    expect(result.current.session.flags.localDirty).toBe(true);
    expect(result.current.files.location).toBeNull();
  });
  it('clearing non-empty loaded context remains dirty and requires replacement confirmation', async () => {
    const { result } = setup(adapter().files);
    await update(() =>
      result.current.session.open(initial(), { filename: 'file.json', saved: true })
    );
    await update(() =>
      result.current.session.run(
        parseProject({ ...result.current.session.project, context: {} }, contentRegistry)
      )
    );
    expect(result.current.session.flags.hasChanges).toBe(true);
    await update(() =>
      result.current.session.open(createProject('other'), { filename: 'other.json' })
    );
    expect(result.current.session.pending).not.toBeNull();
    await update(() => result.current.session.cancelReplacement());
    expect(result.current.session.project.context).toEqual({});
  });
  it('rejects malformed declared projects without replacing the current project', async () => {
    const { result } = setup(adapter().files);
    await update(() => result.current.session.open(initial(), { filename: 'file.json' }));
    await update(() =>
      result.current.session.open(
        { ...initial(), metadata: { kind: 'studio-project', formatVersion: 999 } },
        { filename: 'bad.json' }
      )
    );
    expect(result.current.session.project.document.documentId).toBe('neutral');
    expect(result.current.session.state.issues.length).toBeGreaterThan(0);
  });
});
describe('independent explicit publication', () => {
  function publishing(
    load: StudioPublishing['load'],
    publish: StudioPublishing['publish']
  ): StudioPublishing {
    return { targets: [{ id: 'local', label: 'Local' }], load, publish };
  }
  it('publishes the submitted snapshot while newer edits remain unpublished and locally unsaved', async () => {
    const pending = deferred<ProjectPublishResult>();
    const publish = vi.fn<StudioPublishing['publish']>(() => pending.promise);
    const { result } = setup(
      adapter().files,
      publishing(() => Promise.resolve({ status: 'not-found' }), publish)
    );
    await update(() => result.current.session.open(initial(), { filename: 'remote.json' }));
    // A loaded file's target is selectable independently of its different source revision.
    await update(() => result.current.publication.setKey('destination'));
    let operation = Promise.resolve();
    await update(() => {
      operation = result.current.publication.execute('publish');
    });
    await update(() =>
      result.current.session.run(
        parseProject(
          { ...result.current.session.project, context: { newer: true } },
          contentRegistry
        )
      )
    );
    await update(async () => {
      pending.resolve({ status: 'published', version: { revision: 3 } });
      await operation;
    });
    expect(publish.mock.calls[0]?.[0]).toMatchObject({
      targetId: 'local',
      key: 'destination',
      version: { revision: 2 },
    });
    expect(publish.mock.calls[0]?.[1].project.context).toEqual(initial().context);
    expect(result.current.session.flags.unpublished).toBe(true);
    expect(result.current.session.flags.localDirty).toBe(true);
    expect(result.current.session.project.publishing?.target?.version?.revision).toBe(3);
  });
  it('inspects the latest document/context before replacing after a delayed load', async () => {
    const pending = deferred<ProjectLoadResult>();
    const port = publishing(
      () => pending.promise,
      () => Promise.resolve({ status: 'conflict' })
    );
    const { result } = setup(adapter().files, port);
    await update(() =>
      result.current.session.open(initial(), { filename: 'local.json', saved: true })
    );
    await update(() => result.current.publication.setKey('destination'));
    let operation = Promise.resolve();
    await update(() => {
      operation = result.current.publication.execute('load');
    });
    await update(() =>
      result.current.session.run(
        parseProject(
          { ...result.current.session.project, context: { edited: 'during load' } },
          contentRegistry
        )
      )
    );
    await update(async () => {
      pending.resolve({
        status: 'found',
        project: createProject('remote'),
        version: { revision: 1 },
      });
      await operation;
    });
    expect(result.current.session.pending?.project.document.documentId).toBe('remote');
    expect(result.current.session.project.context).toEqual({ edited: 'during load' });
    await update(() => result.current.session.cancelReplacement());
    expect(result.current.session.project.document.documentId).toBe('neutral');
  });
  it('does not use a source version as the expected version of another publication target', async () => {
    const publish = vi.fn<StudioPublishing['publish']>(() =>
      Promise.resolve({ status: 'published', version: { revision: 1 } })
    );
    const { result } = setup(
      adapter().files,
      publishing(() => Promise.resolve({ status: 'not-found' }), publish)
    );
    await update(() => result.current.session.open(initial(), { filename: 'source.json' }));
    await update(() => result.current.publication.setKey('new-destination'));
    await update(() => result.current.publication.execute('publish'));
    expect(publish.mock.calls[0]?.[0].version?.revision).toBe(0);
  });
  it('preserves publication acknowledgement across content undo without treating it as a local file save', async () => {
    const { result } = setup(adapter().files);
    await update(() => result.current.session.open(initial(), { filename: 'source.json' }));
    const before = result.current.session.project;
    await update(() =>
      result.current.session.run(
        parseProject({ ...before, context: { next: true } }, contentRegistry)
      )
    );
    await update(() =>
      result.current.session.dispatch({
        type: 'published',
        generation: result.current.session.state.generation,
        project: result.current.session.project,
        target: { targetId: 'local', key: 'destination', version: { revision: 3 } },
      })
    );
    expect(result.current.session.flags.unpublished).toBe(false);
    await update(() => result.current.session.dispatch({ type: 'undo' }));
    expect(result.current.session.project.publishing?.target?.version?.revision).toBe(3);
    expect(result.current.session.flags.unpublished).toBe(true);
    expect(result.current.session.flags.localDirty).toBe(true);
    expect(contentFingerprint(result.current.session.project)).toBe(contentFingerprint(before));
  });
});

async function update(callback: () => unknown): Promise<void> {
  await reactAct(async () => {
    await callback();
  });
}

it('links a different existing target version without replacing or publishing the current local project', async () => {
  const publish = vi.fn<StudioPublishing['publish']>(() => Promise.resolve({ status: 'conflict' }));
  const publisher: StudioPublishing = {
    targets: [{ id: 'local', label: 'Local' }],
    load: () =>
      Promise.resolve({
        status: 'found',
        project: createProject('other-content'),
        version: { revision: 7 },
      }),
    publish,
  };
  const { result } = setup(adapter().files, publisher);
  await update(() => result.current.session.open(initial(), { filename: 'keep-local.json' }));
  await update(() => result.current.publication.setKey('different-target'));
  await update(() => result.current.publication.execute('inspect'));
  expect(result.current.session.project.document.documentId).toBe('neutral');
  expect(result.current.session.project.catalogs).toEqual(initial().catalogs);
  expect(result.current.session.project.publishing?.target).toMatchObject({
    key: 'different-target',
    version: { revision: 7 },
  });
  expect(result.current.session.pending).toBeNull();
  expect(result.current.session.flags.unpublished).toBe(true);
  expect(publish).not.toHaveBeenCalled();
});

it('keeps file handles outside the session and does not reuse a cancelled replacement location', async () => {
  const first = adapter();
  const other = {
    name: 'other.studio.json',
    write: vi.fn<StudioFileLocation['write']>(() => Promise.resolve()),
  };
  const open = vi.fn<NonNullable<StudioFileAdapter['open']>>(() =>
    Promise.resolve({
      status: 'opened',
      filename: other.name,
      text: JSON.stringify(createProject('other')),
      location: other,
    })
  );
  const { result } = setup({ ...first.files, open });
  await update(() => result.current.session.open(initial(), { filename: 'first.json' }));
  await update(() => result.current.files.save(true));
  await update(() =>
    result.current.session.run(
      parseProject(
        { ...result.current.session.project, context: { changed: true } },
        contentRegistry
      )
    )
  );
  await update(() => result.current.files.open());
  expect(result.current.session.pending).not.toBeNull();
  expect(result.current.files.location).toBe(first.location);
  expect(result.current.session.state).not.toHaveProperty('location');
  await update(() => result.current.session.cancelReplacement());
  await update(() =>
    result.current.session.open(createProject('third'), { filename: 'third.json' })
  );
  await update(() => result.current.session.confirmReplacement());
  expect(result.current.files.location).toBeNull();
  await update(() => result.current.files.save());
  expect(first.files.saveAs).toHaveBeenCalledTimes(2);
  expect(other.write).not.toHaveBeenCalled();
});
it('binds a native location only when its pending document replacement is accepted', async () => {
  const port = adapter();
  const nextLocation = {
    name: 'next.studio.json',
    write: vi.fn<StudioFileLocation['write']>(() => Promise.resolve()),
  };
  const { result } = setup({
    ...port.files,
    open: () =>
      Promise.resolve({
        status: 'opened',
        filename: nextLocation.name,
        text: JSON.stringify(createProject('next')),
        location: nextLocation,
      }),
  });
  await update(() => result.current.session.open(initial(), { filename: 'first.json' }));
  await update(() => result.current.files.save(true));
  await update(() =>
    result.current.session.run(
      parseProject({ ...result.current.session.project, context: {} }, contentRegistry)
    )
  );
  await update(() => result.current.files.open());
  expect(result.current.files.location).toBe(port.location);
  await update(() => result.current.session.confirmReplacement());
  expect(result.current.files.location).toBe(nextLocation);
  await update(() => result.current.files.save());
  expect(nextLocation.write).toHaveBeenCalledOnce();
});
it('lets a custom resource acknowledge a saved snapshot without a file or publication adapter', async () => {
  const { result } = renderHook(() => useProjectSession(initial()));
  const generation = result.current.state.generation;
  const snapshot = result.current.project;
  await update(() =>
    result.current.run(parseProject({ ...snapshot, context: { latest: true } }, contentRegistry))
  );
  await update(() => result.current.acknowledgeSave(snapshot, generation));
  expect(result.current.flags.localDirty).toBe(true);
  await update(() => result.current.acknowledgeSave(result.current.project, generation));
  expect(result.current.flags.hasChanges).toBe(false);
  expect(result.current.flags.unpublished).toBe(true);
  await update(() => result.current.newProject());
  await update(() => result.current.acknowledgeSave(snapshot, generation));
  expect(result.current.project.document.documentId).not.toBe('neutral');
  expect(result.current.flags.localDirty).toBe(true);
});
