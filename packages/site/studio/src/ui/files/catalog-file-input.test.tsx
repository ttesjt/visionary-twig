import { act, fireEvent, render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { createProject } from '../../data/index.js';
import { useProjectSession } from '../session/use-project-session.js';
import { CatalogFileInput } from './catalog-file-input.js';

function Harness() {
  const session = useProjectSession({
    ...createProject('catalog-files'),
    catalogs: { en: { title: 'Original' }, zh: { title: '原始' } },
  });
  return (
    <>
      <CatalogFileInput session={session} />
      <button
        onClick={() =>
          session.run({
            ok: true,
            value: {
              ...session.project,
              catalogs: { ...session.project.catalogs, en: { title: 'Newer edit' } },
            },
          })
        }
      >
        Edit catalog
      </button>
      <button onClick={() => session.dispatch({ type: 'locale', locale: 'zh' })}>
        Switch language
      </button>
      <button onClick={session.newProject}>Replace project</button>
      <button onClick={() => session.setDraft('other-input', true)}>Start pending draft</button>
      <output data-testid="catalogs">{JSON.stringify(session.project.catalogs)}</output>
      <output data-testid="issues">
        {session.state.issues.map((issue) => issue.code).join(',')}
      </output>
    </>
  );
}
function pendingFile(name: string, text: string) {
  let finish: (bytes: ArrayBuffer) => void = () => {};
  const bytes = new TextEncoder().encode(text);
  const pending = new Promise<ArrayBuffer>((resolve) => {
    finish = resolve;
  });
  class SlowFile extends File {
    override arrayBuffer(): Promise<ArrayBuffer> {
      return pending;
    }
  }
  return {
    file: new SlowFile([text], name, { type: 'application/json' }),
    pending,
    finish: () => finish(bytes.buffer),
  };
}
function choose(file: File) {
  fireEvent.change(screen.getByLabelText('Import catalog JSON'), { target: { files: [file] } });
}

it('does not overwrite catalog edits made while an import is being read', async () => {
  render(<Harness />);
  const file = pendingFile('catalog.json', '{"title":"Imported"}');
  choose(file.file);
  fireEvent.click(screen.getByRole('button', { name: 'Edit catalog' }));
  await act(async () => {
    file.finish();
    await file.pending;
  });
  expect(screen.getByTestId('catalogs')).toHaveTextContent('Newer edit');
  expect(screen.getByTestId('catalogs')).not.toHaveTextContent('Imported');
  expect(screen.getByTestId('issues')).toHaveTextContent('catalog-import-conflict');
});
it('lets the latest file selection win without reviving an older read', async () => {
  render(<Harness />);
  const older = pendingFile('older.json', '{"title":"Older file"}');
  const newer = pendingFile('newer.json', '{"title":"Newer file"}');
  choose(older.file);
  choose(newer.file);
  await act(async () => {
    newer.finish();
    await newer.pending;
  });
  await act(async () => {
    older.finish();
    await older.pending;
  });
  expect(screen.getByTestId('catalogs')).toHaveTextContent('Newer file');
  expect(screen.getByTestId('issues')).toBeEmptyDOMElement();
});
it('ignores reads for a replaced project and protects pending fields', async () => {
  render(<Harness />);
  const file = pendingFile('discarded.json', '{"title":"Discarded"}');
  choose(file.file);
  fireEvent.click(screen.getByRole('button', { name: 'Replace project' }));
  await act(async () => {
    file.finish();
    await file.pending;
  });
  expect(screen.getByTestId('catalogs')).not.toHaveTextContent('Discarded');
  expect(screen.getByTestId('issues')).toBeEmptyDOMElement();
  fireEvent.click(screen.getByRole('button', { name: 'Start pending draft' }));
  expect(screen.getByLabelText('Import catalog JSON')).toBeDisabled();
});

it('imports into the captured language without replacing a later language selection', async () => {
  render(<Harness />);
  const file = pendingFile('english.json', '{"title":"Imported English"}');
  choose(file.file);
  fireEvent.click(screen.getByRole('button', { name: 'Switch language' }));
  await act(async () => {
    file.finish();
    await file.pending;
  });
  expect(screen.getByTestId('catalogs')).toHaveTextContent('"en":{"title":"Imported English"}');
  expect(screen.getByTestId('catalogs')).toHaveTextContent('"zh":{"title":"原始"}');
  expect(screen.getByTestId('issues')).toBeEmptyDOMElement();
});
