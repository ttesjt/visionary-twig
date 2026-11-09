import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { StudioWorkbench } from './studio-workbench.js';
import { DEFAULT_STUDIO_TEXT } from '../text-catalog.js';
vi.mock('@frontend/puck-adapter/editor', () => ({ ContentEditor: () => null }));
afterEach(cleanup);
it('uses supplied theme and viewport labels while preserving machine values', () => {
  const { container } = render(
    <StudioWorkbench
      text={{
        ...DEFAULT_STUDIO_TEXT,
        themeDark: 'Nacht',
        viewportPhone: 'Mobil',
        viewportOption: '{label} ({width})',
      }}
    />
  );
  expect(screen.getByRole('option', { name: 'Nacht' }).getAttribute('value')).toBe('dark');
  expect(screen.getByRole('option', { name: 'Mobil (390)' }).getAttribute('value')).toBe('390');
  fireEvent.change(screen.getByLabelText('Studio theme'), { target: { value: 'dark' } });
  expect(container.querySelector('main')?.getAttribute('data-theme')).toBe('dark');
  fireEvent.change(screen.getByLabelText('Preview viewport'), { target: { value: '390' } });
  expect(screen.getByLabelText('Preview viewport')).toHaveProperty('value', '390');
});
