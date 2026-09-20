export default {
  name: "ping",
  description: "Check if the bot is online.",
  async execute(context) {
    await context.reply("pong");
  },
};