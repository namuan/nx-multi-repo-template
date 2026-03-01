import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeTruthy();
  });

  it('applies variant class', () => {
    const { container } = render(<Button variant="secondary">Test</Button>);
    expect(container.querySelector('.ui-button--secondary')).toBeTruthy();
  });
});
