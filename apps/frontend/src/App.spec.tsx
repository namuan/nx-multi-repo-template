import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('App', () => {
  it('renders login screen for unauthenticated users', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'FleetPilot' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeTruthy();
  });
});
