import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { SKILL_SHA256 } from "../src/installer.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

test("packed package contains and installs the exact canonical Skill", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "forward-if-package-"));
  try {
    const packDirectory = path.join(root, "pack");
    const installDirectory = path.join(root, "install");
    const tempHome = path.join(root, "home");
    await mkdir(packDirectory);
    const packOutput = execFileSync(npm, ["pack", "--ignore-scripts", "--json", "--pack-destination", packDirectory], {
      cwd: repoRoot,
      encoding: "utf8",
    });
    const pack = JSON.parse(packOutput)[0];
    const fileNames = pack.files.map((entry) => entry.path.replaceAll("\\", "/"));
    assert.ok(fileNames.includes("skills/forward/SKILL.md"));
    assert.ok(fileNames.includes("bin/forward-if.js"));
    if (existsSync(path.join(repoRoot, "LICENSE"))) assert.ok(fileNames.includes("LICENSE"));
    assert.ok(!fileNames.includes("skills/forward-v3/SKILL.md"), "the provenance copy stays out of the npm package");
    assert.ok(!fileNames.some((name) => name.startsWith("results/")));
    assert.ok(!fileNames.some((name) => name.startsWith("cases/")));
    const archive = path.join(packDirectory, pack.filename);
    execFileSync(npm, ["install", "--prefix", installDirectory, "--ignore-scripts", "--no-audit", "--no-fund", archive], { encoding: "utf8" });
    const installedSkill = path.join(installDirectory, "node_modules", "forward-if", "skills", "forward", "SKILL.md");
    assert.equal(await readFile(installedSkill, "utf8"), await readFile(path.join(repoRoot, "skills", "forward", "SKILL.md"), "utf8"));
    const runOutput = execFileSync(process.execPath, [
      path.join(installDirectory, "node_modules", "forward-if", "bin", "forward-if.js"),
      "install", "--target", "codex", "--scope", "user", "--dry-run",
    ], {
      encoding: "utf8",
      env: { ...process.env, HOME: tempHome, USERPROFILE: tempHome, CODEX_HOME: undefined },
    });
    assert.match(runOutput, /would install/);
    assert.match(runOutput, new RegExp(SKILL_SHA256));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
