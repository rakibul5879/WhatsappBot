---
name: Baileys client version
description: The connection must track WhatsApp Web's current client revision.
---

Resolve the live WhatsApp Web client revision before creating a Baileys socket, with the Baileys repository version and a pinned fallback only as backups. Use the canonical macOS Chrome browser profile for pairing.

**Why:** WhatsApp can reject an otherwise valid pairing request with HTTP 405 when the advertised client revision or browser profile is stale.

**How to apply:** Keep version resolution in both the normal bot startup and the session-generation flow. After a 405, clear the incomplete local auth directory and generate a fresh session.