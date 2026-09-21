export default {
  name: "tagall",
  aliases: ["everyone", "mentionall"],
  category: "group",
  description: "Mention every participant with an optional message.",
  groupOnly: true,
  adminOnly: true,
  requiresBotAdmin: true,
  async execute(context) {
    const mentions = context.groupMetadata.participants.map(
      (participant) => participant.id,
    );
    const message = context.args.join(" ") || "Attention everyone";
    const mentionLines = mentions.map((jid) => `@${jid.split("@")[0]}`);
    await context.socket.sendMessage(
      context.chatId,
      {
        text: `${message}\n\n${mentionLines.join(" ")}`,
        mentions,
      },
      { quoted: context.message },
    );
  },
};