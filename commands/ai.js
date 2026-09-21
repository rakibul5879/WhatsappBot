import { AiProviderError, generateText } from "../lib/ai-provider.js";

const SYSTEM_PROMPT =
  "You are Rakib AI, a helpful WhatsApp assistant. Be accurate, concise, and use plain text. " +
  "Do not claim to have performed actions you cannot perform.";

export default {
  name: "ai",
  aliases: ["ask", "chat", "gpt"],
  category: "ai",
  description: "Ask the configured AI provider a question.",
  async execute(context) {
    const prompt = context.args.join(" ").trim();
    if (!prompt) {
      await context.reply(`Usage: ${context.prefix}ai your question`);
      return;
    }

    await context.reply("Thinking...");
    try {
      const answer = await generateText({ prompt, system: SYSTEM_PROMPT });
      await context.reply(answer);
    } catch (error) {
      context.logger.warn({ error, command: context.command }, "AI request failed");
      const message = error instanceof AiProviderError ? error.message : "The AI request failed.";
      await context.reply(message);
    }
  },
};
