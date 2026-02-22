import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

let socket = null

export const initializeSocket = () => {
  if (socket?.connected) {
    return socket
  }

  socket = io(SOCKET_URL, {
    withCredentials: true,
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    query: { userType: "admin" },
  })

  socket.on('connect', () => {
    console.log('Admin socket connected:', socket.id)
  })

  socket.on('disconnect', (reason) => {
    console.log('Admin socket disconnected:', reason)
  })

  socket.on('connect_error', (error) => {
    console.error('Admin socket connection error:', error.message)
  })

  return socket
}

export const getSocket = () => {
  if (!socket) {
    return initializeSocket()
  }
  return socket
}

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

// Subscribe to order events
export const subscribeToOrderUpdates = (callback) => {
  const s = getSocket()
  // Listen to all order-related events from server
  const events = [
    'order:new',
    'order:updated', 
    'order:status_changed',
    'delivery_pending_confirmation',
    'orderUpdate',
    'order_delivered',
  ]
  events.forEach(event => s.on(event, callback))
  return () => {
    events.forEach(event => s.off(event, callback))
  }
}
