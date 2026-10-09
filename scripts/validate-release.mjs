import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const expectedSkillHash = "f87fb2f0c29c5beb76525c32c99ab6392c86389352e9cf94e0072d2c513f9296";
const source = await readFile(path.join(root, "skills", "forward-v3", "SKILL.md"));
const shipped = await readFile(path.join(root, "skills", "forward", "SKILL.md"));
const sourceHash = createHash("sha256").update(source).digest("hex");
assert.equal(sourceHash, expectedSkillHash, "frozen Skill v3 provenance hash changed");
assert.deepEqual(shipped, source, "the released Skill must be byte-for-byte identical to frozen v3");

const text = shipped.toString("utf8");
const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
assert.ok(match, "SKILL.md must start with YAML frontmatter");
const fields = new Map();
for (const line of match[1].split(/\r?\n/)) {
  const field = line.match(/^([a-z-]+):\s*(.*?)\s*$/);
  assert.ok(field, `unsupported frontmatter line: ${line}`);
  assert.ok(!fields.has(field[1]), `duplicate frontmatter field: ${field[1]}`);
  fields.set(field[1], field[2]);
}
assert.equal(fields.get("name"), "forward");
assert.match(fields.get("name"), /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
assert.ok(fields.get("name").length <= 64);
assert.equal(path.basename(path.dirname(path.join(root, "skills", "forward", "SKILL.md"))), fields.get("name"));
assert.ok(fields.get("description"));
assert.ok(fields.get("description").length <= 1024);
assert.ok(!/[<>]/.test(fields.get("description")));

const plugin = JSON.parse(await readFile(path.join(root, "plugin.json"), "utf8"));
const marketplace = JSON.parse(await readFile(path.join(root, ".agents", "plugins", "marketplace.json"), "utf8"));
const pkg = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
let licenseText;
try {
  licenseText = await readFile(path.join(root, "LICENSE"), "utf8");
} catch (error) {
  if (error.code === "ENOENT") throw new Error("LICENSE is missing; confirm the exact copyright holder before publishing.");
  throw error;
}
assert.equal(plugin.version, pkg.version);
assert.equal(pkg.version, "0.1.0");
assert.equal(plugin.name, "forward-if");
assert.equal(plugin.license, pkg.license);
assert.equal(pkg.license, "MIT");
assert.match(licenseText, /^MIT License\s*$/m);
assert.match(licenseText, /^Copyright \(c\) 2026 .+$/m, "MIT LICENSE must carry the owner-confirmed copyright name");
assert.equal(marketplace.name, pkg.name);
const listedPlugins = marketplace.plugins.filter((item) => item.name === pkg.name);
assert.equal(listedPlugins.length, 1, "the Codex marketplace must list this plugin exactly once");
assert.deepEqual(listedPlugins[0].source, {
  source: "url",
  url: "https://github.com/antiiii/forward-if.git",
  ref: "main",
});
assert.equal(listedPlugins[0].policy.installation, "AVAILABLE");
assert.equal(listedPlugins[0].policy.authentication, "ON_INSTALL");
assert.ok(!pkg.dependencies, "the installer must not add runtime dependencies");
console.log(`Release metadata valid; frozen Skill SHA-256 ${sourceHash}`);
