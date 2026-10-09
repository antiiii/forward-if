# Evaluation

Forward? is evaluated as an **agent behavior layer**, not as a claim that model weights become smarter. A useful comparison keeps the model, reasoning effort, task, and harness constant and changes only whether the Skill is present.

## What is measured

Two properties must be read together:

1. **Route correction:** does the agent reconsider a route when material evidence, commitment, or outcome alignment changes?
2. **Selectivity:** does it continue normally when the route remains reasonable?

Questioning everything is a regression. Most valid instructions should still move forward.

## Internal evidence

The project used small, multi-turn, endogenous conversations and separate clean/selectivity checks. These cases are intentionally designed to expose specific Forward? mechanisms; they are not a representative sample of ordinary agent tasks.

- A staged production-rollout transfer case had 3/3 valid `CLEAN_PASS` baseline runs with Skill v3. The agents completed a useful review runbook while leaving unconfirmed operational details as recommendations or review items.
- Several internal route- and evidence-reconsideration cases showed target behavior or remained clean under the predeclared rubric. The results are case-specific and do not establish cross-model generalization.
- A long multi-turn durable-artifact case showed a limitation: broad approval of a direction could be converted into concrete assistant-proposed requirements in a final PRD.
- In one diagnostic setup for that case, correct decision-state input plus a small commitment-boundary rule changed the scored outcome from 3/3 target failures to 3/3 clean runs. The matched control remained useful and committed explicitly confirmed items. This was a narrow diagnostic, not a tested general architecture; the state input was not produced by a fully blind process.
- A separate brand-story case was reclassified as `GOLD_AMBIGUOUS` after a blind destination audit found that its frozen gold required a reusable synchronization mechanism that the visible user dialogue had not made necessary.

Detailed research traces remain local and are not included in the public release. These summaries support bounded claims only.

## External evaluations

FixedBench and CodeClash were examined for feasibility. The project did not complete a faithful paired performance evaluation on either benchmark and reports no scores, leaderboard placement, or external performance claim.

## Release smoke checks

The release smoke suite is a small qualitative checklist for ordinary execution, bounded verification, route redirection, respect for explicit choices, and over-intervention. It is not a statistically powered benchmark. See [`evals/README.md`](../evals/README.md).

## Claims this evidence does not support

The current evidence does not show that Forward? generalizes across models or domains, improves a model by a percentage, solves sycophancy or alignment, or guarantees decision-state continuity. See [known limitations](known-limitations.md).
