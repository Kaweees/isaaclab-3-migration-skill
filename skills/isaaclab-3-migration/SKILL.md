---
name: isaaclab-3-migration
description: Migrate an Isaac Lab project (tasks, environments, configs, extensions) to Isaac Lab 3.x. Use when the user asks to upgrade, port, or migrate code to Isaac Lab 3, mentions Isaac Lab version errors after upgrading, or references deprecated Isaac Lab 2.x APIs, imports, or config classes.
---

# Isaac Lab 3.x Migration

Migrate a user's Isaac Lab project to Isaac Lab 3.x: rewrite imports, update renamed/removed APIs, adjust configs, and verify the project still runs.

## Workflow

1. **Assess the project.** Find every file that touches Isaac Lab:
   - Grep for imports (`isaaclab`, `omni.isaac.lab`, `omni.isaac.orbit`) across the repo.
   - Note the current Isaac Lab version (check `pyproject.toml`, `setup.py`, extension configs, or the installed package).
   - List the surface area: env configs, task registrations, custom actuators/sensors, RL library glue (rsl_rl, skrl, rl_games, sb3), launch scripts.
2. **Report a migration plan before editing.** Summarize what will change, grouped by category below, and flag anything with no direct 3.x equivalent.
3. **Apply changes category by category** (imports first, then APIs, then configs), keeping each change minimal and mechanical.
4. **Verify.** Run the project's smallest smoke test (e.g. `python scripts/... --headless --num_envs 4` or the repo's test suite). Report failures honestly and fix iteratively.

## Migration reference

<!-- TODO: Fill in the actual 2.x -> 3.x changes. Keep each table mechanical so the model can apply it without guessing. -->

### Import and module renames

| Isaac Lab 2.x | Isaac Lab 3.x |
| --- | --- |
| `TODO` | `TODO` |

### Renamed / removed APIs

| Old API | Replacement | Notes |
| --- | --- | --- |
| `TODO` | `TODO` | |

### Config class changes

<!-- TODO: e.g. renamed cfg fields, new required fields, changed defaults -->

### Behavioral changes (no code rename, semantics changed)

<!-- TODO: things that compile but behave differently — these need callouts in the final report, not silent edits -->

### Removed features with no equivalent

<!-- TODO: list features the skill must flag to the user instead of migrating -->

## Rules

- Never mix migration edits with refactoring; change only what the version bump requires.
- If an API has no entry in the tables above and its 3.x status is unclear, check the installed `isaaclab` package source or the official migration guide before guessing — and say so in the report.
- Preserve the user's task names, gym registration IDs, and reward semantics exactly unless the migration forces a change.
- End with a summary: files changed, changes that alter behavior, and anything left for the user to decide.

## Resources

- Official migration guide: https://isaac-sim.github.io/IsaacLab/main/source/refs/migration.html
- For long lookup tables that would bloat this file, put them in `references/` next to this file and point to them here.
