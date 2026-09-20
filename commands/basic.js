export default {
  name: "menu",
  aliases: ["help"],
  description: "Show available commands.",
  async execute(context) {
    await context.reply(
      [
        `${context.botName} commands`,
        "",
        `${context.prefix}menu - show this menu`,
        `${context.prefix}ping - check if the bot is online`,
        `${context.prefix}download - save replied-to media locally`,
        "",
        "Owner/admin group commands:",
        `${context.prefix}kick @user`,
        `${context.prefix}add 8801XXXXXXXXX`,
        `${context.prefix}mute`,
        `${context.prefix}unmute`,
      ].join("\n"),
    );
  },
};