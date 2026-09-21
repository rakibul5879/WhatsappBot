import bdSlurs from "../config/bd-slurs.json" with { type: "json" };

const letterOrNumber = "[^\\p{L}\\p{N}]";

function normalizeText(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLocaleLowerCase("bn")
    .replace(/[\u200b-\u200f\u202a-\u202e]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isMatch(text, blockedWord) {
  const normalizedText = normalizeText(text);
  const normalizedWord = normalizeText(blockedWord);
  if (!normalizedWord) return false;

  const wordPattern = normalizedWord
    .split(" ")
    .map(escapeRegex)
    .join("\\s*");
  const boundaryPattern = new RegExp(
    `(?:^|${letterOrNumber})${wordPattern}(?=$|${letterOrNumber})`,
    "iu",
  );

  if (boundaryPattern.test(normalizedText)) return true;

  // Catch simple punctuation/spacing obfuscation such as m.a.d.a.r.c.h.o.d.
  const compactText = normalizedText.replace(/\s+/g, "");
  const compactWord = normalizedWord.replace(/\s+/g, "");
  return compactWord.length >= 4 && compactText.includes(compactWord);
}

export function getBlockedWords() {
  const customWords = (process.env.BLOCKED_WORDS || "")
    .split(",")
    .map((word) => word.trim())
    .filter(Boolean);
  return [...new Set([...bdSlurs, ...customWords])];
}

export function findBlockedWord(text) {
  return getBlockedWords().find((word) => isMatch(text, word));
}

export function isSlurBlockingEnabled() {
  return process.env.SLUR_BLOCKING !== "false";
}

export function getSlurAction() {
  const action = process.env.SLUR_ACTION || "delete_warn";
  return ["warn", "delete", "delete_warn"].includes(action)
    ? action
    : "delete_warn";
}