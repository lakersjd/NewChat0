const express = require("express");
const http = require("http");
const socketIO = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.static(__dirname + "/public"));

let queue = [];

io.on("connection", socket => {
  socket.on("join", ({ country, language }) => {
    socket.meta = { country, language };
    let partner = queue.find(
      s => s !== socket &&
      s.meta.country === country &&
      s.meta.language === language
    );
    if (partner) {
      queue = queue.filter(s => s !== partner);
      socket.partner = partner;
      partner.partner = socket;
      socket.emit("match", { initiator: true });
      partner.emit("match", { initiator: false });
    } else {
      queue.push(socket);
    }
  });

  socket.on("offer", data => {
    if (socket.partner) socket.partner.emit("offer", data);
  });
  socket.on("answer", data => {
    if (socket.partner) socket.partner.emit("answer", data);
  });
  socket.on("candidate", data => {
    if (socket.partner) socket.partner.emit("candidate", data);
  });
  socket.on("message", data => {
    if (socket.partner) socket.partner.emit("message", data);
  });
  socket.on("skip", () => {
    if (socket.partner) socket.partner.emit("stop");
    socket.partner = null;
  });
  socket.on("stop", () => {
    if (socket.partner) socket.partner.emit("stop");
    socket.partner = null;
  });
  socket.on("report", () => {
    console.log("User reported.");
  });
});

server.listen(3000, () => console.log("Server running on http://localhost:3000"));
