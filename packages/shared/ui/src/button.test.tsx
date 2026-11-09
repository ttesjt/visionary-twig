import '@testing-library/jest-dom/vitest';
import type { FormEvent } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './button.js';

describe('Button interaction', () => {
  it('does not submit a form unless explicitly requested', async () => {
    const submit = vi.fn((event: FormEvent) => event.preventDefault());
    const user = userEvent.setup();
    const { rerender } = render(
      <form onSubmit={submit}>
        <Button>Continue</Button>
      </form>
    );
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(submit).not.toHaveBeenCalled();
    rerender(
      <form onSubmit={submit}>
        <Button type="submit">Continue</Button>
      </form>
    );
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(submit).toHaveBeenCalledOnce();
  });
  it('blocks activation while pending and restores keyboard activation afterward', async () => {
    const activate = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(
      <Button onClick={activate} pending>
        Save
      </Button>
    );
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    fireEvent.click(button);
    expect(activate).not.toHaveBeenCalled();
    rerender(<Button onClick={activate}>Save</Button>);
    await user.tab();
    expect(button).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(activate).toHaveBeenCalledOnce();
  });
  it('blocks explicitly disabled actions and removes runtime inline styles', async () => {
    const activate = vi.fn();
    const injected: Record<string, unknown> = { style: { width: '9999px' } };
    render(
      <Button {...injected} disabled onClick={activate}>
        Disabled
      </Button>
    );
    const button = screen.getByRole('button', { name: 'Disabled' });
    await userEvent.setup().click(button);
    expect(activate).not.toHaveBeenCalled();
    expect(button).not.toHaveAttribute('style');
    expect(button).not.toHaveAttribute('aria-busy');
  });
});
