package ws

import (
	"log/slog"
	"sync"
)

// Hub manages WebSocket rooms per tenant. Each tenant gets an isolated room
// so clients only receive telemetry for their own fleet.
type Hub struct {
	mu         sync.RWMutex
	rooms      map[string]map[*Client]bool // tenantID -> set of clients
	register   chan *Client
	unregister chan *Client
	broadcast  chan tenantMessage
}

type tenantMessage struct {
	tenantID string
	payload  []byte
}

func NewHub() *Hub {
	return &Hub{
		rooms:      make(map[string]map[*Client]bool),
		register:   make(chan *Client, 64),
		unregister: make(chan *Client, 64),
		broadcast:  make(chan tenantMessage, 256),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			if h.rooms[client.tenantID] == nil {
				h.rooms[client.tenantID] = make(map[*Client]bool)
			}
			h.rooms[client.tenantID][client] = true
			h.mu.Unlock()
			slog.Info("ws client registered", "tenant", client.tenantID)

		case client := <-h.unregister:
			h.mu.Lock()
			if room, ok := h.rooms[client.tenantID]; ok {
				if _, ok := room[client]; ok {
					delete(room, client)
					close(client.send)
					if len(room) == 0 {
						delete(h.rooms, client.tenantID)
					}
				}
			}
			h.mu.Unlock()
			slog.Info("ws client unregistered", "tenant", client.tenantID)

		case msg := <-h.broadcast:
			h.mu.RLock()
			room := h.rooms[msg.tenantID]
			h.mu.RUnlock()

			for client := range room {
				select {
				case client.send <- msg.payload:
				default:
					// Slow client — drop message rather than block
					slog.Warn("ws slow client, dropping message", "tenant", msg.tenantID)
				}
			}
		}
	}
}

// BroadcastToTenant sends a JSON payload to all WebSocket clients in a tenant room.
func (h *Hub) BroadcastToTenant(tenantID string, payload []byte) {
	h.broadcast <- tenantMessage{tenantID: tenantID, payload: payload}
}
