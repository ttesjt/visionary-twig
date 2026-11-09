import '@testing-library/jest-dom/vitest';
import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ThemeSwitcher } from './theme-switcher.js';
import type { ThemeSwitcherDirection } from './theme-switcher-options.js';
import type { ThemePreference } from '../theme.js';

function Harness({
  direction = 'down',
  onChange = () => {},
}: {
  readonly direction?: ThemeSwitcherDirection;
  readonly onChange?: (value: ThemePreference) => void;
}) {
  const [preference, setPreference] = useState<ThemePreference>('system');
  return (
    <>
      <ThemeSwitcher
        preference={preference}
        direction={direction}
        onPreferenceChange={(value) => {
          onChange(value);
          setPreference(value);
        }}
      />
      <button>Outside</button>
    </>
  );
}
describe('ThemeSwitcher', () => {
  it('offers exactly the other two choices and returns focus after selection', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Harness onChange={onChange} />);
    const trigger = screen.getByRole('button', { name: 'Theme: System' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('group', { name: 'Theme' })).not.toBeInTheDocument();
    await user.click(trigger);
    expect(
      within(screen.getByRole('group', { name: 'Theme' })).getAllByRole('button')
    ).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: 'Dark' }));
    expect(onChange).toHaveBeenCalledExactlyOnceWith('dark');
    expect(screen.getByRole('button', { name: 'Theme: Dark' })).toHaveFocus();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });
  for (const [direction, forward] of [
    ['up', 'ArrowUp'],
    ['down', 'ArrowDown'],
    ['left', 'ArrowLeft'],
    ['right', 'ArrowRight'],
  ] as const) {
    it(`supports directional keys, Home/End and Escape when opening ${direction}`, async () => {
      const user = userEvent.setup();
      render(<Harness direction={direction} />);
      const trigger = screen.getByRole('button', { name: 'Theme: System' });
      trigger.focus();
      await user.keyboard(`{${forward}}`);
      expect(screen.getByRole('button', { name: 'Light' })).toHaveFocus();
      await user.keyboard('{End}');
      expect(screen.getByRole('button', { name: 'Dark' })).toHaveFocus();
      await user.keyboard('{Home}');
      expect(screen.getByRole('button', { name: 'Light' })).toHaveFocus();
      await user.keyboard('{Escape}');
      expect(trigger).toHaveFocus();
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });
  }
  it('dismisses on outside pointer input and Tab without trapping focus', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const trigger = screen.getByRole('button', { name: 'Theme: System' });
    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Outside' }));
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await user.click(trigger);
    await user.tab();
    await user.tab();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Outside' })).toHaveFocus();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });
  it('accepts host icons, labels and style hooks without changing the root theme', () => {
    document.documentElement.dataset.theme = 'light';
    render(
      <ThemeSwitcher
        preference="dark"
        onPreferenceChange={() => {}}
        icons={{ dark: <span data-testid="custom-icon">D</span> }}
        className="custom-switcher"
        labels={{ label: '主题', light: '浅色', dark: '深色', system: '系统' }}
      />
    );
    expect(screen.getByRole('button', { name: '主题: 深色' })).toContainElement(
      screen.getByTestId('custom-icon')
    );
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    delete document.documentElement.dataset.theme;
  });
  it('omits controls under a fixed policy', () => {
    render(
      <ThemeSwitcher
        preference="system"
        onPreferenceChange={() => {}}
        policy={{ mode: 'fixed', scheme: 'dark' }}
      />
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
