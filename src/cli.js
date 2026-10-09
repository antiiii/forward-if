import os from "node:os";
import path from "node:path";
import { detectTargets, doctor, install, resolveTargets, SKILL_SHA256, uninstall, update, VERSION } from "./installer.js";

const HELP = `Forward? installer ${VERSION}

Usage:
  forward-if install [--target auto|all|codex|claude|gemini] [--scope user|project] [--project DIR] [--dry-run] [--force]
  forward-if doctor
  forward-if update [--target TARGET] [--scope SCOPE] [--force] [--dry-run]
  forward-if uninstall [--target TARGET] [--scope SCOPE] [--force] [--dry-run]

--force backs up a conflicting or modified SKILL.md before replacing/removing it.
`;

function parseArgs(argv) {
  const command = argv[0];
  const options = { target: "auto", targetProvided: false, scope: undefined, project: undefined, force: false, dryRun: false };
  for (let index = 1; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--target" || argument === "--scope" || argument === "--project") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`${argument} requires a value.`);
      if (argument === "--target") {
        options.target = value;
        options.targetProvided = true;
      } else if (argument === "--scope") options.scope = value;
      else options.project = path.resolve(value);
      index += 1;
    } else if (argument === "--dry-run") options.dryRun = true;
    else if (argument === "--force") options.force = true;
    else if (argument === "--help" || argument === "-h") options.help = true;
    else throw new Error(`Unknown option: ${argument}`);
  }
  if (!command || command === "--help" || command === "-h") options.help = true;
  // doctor inventories every registered install unless the caller narrows it.
  if (!options.scope && command !== "doctor") options.scope = "user";
  if (options.scope && options.scope !== "user" && options.scope !== "project") throw new Error("--scope must be user or project.");
  if (options.scope === "project") options.project ??= process.cwd();
  else if (options.project) throw new Error("--project can only be used with --scope project.");
  if (!["install", "doctor", "update", "uninstall"].includes(command) && !options.help) {
    throw new Error(`Unknown command '${command}'.\n\n${HELP}`);
  }
  options.home = os.homedir();
  return { command, options };
}

function printResults(results) {
  if (!results.length) {
    console.log("No Forward? installations are registered.");
    return;
  }
  for (const result of results) {
    const target = result.targets?.join(", ") ?? "Forward?";
    const status = result.status ? `${result.status}: ` : "";
    const action = result.action ? ` — ${result.action}` : "";
    console.log(`${status}${target}: ${result.path}${action}`);
  }
}

export async function runCli(argv) {
  const { command, options } = parseArgs(argv);
  if (options.help) {
    console.log(HELP);
    return;
  }
  console.log(`Forward? ${VERSION} · Skill SHA-256 ${SKILL_SHA256}`);
  if (command === "install") {
    options.targets = resolveTargets(options.target);
    const results = await install(options);
    printResults(results);
    if (options.dryRun) console.log("Dry run only; no files or installer state were changed.");
    console.log("Verify discovery: Codex /skills; Claude Code /skills; Gemini CLI /skills list.");
    return;
  }
  if (command === "doctor") {
    console.log(`Detected clients: ${detectTargets().join(", ") || "none"}`);
    printResults(await doctor(options));
    return;
  }
  if (command === "update") {
    if (options.targetProvided) options.targets = resolveTargets(options.target);
    printResults(await update(options));
    if (options.dryRun) console.log("Dry run only; no files or installer state were changed.");
    return;
  }
  if (command === "uninstall") {
    if (options.targetProvided) options.targets = resolveTargets(options.target);
    printResults(await uninstall(options));
    if (options.dryRun) console.log("Dry run only; no files or installer state were changed.");
  }
}
