// socketServer.js
const http = require('http');
const { Server } = require("socket.io");

// Helper for consistent logging
const logWithTimestamp = (message, data = {}) => {
  console.log(`[${new Date().toISOString()}] ${message}`, data);
};

function createServer(app) {
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Track connected clients and rooms
  const connectedClients = new Map();
  const activeRooms = new Map();

  io.on('connection', (socket) => {
    logWithTimestamp('New client connected:', { socketId: socket.id });
    connectedClients.set(socket.id, { 
      connectedAt: new Date(),
      rooms: new Set()
    });

    // Handle room joining
    socket.on('joinRoom', (room) => {
      try {
        socket.join(room);
        connectedClients.get(socket.id).rooms.add(room);
        
        // Track room activity
        if (!activeRooms.has(room)) {
          activeRooms.set(room, new Set());
        }
        activeRooms.get(room).add(socket.id);

        logWithTimestamp(`Socket joined room`, { 
          socketId: socket.id, 
          room,
          roomSize: activeRooms.get(room).size
        });

        // Notify room members
        socket.to(room).emit('userJoined', { 
          socketId: socket.id, 
          timestamp: new Date() 
        });
      } catch (error) {
        logWithTimestamp('Error joining room:', { 
          socketId: socket.id, 
          room, 
          error: error.message 
        });
        socket.emit('error', { 
          message: 'Failed to join room',
          room 
        });
      }
    });

    // Handle room leaving
    socket.on('leaveRoom', (room) => {
      try {
        socket.leave(room);
        connectedClients.get(socket.id).rooms.delete(room);
        
        if (activeRooms.has(room)) {
          activeRooms.get(room).delete(socket.id);
          if (activeRooms.get(room).size === 0) {
            activeRooms.delete(room);
          }
        }

        logWithTimestamp(`Socket left room`, { 
          socketId: socket.id, 
          room 
        });

        // Notify room members
        socket.to(room).emit('userLeft', { 
          socketId: socket.id, 
          timestamp: new Date() 
        });
      } catch (error) {
        logWithTimestamp('Error leaving room:', { 
          socketId: socket.id, 
          room, 
          error: error.message 
        });
      }
    });

    // Handle client messages
    socket.on('message', ({ room, message }) => {
      try {
        if (!room || !message) {
          throw new Error('Invalid message format');
        }

        if (!socket.rooms.has(room)) {
          throw new Error('Not a member of this room');
        }

        logWithTimestamp('Broadcasting message to room', { 
          socketId: socket.id, 
          room 
        });

        socket.to(room).emit('message', {
          socketId: socket.id,
          message,
          timestamp: new Date()
        });
      } catch (error) {
        logWithTimestamp('Error sending message:', { 
          socketId: socket.id, 
          error: error.message 
        });
        socket.emit('error', { 
          message: 'Failed to send message',
          error: error.message 
        });
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      try {
        // Get user's rooms before cleanup
        const userRooms = connectedClients.get(socket.id)?.rooms || new Set();
        
        // Notify all rooms the user was in
        userRooms.forEach(room => {
          if (activeRooms.has(room)) {
            activeRooms.get(room).delete(socket.id);
            if (activeRooms.get(room).size === 0) {
              activeRooms.delete(room);
            }
            socket.to(room).emit('userLeft', { 
              socketId: socket.id, 
              timestamp: new Date() 
            });
          }
        });

        // Cleanup
        connectedClients.delete(socket.id);
        logWithTimestamp('Client disconnected:', { 
          socketId: socket.id,
          roomsLeft: Array.from(userRooms) 
        });
      } catch (error) {
        logWithTimestamp('Error during disconnect:', { 
          socketId: socket.id, 
          error: error.message 
        });
      }
    });

    // Handle errors
    socket.on('error', (error) => {
      logWithTimestamp('Socket error:', { 
        socketId: socket.id, 
        error: error.message 
      });
    });
  });

  // Server-wide error handling
  io.engine.on('connection_error', (error) => {
    logWithTimestamp('Connection error:', { 
      error: error.message, 
      req: error.req.url 
    });
  });

  // Add monitoring methods
  io.getConnectedClients = () => Array.from(connectedClients.keys());
  io.getActiveRooms = () => Array.from(activeRooms.keys());
  io.getRoomMembers = (room) => Array.from(activeRooms.get(room) || []);

  return { server, io };
}

module.exports = { createServer };