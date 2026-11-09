import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useProjectSession, StudioTextCatalogProvider } from '../session.js';
import { StudioCatalogPanel, StudioEditor } from '../editor.js';
import { DEFAULT_STUDIO_TEXT } from '../text-catalog.js';
import { createProject } from '../../data/index.js';
vi.mock('@frontend/puck-adapter/editor', () => ({ ContentEditor: () => null }));
afterEach(cleanup);
it('edits a caller-owned session without list, file or publishing controls or requests', () => {
  const fetch = vi.spyOn(globalThis, 'fetch');
  function CustomResource() {
    const session = useProjectSession(createProject('resource'));
    return (
      <StudioTextCatalogProvider text={{ ...DEFAULT_STUDIO_TEXT, catalogTitle: 'Resource copy' }}>
        <button
          type="button"
          onClick={() => session.acknowledgeSave(session.project, session.state.generation)}
        >
          Save resource
        </button>
        <output>{session.flags.localDirty ? 'changed' : 'saved'}</output>
        <StudioEditor session={session} />
      </StudioTextCatalogProvider>
    );
  }
  render(<CustomResource />);
  expect(screen.getByRole('region', { name: 'Resource copy' })).toBeDefined();
  expect(screen.queryByLabelText(DEFAULT_STUDIO_TEXT.openFile)).toBeNull();
  expect(screen.queryByLabelText(DEFAULT_STUDIO_TEXT.catalogFile)).toBeNull();
  expect(screen.queryByRole('button', { name: DEFAULT_STUDIO_TEXT.publish })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Save resource' }));
  expect(screen.getByText('saved')).toBeDefined();
  expect(fetch).not.toHaveBeenCalled();
  fetch.mockRestore();
});

it('lets a host relocate the catalog while keeping one session and keyboard history', () => {
  function Host() {
    const initial = { ...createProject('relocated'), catalogs: { en: { heading: 'Before' } } };
    const session = useProjectSession(initial);
    return (
      <>
        <StudioCatalogPanel session={session} />
        <StudioEditor session={session} catalogPanel={null} />
      </>
    );
  }
  render(<Host />);
  expect(screen.getAllByRole('region', { name: DEFAULT_STUDIO_TEXT.catalogTitle })).toHaveLength(1);
  fireEvent.click(screen.getByText('heading', { exact: true }));
  const value = screen.getByRole('textbox', { name: DEFAULT_STUDIO_TEXT.catalogValue });
  fireEvent.change(value, { target: { value: 'After' } });
  expect(value).toHaveProperty('value', 'After');
  fireEvent.keyDown(value, { key: 'z', ctrlKey: true });
  expect(value).toHaveProperty('value', 'Before');
});
