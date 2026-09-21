const DEFAULT_MODEL = "gpt-5.6-terra";
const DEFAULT_TIMEOUT_MS = 45_000;
const MAX_PROMPT_LENGTH = 8_000;

export class AiProviderError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "AiProviderError";
    this.code = options.code || "AI_PROVIDER_ERROR";
    this.cause = options.cause;
  }
}

function getConfig() {
  const isCustomProvider = Boolean(process.env.AI_BASE_URL);
  const baseUrl = process.env.AI_BASE_URL || process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  const apiKey = process.env.AI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  const model = process.env.AI_MODEL || DEFAULT_MODEL;

  if (!baseUrl || !apiKey) {
    throw new AiProviderError(
      isCustomProvider
        ? "The configured AI provider is missing AI_API_KEY."
        : "AI is not configured. Enable the Replit OpenAI integration or set AI_BASE_URL and AI_API_KEY.",
      { code: "AI_NOT_CONFIGURED" },
    );
  }

  let endpoint;
  try {
    const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
    endpoint = new URL("chat/completions", normalizedBaseUrl).toString();
  } catch (error) {
    throw new AiProviderError("AI_BASE_URL is not a valid HTTP URL.", {
      code: "AI_INVALID_URL",
      cause: error,
    });
  }

  return { endpoint, apiKey, model };
}

function getMessageContent(content) {
  if (typeof content === "string") return content.trim();
  if (!Array.isArray(content)) return "";
  return content
    .filter((part) => part?.type === "text" && typeof part.text === "string")
    .map((part) => part.text)
    .join("")
    .trim();
}

export async function generateText({ prompt, system }) {
  const input = String(prompt || "").trim();
  if (!input) throw new AiProviderError("AI needs a prompt.", { code: "AI_EMPTY_PROMPT" });
  if (input.length > MAX_PROMPT_LENGTH) {
    throw new AiProviderError(`AI prompts are limited to ${MAX_PROMPT_LENGTH} characters.`, {
      code: "AI_PROMPT_TOO_LONG",
    });
  }

  const { endpoint, apiKey, model } = getConfig();
  const timeoutMs = Number(process.env.AI_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            ...(system ? [{ role: "system", content: system }] : []),
            { role: "user", content: input },
          ],
          max_completion_tokens: Number(process.env.AI_MAX_COMPLETION_TOKENS || 1_024),
        }),
        signal: controller.signal,
      });
    } catch (error) {
      if (error?.name === "AbortError") {
        throw new AiProviderError("The AI provider timed out. Try a shorter prompt.", {
          code: "AI_TIMEOUT",
          cause: error,
        });
      }
      throw new AiProviderError("The AI provider could not be reached.", {
        code: "AI_NETWORK_ERROR",
        cause: error,
      });
    }

    const responseText = await response.text();
    let payload;
    try {
      payload = responseText ? JSON.parse(responseText) : undefined;
    } catch (error) {
      throw new AiProviderError("The AI provider returned an invalid response.", {
        code: "AI_INVALID_RESPONSE",
        cause: error,
      });
    }

    if (!response.ok) {
      const detail =
        payload?.error?.message || payload?.message || `HTTP ${response.status}`;
      throw new AiProviderError(`The AI provider rejected the request: ${detail}`, {
        code: "AI_REQUEST_FAILED",
      });
    }

    const text = getMessageContent(payload?.choices?.[0]?.message?.content);
    if (!text) {
      throw new AiProviderError("The AI provider returned no text.", {
        code: "AI_EMPTY_RESPONSE",
      });
    }
    return text;
  } finally {
    clearTimeout(timeout);
  }
}
