function formatDuration(totalSeconds) {
  const seconds = Math.floor(totalSeconds);
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  const remainder = seconds % 60;
  return `${days}d ${hours}h ${minutes}m ${remainder}s`;
}

export default {
  name: "alive",
  aliases: ["runtime", "uptime"],
  category: "general",
  description: "Show bot status and uptime.",
  async execute(context) {
    await context.reply(
      [
        `${context.botName} is online`,
        "",
        `Uptime: ${formatDuration(process.uptime())}`,
        `Mode: ${context.isOwner ? "owner" : "user"}`,
        `Commands: ${context.plugins.length}`,
      ].join("\n"),
    );
  },
};