export default {
  name: "demote",
  category: "group",
  description: "Remove admin status from a participant.",
  groupOnly: true,
  adminOnly: true,
  requiresBotAdmin: true,
  async execute(context) {
    const target = context.getTargetJid(context.args[0]);
    if (!target) {
      await context.reply("Mention or reply to the participant you want to demote.");
      return;
    }
    await context.socket.groupParticipantsUpdate(context.chatId, [target], "demote");
    await context.reply("Participant demoted.");
  },
};