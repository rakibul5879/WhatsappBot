export default {
  name: "owner",
  aliases: ["creator"],
  category: "owner",
  description: "Show the configured bot owner.",
  ownerOnly: false,
  async execute(context) {
    const owner = process.env.OWNER_NUMBER || "not configured";
    await context.reply(`${context.botName} owner: ${owner}`);
  },
};