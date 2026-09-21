const answers = [
  "Yes.",
  "No.",
  "Probably.",
  "Ask again later.",
  "The signs are unclear.",
  "Definitely.",
];

export default {
  name: "fun",
  aliases: ["8ball"],
  category: "fun",
  description: "Get a random answer. Add a question for 8-ball mode.",
  async execute(context) {
    const question = context.args.join(" ").trim();
    if (!question) {
      await context.reply(`Coin flip: ${Math.random() < 0.5 ? "heads" : "tails"}`);
      return;
    }
    await context.reply(`Question: ${question}\nAnswer: ${answers[Math.floor(Math.random() * answers.length)]}`);
  },
};