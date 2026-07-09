#!/usr/bin/env node
/**
 * Installs the isaaclab-3-migration skill into a Claude Code skills directory.
 *
 * Usage:
 *   npx isaaclab-3-migration-skill            # install to ~/.claude/skills (global)
 *   npx isaaclab-3-migration-skill --project  # install to ./.claude/skills (this repo)
 *   npx isaaclab-3-migration-skill --uninstall [--project]
 */

const fs = require("fs");
const os = require("os");
const path = require("path");

const SKILL_NAME = "isaaclab-3-migration";

const args = process.argv.slice(2);
const isProject = args.includes("--project");
const isUninstall = args.includes("--uninstall");
const isForce = args.includes("--force");

if (args.includes("--help") || args.includes("-h")) {
  console.log(`Usage: npx isaaclab-3-migration-skill [options]

Options:
  --project    Install into ./.claude/skills instead of ~/.claude/skills
  --force      Overwrite an existing installation
  --uninstall  Remove the skill
  -h, --help   Show this help
`);
  process.exit(0);
}

const skillsRoot = isProject
  ? path.join(process.cwd(), ".claude", "skills")
  : path.join(os.homedir(), ".claude", "skills");

const src = path.join(__dirname, "..", "skills", SKILL_NAME);
const dest = path.join(skillsRoot, SKILL_NAME);

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}

if (isUninstall) {
  if (!fs.existsSync(dest)) {
    console.log(`Nothing to remove at ${dest}`);
    process.exit(0);
  }
  fs.rmSync(dest, { recursive: true });
  console.log(`Removed ${dest}`);
  process.exit(0);
}

if (!fs.existsSync(src)) {
  fail(`skill source not found at ${src} (broken package?)`);
}

if (fs.existsSync(dest)) {
  if (!isForce) {
    fail(
      `${dest} already exists. Re-run with --force to overwrite, or --uninstall to remove it.`
    );
  }
  fs.rmSync(dest, { recursive: true });
}

fs.mkdirSync(skillsRoot, { recursive: true });
fs.cpSync(src, dest, { recursive: true });

console.log(`Installed ${SKILL_NAME} -> ${dest}`);
console.log(
  `\nOpen Claude Code and run /${SKILL_NAME}, or just ask it to migrate your project to Isaac Lab 3.`
);
