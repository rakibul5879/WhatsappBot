export default {
  name: "admins",
  aliases: ["staff"],
  category: "group",
  description: "List the current group admins.",
  groupOnly: true,
  async execute(context) {
    const admins = context.groupMetadata.participants.filter(
      (participant) => participant.admin,
    );
    const mentions = admins.map((participant) => participant.id);
    const names = admins.map((participant) => `@${participant.id.split("@")[0]}`);
    await context.socket.sendMessage(
      context.chatId,
      {
        text: `Group admins:\n${names.join("\n")}`,
        mentions,
      },
      { quoted: context.message },
    );
  },
};