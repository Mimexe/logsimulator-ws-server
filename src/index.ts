import { Server } from "socket.io";

const port = parseInt(process.env.PORT || "3000");
const io = new Server(port);

const rooms = new Map<string, string>();
const roomsHost = new Map<string, string>();

io.on("connection", (socket) => {
  console.log("a user connected");
  let room: string | null = null;
  const sendToHost = (room: string, event: string, ...args: any[]) => {
    const host = roomsHost.get(room);
    if (host) {
      io.to(host).emit(event, ...args);
    }
  };
  socket.on("create", ({ name, pass }, callback = () => {}) => {
    try {
      if (room) throw new Error("Already in a room");
      if (!name || !pass) {
        throw new Error("Name or pass is empty");
      }
      console.log("create", name);
      if (rooms.has(name)) {
        throw new Error("Room already exists");
      }
      if (roomsHost.has(name)) {
        throw new Error("Room already exists");
      }
      rooms.set(name, pass);
      roomsHost.set(name, socket.id);
      socket.join(name);
      room = name;
      callback();
    } catch (e: any) {
      console.error(e);
      callback(e.message);
    }
  });
  socket.on("join", ({ name, pass }, callback = () => {}) => {
    try {
      if (room) throw new Error("Already in a room");
      if (!name || !pass) {
        throw new Error("Name or pass is empty");
      }
      console.log("join", name);
      if (!rooms.has(name)) {
        throw new Error("Room does not exist");
      }
      if (rooms.get(name) !== pass) {
        throw new Error("Invalid pass");
      }
      socket.join(name);
      sendToHost(name, "join", socket.id);
      room = name;
      callback();
    } catch (e: any) {
      console.error(e);
      callback(e.message);
    }
  });
  socket.on("send", (msg) => {
    socket.emit("receive", msg);
    // get the room name of the socket
    const room = Array.from(socket.rooms).find((r) => r !== socket.id);
    if (room) {
      socket.to(room).emit("receive", msg);
    }
  });
  socket.on("disconnect", () => {
    // get the room name of the socket
    if (room) {
      console.log("leave", room);

      sendToHost(room, "leave", socket.id);
      if (roomsHost.get(room) === socket.id) {
        console.log("delete", room);

        rooms.delete(room);
        roomsHost.delete(room);
        io.in(room)
          .fetchSockets()
          .then((sockets) => {
            sockets.forEach((s) => s.disconnect(true));
          });
      }
    }
    console.log("user disconnected");
  });
});

console.log(`Server running on http://localhost:${port}`);
