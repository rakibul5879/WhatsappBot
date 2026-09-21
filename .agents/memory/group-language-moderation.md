---
name: Group language moderation
description: The project's built-in Bengali/BD slur filter and its safety boundaries.
---

The group filter uses normalized Bengali text plus common Latin transliterations, exempts the configured owner and group admins, and supports warn, delete, or delete-and-warn actions.

**Why:** Group moderation should handle basic obfuscation without punishing admins, and owners need a way to tune behavior without editing command code.

**How to apply:** Keep additions in the configurable blocked-word list or `BLOCKED_WORDS`; preserve `SLUR_ACTION` behavior and the admin/owner exemptions when extending moderation.