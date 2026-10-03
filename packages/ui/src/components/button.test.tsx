import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Button } from './button';

describe('Button', () => {
  it('renders its children as an accessible button', () => {
    render(<Button>Save card</Button>);

    expect(screen.getByRole('button', { name: 'Save card' })).toBeInTheDocument();
  });

  it('looks different for destructive actions', () => {
    render(
      <>
        <Button>Keep</Button>
        <Button variant="destructive">Archive</Button>
      </>,
    );

    const defaultButtonClasses = screen.getByRole('button', { name: 'Keep' }).className;
    const destructiveButtonClasses = screen.getByRole('button', { name: 'Archive' }).className;
    expect(destructiveButtonClasses).toMatch(/destructive/);
    expect(destructiveButtonClasses).not.toBe(defaultButtonClasses);
  });

  it('calls onClick when the user clicks it', async () => {
    const handleClick = vi.fn<() => void>();
    render(<Button onClick={handleClick}>Move</Button>);

    await userEvent.click(screen.getByRole('button', { name: 'Move' }));

    expect(handleClick).toHaveBeenCalledOnce();
  });
});
