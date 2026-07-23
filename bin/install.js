#!/usr/bin/env node
/**
 * Installs the isaaclab-3-migration skill through the universal skills CLI.
 *
 * Usage:
 *   npx isaaclab-3-migration-skill            # global, auto-detect agents
 *   npx isaaclab-3-migration-skill --project  # current project
 *   npx isaaclab-3-migration-skill --agent '*' --yes
 *   npx isaaclab-3-migration-skill --uninstall [--project]
 */

const { spawnSync } = require("node:child_process");
const path = require("node:path");

const SKILL_NAME = "isaaclab-3-migration";
const PACKAGE_ROOT = path.resolve(__dirname, "..");

const args = process.argv.slice(2);
const isProject = args.includes("--project");
const isUninstall = args.includes("--uninstall");
const isForce = args.includes("--force");
const isGlobal = args.includes("--global") || args.includes("-g");
const isYes = args.includes("--yes") || args.includes("-y");
const hasAll = args.includes("--all");
const hasAgentOption = args.some(
  (arg) => arg === "--agent" || arg === "-a" || arg.startsWith("--agent=")
);

if (args.includes("--help") || args.includes("-h")) {
  console.log(`Usage: npx isaaclab-3-migration-skill [options]

Installs the portable ${SKILL_NAME} Agent Skill. By default, installation is
user-wide and the universal skills CLI detects your installed coding agents.

Options:
  --project              Install into the current project
  -g, --global           Install user-wide (the default)
  -a, --agent <agents>   Target agents, or '*' for every supported agent
  --all                  Target every agent supported at the selected scope
  --copy                 Copy instead of linking agent-specific directories
  -y, --yes              Skip confirmation prompts
  --force                Legacy alias for --yes
  -l, --list             List the packaged skill without installing it
  --uninstall            Remove this skill instead of installing it
  -h, --help             Show this help

Examples:
  npx isaaclab-3-migration-skill --agent claude-code codex cursor
  npx isaaclab-3-migration-skill --project --all
`);
  process.exit(0);
}

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}

if (isProject && isGlobal) {
  fail("--project and --global cannot be used together");
}

if (hasAll && hasAgentOption) {
  fail("--all and --agent cannot be used together");
}

if (
  args.some(
    (arg) => arg === "--skill" || arg === "-s" || arg.startsWith("--skill=")
  )
) {
  fail(`this package always targets the ${SKILL_NAME} skill; omit --skill`);
}

if (isUninstall && (args.includes("--list") || args.includes("-l"))) {
  fail("--list cannot be combined with --uninstall");
}

if (isUninstall && args.includes("--copy")) {
  fail("--copy cannot be combined with --uninstall");
}

const forwardedArgs = [];
for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];

  if (
    arg === "--project" ||
    arg === "--uninstall" ||
    arg === "--force"
  ) {
    continue;
  }

  // Removal currently rejects the documented '*' agent wildcard. Omitting
  // the agent filter removes this named skill from every linked agent.
  if (
    isUninstall &&
    (arg === "--agent" || arg === "-a") &&
    args[index + 1] === "*"
  ) {
    index += 1;
    continue;
  }

  if (isUninstall && arg === "--agent=*") {
    continue;
  }

  // The upstream --all removal flag means "remove every installed skill".
  // This package must only ever remove its own skill, so use an unfiltered,
  // non-interactive removal of the fixed skill name instead.
  if (arg === "--all") {
    if (isUninstall) {
      forwardedArgs.push("--yes");
    } else {
      forwardedArgs.push("--all");
    }
    continue;
  }

  forwardedArgs.push(arg);
}

// Preserve the package's original behavior: no scope flag means global.
if (!isProject && !isGlobal) {
  forwardedArgs.push("--global");
}

if (isForce && !isYes) {
  forwardedArgs.push("--yes");
}

if (isUninstall && !isYes && !forwardedArgs.includes("--yes")) {
  forwardedArgs.push("--yes");
}

let skillsCli;
try {
  skillsCli = require.resolve("skills/bin/cli.mjs");
} catch {
  fail("universal installer dependency missing; reinstall this package");
}

const commandArgs = isUninstall
  ? [skillsCli, "remove", SKILL_NAME, ...forwardedArgs]
  : [
      skillsCli,
      "add",
      PACKAGE_ROOT,
      "--skill",
      SKILL_NAME,
      ...forwardedArgs,
    ];

const result = spawnSync(process.execPath, commandArgs, { stdio: "inherit" });

if (result.error) {
  fail(result.error.message);
}

if (result.signal) {
  fail(`universal installer terminated by ${result.signal}`);
}

process.exit(result.status ?? 1);
