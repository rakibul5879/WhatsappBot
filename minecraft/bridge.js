import { createMinecraftLogReader } from "./log-reader.js";
import { runRconCommand } from "./rcon.js";

let activeSocket;
let activeLogger;
let targetGroup;
let activeReader;

export function isMinecraftBridgeEnabled() {
  return String(process.env.MC_ENABLED || "").toLowerCase() === "true";
}

export function getMinecraftTargetGroup() {
  return String(process.env.MC_WHATSAPP_GROUP_ID || "").trim();
}

function formatTimestamp(date = new Date()) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true,
  }).format(date);
}

function timestamped(text) {
  const stamp = `[${formatTimestamp()}]:`;
  return String(text ?? "").split(/\r?\n/).map((line) => `${stamp} ${line}`).join("\n");
}

async function sendGroupLog(text) {
  if (!activeSocket || !targetGroup) return;
  const lines = timestamped(text).split("\n");
  let chunk = "";
  for (const line of lines) {
    if (chunk && `${chunk}\n${line}`.length > 3500) {
      await activeSocket.sendMessage(targetGroup, { text: chunk });
      chunk = line;
    } else chunk = chunk ? `${chunk}\n${line}` : line;
  }
  if (chunk) await activeSocket.sendMessage(targetGroup, { text: chunk });
}

function extractText(message) {
  let content = message?.message;
  while (content) {
    if (typeof content.conversation === "string") return content.conversation;
    if (typeof content.extendedTextMessage?.text === "string") return content.extendedTextMessage.text;
    if (typeof content.imageMessage?.caption === "string") return content.imageMessage.caption;
    if (typeof content.videoMessage?.caption === "string") return content.videoMessage.caption;
    if (typeof content.documentMessage?.caption === "string") return content.documentMessage.caption;
    content = content.ephemeralMessage?.message || content.viewOnceMessage?.message || content.viewOnceMessageV2?.message;
  }
  return "";
}

function safeText(value, max = 240) {
  return String(value ?? "").replace(/[\r\n\0]/g, " ").trim().slice(0, max);
}

async function sendColoredMinecraftMessage(sender, text) {
  const component = {
    text: "[WhatsApp] ", color: "green",
    extra: [
      { text: sender, color: "aqua", bold: true },
      { text: ": ", color: "white" },
      { text, color: "white" },
    ],
  };
  // tellraw is a vanilla 1.8.8 command and does not add the RCON prefix used by /say.
  return runRconCommand(`tellraw @a ${JSON.stringify(component)}`);
}

/** Relay only ordinary messages from the configured group; slash-prefixed messages are bot commands. */
export async function relayWhatsAppMessageToMinecraft(message, prefix = "/") {
  if (!isMinecraftBridgeEnabled() || !activeSocket) return false;
  if (message?.key?.remoteJid !== targetGroup || message?.key?.fromMe) return false;
  const text = extractText(message).trim();
  if (!text || text.startsWith(prefix)) return false;

  const participant = message.key.participant || "";
  const sender = safeText(message.pushName || participant.split("@")[0] || "WhatsApp", 32);
  const body = safeText(text, 240);
  if (!body) return false;
  await sendColoredMinecraftMessage(sender, body);
  return true;
}

function assertGroup(chatId) {
  if (!isMinecraftBridgeEnabled()) throw new Error("Minecraft integration is disabled. Set MC_ENABLED=true in .env.");
  if (!targetGroup || chatId !== targetGroup) throw new Error("Minecraft commands are only available in the configured WhatsApp group.");
}

export async function runMinecraftCommand(chatId, command) {
  assertGroup(chatId);
  if (!activeSocket) throw new Error("Minecraft bridge is not connected yet.");
  return runRconCommand(command);
}

export async function publishMinecraftCommandResult(chatId, command, result) {
  assertGroup(chatId);
  const output = String(result || "Command executed; the server returned no text.").replace(/§[0-9A-FK-OR]/gi, "").trim();
  await sendGroupLog(`CONSOLE > ${command}\n${output || "(no output)"}`);
}

export async function startMinecraftBridge(socket, logger = console) {
  if (!isMinecraftBridgeEnabled()) {
    logger.info?.("Minecraft bridge disabled (MC_ENABLED is not true)");
    return;
  }
  const groupId = getMinecraftTargetGroup();
  if (!groupId.endsWith("@g.us") || !process.env.MC_RCON_PASSWORD) {
    logger.error?.("Minecraft bridge not started: configure MC_WHATSAPP_GROUP_ID and MC_RCON_PASSWORD in .env");
    return;
  }

  activeReader?.stop();
  activeSocket = socket;
  activeLogger = logger;
  targetGroup = groupId;

  activeReader = createMinecraftLogReader(async (event) => {
    const messages = {
      chat: `<${event.player}>: ${event.text}`,
      join: `${event.player} joined the Minecraft server.`,
      leave: `${event.player} left the Minecraft server.`,
      start: "Minecraft server is ready.",
      stop: "Minecraft server is stopping.",
    };
    const text = messages[event.type];
    if (text) await sendGroupLog(text);
  }, logger);

  await activeReader.start();
  logger.info?.({ groupId, logFile: process.env.MC_LOG_FILE || "default" }, "Minecraft WhatsApp bridge started");
}

export function stopMinecraftBridge() {
  activeReader?.stop();
  activeReader = undefined;
  activeSocket = undefined;
  activeLogger = undefined;
  targetGroup = undefined;
}
