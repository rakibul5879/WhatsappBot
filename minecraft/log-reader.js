import fs from "node:fs";

const DEFAULT_LOG_FILE =
  "C:\\Users\\ADMINISTRATOR_\\OneDrive\\Desktop\\Server1\\logs\\latest.log";

// Remove terminal ANSI escape sequences and Minecraft color codes.
function stripFormatting(text) {
  return text
    .replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, "")
    .replace(/§[0-9A-FK-OR]/gi, "");
}

function cleanLogLine(line) {
  return stripFormatting(line)
    .replace(/^\s*\[\d{2}:\d{2}:\d{2}\]\s*/, "")
    .trim();
}

export function parseMinecraftLogLine(line) {
  if (typeof line !== "string" || !line.trim()) return null;

  const cleaned = cleanLogLine(line);

  // Async chat: supports #0, #1, #25, #999, etc.
  const asyncChat = cleaned.match(
    /^\[Async Chat Thread - #\d+\/INFO\]:\s*([A-Za-z0-9_]{1,16}):\s*(.*)$/
  );

  if (asyncChat) {
    const text = asyncChat[2].trim();

    if (!text) return null;

    return {
      type: "chat",
      player: asyncChat[1],
      text
    };
  }

  // Remove standard server thread/logger prefix.
  const message = cleaned
    .replace(/^\[[^\]]+\/(?:INFO|WARN|ERROR|DEBUG)\]:\s*/, "")
    .trim();

  if (!message) return null;

  if (/^Done \(.+\)! For help, type/i.test(message)) {
    return { type: "start" };
  }

  if (/^Stopping the server/i.test(message)) {
    return { type: "stop" };
  }

  let match = message.match(
    /^<([A-Za-z0-9_]{1,16})>\s*(.+)$/
  );

  if (match) {
    return {
      type: "chat",
      player: match[1],
      text: match[2].trim()
    };
  }

  match = message.match(
    /^([A-Za-z0-9_]{1,16}) joined the game$/
  );

  if (match) {
    return { type: "join", player: match[1] };
  }

  match = message.match(
    /^([A-Za-z0-9_]{1,16}) left the game$/
  );

  if (match) {
    return { type: "leave", player: match[1] };
  }

  return null;
}

export function createMinecraftLogReader(onEvent, options = {}) {
  if (typeof onEvent !== "function") {
    throw new TypeError("onEvent must be a function");
  }

  const logFile =
    options.logFile ||
    process.env.MC_LOG_FILE ||
    DEFAULT_LOG_FILE;

  const pollInterval = Math.max(
    250,
    Number(process.env.MC_LOG_POLL_MS || 1000)
  );

  let offset = 0;
  let timer = null;
  let running = false;
  let polling = false;
  let pendingText = "";

  async function poll() {
    if (!running || polling) return;

    polling = true;

    try {
      if (!fs.existsSync(logFile)) return;

      const stats = fs.statSync(logFile);

      if (stats.size < offset) {
        offset = 0;
        pendingText = "";
      }

      if (stats.size === offset) return;

      const fd = fs.openSync(logFile, "r");

      try {
        const length = stats.size - offset;
        const buffer = Buffer.alloc(length);

        const bytesRead = fs.readSync(
          fd,
          buffer,
          0,
          length,
          offset
        );

        offset += bytesRead;

        pendingText += buffer
          .subarray(0, bytesRead)
          .toString("utf8");

        const lines = pendingText.split(/\r?\n/);
        pendingText = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;

          const event = parseMinecraftLogLine(line);

          if (event) {
            await onEvent(event);
          }
        }
      } finally {
        fs.closeSync(fd);
      }
    } catch (error) {
      console.error("[Minecraft Log Reader]", error);
    } finally {
      polling = false;
    }
  }

  return {
    async start() {
      if (running) return;

      if (fs.existsSync(logFile)) {
        offset = fs.statSync(logFile).size;
      }

      pendingText = "";
      running = true;

      const loop = async () => {
        if (!running) return;

        await poll();

        if (running) {
          timer = setTimeout(loop, pollInterval);
        }
      };

      await loop();
    },

    stop() {
      running = false;

      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    }
  };
}