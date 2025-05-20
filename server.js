
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

let waitingUsers = [];
const reportedUsers = new Set();
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

  console.log('User connected:', socket.id);

  socket.on('joinQueue', ({ username, gender, tags, country, language }) => {
    const user = { id: socket.id, username, gender, tags, country, language };

    const matchIndex = waitingUsers.findIndex(u =>
      u.id !== socket.id &&
      !blockedPairs.has(`${u.id}-${socket.id}`) &&
      (country === "any" || u.country === "any" || u.country === country) &&
      (language === "any" || u.language === "any" || u.language === language) &&
      !tags.length || !u.tags.length || tags.some(tag => u.tags.includes(tag))
    );

    
    if (matchIndex !== -1) {
      console.log(`Match found: ${socket.id} ↔ ${matchUser.id}`);

      const matchUser = waitingUsers.splice(matchIndex, 1)[0];
      const roomId = `${socket.id}#${matchUser.id}`;

      socket.join(roomId);
      io.to(matchUser.id).socketsJoin(roomId);

      io.to(roomId).emit('match', {
        roomId,
        partnerInfo: {
          username: matchUser.username,
          country: matchUser.country,
          language: matchUser.language
        }
      });

      io.to(matchUser.id).emit('match', {
        roomId,
        partnerInfo: {
          username,
          country,
          language
        }
      });
    } else {
      waitingUsers.push(user);
    }
  });

  socket.on('leaveRoom', ({ roomId }) => {
    socket.leave(roomId);
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

  socket.on('reportUser', ({ roomId }) => {
    const other = getOtherUserInRoom(roomId, socket.id);
    if (other) {
      reportedUsers.add(other);
      console.log(`Reported user: ${other}`);
    }
  });

  socket.on('blockUser', ({ roomId }) => {
    const other = getOtherUserInRoom(roomId, socket.id);
    if (other) {
      blockedPairs.add(`${socket.id}-${other}`);
      blockedPairs.add(`${other}-${socket.id}`);
      console.log(`Blocked pair: ${socket.id} <-> ${other}`);
    }
  });

  
  socket.on('disconnect', () => {
    onlineUsers--;
    io.emit('userCount', onlineUsers);
    console.log(`User disconnected: ${socket.id} | Online users: ${onlineUsers}`);

    console.log('User disconnected:', socket.id);
    waitingUsers = waitingUsers.filter(u => u.id !== socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
