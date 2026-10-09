# Platform support

**Documentation checked:** 2026-10-09. Agent clients and their discovery rules can change; consult the linked official documentation if behavior differs from this snapshot.

Forward? has one canonical file at [`skills/forward/SKILL.md`](../skills/forward/SKILL.md). The installer copies that exact file into the host's documented skill directory. It does not create platform-specific Skill variants.

## Compatibility and release-machine verification

| Client | Official skill location | Discovery / refresh | Native install route | v0.1 machine check |
| --- | --- | --- | --- | --- |
| **OpenAI Codex** | Project: `.agents/skills/forward/`; user: `~/.agents/skills/forward/` | Codex detects skill changes; restart if the skill does not appear. Explicit invocation uses `/skills` or `$forward`. | This repository includes a portable skills-only `plugin.json` and repo marketplace entry. Add the repository marketplace with `codex plugin marketplace add antiiii/forward-if`, then install the listed plugin through the Codex plugin UI. The `forward-if` CLI also installs a plain skill directory. | See the release report; do not infer support beyond the tested CLI/version. |
| **Claude Code** | Project: `.claude/skills/forward/`; user: `~/.claude/skills/forward/` | Existing skill directories are watched. If a top-level skills directory is created after startup, run `/reload-skills`. Explicit invocation is `/forward`. | Copy the canonical directory or use `npx forward-if install --target claude`. | See the release report; project/user scope and discovery are tested only on the version recorded there. |
| **Gemini CLI** | Project: `.agents/skills/forward/` or `.gemini/skills/forward/`; user: `~/.agents/skills/forward/` or `~/.gemini/skills/forward/` | Use `/skills list` and `/skills reload`. | Native: `gemini skills install https://github.com/antiiii/forward-if.git --path skills/forward --scope user`. The CLI installer is also available. | Not installed on the release machine; community testing only. |

“Supported” here means the file format and install layout are documented by the host. It does not mean every host/version was exercised. Machine checks and exact versions are recorded in the local release report; only successfully tested clients should be described as release-verified.

## Codex plugin package

The portable manifest uses the current root `plugin.json` layout. OpenAI documents a portable plugin as a root `plugin.json` plus a root `skills/<name>/SKILL.md`; a portable manifest does not need a `skills` field. This repository also includes the marketplace catalog needed to discover the root plugin from Codex.

For local skill discovery, Codex scans `.agents/skills/` in the project and user directories. The repository source directory `skills/` alone is not an auto-discovery location, so use the installer or the plugin flow above.

## Manual install

Copy `skills/forward/` to the client path listed above. Keep the folder name `forward` aligned with the Skill frontmatter `name: forward`. Remove only `forward/SKILL.md` and its now-empty `forward/` directory when uninstalling manually; leave the shared parent `skills/` directory in place.

## Official references

- [Agent Skills specification](https://agentskills.io/specification) — directory layout and required `name` / `description` frontmatter.
- [OpenAI Codex: Build skills](https://developers.openai.com/codex/skills) — local discovery roots, invocation, auto-detection, refresh, and skill installer.
- [OpenAI: Package your plugin](https://developers.openai.com/plugins/build/plugins) — portable root manifest, skills-only package structure, and marketplace catalogs.
- [Anthropic Claude Code: Extend Claude with skills](https://code.claude.com/docs/en/skills) — personal/project paths, invocation, and reload behavior.
- [Google Gemini CLI: Agent Skills](https://geminicli.com/docs/cli/skills/) — discovery, precedence, trust, and skill format.
- [Google Gemini CLI: Managing Agent Skills](https://geminicli.com/docs/cli/using-agent-skills/) — `gemini skills install`, `--scope`, `--path`, listing, and reload commands.
