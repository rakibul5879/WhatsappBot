---
name: Workspace package installs
description: A pnpm workspace-root quirk that affects adding direct dependencies.
---

In this pnpm monorepo, the generic language-package installer invokes `pnpm add`
at the workspace root without the explicit workspace-root flag, so direct
dependency installation can be rejected before it changes package files.

**Why:** The package manager protects workspace roots from accidentally receiving
dependencies, and the installer does not expose a working-directory or
workspace-root option.

**How to apply:** Prefer an already available dependency or use the repository's
explicit workspace-aware package-management path when a new root dependency is
actually required; do not treat a failed generic install as a code failure.