import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { createProject } from '../../data/index.js';
import { useProjectSession } from '../session/use-project-session.js';
import { CatalogPanel } from './catalog-panel.js';

function Harness() {
  const session = useProjectSession({
    ...createProject('catalog-controls'),
    catalogs: { en: { settings: { compact: true }, title: 'Example' } },
  });
  return <CatalogPanel session={session} />;
}
it('keeps an invalid catalog buffer visible instead of discarding it through another control', () => {
  render(<Harness />);
  fireEvent.click(screen.getByRole('button', { name: 'settings' }));
  const value = screen.getByLabelText('Catalog value');
  fireEvent.change(value, { target: { value: '{unfinished catalog' } });
  expect(value).toHaveValue('{unfinished catalog');
  for (const name of [
    'Add language',
    'Set as default language',
    'Create key',
    'Rename key',
    'Delete key',
  ])
    expect(screen.getByRole('button', { name })).toBeDisabled();
  expect(screen.getByLabelText('Value format')).toBeDisabled();
  expect(screen.getByLabelText('Editing language')).toBeDisabled();
  fireEvent.change(value, { target: { value: '{"compact":false}' } });
  expect(screen.getByRole('button', { name: 'Create key' })).toBeEnabled();
  expect(screen.getByLabelText('Value format')).toBeEnabled();
});
