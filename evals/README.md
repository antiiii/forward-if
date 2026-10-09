# Release smoke checks

These five qualitative checks are a small release sanity suite, not a benchmark or a statistically powered evaluation. Run them manually in a client that has discovered Forward?; record client/version and whether the Skill was explicitly or naturally invoked. Do not treat one run as evidence of generalization.

The prompt set is in [`smoke/forward-behavior-smoke.md`](smoke/forward-behavior-smoke.md). It checks ordinary progress, bounded premise verification, route redirection, respect for explicit user choice, and over-intervention.

No model calls run in default CI.
