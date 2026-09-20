# Baileys WhatsApp User Bot

A lightweight multi-device WhatsApp user bot with owner-restricted group moderation, basic commands, local media downloads, and dynamically loaded command plugins.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- `pnpm bot:session` — authenticate with a QR code or pairing code and print a Base64 `SESSION_ID`
- `pnpm bot:start` — start the WhatsApp bot

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `index.js` — main Baileys connection, reconnect handling, and message dispatch
- `session.js` — QR/pairing-code authentication and session bundle export
- `lib/command-handler.js` — dynamic plugin loader and command context
- `lib/session.js` — `SESSION_ID` decoding and local auth bundle management
- `commands/` — one modular command plugin per file
- `.env.example` — environment configuration reference

## Architecture decisions

- `SESSION_ID` supports a Base64 bundle of Baileys auth JSON files so the full multi-device key state can be moved through an environment variable.
- A locally persisted auth directory is used at runtime so reconnects do not require re-pairing on every process restart.
- Moderation commands require the sender to be the configured owner or a group admin, and the bot itself must be a group admin.

## Product

The bot responds to `.menu`, `.ping`, and `.download` without elevated permissions. In groups, authorized users can use `.kick`, `.add`, `.mute`, and `.unmute`. New commands can be added by dropping a plugin file into `commands/`.

## User preferences

- Keep credentials in environment variables or local ignored auth files; never commit a session string.

## Gotchas

- Run `pnpm bot:session` first and copy its output into `SESSION_ID`.
- If WhatsApp logs the bot out, delete `AUTH_DIR`, create a fresh session, and update `SESSION_ID`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
