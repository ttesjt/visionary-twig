import '@testing-library/jest-dom/vitest';
import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { StudioShell } from './studio-shell.js';
import { useStudioTheme } from './theme-context.js';
import { createStudioRegistry } from './registry.js';
import { StudioPageOutlet } from './page-outlet.js';
import type { StudioPageContext } from './contracts.js';
function CustomPage({ navigate, registry }: StudioPageContext) {
  const [count, setCount] = useState(0);
  return (
    <>
      <p>Registered: {registry.pages.length}</p>
      <button onClick={() => setCount(count + 1)}>Count {count}</button>
      <button onClick={() => navigate('guide')}>Go to guide</button>
    </>
  );
}
const registry = createStudioRegistry({
  groups: [{ id: 'content', label: 'Content' }],
  pages: [
    { id: 'notes', title: 'Notebook', group: 'content', component: CustomPage },
    {
      id: 'guide',
      title: 'Guide',
      group: 'content',
      component: () => <p>Independent page content</p>,
    },
  ],
});
const href = (id: string) => '/' + id;
const props = {
  registry,
  activePageId: 'notes',
  navigation: { href, navigate: vi.fn() },
  brand: 'Studio',
  workspace: 'Example',
};
afterEach(() => vi.restoreAllMocks());
it('runs an ordinary custom React page and host-controlled navigation without an editor or backend', () => {
  function Host() {
    const [activePageId, navigate] = useState('notes');
    return <StudioShell {...props} activePageId={activePageId} navigation={{ href, navigate }} />;
  }
  render(<Host />);
  fireEvent.click(screen.getByRole('button', { name: 'Count 0' }));
  expect(screen.getByRole('button', { name: 'Count 1' })).toBeInTheDocument();
  expect(screen.getByText('Registered: 2')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Go to guide' }));
  expect(screen.getByRole('heading', { level: 1, name: 'Guide' })).toBeInTheDocument();
  expect(screen.getByText('Independent page content')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Guide', hidden: false })).toHaveAttribute(
    'aria-current',
    'page'
  );
});
it('renders an explicit route outlet and preserves normal URLs for modified clicks', () => {
  const navigate = vi.fn();
  render(
    <StudioShell {...props} navigation={{ href, navigate }}>
      <StudioPageOutlet />
    </StudioShell>
  );
  const link = screen.getByRole('link', { name: 'Guide' });
  expect(link).toHaveAttribute('href', '/guide');
  fireEvent.click(link, { ctrlKey: true });
  expect(navigate).not.toHaveBeenCalled();
  fireEvent.click(link);
  expect(navigate).toHaveBeenCalledWith('guide');
});
it('honors fixed theme policies and localized shell labels', () => {
  const { container } = render(
    <StudioShell {...props} themePolicy={{ mode: 'fixed', scheme: 'dark' }} />
  );
  expect(container.querySelector('.ui-studio-shell')).toHaveAttribute('data-theme', 'dark');
  expect(screen.queryByRole('button', { name: /Appearance/ })).not.toBeInTheDocument();
});
it('isolates a broken extension and recovers when another page is selected', () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const Broken = () => {
    throw new Error('Private diagnostic');
  };
  const pages = createStudioRegistry({
    groups: registry.groups,
    pages: [
      ...registry.pages,
      { id: 'broken', title: 'Broken', group: 'content', component: Broken },
    ],
  });
  const view = render(<StudioShell {...props} registry={pages} activePageId="broken" />);
  expect(screen.getByRole('alert')).toHaveTextContent('This page could not be opened.');
  expect(screen.queryByText('Private diagnostic')).not.toBeInTheDocument();
  view.rerender(<StudioShell {...props} registry={pages} activePageId="guide" />);
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(screen.getByText('Independent page content')).toBeInTheDocument();
});

it('preserves the shell across host-owned child routes and allows returning to the same module root', () => {
  const navigate = vi.fn();
  const routed = createStudioRegistry({
    groups: registry.groups,
    pages: [{ id: 'records', title: 'Records', group: 'content', rendering: 'route' }],
  });
  const view = render(
    <StudioShell
      {...props}
      registry={routed}
      activePageId="records"
      contentKey="/records"
      navigation={{ href, navigate }}
    >
      <p>List route</p>
    </StudioShell>
  );
  const shell = view.container.querySelector('.ui-studio-shell');
  view.rerender(
    <StudioShell
      {...props}
      registry={routed}
      activePageId="records"
      contentKey="/records/new"
      navigation={{ href, navigate }}
    >
      <p>Create route</p>
    </StudioShell>
  );
  expect(view.container.querySelector('.ui-studio-shell')).toBe(shell);
  expect(screen.getByText('Create route')).toBeInTheDocument();
  expect(screen.getByRole('main')).toHaveFocus();
  fireEvent.click(screen.getByRole('link', { name: 'Records' }));
  expect(navigate).toHaveBeenCalledWith('records');
});
it('resets a failed nested route boundary without replacing its module shell', () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const Broken = () => {
    throw new Error('Broken child');
  };
  const view = render(
    <StudioShell {...props} contentKey="first">
      <Broken />
    </StudioShell>
  );
  expect(screen.getByRole('alert')).toBeInTheDocument();
  view.rerender(
    <StudioShell {...props} contentKey="second">
      <p>Healthy child</p>
    </StudioShell>
  );
  expect(screen.getByText('Healthy child')).toBeInTheDocument();
});

it('keeps resource-layout state mounted while its child route identity changes', () => {
  function PersistentResource({ route }: { readonly route: string }) {
    const [count, setCount] = useState(0);
    return (
      <>
        <button onClick={() => setCount(count + 1)}>Persistent count {count}</button>
        <p>{route}</p>
      </>
    );
  }
  const view = render(
    <StudioShell {...props} contentKey="/notes">
      <PersistentResource route="List" />
    </StudioShell>
  );
  fireEvent.click(screen.getByRole('button', { name: 'Persistent count 0' }));
  view.rerender(
    <StudioShell {...props} contentKey="/notes/new">
      <PersistentResource route="Create" />
    </StudioShell>
  );
  expect(screen.getByRole('button', { name: 'Persistent count 1' })).toBeInTheDocument();
});

it('allows a resource host to omit the repeated page heading without losing navigation', () => {
  render(<StudioShell {...props} pageHeading={null} />);
  expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Notebook' })).toHaveAttribute('aria-current', 'page');
  expect(screen.getByRole('button', { name: 'Count 0' })).toBeInTheDocument();
});

it('switches to focus layout without remounting a working child session', () => {
  const page = registry.findPage('notes');
  if (!page) throw new Error('Missing test page');
  const child = <CustomPage page={page} registry={registry} navigate={vi.fn()} />;
  const view = render(
    <StudioShell {...props} pageHeading={null}>
      {child}
    </StudioShell>
  );
  fireEvent.click(screen.getByRole('button', { name: 'Count 0' }));
  view.rerender(
    <StudioShell {...props} layout="focus" pageHeading={null}>
      {child}
    </StudioShell>
  );
  expect(screen.getByRole('button', { name: 'Count 1' })).toBeInTheDocument();
  expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  view.rerender(
    <StudioShell {...props} pageHeading={null}>
      {child}
    </StudioShell>
  );
  expect(screen.getByRole('button', { name: 'Count 1' })).toBeInTheDocument();
  expect(screen.getByRole('complementary')).toBeVisible();
});

function ThemeConsumer() {
  const appearance = useStudioTheme();
  const [draft, setDraft] = useState('kept draft');
  return (
    <>
      <output aria-label="Observed preference">{appearance.preference}</output>
      <input
        aria-label="Child draft"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
      />
      <button onClick={() => appearance.setPreference('dark')}>Request dark</button>
    </>
  );
}
it('shares one appearance with descendants and retains it across focused child routes', () => {
  const view = render(
    <StudioShell {...props}>
      <ThemeConsumer />
    </StudioShell>
  );
  fireEvent.change(screen.getByRole('textbox', { name: 'Child draft' }), {
    target: { value: 'edited' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Request dark' }));
  expect(view.container.querySelector('.ui-studio-shell')).toHaveAttribute('data-theme', 'dark');
  expect(screen.getByLabelText('Observed preference')).toHaveTextContent('dark');
  fireEvent.click(screen.getByRole('button', { name: /Appearance/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Light' }));
  expect(screen.getByLabelText('Observed preference')).toHaveTextContent('light');
  view.rerender(
    <StudioShell {...props} layout="focus" contentKey="/notes/json">
      <ThemeConsumer />
    </StudioShell>
  );
  expect(screen.getByLabelText('Observed preference')).toHaveTextContent('light');
  expect(screen.getByRole('textbox', { name: 'Child draft' })).toHaveValue('edited');
});
it('exposes the effective fixed policy to descendants even after a child requests another theme', () => {
  const view = render(
    <StudioShell {...props} themePolicy={{ mode: 'fixed', scheme: 'light' }}>
      <ThemeConsumer />
    </StudioShell>
  );
  fireEvent.click(screen.getByRole('button', { name: 'Request dark' }));
  expect(screen.getByLabelText('Observed preference')).toHaveTextContent('light');
  view.rerender(
    <StudioShell {...props} themePolicy={{ mode: 'fixed', scheme: 'dark' }}>
      <ThemeConsumer />
    </StudioShell>
  );
  expect(screen.getByLabelText('Observed preference')).toHaveTextContent('dark');
  expect(screen.getByRole('textbox', { name: 'Child draft' })).toHaveValue('kept draft');
});

it('closes navigation after the host completes a guarded route change and does not reopen on return', () => {
  const view = render(<StudioShell {...props} contentKey="/notes" />);
  fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }));
  expect(screen.getByRole('dialog', { name: 'Studio' })).toBeVisible();
  view.rerender(<StudioShell {...props} contentKey="/guide" activePageId="guide" />);
  expect(screen.queryByRole('dialog', { name: 'Studio' })).not.toBeInTheDocument();
  view.rerender(<StudioShell {...props} contentKey="/notes" />);
  expect(screen.queryByRole('dialog', { name: 'Studio' })).not.toBeInTheDocument();
});
