const games = new Map();
const choices = ["rock", "paper", "scissors"];

function gameHelp(prefix) {
  return [
    "Games",
    `${prefix}games dice`,
    `${prefix}games coin`,
    `${prefix}games rps rock|paper|scissors`,
    `${prefix}games guess`,
    `${prefix}games guess <number>`,
  ].join("\n");
}

function rpsResult(player, bot) {
  if (player === bot) return "Draw.";
  if (
    (player === "rock" && bot === "scissors") ||
    (player === "paper" && bot === "rock") ||
    (player === "scissors" && bot === "paper")
  ) {
    return "You win.";
  }
  return "Rakib AI wins.";
}

export default {
  name: "games",
  aliases: ["game", "dice", "coin", "rps", "guess"],
  category: "fun",
  description: "Play dice, coin, rock-paper-scissors, and number guess games.",
  async execute(context) {
    const action = context.command === "games" || context.command === "game"
      ? context.args[0]?.toLowerCase()
      : context.command;
    const args = context.command === "games" || context.command === "game"
      ? context.args.slice(1)
      : context.args;

    if (!action) {
      await context.reply(gameHelp(context.prefix));
      return;
    }

    if (action === "dice") {
      await context.reply(`You rolled: ${Math.floor(Math.random() * 6) + 1}`);
      return;
    }
    if (action === "coin") {
      await context.reply(`Coin: ${Math.random() < 0.5 ? "heads" : "tails"}`);
      return;
    }
    if (action === "rps") {
      const player = args[0]?.toLowerCase();
      if (!choices.includes(player)) {
        await context.reply(`Choose one: ${choices.join(", ")}`);
        return;
      }
      const bot = choices[Math.floor(Math.random() * choices.length)];
      await context.reply(`You: ${player}\nRakib AI: ${bot}\n${rpsResult(player, bot)}`);
      return;
    }
    if (action === "guess") {
      const key = context.chatId;
      if (!args[0]) {
        const target = Math.floor(Math.random() * 10) + 1;
        games.set(key, target);
        await context.reply("I picked a number from 1 to 10. Guess with .games guess <number>.");
        return;
      }
      const target = games.get(key);
      const guess = Number(args[0]);
      if (!target || !Number.isInteger(guess) || guess < 1 || guess > 10) {
        await context.reply("Start a game first with .games guess.");
        return;
      }
      if (guess === target) {
        games.delete(key);
        await context.reply("Correct. You won.");
      } else {
        await context.reply(guess < target ? "Too low." : "Too high.");
      }
      return;
    }

    await context.reply(gameHelp(context.prefix));
  },
};