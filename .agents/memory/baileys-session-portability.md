---
name: WhatsApp session portability
description: Why the bot exports the complete Baileys auth directory into SESSION_ID.
---

The generated `SESSION_ID` is a Base64 JSON bundle containing all JSON files from the Baileys multi-file auth directory.

**Why:** Multi-device operation depends on signal/app-state keys as well as credentials; exporting only `creds.json` can authenticate incompletely and break after the first reconnect.

**How to apply:** Preserve the bundle format when changing session setup. If a future session format is added, keep the current bundle format backward compatible.