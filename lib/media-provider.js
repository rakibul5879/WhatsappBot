const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_MAX_BYTES = 50 * 1024 * 1024;

export class MediaProviderError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "MediaProviderError";
    this.code = options.code || "MEDIA_PROVIDER_ERROR";
    this.cause = options.cause;
  }
}

function getProviderConfig() {
  const baseUrl = process.env.MEDIA_PROVIDER_URL;
  if (!baseUrl) {
    throw new MediaProviderError(
      "Media downloads are not configured. Set MEDIA_PROVIDER_URL in the environment.",
      { code: "MEDIA_NOT_CONFIGURED" },
    );
  }

  let endpoint;
  try {
    endpoint = new URL(baseUrl);
    if (!["http:", "https:"].includes(endpoint.protocol)) throw new Error("Unsupported protocol");
  } catch (error) {
    throw new MediaProviderError("MEDIA_PROVIDER_URL is not a valid HTTP URL.", {
      code: "MEDIA_INVALID_URL",
      cause: error,
    });
  }

  return {
    endpoint: endpoint.toString(),
    apiKey: process.env.MEDIA_PROVIDER_API_KEY,
    timeoutMs: Number(process.env.MEDIA_PROVIDER_TIMEOUT_MS || DEFAULT_TIMEOUT_MS),
    maxBytes: Number(process.env.MEDIA_MAX_BYTES || DEFAULT_MAX_BYTES),
  };
}

function validateSourceUrl(value) {
  let source;
  try {
    source = new URL(value);
  } catch (error) {
    throw new MediaProviderError("Provide a complete URL starting with https://.", {
      code: "MEDIA_INVALID_SOURCE",
      cause: error,
    });
  }
  if (!["http:", "https:"].includes(source.protocol)) {
    throw new MediaProviderError("Only http:// and https:// media URLs are supported.", {
      code: "MEDIA_INVALID_SOURCE",
    });
  }
  return source.toString();
}

async function readResponseBuffer(response, maxBytes) {
  if (!response.body) {
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength > maxBytes) {
      throw new MediaProviderError(`The media file is larger than ${maxBytes} bytes.`, {
        code: "MEDIA_TOO_LARGE",
      });
    }
    return buffer;
  }

  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new MediaProviderError(`The media file is larger than ${maxBytes} bytes.`, {
          code: "MEDIA_TOO_LARGE",
        });
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks, total);
}

async function fetchWithLimit(url, options, config) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    let response;
    try {
      response = await fetch(url, { ...options, signal: controller.signal });
    } catch (error) {
      if (error?.name === "AbortError") {
        throw new MediaProviderError("The media provider timed out.", {
          code: "MEDIA_TIMEOUT",
          cause: error,
        });
      }
      throw new MediaProviderError("The media provider could not be reached.", {
        code: "MEDIA_NETWORK_ERROR",
        cause: error,
      });
    }
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

async function parseProviderResponse(response) {
  const body = await response.text();
  let payload;
  try {
    payload = body ? JSON.parse(body) : undefined;
  } catch (error) {
    throw new MediaProviderError("The media provider returned invalid JSON.", {
      code: "MEDIA_INVALID_RESPONSE",
      cause: error,
    });
  }

  if (!response.ok) {
    const detail = payload?.error || payload?.message || `HTTP ${response.status}`;
    throw new MediaProviderError(`The media provider rejected the request: ${detail}`, {
      code: "MEDIA_REQUEST_FAILED",
    });
  }
  return payload?.data || payload;
}

function getAssetUrl(asset) {
  return asset?.url || asset?.downloadUrl || asset?.mediaUrl;
}

function getBufferAsset(asset) {
  const encoded = asset?.base64 || asset?.data;
  if (!encoded || typeof encoded !== "string") return undefined;
  try {
    const data = Buffer.from(encoded, "base64");
    if (!data.length) throw new Error("Empty media");
    return data;
  } catch (error) {
    throw new MediaProviderError("The media provider returned invalid Base64 media.", {
      code: "MEDIA_INVALID_RESPONSE",
      cause: error,
    });
  }
}

export async function downloadFromProvider({ sourceUrl, mediaType }) {
  const source = validateSourceUrl(sourceUrl);
  const config = getProviderConfig();
  const headers = { "Content-Type": "application/json" };
  if (config.apiKey) headers.Authorization = `Bearer ${config.apiKey}`;

  const providerResponse = await fetchWithLimit(
    config.endpoint,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ url: source, type: mediaType }),
    },
    config,
  );
  const asset = await parseProviderResponse(providerResponse);
  const data = getBufferAsset(asset);
  const assetUrl = getAssetUrl(asset);

  let buffer = data;
  let mimetype = asset?.mimeType || asset?.mimetype;
  if (!buffer && assetUrl) {
    let parsedUrl;
    try {
      parsedUrl = new URL(assetUrl);
    } catch (error) {
      throw new MediaProviderError("The media provider returned an invalid download URL.", {
        code: "MEDIA_INVALID_RESPONSE",
        cause: error,
      });
    }
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new MediaProviderError("The media provider returned an unsupported download URL.", {
        code: "MEDIA_INVALID_RESPONSE",
      });
    }
    const mediaResponse = await fetchWithLimit(assetUrl, {}, config);
    if (!mediaResponse.ok) {
      throw new MediaProviderError(
        `The media file could not be downloaded: HTTP ${mediaResponse.status}.`,
        { code: "MEDIA_DOWNLOAD_FAILED" },
      );
    }
    buffer = await readResponseBuffer(mediaResponse, config.maxBytes);
    mimetype = mimetype || mediaResponse.headers.get("content-type")?.split(";")[0];
  }

  if (!buffer) {
    throw new MediaProviderError(
      "The media provider returned no media. Expected url, downloadUrl, mediaUrl, or base64.",
      { code: "MEDIA_INVALID_RESPONSE" },
    );
  }

  if (buffer.byteLength > config.maxBytes) {
    throw new MediaProviderError(`The media file is larger than ${config.maxBytes} bytes.`, {
      code: "MEDIA_TOO_LARGE",
    });
  }

  return {
    data: buffer,
    mimetype: mimetype || "application/octet-stream",
    filename: asset?.filename || asset?.fileName || `rakib-${mediaType}`,
    title: asset?.title,
  };
}
