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
      const { answer, usedModel } = await generateText({ prompt, system: SYSTEM_PROMPT });

      const date = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
      const creator = "Rakib";

      const formattedResponse = `${answer}\n\n[Model: ${usedModel}]\n[Creator: ${creator}]\n[Date: ${date}]`;

      await context.reply(formattedResponse);
    } catch (error) {
      context.logger.warn({ error, command: context.command }, "AI request failed");
      const message = error instanceof AiProviderError ? error.message : "The AI request failed.";
      await context.reply(message);
    }
  },
};