export default {
  name: "kick",
  aliases: ["remove"],
  description: "Remove a mentioned or replied-to participant.",
  groupOnly: true,
  adminOnly: true,
  requiresBotAdmin: true,
  async execute(context) {
    const target = context.getTargetJid(context.args[0]);
    if (!target) {
      await context.reply("Mention or reply to the participant you want to remove.");
      return;
    }

    await context.socket.groupParticipantsUpdate(context.chatId, [target], "remove");
    await context.reply("Participant removed.");
  },
};