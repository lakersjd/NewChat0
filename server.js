
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

let waitingUsers = [];
const blockedPairs = new Set();

app.use(express.static(path.join(__dirname)));

function getOtherUserInRoom(roomId, currentId) {
  const [id1, id2] = roomId.split('#');
  return currentId === id1 ? id2 : id1;
}

let onlineUsers = 0;

io.on('connection', (socket) => {
  onlineUsers++;
  io.emit('userCount', onlineUsers);
  console.log(`User connected: ${socket.id} | Online users: ${onlineUsers}`);

  socket.on('joinQueue', ({ username }) => {
    const user = { id: socket.id, username };
    socket.username = username;

    const matchIndex = waitingUsers.findIndex(u =>
      u.id !== socket.id && !blockedPairs.has(`${u.id}-${socket.id}`)
    );

    if (matchIndex !== -1) {
      const matchUser = waitingUsers.splice(matchIndex, 1)[0];
      const roomId = `${socket.id}#${matchUser.id}`;

      socket.join(roomId);
      io.to(matchUser.id).socketsJoin(roomId);

      io.to(roomId).emit('match', {
        roomId,
        partnerInfo: {
          username: matchUser.username
        }
      });

      io.to(matchUser.id).emit('match', {
        roomId,
        partnerInfo: {
          username: user.username
        }
      });

      console.log(`Match found: ${socket.id} ↔ ${matchUser.id}`);
    } else {
      waitingUsers.push(user);
    }
  });

  socket.on('leaveRoom', ({ roomId }) => {
    const user = { id: socket.id, username: socket.username || 'Anonymous' };

    socket.leave(roomId);
    waitingUsers.push(user);
    const other = getOtherUserInRoom(roomId, socket.id);
    if (other) {
      io.to(other).emit('strangerDisconnected');
    }
  });

  socket.on('signal', ({ roomId, sdp, candidate }) => {
    socket.to(roomId).emit('signal', { sdp, candidate });
  });

  socket.on('chatMessage', ({ roomId, message }) => {
    socket.to(roomId).emit('chatMessage', { sender: 'Stranger', message });
  });

  socket.on('disconnect', () => {
    onlineUsers--;
    io.emit('userCount', onlineUsers);
    console.log(`User disconnected: ${socket.id} | Online users: ${onlineUsers}`);
    waitingUsers = waitingUsers.filter(u => u.id !== socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
