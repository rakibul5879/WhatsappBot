export default {
  name: "link",
  aliases: ["grouplink", "invite"],
  category: "group",
  description: "Get the current group invite link.",
  groupOnly: true,
  adminOnly: true,
  requiresBotAdmin: true,
  async execute(context) {
    const code = await context.socket.groupInviteCode(context.chatId);
    await context.reply(`https://chat.whatsapp.com/${code}`);
  },
};