import net from "node:net";

const SERVERDATA_AUTH = 3;
const SERVERDATA_EXECCOMMAND = 2;
const SERVERDATA_RESPONSE_VALUE = 0;
const SERVERDATA_AUTH_RESPONSE = 2;

function makePacket(id, type, body = "") {
  const payload = Buffer.from(String(body), "utf8");
  const packet = Buffer.alloc(payload.length + 14);
  packet.writeInt32LE(payload.length + 10, 0);
  packet.writeInt32LE(id, 4);
  packet.writeInt32LE(type, 8);
  payload.copy(packet, 12);
  packet.writeInt16LE(0, packet.length - 2);
  return packet;
}

function readPacket(socket, timeoutMs) {
  return new Promise((resolve, reject) => {
    let buffer = Buffer.alloc(0);
    const timer = setTimeout(() => finish(new Error("Minecraft RCON timed out.")), timeoutMs);
    const cleanup = () => {
      clearTimeout(timer);
      socket.off("data", onData);
      socket.off("error", onError);
      socket.off("close", onClose);
    };
    const finish = (error, packet) => {
      cleanup();
      error ? reject(error) : resolve(packet);
    };
    const onError = (error) => finish(error);
    const onClose = () => finish(new Error("Minecraft RCON connection closed unexpectedly."));
    const onData = (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      if (buffer.length < 4) return;
      const length = buffer.readInt32LE(0);
      if (length < 10 || length > 4 * 1024 * 1024) return finish(new Error("Invalid RCON packet length."));
      if (buffer.length < length + 4) return;
      finish(null, {
        id: buffer.readInt32LE(4),
        type: buffer.readInt32LE(8),
        body: buffer.subarray(12, length + 2).toString("utf8"),
      });
    };
    socket.on("data", onData);
    socket.once("error", onError);
    socket.once("close", onClose);
  });
}

export async function runRconCommand(command) {
  const host = process.env.MC_RCON_HOST || "127.0.0.1";
  const port = Number(process.env.MC_RCON_PORT || 25575);
  const password = process.env.MC_RCON_PASSWORD;
  const timeoutMs = Number(process.env.MC_RCON_TIMEOUT_MS || 5000);
  if (!password) throw new Error("MC_RCON_PASSWORD is not configured.");
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("MC_RCON_PORT is invalid.");

  const socket = net.createConnection({ host, port });
  socket.setNoDelay(true);
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Could not connect to Minecraft RCON.")), timeoutMs);
      socket.once("connect", () => { clearTimeout(timer); resolve(); });
      socket.once("error", (error) => { clearTimeout(timer); reject(error); });
    });

    socket.write(makePacket(1, SERVERDATA_AUTH, password));
    let auth;
    do {
      auth = await readPacket(socket, timeoutMs);
    } while (auth.id === 1 && auth.type === SERVERDATA_RESPONSE_VALUE && auth.body === "");
    if (auth.id === -1 || auth.id !== 1 || auth.type !== SERVERDATA_AUTH_RESPONSE) {
      throw new Error("Minecraft RCON authentication failed. Check MC_RCON_PASSWORD.");
    }

    socket.write(makePacket(2, SERVERDATA_EXECCOMMAND, command));
    const response = await readPacket(socket, timeoutMs);
    if (response.id !== 2 || response.type !== SERVERDATA_RESPONSE_VALUE) {
      throw new Error("Minecraft RCON returned an unexpected response.");
    }
    return response.body.trim();
  } finally {
    socket.end();
    socket.destroy();
  }
}
