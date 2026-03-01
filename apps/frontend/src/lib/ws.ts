const GO_WS_URL = (import.meta.env['VITE_API_GO_URL'] ?? 'http://localhost:9101')
  .replace(/^http/, 'ws');

export interface TelemetryMessage {
  type: 'telemetry';
  device_id: string;
  tenant_id: string;
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  status: string;
}

export type WsMessage = TelemetryMessage;

export class FleetWebSocket {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners = new Set<(msg: WsMessage) => void>();
  private shouldReconnect = true;

  connect(token: string) {
    this.shouldReconnect = true;
    this.openSocket(token);
  }

  private openSocket(token: string) {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.ws = new WebSocket(`${GO_WS_URL}/ws?token=${token}`);

    this.ws.onopen = () => console.log('[WS] connected');

    this.ws.onmessage = (event) => {
      try {
        const msg: WsMessage = JSON.parse(event.data);
        this.listeners.forEach((fn) => fn(msg));
      } catch {
        // non-JSON (pings, etc.) — ignore
      }
    };

    this.ws.onclose = () => {
      if (this.shouldReconnect) {
        console.log('[WS] reconnecting in 3s...');
        this.reconnectTimer = setTimeout(() => this.openSocket(token), 3_000);
      }
    };

    this.ws.onerror = () => this.ws?.close();
  }

  disconnect() {
    this.shouldReconnect = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }

  subscribe(fn: (msg: WsMessage) => void) {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  }
}

export const fleetWs = new FleetWebSocket();
