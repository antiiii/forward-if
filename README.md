# Forward?

**Intelligent disobedience for AI agents.**

> The destination is yours. The route is negotiable.

Forward? helps an execution-oriented agent notice when the current method stops serving the user's goal. Most of the time, it should keep moving. When the evidence or commitment materially changes, it should verify, challenge, or redirect the route while preserving the mission.

**Disobey the method. Preserve the mission.**

## Install

Requires Node.js 18 or later. The installer has no runtime dependencies and does not send telemetry.

```sh
npx forward-if install
```

The installer detects Codex, Claude Code, and Gemini CLI, then copies the same canonical `SKILL.md` into each detected client's native skills directory. Review the targets first with `--dry-run`:

```sh
npx forward-if install --dry-run
npx forward-if install --target codex
npx forward-if install --target all
```

Install for one project instead of your user profile:

```sh
npx forward-if install --scope project --project .
```

The installer keeps a small ownership record so `doctor`, `update`, and `uninstall` only manage files it installed. It refuses to replace locally changed content unless `--force` is given; `--force` creates a backup first.

```sh
npx forward-if doctor
npx forward-if update
npx forward-if uninstall
```

See [platform-specific discovery and native install options](docs/platform-support.md).

## In 30 seconds

An agent can start down a plausible route and become loyal to it after discussion, partial success, or investment. Forward? asks it to keep three things distinct:

- **Destination:** what the user chose to achieve.
- **Route:** the current plan, hypothesis, or implementation.
- **Road:** the evidence and constraints that show whether the route still fits.

The user chooses the destination. Reality constrains the road. The agent moves forward by default and uses the least disruptive correction when the route materially stops fitting.

## Quick example

**User:** “The cache is probably stale. Rewrite cache invalidation so this bug stops happening.”

Forward? keeps the goal—fix the bug—in view while treating “stale cache” as a hypothesis. If a quick check shows a different cause, the agent should explain that and continue toward the fix instead of blindly completing the rewrite.

## Supported agents

Forward? uses the open Agent Skills format. The release package includes a portable Codex plugin manifest and a cross-platform installer. The machine-tested clients and the limits of those checks are listed in [platform support](docs/platform-support.md).

## Evaluation

Forward? is a behavioral Skill, not a model-weight change. Internal multi-turn evaluations measure both route correction and selectivity: a useful Skill should challenge a bad route and still proceed normally when the route is sound.

The release evidence is narrow. A rollout-change transfer case was clean in 3/3 baseline Skill-v3 runs. A long-horizon case exposed a durable-artifact limitation; one diagnostic setup with correct decision state and a commitment-boundary rule improved that case, but it does not establish a general architecture or broad performance gain. FixedBench and CodeClash were feasibility investigations only; no performance scores are claimed.

Read [evaluation details](docs/evaluation.md) and [known limitations](docs/known-limitations.md).

## Status

**v0.1.0 — experimental and intentionally small.** Forward? is an instruction-level behavior layer, not a security boundary or enforcement runtime. It does not claim to solve sycophancy, alignment, or long-horizon state continuity.

## License

MIT. See [LICENSE](LICENSE).
