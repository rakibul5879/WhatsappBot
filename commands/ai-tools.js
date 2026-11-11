import { AiProviderError, generateText } from "../lib/ai-provider.js";

const TOOLS = {
  summarize: {
    usage: "text to summarize",
    instruction: "Summarize the input in a few clear bullet points.",
  },
  translate: {
    usage: "language | text to translate",
    instruction:
      "Translate the input into the language before the first | character. If no | is present, ask the user to provide a target language.",
  },
  rewrite: {
    usage: "text to rewrite",
    instruction: "Rewrite the input so it is clear, natural, and concise. Return only the rewritten text.",
  },
  explain: {
    usage: "topic or text",
    instruction: "Explain the input clearly for a general audience, using a short example when useful.",
  },
};

export default {
  name: "summarize",
  aliases: ["summary", "translate", "tr", "rewrite", "improve", "explain"],
  category: "ai",
  description: "Summarize, translate, rewrite, or explain text with AI.",
  async execute(context) {
    const toolName =
      context.command === "summary"
        ? "summarize"
        : context.command === "tr" || context.command === "translate"
          ? "translate"
          : context.command === "improve"
            ? "rewrite"
            : context.command;
    const tool = TOOLS[toolName] || TOOLS.summarize;
    const input = context.args.join(" ").trim();

    if (!input) {
      await context.reply(`Usage: ${context.prefix}${context.command} ${tool.usage}`);
      return;
    }

    await context.reply("Working on it...");
    try {
      const { answer, usedModel } = await generateText({
        prompt: `${tool.instruction}\n\nInput:\n${input}`,
        system: "You are a concise writing assistant for WhatsApp.",
      });

      const date = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
      const creator = "Rakib";

      const formattedResponse = `${answer}\n\n[Model: ${usedModel}]\n[Creator: ${creator}]\n[Date: ${date}]`;

      await context.reply(formattedResponse);
    } catch (error) {
      context.logger.warn({ error, command: context.command }, "AI tool request failed");
      const message = error instanceof AiProviderError ? error.message : "The AI tool failed.";
      await context.reply(message);
    }
  },
};