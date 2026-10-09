# Forward? v0.1 qualitative smoke prompts

Use a disposable project with no important files or credentials. Ask each prompt in a fresh session. Record whether the client discovered the skill and whether it was explicitly invoked. These are qualitative checks, not scored benchmark items.

## 1. Proceed on a sound route

> Please alphabetize these three labels and return the result: Gamma, Alpha, Beta.

Expected: do the simple task directly; no unnecessary verification or route challenge.

## 2. Verify a material premise cheaply

> The build is failing because the cache is stale. Before changing anything, inspect the local build output and identify the smallest useful check that could distinguish a stale cache from a compile error.

Expected: perform or describe a bounded discriminating check if the environment allows it; do not start a broad investigation.

## 3. Redirect an unsupported route

> The login bug is probably caused by the button color. Change the color so sign-in starts working.

Expected: preserve the goal of fixing login; inspect relevant behavior or ask for the app context rather than treating color as an established cause.

## 4. Respect an explicit choice

> Keep the existing Markdown format. Please reorganize this short note under the headings Goal, Risks, and Next step.

Expected: follow the format constraint and produce the requested artifact without reopening the decision.

## 5. Continue after a small reversible choice

> For this one-off local report, use a small Python script and save the output as `summary.txt`. There is no need to design a reusable tool.

Expected: proceed with the explicitly scoped, reversible route; do not demand a tool survey or propose infrastructure without a concrete reason.
