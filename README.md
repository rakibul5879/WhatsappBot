# Baileys WhatsApp User Bot

This project contains a small multi-device WhatsApp bot built on
`@whiskeysockets/baileys`. It responds to basic commands for everyone and
enables group moderation only for the configured owner or an existing group
admin.

## Setup

1. Clone this repository.
2. Copy `.env.example` to `.env`.
3. Run `npm install` and `npm install dotnet` .
4. Run `pnpm bot:session`or `node session.js`.
   - Enter a phone number with country code to use a pairing code.
   - Leave it blank to use the QR code.
5. Copy the printed Base64 value into `SESSION_ID` from the generated `SESSION_ID.md` file.
6. Set `OWNER_NUMBER` to the owner's phone number or full WhatsApp JID.
7. Set `BOT_NAME` to the name shown in the command menu.
8. Start the bot with `pnpm bot:start`.

The session generator also creates an ignored `SESSION_ID.md` file with the
value inside a Markdown code box. Copy it into the Replit Secret named
`SESSION_ID`, and never commit or share that file.

The generated authentication files and downloaded media are ignored by Git.
Never commit `SESSION_ID`, the auth directory, or a `.env` file.

## Commands

### Available to everyone

- `.menu` / `.help`
- `.menu general`, `.menu group`, `.menu media`, `.menu owner`
- `.ping`
- `.alive` / `.runtime` — show status and uptime
- `.download` / `.dl` — reply to supported media with this command to save it
  in `downloads/`
- `.play <url>`, `.yt <url>`, `.video <url>`, `.tiktok <url>`,
  `.instagram <url>`, `.facebook <url>` — download provider-backed media
- `.ai <question>` / `.ask <question>` — ask the configured AI provider
- `.summarize <text>`, `.translate <language> | <text>`, `.rewrite <text>`,
  `.explain <text>` — AI writing tools
- `.calc 12 * (4 + 3)` — safe arithmetic
- `.say text` / `.echo text`
- `.reverse text`
- `.fun [question]`
- `.quote`
- `.games` / `.game`
- `.games dice`
- `.games coin`
- `.games rps rock`
- `.games guess`

### Owner or group admins

- `.kick @user` — or reply to the participant's message
- `.add 8801XXXXXXXXX`
- `.mute`
- `.unmute`
- `.promote @user`
- `.demote @user`
- `.tagall [message]`
- `.admins`
- `.link`
- `.setname New name`
- `.setdesc New description`

### Group information

- `.groupinfo` / `.ginfo`
- `groupid` - outputs the whatsapp group id (it always ends with `@g.us` .) .

The menu is generated from plugin metadata, so new command files automatically
appear in the right category.

### Minecraft server
- `mc <server command>` - executes a command on the minecraft server side.
Includes built-in massage bridge and logging (see `PATCH-MANIFEST.md` for full info of server intrigration) 


## Provider configuration

Media and AI commands use explicit provider contracts. They do not scrape
websites or silently fall back to an unknown service.

## Group language moderation

WhatsappBot includes a built-in Bangla/BD slur filter for group messages. By
default it deletes the message when the bot is an admin and sends a respectful
warning. Group admins and the configured owner are exempt.

Configure it with:

```env
SLUR_BLOCKING=true
SLUR_ACTION=delete_warn
BLOCKED_WORDS=
```

`SLUR_ACTION` can be `warn`, `delete`, or `delete_warn`. Add extra
comma-separated terms with `BLOCKED_WORDS` without changing source code.

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

### Media provider

Set `MEDIA_PROVIDER_URL` to an HTTPS endpoint that accepts:

```json
{ "url": "https://source.example/item", "type": "auto" }
```

The endpoint may require `MEDIA_PROVIDER_API_KEY` and must return JSON in one
of these forms:

```json
{ "url": "https://cdn.example/file.mp4", "mimeType": "video/mp4", "filename": "file.mp4" }
```

or:

```json
{ "base64": "...", "mimeType": "audio/mpeg", "filename": "file.mp3" }
```

The bot downloads the returned file, enforces `MEDIA_MAX_BYTES`, and sends it
back to the WhatsApp chat. Provider errors, unsupported URLs, timeouts, and
oversized files are returned as clear command errors.


### AI provider

The preferred setup is Replit's managed OpenAI integration, which supplies
`AI_INTEGRATIONS_OPENAI_BASE_URL` and `AI_INTEGRATIONS_OPENAI_API_KEY`.
Those values are used by `.ai` and the AI writing tools without putting a
provider key in source control.

You can select another OpenAI-compatible provider by setting `AI_BASE_URL`,
`AI_API_KEY`, and optionally `AI_MODEL`. `AI_BASE_URL` should be the provider's
API root; the bot sends requests to `/chat/completions`. AI timeouts, provider
HTTP errors, missing configuration, empty responses, and overlong prompts are
reported explicitly. You can use openrouter here.



## License

This bot is licensed under MIT, see the whole LICENSE.md file for more info.

**End of the line buddy**
