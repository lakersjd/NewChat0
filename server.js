
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

let waitingUsers = [];

app.use(express.static(path.join(__dirname)));

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('joinQueue', ({ username, gender, tags }) => {
    const user = { id: socket.id, username, gender, tags };
    const matchIndex = waitingUsers.findIndex(u => u.id !== socket.id);

    if (matchIndex !== -1) {
      const matchUser = waitingUsers.splice(matchIndex, 1)[0];
      const roomId = `${socket.id}#${matchUser.id}`;

      socket.join(roomId);
      io.to(matchUser.id).socketsJoin(roomId);

      io.to(roomId).emit('match', roomId);
      console.log(`Matched ${socket.id} with ${matchUser.id} in room ${roomId}`);
    } else {
      waitingUsers.push(user);
    }
  });

  socket.on('signal', ({ roomId, sdp, candidate }) => {
    socket.to(roomId).emit('signal', { sdp, candidate });
  });

  socket.on('chatMessage', ({ roomId, message }) => {
    socket.to(roomId).emit('chatMessage', { sender: 'Stranger', message });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    waitingUsers = waitingUsers.filter(u => u.id !== socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
