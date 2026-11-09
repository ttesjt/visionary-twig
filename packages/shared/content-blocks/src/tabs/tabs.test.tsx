import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Tabs } from './tabs.js';
import { TabPanel } from './tab-panel.js';

function Example({ editing = false }: { readonly editing?: boolean }) {
  return (
    <Tabs label="Project sections" editing={editing}>
      <TabPanel label="Introduction">
        <a href="/intro">Read introduction</a>
      </TabPanel>
      <TabPanel label="Details">
        <p>Detailed content</p>
      </TabPanel>
    </Tabs>
  );
}
describe('content tabs', () => {
  it('keeps every panel readable in server HTML before enhancement', () => {
    const html = renderToStaticMarkup(<Example />);
    expect(html).toContain('Read introduction');
    expect(html).toContain('Detailed content');
    expect(html).toContain('data-enhanced="false"');
    expect(html).toContain('role="tablist"');
    expect(html).not.toContain('role="tabpanel"');
  });
  it('selects one panel and links each tab to its panel', () => {
    render(<Example />);
    const first = screen.getByRole('tab', { name: 'Introduction' });
    const second = screen.getByRole('tab', { name: 'Details' });
    expect(first).toHaveAttribute('aria-selected', 'true');
    expect(document.getElementById(first.getAttribute('aria-controls') ?? '')).toHaveAttribute(
      'aria-labelledby',
      first.id
    );
    expect(screen.queryByRole('link', { name: 'Read introduction' })).toBeVisible();
    fireEvent.click(second);
    expect(screen.queryByRole('link', { name: 'Read introduction' })).toBeNull();
    expect(screen.getByRole('tabpanel', { name: 'Details' })).toBeVisible();
    expect(second).toHaveAttribute('tabindex', '0');
    expect(first).toHaveAttribute('tabindex', '-1');
  });
  it('wraps arrow-key focus and supports Home and End', () => {
    render(<Example />);
    const first = screen.getByRole('tab', { name: 'Introduction' });
    const second = screen.getByRole('tab', { name: 'Details' });
    fireEvent.keyDown(first, { key: 'ArrowLeft' });
    expect(second).toHaveFocus();
    fireEvent.keyDown(second, { key: 'ArrowRight' });
    expect(first).toHaveFocus();
    fireEvent.keyDown(first, { key: 'End' });
    expect(second).toHaveFocus();
    fireEvent.keyDown(second, { key: 'Home' });
    expect(first).toHaveFocus();
  });
  it('keeps native editor slots visible and isolates duplicate component instances', () => {
    const { container } = render(
      <>
        <Example editing />
        <Example />
      </>
    );
    expect(screen.getAllByRole('tabpanel')).toHaveLength(3);
    const ids = Array.from(container.querySelectorAll('[id]'), (element) => element.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('follows panel moves and removal without a parallel list', async () => {
    const view = (labels: readonly string[]) => (
      <Tabs label="Live sections">
        {labels.map((label) => (
          <TabPanel key={label} label={label}>
            <p>{label} body</p>
          </TabPanel>
        ))}
      </Tabs>
    );
    const { rerender } = render(view(['One', 'Two']));
    fireEvent.click(screen.getByRole('tab', { name: 'Two' }));
    rerender(view(['Two', 'One']));
    await waitFor(() =>
      expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['Two', 'One'])
    );
    expect(screen.getByRole('tab', { name: 'Two' })).toHaveAttribute('aria-selected', 'true');
    rerender(view(['One']));
    await waitFor(() =>
      expect(screen.getByRole('tab', { name: 'One' })).toHaveAttribute('aria-selected', 'true')
    );
  });
});
