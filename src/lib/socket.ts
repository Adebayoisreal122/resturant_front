import { io, type Socket } from "socket.io-client";
import { SOCKET_URL } from "./config";
import { tokens } from "./api";

let socket: Socket | null = null;

// One shared connection, authenticated with the current access token
export function getSocket(): Socket | null {
  const t = tokens.get();
  if (!t) return null;
  if (!socket) {
    socket = io(SOCKET_URL, { auth: (cb) => cb({ token: tokens.get()?.accessToken }), transports: ["websocket", "polling"] });
  }
  return socket;
}

export function closeSocket() {
  socket?.disconnect();
  socket = null;
}
