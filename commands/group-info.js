export default {
  name: "groupinfo",
  aliases: ["ginfo"],
  category: "group",
  description: "Show group name, participant count, and admin count.",
  groupOnly: true,
  async execute(context) {
    const metadata = context.groupMetadata;
    const admins = metadata.participants.filter((participant) => participant.admin);
    await context.reply(
      [
        `Group: ${metadata.subject}`,
        `Participants: ${metadata.participants.length}`,
        `Admins: ${admins.length}`,
        `Created: ${metadata.creation ? new Date(metadata.creation * 1000).toLocaleDateString() : "unknown"}`,
      ].join("\n"),
    );
  },
};