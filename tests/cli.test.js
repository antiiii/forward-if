import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { install } from "../src/installer.js";

test("doctor without a scope filter reports project installations", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "forward-if-cli-test-"));
  try {
    const home = path.join(root, "home");
    const project = path.join(root, "project");
    await mkdir(home);
    await mkdir(project);
    await install({ home, project, scope: "project", targets: ["codex"] });

    const bin = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../bin/forward-if.js");
    const result = spawnSync(process.execPath, [bin, "doctor"], {
      env: { ...process.env, HOME: home, USERPROFILE: home },
      encoding: "utf8",
    });

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /OK: codex:/);
    assert.ok(result.stdout.includes(project), `doctor did not report project path: ${result.stdout}`);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
