import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const SESSION_VERSION = 1;

function decodeBase64Json(sessionId) {
  const decoded = Buffer.from(sessionId, "base64").toString("utf8");
  return JSON.parse(decoded);
}

function tryParseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

async function writeBundle(authDir, bundle) {
  await mkdir(authDir, { recursive: true });

  for (const [fileName, contents] of Object.entries(bundle.files || {})) {
    if (!/^[a-zA-Z0-9._-]+$/.test(fileName)) {
      throw new Error(`Invalid session file name: ${fileName}`);
    }
    await writeFile(path.join(authDir, fileName), contents, "utf8");
  }
}

export async function prepareAuthDirectory(authDir, sessionId) {
  if (!sessionId) return;

  const trimmed = sessionId.trim();
  const bundle = tryParseJson(trimmed) || tryParseJson(Buffer.from(trimmed, "base64").toString("utf8"));

  if (!bundle) {
    throw new Error(
      "SESSION_ID must be either a Base64 session bundle or a valid JSON credentials string.",
    );
  }

  if (bundle.version === SESSION_VERSION && bundle.files) {
    await writeBundle(authDir, bundle);
    return;
  }

  const creds = bundle.creds || bundle;
  if (!creds.noiseKey || !creds.signedIdentityKey) {
    throw new Error(
      "SESSION_ID JSON does not look like Baileys credentials. Run `pnpm bot:session` to create a valid value.",
    );
  }

  await mkdir(authDir, { recursive: true });
  await writeFile(path.join(authDir, "creds.json"), JSON.stringify(creds), "utf8");
}

export async function exportSessionBundle(authDir) {
  const fileNames = await readdir(authDir);
  const files = {};

  for (const fileName of fileNames) {
    if (!fileName.endsWith(".json")) continue;
    files[fileName] = await readFile(path.join(authDir, fileName), "utf8");
  }

  return Buffer.from(
    JSON.stringify({ version: SESSION_VERSION, files }),
    "utf8",
  ).toString("base64");
}