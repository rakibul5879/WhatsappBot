import {
  getMinecraftTargetGroup,
  isMinecraftBridgeEnabled,
  publishMinecraftCommandResult,
  runMinecraftCommand,
} from "../minecraft/bridge.js";

function ensureMinecraft(context) {
  if (!isMinecraftBridgeEnabled()) throw new Error("Minecraft integration is disabled. Set MC_ENABLED=true in .env.");
  if (!getMinecraftTargetGroup() || context.chatId !== getMinecraftTargetGroup()) {
    throw new Error("Minecraft commands are only available in the configured WhatsApp group.");
  }
}

function cleanOutput(value) {
  const output = String(value || "").replace(/§[0-9A-FK-OR]/gi, "").trim();
  return output.length > 3500 ? `${output.slice(0, 3500)}\n…output truncated` : output;
}

const minecraftCommand = {
  name: "mc",
  aliases: ["minecraft"],
  category: "minecraft",
  description: "Run a Minecraft server console command; output is relayed to the group.",
  async execute(context) {
    ensureMinecraft(context);
    const command = context.args.join(" ").trim();
    if (!command) return context.reply(`Usage: ${context.prefix}mc <server console command>`);
    try {
      const result = await runMinecraftCommand(context.chatId, command);
      await publishMinecraftCommandResult(context.chatId, command, cleanOutput(result));
    } catch (error) {
      await context.reply(`Minecraft RCON error: ${error.message}`);
    }
  },
};

const minecraftCommands = [
  minecraftCommand,
  {
    name: "players", aliases: ["online"], category: "minecraft",
    description: "Show online Minecraft players.",
    async execute(context) {
      ensureMinecraft(context);
      try { await context.reply(`🎮 ${cleanOutput(await runMinecraftCommand(context.chatId, "list")) || "No players online."}`); }
      catch (error) { await context.reply(`Minecraft RCON error: ${error.message}`); }
    },
  },
  {
    name: "server", aliases: ["mcstatus"], category: "minecraft",
    description: "Check Minecraft server RCON connectivity.",
    async execute(context) {
      ensureMinecraft(context);
      try { await context.reply(`🟢 Minecraft RCON is reachable.\n${cleanOutput(await runMinecraftCommand(context.chatId, "list"))}`); }
      catch (error) { await context.reply(`🔴 Minecraft server unavailable: ${error.message}`); }
    },
  },
  {
    name: "mchelp", aliases: [], category: "minecraft",
    description: "Show Minecraft bridge commands.",
    async execute(context) {
      ensureMinecraft(context);
      await context.reply([
        "Minecraft bridge commands:",
        `${context.prefix}mc <command> — run a server console command (output goes to this group)`,
        `${context.prefix}players — list online players`,
        `${context.prefix}server — check server connectivity`,
        `${context.prefix}mchelp — show this help`,
        "Ordinary messages in this group are relayed to Minecraft automatically.",
      ].join("\n"));
    },
  },
];

export default minecraftCommand;
export const commands = minecraftCommands;
