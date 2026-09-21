export default {
  name: "menu",
  aliases: ["help", "commands"],
  category: "general",
  description: "Show categorized commands. Use .menu group for one category.",
  async execute(context) {
    const categoryNames = {
      general: "GENERAL",
      media: "MEDIA",
      group: "GROUP",
      owner: "OWNER",
    };
    const requestedCategory = context.args[0]?.toLowerCase();
    const availableCategories = [...new Set(context.plugins.map((plugin) => plugin.category))];
    const categories = requestedCategory
      ? availableCategories.filter((category) => category === requestedCategory)
      : availableCategories;

    if (requestedCategory && categories.length === 0) {
      await context.reply(
        `Unknown category. Available categories: ${availableCategories.join(", ")}`,
      );
      return;
    }

    const lines = [
      `╭─ ${context.botName} ─╮`,
      `│ Prefix: ${context.prefix}`,
      "│ Multi-device command center",
      "╰────────────────────╯",
      "",
    ];

    for (const category of categories) {
      lines.push(`「 ${categoryNames[category] || category.toUpperCase()} 」`);
      const categoryPlugins = context.plugins
        .filter((plugin) => plugin.category === category)
        .sort((left, right) => left.name.localeCompare(right.name));

      for (const plugin of categoryPlugins) {
        const adminMarker = plugin.adminOnly ? " [admin]" : "";
        lines.push(
          `${context.prefix}${plugin.name}${adminMarker} - ${plugin.description}`,
        );
      }
      lines.push("");
    }

    lines.push(`Use ${context.prefix}menu <category> for a focused list.`);
    await context.reply(lines.join("\n"));
  },
};