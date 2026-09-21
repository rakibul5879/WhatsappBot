export default {
  name: "say",
  aliases: ["echo"],
  category: "text",
  description: "Repeat text through the bot.",
  async execute(context) {
    const text = context.args.join(" ").trim();
    await context.reply(text || `Usage: ${context.prefix}say your message`);
  },
};