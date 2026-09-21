const quotes = [
  "Small steps still move you forward.",
  "Consistency beats intensity when intensity does not last.",
  "Make the next useful decision.",
  "Clear work is better work.",
  "Build something you can improve tomorrow.",
];

export default {
  name: "quote",
  category: "fun",
  description: "Send a short motivational quote.",
  async execute(context) {
    await context.reply(`“${quotes[Math.floor(Math.random() * quotes.length)]}”`);
  },
};