export default {
  name: "promote",
  category: "group",
  description: "Promote a mentioned or replied-to participant.",
  groupOnly: true,
  adminOnly: true,
  requiresBotAdmin: true,
  async execute(context) {
    const target = context.getTargetJid(context.args[0]);
    if (!target) {
      await context.reply("Mention or reply to the participant you want to promote.");
      return;
    }
    await context.socket.groupParticipantsUpdate(context.chatId, [target], "promote");
    await context.reply("Participant promoted.");
  },
};