import {
  fetchLatestBaileysVersion,
  fetchLatestWaWebVersion,
} from "@whiskeysockets/baileys";

const LAST_RESORT_VERSION = [2, 3000, 1015901307];

export async function resolveWhatsAppVersion(logger = console) {
  const liveVersion = await fetchLatestWaWebVersion();
  if (liveVersion.version?.length === 3) {
    logger.info?.(
      { version: liveVersion.version, source: "web.whatsapp.com/sw.js" },
      "Using live WhatsApp Web version",
    );
    return liveVersion.version;
  }

  const repositoryVersion = await fetchLatestBaileysVersion();
  if (repositoryVersion.version?.length === 3) {
    logger.warn?.(
      { version: repositoryVersion.version },
      "Using Baileys repository version because live WhatsApp version was unavailable",
    );
    return repositoryVersion.version;
  }

  logger.warn?.(
    { version: LAST_RESORT_VERSION },
    "Using last-resort WhatsApp Web version",
  );
  return LAST_RESORT_VERSION;
}