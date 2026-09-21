export default {
  name: "reverse",
  aliases: ["rev"],
  category: "text",
  description: "Reverse a text string.",
  async execute(context) {
    const text = context.args.join(" ").trim();
    await context.reply(text ? [...text].reverse().join("") : "Provide text to reverse.");
  },
};