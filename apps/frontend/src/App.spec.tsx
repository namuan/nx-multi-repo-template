import { fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('App', () => {
  it('renders headline', () => {
    render(<App />);
    expect(screen.getByText('Nx Polyglot Monorepo')).toBeTruthy();

    const button = screen.getByRole('button', { name: 'Count: 0' });
    fireEvent.click(button);
    expect(screen.getByRole('button', { name: 'Count: 1' })).toBeTruthy();
  });
});
