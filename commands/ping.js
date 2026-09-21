export default {
  name: "ping",
  category: "general",
  description: "Check if the bot is online.",
  async execute(context) {
    await context.reply("pong");
  },
};