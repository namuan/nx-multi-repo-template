import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Alerts from './Alerts';
import { alerts as alertApi } from '../lib/api';
import { useAuthStore } from '../stores/auth.store';

vi.mock('../lib/ws', () => ({
  fleetWs: { connect: vi.fn(), disconnect: vi.fn(), subscribe: vi.fn() },
}));

vi.mock('../lib/api', () => ({
  alerts: {
    list: vi.fn(),
    rules: vi.fn(),
    count: vi.fn(),
    acknowledge: vi.fn(),
    createRule: vi.fn(),
    toggleRule: vi.fn(),
    deleteRule: vi.fn(),
  },
}));

const mockUser = {
  userId: 'u1',
  email: 'alice@acme.com',
  fullName: 'Alice',
  role: 'fleet_admin',
  isPlatformAdmin: false,
  tenantId: 't1',
  tenantName: 'Acme',
  primaryColor: '#3B82F6',
};

const makeAlert = (id: string, acknowledged = false) => ({
  id,
  deviceId: 'd1',
  type: 'speed',
  message: `Alert message ${id}`,
  severity: 'warning' as const,
  acknowledged,
  createdAt: new Date().toISOString(),
});

const mockAlertPage = {
  content: [makeAlert('a1', false), makeAlert('a2', true)],
  totalElements: 2,
  totalPages: 1,
  number: 0,
  size: 50,
};

const mockRules = [
  {
    id: 'r1',
    name: 'Speed limit 80',
    type: 'speed',
    threshold: 80,
    severity: 'warning',
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'r2',
    name: 'Idle rule',
    type: 'idle',
    threshold: null,
    severity: 'info',
    active: false,
    createdAt: new Date().toISOString(),
  },
];

function renderAlerts() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  useAuthStore.setState({ isAuthenticated: true, user: mockUser, token: 'tok' });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <Alerts />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  useAuthStore.setState({ token: null, user: null, isAuthenticated: false });
  vi.clearAllMocks();
  vi.mocked(alertApi.list).mockResolvedValue({ data: mockAlertPage } as any);
  vi.mocked(alertApi.rules).mockResolvedValue({ data: [] } as any);
  vi.mocked(alertApi.count).mockResolvedValue({ data: { count: 0 } } as any);
});

describe('Alerts', () => {
  it('renders alerts and rules tabs', async () => {
    renderAlerts();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /alerts/i })).toBeTruthy();
      expect(screen.getByRole('button', { name: /rules/i })).toBeTruthy();
    });
  });

  it('shows Alerts tab content by default (unacked filter)', async () => {
    renderAlerts();
    await waitFor(() => {
      // Only unacknowledged alerts shown (filter='unacked' by default)
      expect(screen.getByText('Alert message a1')).toBeTruthy();
    });
    expect(screen.queryByText('Alert message a2')).toBeNull(); // a2 is acknowledged
  });

  it('shows Ack button for unacknowledged alerts', async () => {
    renderAlerts();
    await waitFor(() => expect(screen.getByText('Ack')).toBeTruthy());
  });

  it('renders alert severity badge', async () => {
    renderAlerts();
    await waitFor(() => expect(screen.getByText('warning')).toBeTruthy());
  });

  it('renders Open badge for unacknowledged alerts', async () => {
    renderAlerts();
    await waitFor(() => expect(screen.getByText('Open')).toBeTruthy());
  });

  it('switches to All filter and shows acknowledged alerts too', async () => {
    renderAlerts();
    await waitFor(() => fireEvent.click(screen.getByRole('button', { name: 'All' })));
    await waitFor(() => {
      expect(screen.getByText('Alert message a1')).toBeTruthy();
      expect(screen.getByText('Alert message a2')).toBeTruthy();
    });
    expect(screen.getByText('Acknowledged')).toBeTruthy();
  });

  it('shows empty state when no alerts match filter', async () => {
    vi.mocked(alertApi.list).mockResolvedValue({
      data: { content: [], totalElements: 0, totalPages: 0, number: 0, size: 50 },
    } as any);
    renderAlerts();
    await waitFor(() => expect(screen.getByText('No alerts')).toBeTruthy());
  });

  it('calls acknowledge API when Ack button is clicked', async () => {
    vi.mocked(alertApi.acknowledge).mockResolvedValue({ data: makeAlert('a1', true) } as any);
    renderAlerts();
    await waitFor(() => fireEvent.click(screen.getByText('Ack')));
    expect(alertApi.acknowledge).toHaveBeenCalledWith('a1');
  });

  it('switches to Rules tab and shows Alert Rules heading', async () => {
    vi.mocked(alertApi.rules).mockResolvedValue({ data: mockRules } as any);
    renderAlerts();
    await waitFor(() => fireEvent.click(screen.getByRole('button', { name: /rules/i })));
    await waitFor(() => expect(screen.getByText('Alert Rules')).toBeTruthy());
  });

  it('shows rule names in Rules tab', async () => {
    vi.mocked(alertApi.rules).mockResolvedValue({ data: mockRules } as any);
    renderAlerts();
    await waitFor(() => fireEvent.click(screen.getByRole('button', { name: /rules/i })));
    await waitFor(() => {
      expect(screen.getByText('Speed limit 80')).toBeTruthy();
      expect(screen.getByText('Idle rule')).toBeTruthy();
    });
  });

  it('shows rule threshold values', async () => {
    vi.mocked(alertApi.rules).mockResolvedValue({ data: mockRules } as any);
    renderAlerts();
    await waitFor(() => fireEvent.click(screen.getByRole('button', { name: /rules/i })));
    await waitFor(() => expect(screen.getByText('80')).toBeTruthy());
  });

  it('shows Active/Disabled status for rules', async () => {
    vi.mocked(alertApi.rules).mockResolvedValue({ data: mockRules } as any);
    renderAlerts();
    await waitFor(() => fireEvent.click(screen.getByRole('button', { name: /rules/i })));
    await waitFor(() => {
      expect(screen.getByText('Active')).toBeTruthy();
      expect(screen.getByText('Disabled')).toBeTruthy();
    });
  });

  it('shows empty rules state when no rules exist', async () => {
    renderAlerts();
    await waitFor(() => fireEvent.click(screen.getByRole('button', { name: /rules/i })));
    await waitFor(() => expect(screen.getByText('No alert rules configured')).toBeTruthy());
  });

  it('shows New rule button in Rules tab', async () => {
    renderAlerts();
    await waitFor(() => fireEvent.click(screen.getByRole('button', { name: /rules/i })));
    await waitFor(() => expect(screen.getByText('+ New rule')).toBeTruthy());
  });

  it('opens CreateRuleModal when New rule button is clicked', async () => {
    renderAlerts();
    await waitFor(() => fireEvent.click(screen.getByRole('button', { name: /rules/i })));
    await waitFor(() => fireEvent.click(screen.getByText('+ New rule')));
    expect(screen.getByText('Create alert rule')).toBeTruthy();
  });

  it('closes modal when Cancel is clicked in CreateRuleModal', async () => {
    renderAlerts();
    await waitFor(() => fireEvent.click(screen.getByRole('button', { name: /rules/i })));
    await waitFor(() => fireEvent.click(screen.getByText('+ New rule')));
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('Create alert rule')).toBeNull();
  });

  it('Create rule button is disabled when rule name is empty', async () => {
    renderAlerts();
    await waitFor(() => fireEvent.click(screen.getByRole('button', { name: /rules/i })));
    await waitFor(() => fireEvent.click(screen.getByText('+ New rule')));
    const btn = screen.getByRole('button', { name: 'Create rule' }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('calls createRule API when rule form is submitted', async () => {
    vi.mocked(alertApi.createRule).mockResolvedValue({ data: mockRules[0] } as any);
    renderAlerts();
    await waitFor(() => fireEvent.click(screen.getByRole('button', { name: /rules/i })));
    await waitFor(() => fireEvent.click(screen.getByText('+ New rule')));
    fireEvent.change(screen.getByPlaceholderText('Speed limit 80 km/h'), {
      target: { value: 'My Rule' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create rule' }));
    await waitFor(() => expect(alertApi.createRule).toHaveBeenCalledTimes(1));
  });

  it('calls toggleRule API when Active/Disabled button is clicked', async () => {
    vi.mocked(alertApi.rules).mockResolvedValue({ data: mockRules } as any);
    vi.mocked(alertApi.toggleRule).mockResolvedValue({
      data: { ...mockRules[0], active: false },
    } as any);
    renderAlerts();
    await waitFor(() => fireEvent.click(screen.getByRole('button', { name: /rules/i })));
    await waitFor(() => fireEvent.click(screen.getByText('Active')));
    expect(alertApi.toggleRule).toHaveBeenCalledWith('r1', false);
  });
});
