// Package ws provides tenant-isolated WebSocket broadcasting.
package ws

import (
	"log/slog"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/codes"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10
	maxMessageSize = 512
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 4096,
	CheckOrigin: func(_ *http.Request) bool {
		// Origin check is handled by the CORS middleware upstream
		return true
	},
}

// Client is a single WebSocket connection within a tenant room.
type Client struct {
	hub      *Hub
	conn     *websocket.Conn
	tenantID string
	send     chan []byte
}

// ServeWS upgrades an HTTP request to a tenant-scoped WebSocket connection.
func ServeWS(hub *Hub, tenantID string, w http.ResponseWriter, r *http.Request) {
	_, span := otel.Tracer("api-go").Start(r.Context(), "ws.upgrade")
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "ws upgrade failed")
		span.End()
		slog.Error("ws upgrade failed", "error", err)
		return
	}
	span.End()

	client := &Client{
		hub:      hub,
		conn:     conn,
		tenantID: tenantID,
		send:     make(chan []byte, 128),
	}
	hub.register <- client

	go client.writePump()
	go client.readPump()
}

func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		if err := c.conn.Close(); err != nil {
			slog.Debug("ws close failed", "error", err)
		}
	}()

	c.conn.SetReadLimit(maxMessageSize)
	if err := c.conn.SetReadDeadline(time.Now().Add(pongWait)); err != nil {
		slog.Debug("ws set read deadline failed", "error", err)
		return
	}
	c.conn.SetPongHandler(func(string) error {
		if err := c.conn.SetReadDeadline(time.Now().Add(pongWait)); err != nil {
			slog.Debug("ws pong read deadline failed", "error", err)
			return err
		}
		return nil
	})

	// Drain client messages (frontend sends nothing meaningful, but we must read)
	for {
		if _, _, err := c.conn.ReadMessage(); err != nil {
			break
		}
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		if err := c.conn.Close(); err != nil {
			slog.Debug("ws close failed", "error", err)
		}
	}()

	for {
		select {
		case msg, ok := <-c.send:
			if err := c.conn.SetWriteDeadline(time.Now().Add(writeWait)); err != nil {
				return
			}
			if !ok {
				if err := c.conn.WriteMessage(websocket.CloseMessage, []byte{}); err != nil {
					slog.Debug("ws close frame failed", "error", err)
				}
				return
			}
			if err := c.conn.WriteMessage(websocket.TextMessage, msg); err != nil {
				return
			}

		case <-ticker.C:
			if err := c.conn.SetWriteDeadline(time.Now().Add(writeWait)); err != nil {
				return
			}
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
