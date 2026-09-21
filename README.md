# Baileys WhatsApp User Bot

This project contains a small multi-device WhatsApp bot built on
`@whiskeysockets/baileys`. It responds to basic commands for everyone and
enables group moderation only for the configured owner or an existing group
admin.

## Setup

1. Copy `.env.example` to `.env`.
2. Run `pnpm bot:session`.
   - Enter a phone number with country code to use a pairing code.
   - Leave it blank to use the QR code.
3. Copy the printed Base64 value into `SESSION_ID`.
4. Set `OWNER_NUMBER` to the owner's phone number or full WhatsApp JID.
5. Set `BOT_NAME` to the name shown in the command menu.
6. Start the bot with `pnpm bot:start`.

The session generator also creates an ignored `SESSION_ID.md` file with the
value inside a Markdown code box. Copy it into the Replit Secret named
`SESSION_ID`, and never commit or share that file.

The generated authentication files and downloaded media are ignored by Git.
Never commit `SESSION_ID`, the auth directory, or a `.env` file.

## Commands

### Available to everyone

- `.menu` / `.help`
- `.ping`
- `.download` / `.dl` — reply to supported media with this command to save it
  in `downloads/`

### Owner or group admins

- `.kick @user` — or reply to the participant's message
- `.add 8801XXXXXXXXX`
- `.mute`
- `.unmute`

The bot account must also be a group admin for moderation commands.

## Adding plugins

Create a JavaScript file in `commands/` that exports a default object:

```js
export default {
  name: "hello",
  aliases: ["hi"],
  description: "Say hello.",
  async execute(context) {
    await context.reply("Hello from a plugin.");
  },
};
```

Optional plugin flags are `groupOnly`, `adminOnly`, and
`requiresBotAdmin`. The context includes `socket`, `message`, `args`,
`chatId`, `sender`, `isGroup`, `isOwner`, `canModerate`, `reply()`, and
`downloadMedia()`.