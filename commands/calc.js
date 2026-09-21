function tokenize(expression) {
  const tokens = expression.match(/(?:\d+(?:\.\d+)?|[()+\-*/%])/g) || [];
  if (tokens.join("") !== expression.replace(/\s+/g, "")) {
    throw new Error("Only numbers and arithmetic operators are supported.");
  }
  return tokens;
}

function evaluate(expression) {
  const output = [];
  const operators = [];
  const precedence = { "+": 1, "-": 1, "*": 2, "/": 2, "%": 2 };

  for (const token of tokenize(expression)) {
    if (!Number.isNaN(Number(token))) {
      output.push(Number(token));
      continue;
    }
    if (token === "(") {
      operators.push(token);
      continue;
    }
    if (token === ")") {
      while (operators.at(-1) !== "(") {
        if (!operators.length) throw new Error("Mismatched parentheses.");
        output.push(operators.pop());
      }
      operators.pop();
      continue;
    }
    while (
      operators.length &&
      operators.at(-1) !== "(" &&
      precedence[operators.at(-1)] >= precedence[token]
    ) {
      output.push(operators.pop());
    }
    operators.push(token);
  }

  while (operators.length) {
    const operator = operators.pop();
    if (operator === "(") throw new Error("Mismatched parentheses.");
    output.push(operator);
  }

  const values = [];
  for (const token of output) {
    if (typeof token === "number") {
      values.push(token);
      continue;
    }
    const right = values.pop();
    const left = values.pop();
    if (left === undefined || right === undefined) throw new Error("Invalid expression.");
    if (token === "/" && right === 0) throw new Error("Cannot divide by zero.");
    values.push(
      token === "+"
        ? left + right
        : token === "-"
          ? left - right
          : token === "*"
            ? left * right
            : token === "/"
              ? left / right
              : left % right,
    );
  }

  if (values.length !== 1 || !Number.isFinite(values[0])) {
    throw new Error("Invalid expression.");
  }
  return values[0];
}

export default {
  name: "calc",
  aliases: ["calculate", "math"],
  category: "utility",
  description: "Safely evaluate basic arithmetic.",
  async execute(context) {
    if (!context.args.length) {
      await context.reply(`Usage: ${context.prefix}calc 12 * (4 + 3)`);
      return;
    }
    try {
      const result = evaluate(context.args.join(""));
      await context.reply(`Result: ${result}`);
    } catch (error) {
      await context.reply(`Calculator error: ${error.message}`);
    }
  },
};