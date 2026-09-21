import "dotenv/config";

import {
  Browsers,
  DisconnectReason,
  useMultiFileAuthState,
} from "@whiskeysockets/baileys";
import makeWASocket from "@whiskeysockets/baileys";
import pino from "pino";
import qrcode from "qrcode-terminal";
import { writeFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { exportSessionBundle } from "./lib/session.js";
import { resolveWhatsAppVersion } from "./lib/wa-version.js";

const AUTH_DIR = process.env.AUTH_DIR || "./auth_info_baileys";
const PAIRING_NUMBER = process.env.PAIRING_NUMBER?.replace(/\D/g, "");
const logger = pino({ level: process.env.BAILEYS_LOG_LEVEL || "silent" });

let pairingRequested = false;
let pairingTimer;
let connectionClosed = false;
let restartAttempts = 0;

async function askForPhoneNumber() {
  if (PAIRING_NUMBER) return PAIRING_NUMBER;
  if (!process.stdin.isTTY) return undefined;

  const prompt = createInterface({ input, output });
  const value = await prompt.question(
    "Phone number with country code for pairing (leave blank to use QR): ",
  );
  prompt.close();
  return value.replace(/\D/g, "") || undefined;
}

async function startSession(phoneNumber, state, saveCreds) {
  connectionClosed = false;
  const version = await resolveWhatsAppVersion(console);
  const socket = makeWASocket({
    auth: state,
    version,
    browser: Browsers.macOS("Chrome"),
    logger,
    printQRInTerminal: false,
    syncFullHistory: false,
    markOnlineOnConnect: false,
  });

  socket.ev.on("creds.update", saveCreds);

  socket.ev.on("connection.update", async ({ connection, lastDisconnect, qr }) => {
    if (qr && !phoneNumber) {
      console.log("\nScan this QR code in WhatsApp > Linked devices:\n");
      qrcode.generate(qr, { small: true });
    }

    if (
      (connection === "connecting" || qr) &&
      phoneNumber &&
      !state.creds.registered &&
      !pairingRequested
    ) {
      pairingRequested = true;
      pairingTimer = setTimeout(async () => {
        if (connectionClosed) return;
        try {
          const code = await socket.requestPairingCode(phoneNumber);
          console.log(`\nPairing code: ${code}`);
          console.log(
            "Open WhatsApp > Linked devices > Link a device > Link with phone number.",
          );
        } catch (error) {
          console.error(
            "Unable to request pairing code:",
            error?.message || error,
          );
          process.exitCode = 1;
        }
      }, 3_000);
    }

    if (connection === "open") {
      restartAttempts = 0;
      const sessionId = await exportSessionBundle(AUTH_DIR);
      await writeFile(
        "SESSION_ID.md",
        `# Rakib AI SESSION_ID\n\nCopy only the value inside this box into the Replit Secret named \`SESSION_ID\`.\n\n\`\`\`text\n${sessionId}\n\`\`\`\n`,
        { encoding: "utf8", mode: 0o600 },
      );
      console.log("\nAuthentication complete.");
      console.log("SESSION_ID.md was created with a copy-friendly Markdown box.");
      console.log("Copy its value into the Replit Secret named SESSION_ID.");
      console.log("\nYou can now stop this process and run `pnpm bot:start`.");
      process.exit(0);
    }

    if (connection === "close") {
      connectionClosed = true;
      if (pairingTimer) clearTimeout(pairingTimer);
      const statusCode =
        lastDisconnect?.error?.output?.statusCode ??
        lastDisconnect?.error?.data?.statusCode;
      const reason =
        lastDisconnect?.error?.output?.payload?.message ||
        lastDisconnect?.error?.message ||
        "unknown";

      if (statusCode === DisconnectReason.restartRequired) {
        restartAttempts += 1;
        if (restartAttempts > 5) {
          console.error("WhatsApp requested too many authentication restarts.");
          process.exitCode = 1;
          return;
        }

        console.log(
          `WhatsApp accepted the pairing and requested a restart (515). Reconnecting (${restartAttempts}/5)...`,
        );
        setTimeout(() => {
          void startSession(phoneNumber, state, saveCreds).catch((error) => {
            console.error("Authentication restart failed:", error);
            process.exitCode = 1;
          });
        }, 1_000);
        return;
      }

      if (statusCode === DisconnectReason.loggedOut) {
        console.error(
          `WhatsApp rejected the session (status ${statusCode}, ${reason}). Delete AUTH_DIR and try again.`,
        );
      } else {
        console.error(
          `Session connection closed before authentication completed (status ${statusCode ?? "unknown"}, ${reason}).`,
        );
      }
      process.exitCode = 1;
    }
  });
}

async function main() {
  const phoneNumber = await askForPhoneNumber();
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  await startSession(phoneNumber, state, saveCreds);
}

void main().catch((error) => {
  console.error("Session setup failed:", error);
  process.exitCode = 1;
});