const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

async function main() {
  // Open a database connection
  const db = await open({
    filename: "checkboxes.db",
    driver: sqlite3.Database,
  });
  await db.exec(
    `CREATE TABLE IF NOT EXISTS checkboxes (
      id INTEGER PRIMARY KEY, 
      id_checkbox INTEGER,
      checked BOOLEAN)`
  );

  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, { connectionStateRecovery: {} });

  // Serve static files
  app.use(express.static("public"));

  // Store checkbox states

  io.on("connection", async (socket) => {
    // Send the current state to the new user

    // Listen for checkbox changes
    socket.on("checkboxChange", async ({ index, checked }) => {
      // Update the database
      let result;
      try {
        // store the message in the database
        result = await db.run(
          "INSERT INTO checkboxes (id_checkbox, checked) VALUES (?, ?)",
          [index, checked]
        );
      } catch (e) {
        // TODO handle the failure
        return;
      }
      // Broadcast the change to all connected clients
      io.emit("checkboxChange", { index, checked, id: result.lastID });
    });

    if (!socket.recovered) {
      try {
        await db.each(
          "SELECT id, id_checkbox, checked FROM checkboxes WHERE id > ?",
          [socket.handshake.auth.serverOffset || 0],
          (_err, row) => {
            socket.emit(
              "updateCheckboxes",
              row.id_checkbox,
              row.checked,
              row.id
            );
          }
        );
      } catch (e) {
        // TODO handle the failure
        return;
      }
    }
  });

  const PORT = process.env.PORT || 3001;
  server.listen(PORT, () => {
    console.log(`Server is running on port http://localhost:${PORT}`);
  });
}

main();
