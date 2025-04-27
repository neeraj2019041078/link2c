const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const path = require("path");

const app = express();

// CORS
app.use(cors({
 origin: "https://wonderful-mandazi-7d0b77.netlify.app",   
  methods: ["GET", "POST"]
}));

const server = http.createServer(app);


const io = new Server(server, {
  cors: {
     origin: "https://wonderful-mandazi-7d0b77.netlify.app/",
    methods: ["GET", "POST"]
  }
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

  socket.on("call-admin", (roomId) => {
    const adminId = rooms[roomId];
    if (adminId) {
      io.to(adminId).emit("incoming-call", { guestId: socket.id, roomId });
    }
  });

  socket.on("accept-call", ({ guestId, roomId }) => {
    io.to(guestId).emit("call-accepted", { adminId: socket.id, roomId });
    io.to(roomId).emit("call-started", { adminId: socket.id, guestId, startTime: Date.now() });
  });

  socket.on("reject-call", ({ guestId }) => {
    io.to(guestId).emit("call-rejected");
  });

  socket.on("signal", ({ to, from, data }) => {
    io.to(to).emit("signal", { from, data });
  });

  socket.on("call-ended", ({ roomId }) => {
    io.to(roomId).emit("call-ended");
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    for (const [roomId, adminId] of Object.entries(rooms)) {
      if (adminId === socket.id) {
        delete rooms[roomId];
        break;
      }
    }
  });
});


app.use(express.static(path.join(__dirname, "client", "dist")));

app.get("/join/:roomId", (req, res) => {
  res.sendFile(path.join(__dirname, "client", "dist", "index.html"));
});

server.listen(5000, () => {
  console.log("Server running on port 5000");
});
