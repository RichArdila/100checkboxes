require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const path = require("path");
var logger = require("morgan");
var session = require("express-session");
var SQLiteStore = require("connect-sqlite3")(session);
var passport = require("passport");

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
  app.use(express.static(path.join(__dirname, "public")));

  const sessionMiddleware = session({
    secret: "keyboard cat",
    resave: false,
    saveUninitialized: false,
    store: new SQLiteStore({ db: "sessions.db", dir: "./var/db" }),
  });

  app.use(sessionMiddleware);

  app.use(passport.authenticate("session"));

  // Inicializar Passport
  app.use(passport.initialize());
  app.use(passport.session());

  //Routers
  var authRouter = require("./routes/auth");

  //User routes
  app.use("/", authRouter);

  function onlyForHandshake(middleware) {
    return (req, res, next) => {
      const isHandshake = req._query.sid === undefined;
      if (isHandshake) {
        middleware(req, res, next);
      } else {
        next();
      }
    };
  }

  io.engine.use(onlyForHandshake(sessionMiddleware));
  io.engine.use(onlyForHandshake(passport.session()));
  io.engine.use(
    onlyForHandshake((req, res, next) => {
      if (req.user) {
        next();
      } else {
        res.writeHead(401);
        res.end();
      }
    })
  );

  io.on("connection", async (socket) => {
    // Send the current state to the new user

    const userId = socket.request.user.id;

    // the user ID is used as a room
    socket.join(`user:${userId}`);

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
      io.to(`user:${userId}`).emit("checkboxChange", {
        index,
        checked,
        id: result.lastID,
      });
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

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`Server is running on port http://localhost:${PORT}`);
  });
}

main();
