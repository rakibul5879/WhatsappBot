import { createWriteStream } from "node:fs";
import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { downloadContentFromMessage } from "@whiskeysockets/baileys";
import {
  findBlockedWord,
  getSlurAction,
  isSlurBlockingEnabled,
} from "./moderation.js";

const thisFile = fileURLToPath(import.meta.url);
const projectRoot = path.dirname(path.dirname(thisFile));

function unwrapMessage(message) {
  let current = message?.message;
  if (!current) return undefined;

  if (current.ephemeralMessage?.message) current = current.ephemeralMessage.message;
  if (current.viewOnceMessage?.message) current = current.viewOnceMessage.message;
  if (current.documentWithCaptionMessage?.message) {
    current = current.documentWithCaptionMessage.message;
  }
  return current;
}

function getTextFromMessage(message) {
  const content = unwrapMessage(message);
  return (
    content?.conversation ||
    content?.extendedTextMessage?.text ||
    content?.imageMessage?.caption ||
    content?.videoMessage?.caption ||
    content?.documentMessage?.caption ||
    ""
  ).trim();
}

function getMediaContent(message) {
  const content = unwrapMessage(message);
  if (content?.imageMessage) return { type: "image", data: content.imageMessage };
  if (content?.videoMessage) return { type: "video", data: content.videoMessage };
  if (content?.audioMessage) return { type: "audio", data: content.audioMessage };
  if (content?.documentMessage) return { type: "document", data: content.documentMessage };
  if (content?.stickerMessage) return { type: "sticker", data: content.stickerMessage };
  return undefined;
}

function getQuotedMessage(message) {
  return unwrapMessage(message)?.extendedTextMessage?.contextInfo?.quotedMessage;
}

function getSenderJid(message) {
  return message.key.participant || message.key.remoteJid || "";
}

function normalizeJid(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits ? `${digits}@s.whatsapp.net` : "";
}

function isSameUser(left, right) {
  return normalizeJid(left).split("@")[0] === normalizeJid(right).split("@")[0];
}

function getOwnerNumber() {
  return process.env.OWNER_NUMBER || "";
}

async function getGroupState(socket, chatId, senderJid) {
  if (!chatId.endsWith("@g.us")) {
    return { metadata: undefined, senderIsAdmin: false, botIsAdmin: false };
  }

  const metadata = await socket.groupMetadata(chatId);
  const sender = metadata.participants.find((participant) =>
    isSameUser(participant.id, senderJid),
  );
  const botId = socket.user?.id || "";
  const bot = metadata.participants.find((participant) => isSameUser(participant.id, botId));

  return {
    metadata,
    senderIsAdmin: sender?.admin === "admin" || sender?.admin === "superadmin",
    botIsAdmin: bot?.admin === "admin" || bot?.admin === "superadmin",
  };
}

function getTargetJid(context, value) {
  const mentioned = context.message.message?.extendedTextMessage?.contextInfo?.mentionedJid;
  if (mentioned?.[0]) return mentioned[0];

  const quotedParticipant = context.message.message?.extendedTextMessage?.contextInfo?.participant;
  if (!value && quotedParticipant) return quotedParticipant;

  return normalizeJid(value);
}

export async function loadPlugins(commandDirectory) {
  const absoluteDirectory = path.resolve(projectRoot, commandDirectory);
  const entries = await readdir(absoluteDirectory, { withFileTypes: true });
  const loaded = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".js")) continue;
    const moduleUrl = pathToFileURL(path.join(absoluteDirectory, entry.name)).href;
    const module = await import(moduleUrl);
    const plugin = module.default;

    if (!plugin?.name || typeof plugin.execute !== "function") {
      throw new Error(`Command plugin ${entry.name} must export { name, execute }`);
    }
    loaded.push({
      ...plugin,
      aliases: plugin.aliases || [],
      description: plugin.description || "",
      category: plugin.category || "general",
    });
  }

  return loaded;
}

export async function createMessageContext(socket, message, options) {
  const chatId = message.key.remoteJid;
  if (!chatId || chatId === "status@broadcast") return undefined;

  const rawText = getTextFromMessage(message);
  if (!rawText.startsWith(options.prefix)) return undefined;

  const withoutPrefix = rawText.slice(options.prefix.length).trim();
  const [command = "", ...args] = withoutPrefix.split(/\s+/);
  if (!command) return undefined;

  const sender = getSenderJid(message);
  const groupState = await getGroupState(socket, chatId, sender);
  const owner = getOwnerNumber();
  const isOwner = owner ? isSameUser(sender, owner) : false;
  const isGroup = chatId.endsWith("@g.us");

  const reply = (text) => socket.sendMessage(chatId, { text }, { quoted: message });
  const downloadMedia = async (targetMessage = message) => {
    const media = getMediaContent(targetMessage);
    if (!media) throw new Error("No downloadable media found.");

    await mkdir(path.resolve(projectRoot, "downloads"), { recursive: true });
    const extension = media.data.mimetype?.split("/")[1]?.split(";")[0] || "bin";
    const fileName = `${Date.now()}-${media.type}.${extension}`;
    const destination = path.resolve(projectRoot, "downloads", fileName);
    const stream = await downloadContentFromMessage(media.data, media.type);
    await new Promise((resolve, reject) => {
      const output = createWriteStream(destination);
      stream.pipe(output);
      output.on("finish", resolve);
      output.on("error", reject);
    });
    return destination;
  };

  return {
    socket,
    message,
    logger: options.logger,
    botName: options.botName,
    prefix: options.prefix,
    rawText,
    command: command.toLowerCase(),
    args,
    chatId,
    sender,
    isGroup,
    isOwner,
    senderIsAdmin: groupState.senderIsAdmin,
    botIsAdmin: groupState.botIsAdmin,
    canModerate: isOwner || groupState.senderIsAdmin,
    groupMetadata: groupState.metadata,
    quotedMessage: getQuotedMessage(message),
    getTargetJid: (value) => getTargetJid({ message }, value),
    reply,
    downloadMedia,
  };
}

export async function moderateIncomingMessage(socket, message, options) {
  const chatId = message.key.remoteJid;
  if (!chatId?.endsWith("@g.us") || !isSlurBlockingEnabled()) return false;

  const text = getTextFromMessage(message);
  const blockedWord = findBlockedWord(text);
  if (!blockedWord) return false;

  const sender = getSenderJid(message);
  const groupState = await getGroupState(socket, chatId, sender);
  const owner = getOwnerNumber();
  const senderIsExempt =
    (owner && isSameUser(sender, owner)) || groupState.senderIsAdmin;
  if (senderIsExempt) return false;

  const action = getSlurAction();
  let deleted = false;
  if (action === "delete" || action === "delete_warn") {
    if (groupState.botIsAdmin) {
      try {
        await socket.sendMessage(chatId, { delete: message.key });
        deleted = true;
      } catch (error) {
        options.logger.warn({ error }, "Unable to delete blocked message");
      }
    }
  }

  if (action === "warn" || action === "delete_warn" || !deleted) {
    const result = deleted ? "Message removed." : "Please avoid abusive language.";
    await socket.sendMessage(
      chatId,
      { text: `${result} Keep the group respectful.` },
      { quoted: message },
    );
  }

  return true;
}

export async function handleMessage(context, plugins) {
  const plugin = plugins.find(
    (candidate) =>
      candidate.name.toLowerCase() === context.command ||
      candidate.aliases.some((alias) => alias.toLowerCase() === context.command),
  );
  if (!plugin) return;

  if (plugin.groupOnly && !context.isGroup) {
    await context.reply("This command only works in groups.");
    return;
  }
  if (plugin.adminOnly && !context.canModerate) {
    await context.reply("Only the owner or a group admin can use this command.");
    return;
  }
  if (plugin.ownerOnly && !context.isOwner) {
    await context.reply("Only the configured owner can use this command.");
    return;
  }
  if (plugin.requiresBotAdmin && !context.botIsAdmin) {
    await context.reply("I need to be a group admin to do that.");
    return;
  }

  await plugin.execute({ ...context, plugins });
}