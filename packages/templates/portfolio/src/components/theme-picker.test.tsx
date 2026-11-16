import { useLayoutEffect } from 'react';
import { renderWithText } from '../../test/text-render';
import '@testing-library/jest-dom/vitest';
import { cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider, useThemePreference } from '../infra/theme/client';
import { THEME_STORAGE_KEY } from '../site/theme';
import { ThemePicker } from './theme-picker';

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('matchMedia', (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => true),
  }));
});
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
  delete document.documentElement.dataset.theme;
  document.documentElement.style.removeProperty('color-scheme');
});

describe('theme selection', () => {
  it('persists manual preference and resolves system separately from its selected value', async () => {
    const user = userEvent.setup();
    await renderWithText(
      <ThemeProvider>
        <ThemePicker />
      </ThemeProvider>
    );
    const picker = screen.getByRole('combobox', { name: 'Theme' });
    expect(picker).toHaveValue('system');
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    await user.selectOptions(picker, 'dark');
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    await user.selectOptions(picker, 'light');
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    await user.selectOptions(picker, 'system');
    expect(picker).toHaveValue('system');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('system');
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
  });

  it('restores a saved preference on a new provider', async () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    await renderWithText(
      <ThemeProvider>
        <ThemePicker />
      </ThemeProvider>
    );
    expect(screen.getByRole('combobox', { name: 'Theme' })).toHaveValue('dark');
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
  });

  it('repairs the actual library state and storage instead of only normalizing the displayed value', async () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'sepia');
    await renderWithText(
      <ThemeProvider>
        <ThemePicker />
      </ThemeProvider>
    );
    expect(screen.getByRole('combobox', { name: 'Theme' })).toHaveValue('system');
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('system');
  });

  it('does not overwrite a newer saved choice while repairing an older invalid state', async () => {
    function NewerChoice() {
      useLayoutEffect(() => {
        localStorage.setItem(THEME_STORAGE_KEY, 'dark');
      }, []);
      return null;
    }
    localStorage.setItem(THEME_STORAGE_KEY, 'sepia');
    await renderWithText(
      <ThemeProvider>
        <NewerChoice />
        <ThemePicker />
      </ThemeProvider>
    );
    expect(screen.getByRole('combobox', { name: 'Theme' })).toHaveValue('dark');
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('uses the owning selectable policy default when repairing state', async () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'sepia');
    await renderWithText(
      <ThemeProvider policy={{ mode: 'selectable', defaultPreference: 'dark' }}>
        <ThemePicker />
      </ThemeProvider>
    );
    expect(screen.getByRole('combobox', { name: 'Theme' })).toHaveValue('dark');
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('fixed policy leaves even an unsupported stored preference untouched', async () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'sepia');
    await renderWithText(
      <ThemeProvider policy={{ mode: 'fixed', scheme: 'light' }}>
        <ThemePicker />
      </ThemeProvider>
    );
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('sepia');
  });

  it('hides fixed controls and prevents preference changes through the adapter', async () => {
    function RequestDark() {
      const { setPreference } = useThemePreference();
      return <button onClick={() => setPreference('dark')}>Request dark</button>;
    }
    const user = userEvent.setup();
    localStorage.setItem(THEME_STORAGE_KEY, 'system');
    await renderWithText(
      <ThemeProvider policy={{ mode: 'fixed', scheme: 'light' }}>
        <ThemePicker />
        <RequestDark />
      </ThemeProvider>
    );
    expect(screen.queryByRole('combobox', { name: 'Theme' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Request dark' }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('system');
  });
});
