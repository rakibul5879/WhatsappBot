export default {
  name: "setname",
  aliases: ["groupname"],
  category: "group",
  description: "Change the group subject.",
  groupOnly: true,
  adminOnly: true,
  requiresBotAdmin: true,
  async execute(context) {
    const name = context.args.join(" ").trim();
    if (!name) {
      await context.reply(`Usage: ${context.prefix}setname New group name`);
      return;
    }
    await context.socket.groupUpdateSubject(context.chatId, name);
    await context.reply("Group name updated.");
  },
};