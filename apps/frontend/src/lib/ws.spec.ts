import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FleetWebSocket } from './ws';

// Track the most recently created WebSocket instance and constructor calls
let latestWs: {
  url: string;
  readyState: number;
  close: ReturnType<typeof vi.fn>;
  onopen: ((e: any) => void) | null;
  onmessage: ((e: any) => void) | null;
  onclose: ((e: any) => void) | null;
  onerror: ((e: any) => void) | null;
} | null = null;

const constructorSpy = vi.fn();

// Must be a regular function (not arrow) so it can be used as a `new` target
function MockWebSocket(this: any, url: string) {
  this.url = url;
  this.readyState = 3; // CLOSED
  this.close = vi.fn();
  this.onopen = null;
  this.onmessage = null;
  this.onclose = null;
  this.onerror = null;
  constructorSpy(url);
  latestWs = this;
}
(MockWebSocket as any).OPEN = 1;
(MockWebSocket as any).CONNECTING = 0;
(MockWebSocket as any).CLOSING = 2;
(MockWebSocket as any).CLOSED = 3;

vi.stubGlobal('WebSocket', MockWebSocket);

beforeEach(() => {
  vi.clearAllMocks();
  constructorSpy.mockClear();
  latestWs = null;
});

afterEach(() => {
  vi.clearAllTimers();
});

describe('FleetWebSocket', () => {
  describe('connect()', () => {
    it('creates a WebSocket with the token in the URL', () => {
      const ws = new FleetWebSocket();
      ws.connect('my-jwt-token');
      expect(constructorSpy).toHaveBeenCalledTimes(1);
      expect(constructorSpy.mock.calls[0][0]).toContain('my-jwt-token');
    });

    it('does not create a new WebSocket if one is already OPEN', () => {
      const ws = new FleetWebSocket();
      ws.connect('token');
      // Mark the socket as open
      latestWs!.readyState = 1; // OPEN
      constructorSpy.mockClear();
      ws.connect('token'); // should not create another socket
      expect(constructorSpy).not.toHaveBeenCalled();
    });
  });

  describe('disconnect()', () => {
    it('calls close() on the underlying WebSocket', () => {
      const ws = new FleetWebSocket();
      ws.connect('token');
      ws.disconnect();
      expect(latestWs!.close).toHaveBeenCalledTimes(1);
    });

    it('prevents reconnection after disconnect', () => {
      vi.useFakeTimers();
      const ws = new FleetWebSocket();
      ws.connect('token');
      const wsAfterConnect = latestWs!;
      ws.disconnect();
      constructorSpy.mockClear();
      // Simulate close event firing after disconnect
      if (wsAfterConnect.onclose) {
        wsAfterConnect.onclose({} as CloseEvent);
      }
      vi.runAllTimers();
      expect(constructorSpy).not.toHaveBeenCalled();
      vi.useRealTimers();
    });
  });

  describe('subscribe()', () => {
    it('returns an unsubscribe function', () => {
      const ws = new FleetWebSocket();
      const unsub = ws.subscribe(vi.fn());
      expect(typeof unsub).toBe('function');
    });

    it('calls listener when a valid telemetry message is received', () => {
      const ws = new FleetWebSocket();
      ws.connect('token');
      const listener = vi.fn();
      ws.subscribe(listener);

      const msg = {
        type: 'telemetry',
        device_id: 'd1',
        tenant_id: 't1',
        lat: 37.77,
        lng: -122.42,
        speed: 60,
        heading: 90,
        status: 'online',
      };
      latestWs!.onmessage!({ data: JSON.stringify(msg) } as MessageEvent);
      expect(listener).toHaveBeenCalledWith(msg);
    });

    it('ignores non-JSON messages without throwing', () => {
      const ws = new FleetWebSocket();
      ws.connect('token');
      const listener = vi.fn();
      ws.subscribe(listener);
      expect(() => latestWs!.onmessage!({ data: 'ping' } as MessageEvent)).not.toThrow();
      expect(listener).not.toHaveBeenCalled();
    });

    it('stops calling listener after unsubscribe', () => {
      const ws = new FleetWebSocket();
      ws.connect('token');
      const listener = vi.fn();
      const unsub = ws.subscribe(listener);
      unsub();

      const msg = {
        type: 'telemetry',
        device_id: 'd1',
        tenant_id: 't1',
        lat: 0,
        lng: 0,
        speed: 0,
        heading: 0,
        status: 'online',
      };
      latestWs!.onmessage!({ data: JSON.stringify(msg) } as MessageEvent);
      expect(listener).not.toHaveBeenCalled();
    });

    it('supports multiple simultaneous listeners', () => {
      const ws = new FleetWebSocket();
      ws.connect('token');
      const l1 = vi.fn();
      const l2 = vi.fn();
      ws.subscribe(l1);
      ws.subscribe(l2);

      const msg = {
        type: 'telemetry',
        device_id: 'd1',
        tenant_id: 't1',
        lat: 0,
        lng: 0,
        speed: 0,
        heading: 0,
        status: 'online',
      };
      latestWs!.onmessage!({ data: JSON.stringify(msg) } as MessageEvent);
      expect(l1).toHaveBeenCalledTimes(1);
      expect(l2).toHaveBeenCalledTimes(1);
    });
  });

  describe('WebSocket event handlers', () => {
    it('schedules reconnection 3 seconds after close when still active', () => {
      vi.useFakeTimers();
      const ws = new FleetWebSocket();
      ws.connect('token');
      const wsAfterConnect = latestWs!;
      constructorSpy.mockClear();
      wsAfterConnect.readyState = 3; // CLOSED (so reconnect will create new socket)
      wsAfterConnect.onclose!({} as CloseEvent);
      vi.advanceTimersByTime(3100);
      expect(constructorSpy).toHaveBeenCalledTimes(1);
      vi.useRealTimers();
    });

    it('triggers close on the socket when onerror fires', () => {
      const ws = new FleetWebSocket();
      ws.connect('token');
      latestWs!.onerror!({} as Event);
      expect(latestWs!.close).toHaveBeenCalled();
    });
  });
});
