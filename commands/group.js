export default {
  name: "add",
  category: "group",
  description: "Add a participant by phone number.",
  groupOnly: true,
  adminOnly: true,
  requiresBotAdmin: true,
  async execute(context) {
    const target = context.getTargetJid(context.args[0]);
    if (!target) {
      await context.reply("Provide a phone number with country code, for example .add 8801XXXXXXXXX.");
      return;
    }

    await context.socket.groupParticipantsUpdate(context.chatId, [target], "add");
    await context.reply("Add request sent.");
  },
};