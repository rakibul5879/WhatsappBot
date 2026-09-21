import { downloadFromProvider, MediaProviderError } from "../lib/media-provider.js";

const MEDIA_TYPES = {
  media: "auto",
  play: "audio",
  song: "audio",
  yt: "video",
  youtube: "video",
  video: "video",
  tiktok: "video",
  instagram: "video",
  ig: "video",
  facebook: "video",
  fb: "video",
};

export default {
  name: "media",
  aliases: Object.keys(MEDIA_TYPES).filter((name) => name !== "media"),
  category: "media",
  description: "Download media from a supported URL through the configured provider.",
  async execute(context) {
    const sourceUrl = context.args[0];
    const mediaType = MEDIA_TYPES[context.command] || "auto";
    if (!sourceUrl) {
      await context.reply(
        `Usage: ${context.prefix}${context.command} https://example.com/media\n` +
          "Supported aliases: play, yt, video, tiktok, instagram, facebook.",
      );
      return;
    }

    await context.reply("Fetching media from the configured provider...");
    try {
      const asset = await downloadFromProvider({ sourceUrl, mediaType });
      await context.sendMedia({
        data: asset.data,
        mimetype: asset.mimetype,
        filename: asset.filename,
        caption: asset.title ? `${asset.title}\n\nDownloaded by ${context.botName}` : undefined,
      });
    } catch (error) {
      context.logger.warn({ error, command: context.command }, "Provider media download failed");
      const message =
        error instanceof MediaProviderError ? error.message : "The media download failed.";
      await context.reply(message);
    }
  },
};
