export default {
  name: "setdesc",
  aliases: ["groupdesc"],
  category: "group",
  description: "Change the group description.",
  groupOnly: true,
  adminOnly: true,
  requiresBotAdmin: true,
  async execute(context) {
    const description = context.args.join(" ").trim();
    if (!description) {
      await context.reply(`Usage: ${context.prefix}setdesc New group description`);
      return;
    }
    await context.socket.groupUpdateDescription(context.chatId, description);
    await context.reply("Group description updated.");
  },
};