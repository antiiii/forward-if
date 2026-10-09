# Known limitations

Forward? v0.1.0 is a small instruction-level Skill. It is not a persistent state engine, trajectory monitor, authorization system, or policy-enforcement runtime.

## Long-conversation decision-state drift

In one long multi-turn case, the agent retained the broad direction the user had accepted but wrote concrete assistant-proposed details into a developer-ready artifact as if they were confirmed. Repeated wording-only Skill revisions did not eliminate the behavior.

A narrow diagnostic using correct decision state together with a commitment-boundary rule improved that case. It has not been established as a general solution, and neither a ledger nor a gate is included in v0.1.0.

## Case and model dependence

Internal trajectories are small, purpose-built cases, not a representative task sample. A clean result on one model, effort setting, or host does not guarantee the same behavior elsewhere. The Skill may under-intervene or over-intervene.

## Activation depends on the host

Clients use different discovery paths, refresh behavior, and activation mechanisms. Installation does not guarantee that a host has loaded or invoked the Skill. Follow the platform-specific discovery check in [`platform-support.md`](platform-support.md).

## Not an enforcement boundary

Skill instructions can be ignored or misapplied. Do not rely on Forward? as a security control, access-control mechanism, compliance barrier, or substitute for tool permissions and runtime safeguards.

## No external performance claim

FixedBench and CodeClash were feasibility investigations only. No paired performance scores were produced, and v0.1.0 makes no external benchmark claim.
