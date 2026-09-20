export default {
  name: "mute",
  description: "Allow only admins to send group messages.",
  groupOnly: true,
  adminOnly: true,
  requiresBotAdmin: true,
  async execute(context) {
    await context.socket.groupSettingUpdate(context.chatId, "announcement");
    await context.reply("Group muted. Only admins can send messages.");
  },
};