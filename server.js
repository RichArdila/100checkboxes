const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files
app.use(express.static("public"));

// Store checkbox states
let checkboxStates = Array(100).fill(false);

io.on("connection", (socket) => {
  // Send the current state to the new user
  socket.emit("updateCheckboxes", checkboxStates);

  // Listen for checkbox changes
  socket.on("checkboxChange", ({ index, checked }) => {
    checkboxStates[index] = checked;
    // Broadcast the change to all connected clients
    io.emit("checkboxChange", { index, checked });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
