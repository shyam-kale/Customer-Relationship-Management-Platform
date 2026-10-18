import { EventEmitter } from 'events'
import { WebSocketServer, WebSocket } from 'ws'

export const crmEvents = new EventEmitter()

let wss = null
const clients = new Set()

export function initWebSocketServer(httpServer) {
  if (wss) return wss

  try {
    wss = new WebSocketServer({ server: httpServer, path: '/ws' })

    wss.on('connection', (ws) => {
      clients.add(ws)

      // Send initial welcome & connection count
      ws.send(JSON.stringify({
        type: 'system:connected',
        timestamp: new Date().toISOString(),
        clientsCount: clients.size,
      }))

      // Broadcast updated client count
      broadcastClientCount()

      ws.on('close', () => {
        clients.delete(ws)
        broadcastClientCount()
      })

      ws.on('error', () => {
        clients.delete(ws)
      })

      // Simple ping-pong
      ws.on('message', (msg) => {
        try {
          const parsed = JSON.parse(msg.toString())
          if (parsed.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }))
          }
        } catch (_) {}
      })
    })

    // Heartbeat every 30 seconds
    const interval = setInterval(() => {
      for (const client of clients) {
        if (client.readyState === WebSocket.OPEN) {
          client.ping()
        }
      }
    }, 30000)

    wss.on('close', () => {
      clearInterval(interval)
      clients.clear()
    })
  } catch (err) {
    console.error('WebSocket initialization error:', err.message)
  }

  return wss
}

function broadcastClientCount() {
  const payload = JSON.stringify({
    type: 'presence:update',
    onlineUsers: Math.max(1, clients.size),
    timestamp: new Date().toISOString(),
  })
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload)
    }
  }
}

export function broadcast(type, data) {
  // Always emit to in-process listeners
  try {
    crmEvents.emit(type, data)
  } catch (e) {
    console.error('Event emit error:', e.message)
  }

  if (clients.size === 0) return

  const message = JSON.stringify({
    type,
    data,
    timestamp: new Date().toISOString(),
  })

  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(message)
      } catch (err) {
        clients.delete(client)
      }
    }
  }
}

export default { crmEvents, initWebSocketServer, broadcast }
