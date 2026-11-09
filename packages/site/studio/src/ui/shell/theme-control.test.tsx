import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { useState } from 'react';
import { StudioShell } from './studio-shell.js';
import { useStudioTheme, type StudioAppearance } from './theme-context.js';
import { createStudioRegistry } from './registry.js';
const registry = createStudioRegistry({
  groups: [{ id: 'tools', label: 'Tools' }],
  pages: [{ id: 'demo', title: 'Demo', group: 'tools', rendering: 'route' }],
});
const props = {
  registry,
  activePageId: 'demo',
  navigation: { href: (id: string) => '/' + id, navigate: vi.fn() },
  brand: 'Studio',
  workspace: 'Example',
};
function Child() {
  const theme = useStudioTheme();
  const [draft, setDraft] = useState('draft');
  return (
    <>
      <output aria-label="Child preference">{theme.preference}</output>
      <input
        aria-label="Child draft"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
      />
      <button onClick={() => theme.setPreference('dark')}>Request dark</button>
    </>
  );
}
it('delegates both descendant and topbar changes to the controlled owner without remounting children', () => {
  const setPreference = vi.fn<StudioAppearance['setPreference']>();
  const view = render(
    <StudioShell {...props} appearance={{ preference: 'light', setPreference }}>
      <Child />
    </StudioShell>
  );
  fireEvent.change(screen.getByRole('textbox', { name: 'Child draft' }), {
    target: { value: 'retained' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Request dark' }));
  expect(setPreference).toHaveBeenLastCalledWith('dark');
  expect(screen.getByLabelText('Child preference')).toHaveTextContent('light');
  view.rerender(
    <StudioShell {...props} appearance={{ preference: 'dark', setPreference }}>
      <Child />
    </StudioShell>
  );
  expect(screen.getByLabelText('Child preference')).toHaveTextContent('dark');
  fireEvent.click(screen.getByRole('button', { name: /Appearance/ }));
  fireEvent.click(screen.getByRole('button', { name: 'System' }));
  expect(setPreference).toHaveBeenLastCalledWith('system');
  view.rerender(
    <StudioShell {...props} layout="focus" appearance={{ preference: 'system', setPreference }}>
      <Child />
    </StudioShell>
  );
  expect(screen.getByLabelText('Child preference')).toHaveTextContent('system');
  expect(screen.getByRole('textbox', { name: 'Child draft' })).toHaveValue('retained');
});
it('fixed policy overrides a controlled value and never asks the host to persist another choice', () => {
  const setPreference = vi.fn<StudioAppearance['setPreference']>();
  render(
    <StudioShell
      {...props}
      themePolicy={{ mode: 'fixed', scheme: 'light' }}
      appearance={{ preference: 'dark', setPreference }}
    >
      <Child />
    </StudioShell>
  );
  expect(screen.getByLabelText('Child preference')).toHaveTextContent('light');
  fireEvent.click(screen.getByRole('button', { name: 'Request dark' }));
  expect(setPreference).not.toHaveBeenCalled();
});
