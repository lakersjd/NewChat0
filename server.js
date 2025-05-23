
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let usersOnline = 0;

app.use(express.static('public'));

io.on('connection', (socket) => {
    usersOnline++;
    io.emit('userCount', usersOnline);

    socket.on('message', (msg) => {
        socket.broadcast.emit('message', msg);
    });

    socket.on('disconnect', () => {
        usersOnline--;
        io.emit('userCount', usersOnline);
    });
});

server.listen(3000, () => console.log('Server running on http://localhost:3000'));
