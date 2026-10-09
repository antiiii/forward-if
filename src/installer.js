import { createHash } from "node:crypto";
import { accessSync, constants, readFileSync } from "node:fs";
import { lstat, mkdir, readFile, rename, rm, rmdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PACKAGE = JSON.parse(readFileSync(path.join(PACKAGE_ROOT, "package.json"), "utf8"));
const SKILL_SOURCE = path.join(PACKAGE_ROOT, "skills", "forward", "SKILL.md");
const STATE_FILE = "installations.json";
const STATE_SCHEMA = 1;
const TARGETS = ["codex", "claude", "gemini"];

export const VERSION = PACKAGE.version;
export const SKILL_NAME = "forward";
export const SKILL_BYTES = readFileSync(SKILL_SOURCE);
export const SKILL_SHA256 = createHash("sha256").update(SKILL_BYTES).digest("hex");

export function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function normalizePath(value, pathApi = path) {
  const normalized = pathApi.resolve(value);
  return pathApi.sep === "\\" ? normalized.toLowerCase() : normalized;
}

export function resolveSkillFile(target, scope, options = {}) {
  const pathApi = options.pathApi ?? path;
  const home = options.home ?? os.homedir();
  const project = options.project ?? process.cwd();
  if (!TARGETS.includes(target)) throw new Error(`Unsupported target: ${target}`);
  if (scope !== "user" && scope !== "project") throw new Error(`Unsupported scope: ${scope}`);
  const root = scope === "user" ? home : project;
  if (scope === "project" && !options.project) throw new Error("Project scope requires a project directory.");
  const skillsRoot = target === "claude" ? ".claude/skills" : ".agents/skills";
  return pathApi.join(root, skillsRoot, SKILL_NAME, "SKILL.md");
}

export function stateFilePath(home = os.homedir(), pathApi = path) {
  return pathApi.join(home, ".forward-if", STATE_FILE);
}

export function findExecutable(command, options = {}) {
  const env = options.env ?? process.env;
  const platform = options.platform ?? process.platform;
  const pathApi = options.pathApi ?? path;
  const exists = options.exists ?? ((candidate) => {
    try {
      accessSync(candidate, platform === "win32" ? constants.F_OK : constants.X_OK);
      return true;
    } catch {
      return false;
    }
  });
  const pathValue = env.PATH ?? env.Path ?? "";
  const dirs = pathValue.split(pathApi.delimiter).filter(Boolean);
  const extensions = platform === "win32"
    ? (env.PATHEXT ?? ".EXE;.CMD;.BAT;.COM").split(";")
    : [""];
  for (const dir of dirs) {
    for (const extension of extensions) {
      const candidate = pathApi.join(dir, `${command}${extension}`);
      if (exists(candidate)) return candidate;
    }
  }
  return null;
}

export function detectTargets(options = {}) {
  return TARGETS.filter((target) => findExecutable(target, options) !== null);
}

export function resolveTargets(targetOption, options = {}) {
  if (targetOption === "all") return [...TARGETS];
  if (targetOption === "auto" || !targetOption) {
    const found = detectTargets(options);
    if (!found.length) {
      throw new Error("No supported client was detected. Install Codex, Claude Code, or Gemini CLI, or pass --target explicitly.");
    }
    return found;
  }
  if (TARGETS.includes(targetOption)) return [targetOption];
  throw new Error(`Unknown target '${targetOption}'. Choose auto, all, codex, claude, or gemini.`);
}

function assertOwnedSkillPath(filePath) {
  if (path.basename(filePath) !== "SKILL.md" || path.basename(path.dirname(filePath)) !== SKILL_NAME) {
    throw new Error(`Refusing unsafe install record path: ${filePath}`);
  }
}

async function readState(filePath) {
  try {
    const parsed = JSON.parse(await readFile(filePath, "utf8"));
    if (parsed.schema !== STATE_SCHEMA || !Array.isArray(parsed.installations)) {
      throw new Error("Unsupported installer state format");
    }
    return parsed;
  } catch (error) {
    if (error.code === "ENOENT") return { schema: STATE_SCHEMA, installations: [] };
    throw new Error(`Cannot read installer state at ${filePath}: ${error.message}`);
  }
}

async function saveState(filePath, state) {
  if (state.installations.length === 0) {
    await rm(filePath, { force: true });
    return;
  }
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
  await rename(temporary, filePath);
}

async function inspectFile(filePath) {
  try {
    const stats = await lstat(filePath);
    if (stats.isSymbolicLink() || !stats.isFile()) {
      throw new Error(`Refusing to replace a non-regular skill file: ${filePath}`);
    }
    return { exists: true, hash: sha256(await readFile(filePath)) };
  } catch (error) {
    if (error.code === "ENOENT") return { exists: false, hash: null };
    throw error;
  }
}

async function assertDirectoryIsSafe(directory) {
  try {
    const stats = await lstat(directory);
    if (stats.isSymbolicLink() || !stats.isDirectory()) {
      throw new Error(`Refusing to write through a non-directory or symbolic link: ${directory}`);
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

function makeBackupPath(filePath) {
  const stamp = new Date().toISOString().replaceAll(/[:.]/g, "-");
  let candidate = `${filePath}.forward-if-${stamp}.bak`;
  let counter = 1;
  while (true) {
    try {
      accessSync(candidate, constants.F_OK);
      candidate = `${filePath}.forward-if-${stamp}-${counter++}.bak`;
    } catch {
      return candidate;
    }
  }
}

async function backupExisting(filePath) {
  const backupPath = makeBackupPath(filePath);
  await rename(filePath, backupPath);
  return backupPath;
}

async function writeSkill(filePath) {
  const directory = path.dirname(filePath);
  await assertDirectoryIsSafe(directory);
  await mkdir(directory, { recursive: true });
  const temporary = `${filePath}.${process.pid}.tmp`;
  await writeFile(temporary, SKILL_BYTES, { mode: 0o644 });
  await rename(temporary, filePath);
}

function mergeRecord(state, record) {
  const key = normalizePath(record.path);
  const existingIndex = state.installations.findIndex((item) => normalizePath(item.path) === key);
  if (existingIndex === -1) state.installations.push(record);
  else state.installations[existingIndex] = record;
}

function selectedRecords(state, options) {
  const targetFilter = options.targets ? new Set(options.targets) : null;
  return state.installations.filter((record) => {
    if (options.scope && record.scope !== options.scope) return false;
    if (targetFilter && !record.targets.some((target) => targetFilter.has(target))) return false;
    return true;
  });
}

export async function install(options) {
  const targets = options.targets;
  const scope = options.scope ?? "user";
  const statePath = stateFilePath(options.home, options.pathApi ?? path);
  const state = await readState(statePath);
  const byPath = new Map();
  for (const target of targets) {
    const filePath = resolveSkillFile(target, scope, options);
    const key = normalizePath(filePath, options.pathApi ?? path);
    const item = byPath.get(key) ?? { path: filePath, targets: [] };
    item.targets.push(target);
    byPath.set(key, item);
  }

  const results = [];
  for (const item of byPath.values()) {
    const filePath = item.path;
    const directory = path.dirname(filePath);
    await assertDirectoryIsSafe(directory);
    const current = await inspectFile(filePath);
    const record = state.installations.find((saved) => normalizePath(saved.path) === normalizePath(filePath));
    if (record) assertOwnedSkillPath(record.path);
    let action = "installed";
    if (options.dryRun) {
      action = current.exists ? (current.hash === SKILL_SHA256 ? "already current" : "would update/replace") : "would install";
    } else if (current.exists && current.hash === SKILL_SHA256) {
      action = "already current";
    } else if (current.exists && record && current.hash === record.installedHash) {
      action = "updated";
      await writeSkill(filePath);
    } else if (current.exists && options.force) {
      const backup = await backupExisting(filePath);
      await writeSkill(filePath);
      action = `backed up to ${path.basename(backup)} and replaced`;
    } else if (current.exists) {
      throw new Error(`Existing skill is not an unmodified Forward? installation: ${filePath}. Use --force to back it up before replacement.`);
    } else {
      await writeSkill(filePath);
    }
    if (!options.dryRun) {
      mergeRecord(state, {
        path: filePath,
        scope,
        targets: item.targets,
        version: VERSION,
        installedHash: SKILL_SHA256,
      });
    }
    results.push({ path: filePath, targets: item.targets, action });
  }
  if (!options.dryRun) await saveState(statePath, state);
  return results;
}

export async function update(options = {}) {
  const statePath = stateFilePath(options.home, options.pathApi ?? path);
  const state = await readState(statePath);
  const records = selectedRecords(state, options);
  if (!records.length) return [];
  const results = [];
  for (const record of records) {
    assertOwnedSkillPath(record.path);
    const current = await inspectFile(record.path);
    if (!current.exists) {
      if (!options.dryRun) {
        state.installations = state.installations.filter((item) => normalizePath(item.path) !== normalizePath(record.path));
      }
      results.push({ path: record.path, targets: record.targets, action: "missing" });
      continue;
    }
    if (current.hash !== record.installedHash) {
      if (!options.force) {
        throw new Error(`Locally modified skill was not overwritten: ${record.path}. Use --force to back it up before updating.`);
      }
      if (!options.dryRun) await backupExisting(record.path);
    }
    const action = options.dryRun
      ? (current.hash === SKILL_SHA256 ? "already current" : "would update")
      : (current.hash === SKILL_SHA256 ? "already current" : "updated");
    if (!options.dryRun && current.hash !== SKILL_SHA256) await writeSkill(record.path);
    if (!options.dryRun) {
      record.version = VERSION;
      record.installedHash = SKILL_SHA256;
    }
    results.push({ path: record.path, targets: record.targets, action });
  }
  if (!options.dryRun) await saveState(statePath, state);
  return results;
}

export async function uninstall(options = {}) {
  const statePath = stateFilePath(options.home, options.pathApi ?? path);
  const state = await readState(statePath);
  const records = selectedRecords(state, options);
  const results = [];
  for (const record of records) {
    assertOwnedSkillPath(record.path);
    const current = await inspectFile(record.path);
    if (!current.exists) {
      results.push({ path: record.path, targets: record.targets, action: "already missing" });
    } else if (current.hash !== record.installedHash && !options.force) {
      throw new Error(`Locally modified skill was not removed: ${record.path}. Use --force to back it up before removal.`);
    } else {
      if (!options.dryRun) {
        if (current.hash !== record.installedHash) await backupExisting(record.path);
        else await rm(record.path);
        // Remove only Forward?'s empty skill directory; never remove its parent skills directory.
        try {
          await rmdir(path.dirname(record.path));
        } catch (error) {
          if (error.code !== "ENOTEMPTY" && error.code !== "EEXIST") throw error;
        }
      }
      results.push({ path: record.path, targets: record.targets, action: "removed" });
    }
    if (!options.dryRun) {
      state.installations = state.installations.filter((item) => normalizePath(item.path) !== normalizePath(record.path));
    }
  }
  if (!options.dryRun) await saveState(statePath, state);
  return results;
}

export async function doctor(options = {}) {
  const statePath = stateFilePath(options.home, options.pathApi ?? path);
  const state = await readState(statePath);
  const results = [];
  for (const record of selectedRecords(state, options)) {
    assertOwnedSkillPath(record.path);
    const current = await inspectFile(record.path);
    const status = !current.exists
      ? "MISSING"
      : current.hash !== record.installedHash
        ? "MODIFIED"
        : current.hash === SKILL_SHA256 && record.version === VERSION
          ? "OK"
          : "OUTDATED";
    results.push({ ...record, status, currentHash: current.hash });
  }
  return results;
}
