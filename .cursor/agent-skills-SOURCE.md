# agent-skills (Cursor install)

Copied from [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) for Cursor Agent.

| Field | Value |
|-------|-------|
| Upstream | https://github.com/addyosmani/agent-skills |
| Upstream commit | `df1edb2e05487d0aa6d93c747141e0aed1187f25` (plugin 0.6.7, 2026-08-14) |
| License | MIT — see `agent-skills-LICENSE` |
| Cursor layout | [docs/cursor-setup.md](https://github.com/addyosmani/agent-skills/blob/main/docs/cursor-setup.md) |

## What was copied

- `skills/` → `.cursor/skills/` (24 workflow skills; this is what Cursor loads)
- `references/` → `.cursor/references/` (shared checklists; skill files link here as `../../references/`)

Eval fixtures, plugin manifests, and other-agent command files were not copied.

## Refresh from upstream

```bash
git clone --depth 1 https://github.com/addyosmani/agent-skills.git /tmp/agent-skills
cp -a /tmp/agent-skills/skills/. .cursor/skills/
cp -a /tmp/agent-skills/references/. .cursor/references/
cp /tmp/agent-skills/LICENSE .cursor/agent-skills-LICENSE
```
