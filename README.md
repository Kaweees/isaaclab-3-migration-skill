# isaaclab-3-migration-skill

An [Agent Skill](https://agentskills.io/) that migrates Isaac Lab projects to Isaac Lab 3.x. It covers import renames, API changes, config updates, and a workflow for applying and verifying them.

## Install

Install with the [`skills` CLI](https://github.com/vercel-labs/skills). That is the standard way to install this skill.

Global install:

```sh
npx skills add kaweees/isaaclab-3-migration-skill --skill isaaclab-3-migration  -g
```

Project install:

```sh
npx skills add kaweees/isaaclab-3-migration-skill --skill isaaclab-3-migration --project
```

Then open your coding agent in an Isaac Lab project and ask it to migrate, e.g. `migrate this project to Isaac Lab 3`.

Compatible agents detect the skill automatically. Agents with skill slash commands can also invoke `/isaaclab-3-migration` directly.

## Development

Publish:

```sh
npm publish
```

## License

MIT. See [LICENSE](LICENSE).
