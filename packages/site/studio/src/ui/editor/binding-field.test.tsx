import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { z } from 'zod';
import { createProject, type StudioProject } from '../../data/index.js';
import { useProjectSession, StudioTextCatalogProvider } from '../session.js';
import { DEFAULT_STUDIO_TEXT } from '../text-catalog.js';
import { BindingField } from './binding-field.js';

afterEach(cleanup);

it('formats the resolved output label from supplied text while keeping binding behavior', () => {
  const initial = createProject('neutral');
  const project: StudioProject = {
    ...initial,
    catalogs: { en: { heading: 'Sample heading' } },
    document: {
      ...initial.document,
      data: {
        root: {},
        content: [{ type: 'Heading', props: { id: 'title', text: '', level: 2 } }],
      },
      bindings: [{ nodeId: 'title', targetPath: ['text'], sourcePath: ['copy', 'heading'] }],
    },
  };
  function Example({ label }: { readonly label: string }) {
    const session = useProjectSession(project);
    return (
      <StudioTextCatalogProvider text={{ ...DEFAULT_STUDIO_TEXT, resolvedValue: label }}>
        <BindingField
          id="heading-field"
          nodeId="title"
          name="text"
          label="Heading"
          schema={z.string()}
          value=""
          readOnly={false}
          onChange={() => undefined}
          session={session}
        />
      </StudioTextCatalogProvider>
    );
  }
  const { rerender } = render(<Example label="{label} — resolved content" />);
  expect(screen.getByRole('status', { name: 'Heading — resolved content' }).textContent).toBe(
    '"Sample heading"'
  );
  expect(screen.getByRole('textbox', { name: /copy.heading/ })).toHaveProperty(
    'value',
    'Sample heading'
  );
  rerender(<Example label={DEFAULT_STUDIO_TEXT.resolvedValue} />);
  expect(screen.getByRole('status', { name: 'Resolved Heading' }).textContent).toBe(
    '"Sample heading"'
  );
});
