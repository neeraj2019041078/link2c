// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" },
});

const rooms = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("create-room", (roomId) => {
    rooms[roomId] = socket.id;
    socket.join(roomId);
    console.log(`Room ${roomId} created by ${socket.id}`);
  });

  socket.on("join-room", (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);
  });

  // Guest sends call request to Admin
  socket.on("call-admin", (roomId) => {
    const adminId = rooms[roomId];
    if (adminId) {
      io.to(adminId).emit("incoming-call", { guestId: socket.id, roomId });
    }
  });

  // Admin accepts the call and starts the timer
  socket.on("accept-call", ({ guestId, roomId }) => {
    io.to(guestId).emit("call-accepted", { adminId: socket.id, roomId });
    io.to(roomId).emit("call-started", { adminId: socket.id, guestId, startTime: Date.now() });
  });

  // Admin rejects the call
  socket.on("reject-call", ({ guestId }) => {
    io.to(guestId).emit("call-rejected");
  });

  // Signal exchange for WebRTC
  socket.on("signal", ({ to, from, data }) => {
    io.to(to).emit("signal", { from, data });
  });

  // Call ends
  socket.on("call-ended", ({ roomId }) => {
    io.to(roomId).emit("call-ended");
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

server.listen(5000, () => console.log("Server running on port 5000"));
