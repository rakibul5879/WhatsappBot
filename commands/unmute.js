export default {
  name: "unmute",
  description: "Allow all participants to send group messages.",
  groupOnly: true,
  adminOnly: true,
  requiresBotAdmin: true,
  async execute(context) {
    await context.socket.groupSettingUpdate(context.chatId, "not_announcement");
    await context.reply("Group unmuted. All participants can send messages.");
  },
};