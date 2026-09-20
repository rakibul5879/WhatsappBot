export default {
  name: "download",
  aliases: ["dl"],
  description: "Download media from this message or a quoted message.",
  async execute(context) {
    const targetMessage = context.quotedMessage
      ? { message: context.quotedMessage }
      : context.message;

    try {
      const filePath = await context.downloadMedia(targetMessage);
      await context.reply(`Saved media locally as ${filePath.split("/").pop()}.`);
    } catch (error) {
      context.logger.warn({ error }, "Media download failed");
      await context.reply("Reply to an image, video, audio, document, or sticker with .download.");
    }
  },
};