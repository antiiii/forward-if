import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  detectTargets,
  doctor,
  install,
  normalizePath,
  resolveSkillFile,
  sha256,
  SKILL_SHA256,
  stateFilePath,
  uninstall,
  update,
  VERSION,
} from "../src/installer.js";

async function temporaryDirectory(prefix) {
  return mkdtemp(path.join(os.tmpdir(), prefix));
}

async function useTempRoot(run) {
  const root = await temporaryDirectory("forward-if-test-");
  try {
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

function userOptions(home, overrides = {}) {
  return { home, scope: "user", targets: ["codex"], ...overrides };
}

test("install is idempotent and doctor reports the current Skill", async () => {
  await useTempRoot(async (home) => {
    const options = userOptions(home, { targets: ["codex", "gemini"] });
    const first = await install(options);
    const second = await install(options);
    const status = await doctor({ home });
    assert.equal(first.length, 1, "Codex and Gemini share the interoperable .agents path");
    assert.equal(first[0].action, "installed");
    assert.equal(second[0].action, "already current");
    assert.deepEqual(status[0].targets, ["codex", "gemini"]);
    assert.equal(status[0].status, "OK");
    assert.equal(status[0].currentHash, SKILL_SHA256);
  });
});

test("update replaces a managed older hash and records the current version", async () => {
  await useTempRoot(async (home) => {
    const options = userOptions(home);
    await install(options);
    const file = resolveSkillFile("codex", "user", { home });
    const oldBytes = Buffer.from("---\nname: forward\ndescription: earlier managed release\n---\n\nOld instructions.\n");
    await writeFile(file, oldBytes);
    const statePath = stateFilePath(home);
    const state = JSON.parse(await readFile(statePath, "utf8"));
    state.installations[0].version = "0.0.9";
    state.installations[0].installedHash = sha256(oldBytes);
    await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`);

    const result = await update({ home });
    const status = await doctor({ home });
    assert.equal(result[0].action, "updated");
    assert.equal(status[0].version, VERSION);
    assert.equal(status[0].status, "OK");
    assert.equal(status[0].currentHash, SKILL_SHA256);
  });
});

test("update refuses to overwrite a locally modified Skill", async () => {
  await useTempRoot(async (home) => {
    await install(userOptions(home));
    const file = resolveSkillFile("codex", "user", { home });
    await writeFile(file, "local edit\n", { flag: "a" });
    await assert.rejects(update({ home }), /Locally modified skill was not overwritten/);
    assert.equal((await doctor({ home }))[0].status, "MODIFIED");
    assert.match(await readFile(file, "utf8"), /local edit/);
  });
});

test("force update backs up a modified Skill before replacement", async () => {
  await useTempRoot(async (home) => {
    await install(userOptions(home));
    const file = resolveSkillFile("codex", "user", { home });
    await writeFile(file, "local edit\n", { flag: "a" });
    const result = await update({ home, force: true });
    const files = await readdir(path.dirname(file));
    assert.equal(result[0].action, "updated");
    assert.ok(files.some((name) => name.endsWith(".bak")));
    assert.equal((await doctor({ home }))[0].status, "OK");
  });
});

test("uninstall removes only the owned Skill and preserves the shared parent", async () => {
  await useTempRoot(async (home) => {
    await install(userOptions(home));
    const file = resolveSkillFile("codex", "user", { home });
    const skillDirectory = path.dirname(file);
    const skillsDirectory = path.dirname(skillDirectory);
    await writeFile(path.join(skillDirectory, "user-note.txt"), "keep\n");
    const result = await uninstall({ home });
    assert.equal(result[0].action, "removed");
    assert.equal(await readFile(path.join(skillDirectory, "user-note.txt"), "utf8"), "keep\n");
    await assert.rejects(readFile(file));
    assert.ok((await readdir(skillsDirectory)).includes("forward"));
    assert.deepEqual(await doctor({ home }), []);
  });
});

test("project scope installs under the requested project root", async () => {
  await useTempRoot(async (root) => {
    const project = path.join(root, "workspace");
    const home = path.join(root, "home");
    await mkdir(project);
    await mkdir(home);
    const result = await install({ home, project, scope: "project", targets: ["claude"] });
    assert.equal(result[0].path, path.join(project, ".claude", "skills", "forward", "SKILL.md"));
    const status = await doctor({ home });
    assert.equal(status.length, 1, "doctor inventories project installs when no scope filter is given");
    assert.equal(status[0].status, "OK");
  });
});

test("Windows path resolution uses native separators for user and project installs", () => {
  const pathApi = path.win32;
  assert.equal(
    resolveSkillFile("codex", "user", { home: "C:\\Users\\Example", pathApi }),
    "C:\\Users\\Example\\.agents\\skills\\forward\\SKILL.md",
  );
  assert.equal(
    resolveSkillFile("claude", "project", { project: "D:\\Work\\app", pathApi }),
    "D:\\Work\\app\\.claude\\skills\\forward\\SKILL.md",
  );
  assert.equal(normalizePath("C:\\Users\\EXAMPLE\\.agents\\skills\\forward", pathApi), "c:\\users\\example\\.agents\\skills\\forward");
});

test("auto detection handles multiple client binaries and Windows extensions", () => {
  const pathApi = path.win32;
  const existing = new Set(["C:\\Tools\\codex.CMD", "C:\\Tools\\claude.EXE"]);
  const targets = detectTargets({
    platform: "win32",
    pathApi,
    env: { PATH: "C:\\Tools", PATHEXT: ".EXE;.CMD;.BAT" },
    exists: (candidate) => existing.has(candidate),
  });
  assert.deepEqual(targets, ["codex", "claude"]);
});

test("dry-run does not create the skill or ownership state", async () => {
  await useTempRoot(async (home) => {
    const result = await install(userOptions(home, { dryRun: true }));
    assert.equal(result[0].action, "would install");
    await assert.rejects(readFile(resolveSkillFile("codex", "user", { home })));
    await assert.rejects(readFile(stateFilePath(home)));
  });
});
