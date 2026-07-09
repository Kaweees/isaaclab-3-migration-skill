# isaaclab-3-migration-skill

A [Claude Code](https://claude.com/claude-code) skill that migrates Isaac Lab projects to Isaac Lab 3.x. It teaches Claude the import renames, API changes, and config updates the version bump requires, plus a workflow for applying and verifying them.

## Install

Install for all your projects (copies into `~/.claude/skills/`):

```sh
npx isaaclab-3-migration-skill
```

Or install into just the current repo (copies into `./.claude/skills/`):

```sh
npx isaaclab-3-migration-skill --project
```

Other flags: `--force` to overwrite an existing install, `--uninstall` to remove it.

## Use

Open Claude Code in your Isaac Lab project and ask it to migrate:

```
> migrate this project to Isaac Lab 3
```

Claude will detect the skill automatically. You can also invoke it directly with `/isaaclab-3-migration`.

## What's in the skill

```
skills/isaaclab-3-migration/
  SKILL.md        # workflow + migration reference tables
  references/     # optional long-form lookup tables
```

## Development

Test the installer locally without publishing:

```sh
node bin/install.js --project --force
```

Publish:

```sh
npm publish
```

## License

MIT
