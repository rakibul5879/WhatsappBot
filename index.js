import "dotenv/config";

import makeWASocket, {
  Browsers,
  DisconnectReason,
  useMultiFileAuthState,
} from "@whiskeysockets/baileys";
import pino from "pino";
import qrcode from "qrcode-terminal";

import {
  createMessageContext,
  handleMessage,
  loadPlugins,
  moderateIncomingMessage,
} from "./lib/command-handler.js";
import { prepareAuthDirectory } from "./lib/session.js";
import { resolveWhatsAppVersion } from "./lib/wa-version.js";

const AUTH_DIR = process.env.AUTH_DIR || "./auth_info_baileys";
const PREFIX = process.env.PREFIX || ".";
const BOT_NAME = process.env.BOT_NAME || "Rakib AI";
const RECONNECT_DELAY_MS = Number(process.env.RECONNECT_DELAY_MS || 3_000);
const logger = pino({ level: process.env.LOG_LEVEL || "info" });

let socket;
let reconnectTimer;
let stopping = false;
let plugins = [];
let authDirectoryPrepared = false;

function getDisconnectStatusCode(error) {
  return error?.output?.statusCode ?? error?.data?.statusCode;
}

async function startBot() {
  if (stopping) return;

  if (!authDirectoryPrepared) {
    await prepareAuthDirectory(AUTH_DIR, process.env.SESSION_ID);
    authDirectoryPrepared = true;
  }
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const version = await resolveWhatsAppVersion(logger);

  socket = makeWASocket({
    auth: state,
    version,
    browser: Browsers.macOS("Chrome"),
    logger: pino({ level: process.env.BAILEYS_LOG_LEVEL || "silent" }),
    printQRInTerminal: false,
    markOnlineOnConnect: false,
    syncFullHistory: false,
    generateHighQualityLinkPreview: false,
  });

  socket.ev.on("creds.update", saveCreds);

  socket.ev.on("connection.update", ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      logger.info("Scan the QR code below to authenticate this bot:");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "open") {
      logger.info({ pluginCount: plugins.length }, "WhatsApp bot connected");
    }

    if (connection === "close") {
      const statusCode = getDisconnectStatusCode(lastDisconnect?.error);
      const loggedOut = statusCode === DisconnectReason.loggedOut;

      if (loggedOut) {
        logger.error(
          "WhatsApp logged out. Delete AUTH_DIR and run `pnpm bot:session` to authenticate again.",
        );
        return;
      }

      if (!stopping && !reconnectTimer) {
        logger.warn(
          { statusCode, reconnectInMs: RECONNECT_DELAY_MS },
          "WhatsApp connection closed; reconnecting",
        );
        reconnectTimer = setTimeout(() => {
          reconnectTimer = undefined;
          void startBot().catch((error) => {
            logger.error({ error }, "Bot reconnect failed");
          });
        }, RECONNECT_DELAY_MS);
      }
    }
  });

  socket.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    for (const message of messages) {
      if (!message.message || message.key.fromMe) continue;

      try {
        const wasModerated = await moderateIncomingMessage(socket, message, {
          prefix: PREFIX,
          logger,
        });
        if (wasModerated) continue;

        const context = await createMessageContext(socket, message, {
          prefix: PREFIX,
          botName: BOT_NAME,
          logger,
        });
        if (context) await handleMessage(context, plugins);
      } catch (error) {
        logger.error({ error, messageId: message.key.id }, "Command handling failed");
      }
    }
  });
}

async function shutdown(signal) {
  if (stopping) return;
  stopping = true;
  if (reconnectTimer) clearTimeout(reconnectTimer);
  logger.info({ signal }, "Stopping WhatsApp bot");
  socket?.end?.(new Error(`Process received ${signal}`));
}

async function main() {
  plugins = await loadPlugins("./commands");
  logger.info(
    { botName: BOT_NAME, prefix: PREFIX, pluginNames: plugins.map((plugin) => plugin.name) },
    "Loaded command plugins",
  );
  await startBot();
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));

void main().catch((error) => {
  logger.fatal({ error }, "Unable to start WhatsApp bot");
  process.exitCode = 1;
});