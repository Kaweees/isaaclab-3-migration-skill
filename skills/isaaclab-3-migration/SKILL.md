---
name: isaaclab-3-migration
description: Migrate Isaac Lab (IsaacLab) 2.x code to Isaac Lab 3.0, and write new Isaac Lab 3.0 code correctly. Use this skill whenever the user mentions Isaac Lab, IsaacLab, isaaclab imports, Isaac Sim RL environments, upgrading or porting robotics simulation code to Isaac Lab 3.x, quaternion WXYZ/XYZW convention issues, ProxyArray errors, deprecated write_*_to_sim methods, Newton/PhysX backend selection, ModuleNotFoundError for omni.physics.tensors.impl, or DeprecationWarnings from isaaclab packages — even if they never explicitly say migrate.
---

# Isaac Lab 3.x Migration

Isaac Lab 3.0 introduces a multi-backend architecture (PhysX + Newton) that separates backend-specific code from the core `isaaclab` API. This skill encodes every breaking change and deprecation needed to migrate Isaac Lab 2.x code to 3.0, or to write correct 3.0 code from scratch.

## The Three Highest-Impact Changes (check these first)

### 1. Quaternion format changed from WXYZ to XYZW ⚠️

This silently breaks rotations — code runs but robots are oriented wrong.

| | Old (2.x, WXYZ) | New (3.0, XYZW) |
|---|---|---|
| Order | `(w, x, y, z)` | `(x, y, z, w)` |
| Identity | `(1.0, 0.0, 0.0, 0.0)` | `(0.0, 0.0, 0.0, 1.0)` |

Update ALL hard-coded quaternions: `rot=` in asset configs, goal poses, initial states, controller targets, docs/comments. All `isaaclab.utils.math` quaternion functions (`quat_mul`, `quat_apply`, `quat_from_euler_xyz`, `quat_from_matrix`, etc.) now expect and return XYZW. `convert_quat()` has been **removed** — delete calls to it; no conversion is needed anymore.

```python
# Before (2.x):  rot=(1.0, 0.0, 0.0, 0.0)   # w, x, y, z
# After  (3.0):  rot=(0.0, 0.0, 0.0, 1.0)   # x, y, z, w
```

Tools to find quaternions in a user codebase (never run on Isaac Lab's own packages — they're already converted):

```bash
# Scan (review results manually; not bulletproof)
python scripts/tools/find_quaternions.py --path my_project/
# Safest automated fix: identity quaternions only
python scripts/tools/find_quaternions.py --fix-identity-only
# Interactive fix / dry run / force
python scripts/tools/find_quaternions.py --fix [--dry-run|--force]
```

For runtime reads of quaternion data (which the static tool can't see), enable the runtime detector, run a representative scene, and triage each `UserWarning` traceback:

```bash
export WARN_ON_TORCH_QUATF_ACCESS=1
./isaaclab.sh -p my_script.py
```

Recommended order: commit clean git state → scan without `--fix` → `--fix-identity-only` → review non-identity hits manually (RGBA colors and bounding boxes are 4-element false positives) → run with the runtime detector → test.

### 2. `.data.*` properties now return ProxyArray, not torch.Tensor

All asset (`Articulation`, `RigidObject`, `RigidObjectCollection`, `DeformableObject`) and sensor (`ContactSensor`, `Imu`, `Pva`, `FrameTransformer`, `RayCaster*`) data properties return `ProxyArray` with explicit `.torch` and `.warp` accessors:

```python
root_pos = robot.data.root_pos_w.torch          # torch.Tensor (cached, zero-copy)
joint_pos_warp = robot.data.joint_pos.warp      # underlying wp.array

# Patterns that need .torch appended:
pos = robot.data.root_pos_w.torch.clone()
zeros = torch.zeros_like(robot.data.root_pos_w.torch)
torch.testing.assert_close(robot.data.root_pos_w.torch, expected)
```

Interop notes:
- `wp.launch(kernel, inputs=[robot.data.joint_pos])` works unchanged — ProxyArray implements `__cuda_array_interface__`.
- `torch.mean(robot.data.joint_pos)` etc. work via `__torch_function__` but emit a one-time DeprecationWarning; migrate to explicit `.torch` (the bridge will be removed).
- Replace `wp.to_torch(proxy_array)` with `proxy_array.torch` (shim is deprecated).

### 3. Write methods split into `_index` / `_mask` variants

The old `write_*_to_sim(data, env_ids)` methods are **removed** (not deprecated). Two replacements:

```python
# Partial data for sparse env indices — data shape (len(env_ids), ...)
robot.write_root_pose_to_sim_index(root_pose=pose_data, env_ids=env_ids)
# Full data + boolean mask — data shape (num_envs, ...)
robot.write_root_pose_to_sim_mask(root_pose=pose_data, env_mask=env_mask)
```

The pattern applies to all root pose/velocity writers and all Articulation joint writers (`write_joint_position_to_sim`, `write_joint_stiffness_to_sim`, `write_joint_effort_limit_to_sim`, etc.). See `references/api-renames.md` for the complete table.

## Import and Class Moves

**Moved to `isaaclab_physx`** (installed automatically with Isaac Lab):

```python
from isaaclab_physx.assets import SurfaceGripper, SurfaceGripperCfg  # was isaaclab.assets
```

**Unchanged imports** — `Articulation`, `RigidObject`, `RigidObjectCollection`, `DeformableObject` (+ Cfg/Data), and sensors `ContactSensor`, `Imu`, `Pva`, `FrameTransformer`, `JointWrenchSensor` stay in `isaaclab.*`. A factory dispatches to the active backend (`physx` default) automatically — same imports work for any backend.

**`XformPrimView` → `FrameView`**: `from isaaclab.sim.views import FrameView` (old name is a deprecated alias). The factory dispatches to `FabricFrameView` (PhysX) or `NewtonSiteFrameView` (Newton).

**IMU renamed to PVA; new lightweight IMU**: The old full-state `Imu` is now `Pva`/`PvaCfg`/`PvaData` (pose, velocities, accelerations, projected gravity). The new `Imu` only provides `ang_vel_b` + `lin_acc_b` like a real IMU. The `gravity_bias` config param is removed: PVA reports raw kinematic acceleration (no gravity); the new IMU always includes gravity automatically. MDP observation funcs renamed: `imu_orientation` → `pva_orientation`, `imu_projected_gravity` → `pva_projected_gravity`.

**`root_physx_view` → `root_view`**: `robot.root_view.get_masses()`.

**RigidObjectCollection `object_*` → `body_*`**: e.g. `find_objects()` → `find_bodies()`, `data.object_pose_w` → `data.body_pose_w`, `write_object_state_to_sim()` → `write_body_state_to_sim()` (then further split into `_index`/`_mask`). Full rename tables in `references/api-renames.md`.

**Joint wrench data moved to a sensor**: `ArticulationData.body_incoming_joint_wrench_b` is removed. Add a `JointWrenchSensorCfg(prim_path="{ENV_REGEX_NS}/Robot")` to the scene and read `sensor.data.force.torch` / `sensor.data.torque.torch`; in manager-based envs use `mdp.body_incoming_wrench` with a `SceneEntityCfg("joint_wrench", body_names=[...])`.

**Sensor pose deprecation**: `pose_w`/`pos_w`/`quat_w` on `ContactSensorData` are deprecated — use a `FrameTransformer` to track sensor poses.

## Schema Configuration Refactor

Spawner schema cfgs split into solver-common base classes (`isaaclab.sim.schemas`) and backend subclasses (`isaaclab_physx.sim.schemas`, `isaaclab_newton.sim.schemas`). 2.x names remain as deprecated aliases until 4.0:

| 2.x class | 3.0 replacement |
|---|---|
| `RigidBodyPropertiesCfg` | `RigidBodyBaseCfg` (portable) or `PhysxRigidBodyPropertiesCfg` |
| `JointDrivePropertiesCfg` | `JointDriveBaseCfg` or `PhysxJointDrivePropertiesCfg` |
| `CollisionPropertiesCfg` | `CollisionBaseCfg` or `PhysxCollisionPropertiesCfg` |
| `ArticulationRootPropertiesCfg` | `ArticulationRootBaseCfg` or `PhysxArticulationRootPropertiesCfg` |
| `FixedTendonPropertiesCfg` / `SpatialTendonPropertiesCfg` | `PhysxFixedTendonPropertiesCfg` / `PhysxSpatialTendonPropertiesCfg` |

Field renames on `JointDriveBaseCfg` (old names deprecated; if both set, the new one silently wins): `max_velocity` → `max_joint_velocity`, `max_effort` → `max_force`.

```python
# Backend-portable
from isaaclab.sim.schemas import RigidBodyBaseCfg, JointDriveBaseCfg
JointDriveBaseCfg(max_force=80.0, max_joint_velocity=5.0)
# PhysX-targeted
from isaaclab_physx.sim.schemas import PhysxRigidBodyPropertiesCfg
PhysxRigidBodyPropertiesCfg(disable_gravity=True, linear_damping=0.1)
```

Newton/MuJoCo-specific cfgs live in `isaaclab_newton.sim.schemas` (`NewtonCollisionPropertiesCfg`, `MujocoRigidBodyPropertiesCfg` for `gravcomp`, etc.). Full table in `references/api-renames.md`.

## CLI Changes

**`--headless` is deprecated** — use `--visualizer` / `--viz` (comma-separated, e.g. `--viz kit,newton`; `--viz none` disables all, including config-defined ones). If omitted, visualizers resolve from `SimulationCfg.visualizer_cfgs`.

**Unified RL entrypoints** — select library with `--rl_library` (`rsl_rl`, `rl_games`, `skrl`, `sb3`, `rlinf`) instead of per-library scripts:

```bash
# 2.x (deprecated):  ./isaaclab.sh -p scripts/reinforcement_learning/rsl_rl/train.py --task Isaac-Cartpole-v0
./isaaclab.sh train --rl_library rsl_rl --task Isaac-Cartpole-v0
./isaaclab.sh play  --rl_library rsl_rl --task Isaac-Cartpole-v0 --checkpoint /PATH/TO/model.pt
# Distributed: point torch.distributed.run at the unified scripts/reinforcement_learning/train.py with --rl_library
```

## Multi-Backend Environments: PresetCfg

To make an env config work on both PhysX and Newton, declare named variants with `PresetCfg` (from `isaaclab_tasks.utils`); select at launch with `physics=newton_mjwarp` or `physics=physx` (legacy `presets=NAME` still works):

```python
from isaaclab_newton.physics import MJWarpSolverCfg, NewtonCfg
from isaaclab_physx.physics import PhysxCfg
from isaaclab_tasks.utils import PresetCfg

@configclass
class ReachPhysicsCfg(PresetCfg):
    default: PhysxCfg = PhysxCfg(bounce_threshold_velocity=0.2)  # used with no override
    physx:   PhysxCfg = PhysxCfg(bounce_threshold_velocity=0.2)
    newton_mjwarp: NewtonCfg = NewtonCfg(
        solver_cfg=MJWarpSolverCfg(njmax=20, nconmax=20, ls_iterations=20,
                                   cone="pyramidal", ls_parallel=True,
                                   integrator="implicitfast", impratio=1),
        num_substeps=1)

# in env cfg __post_init__:  self.sim.physics = ReachPhysicsCfg()
```

Key Newton solver knobs: `njmax` (max constraint rows ≥ expected contacts/env), `nconmax` (max contacts/env), `cone` (`"pyramidal"` fast / `"elliptic"` accurate), `integrator` (`"implicitfast"` recommended), `impratio` (>1 for soft-contact stability). The same PresetCfg pattern works for other sections (e.g. an `events` field with a Newton-compatible subset that omits PhysX-only terms like `randomize_rigid_body_material`).

## Ray Caster Changes

RayCaster family moved from PyTorch/USD to native Warp kernels:
- `data.pos_w`, `data.quat_w`, `data.ray_hits_w` return ProxyArray → append `.torch`.
- `attach_yaw_only` (bool) deprecated → `ray_alignment` string: `False`→`"base"`, `True`→`"yaw"`, new option `"world"` (rays always in world frame).
- `raycast_dynamic_meshes_kernel` now takes `env_mask` (`wp.array(dtype=wp.bool)`) as its **first** input; the Python wrapper `raycast_dynamic_meshes` injects an all-True mask automatically.
- `RayCaster.meshes` cache is keyed by `(prim_path, device)` tuples, not `prim_path` alone.

## Custom Data Classes: TimestampedBufferWarp

Subclasses of Isaac Lab data classes must switch buffers:

```python
# 2.x: TimestampedBuffer(torch.zeros(num_envs, 3, device=device))
self._data.root_pos_w = TimestampedBufferWarp(shape=(num_envs,), device=device, wp_dtype=wp.vec3f)
```

## Deformables (summary)

Old soft-body API deprecated; two deformable types selected by material: **volume** (`PhysxDeformableBodyMaterialCfg` / `NewtonDeformableBodyMaterialCfg`) and **surface** (`PhysxSurfaceDeformableBodyMaterialCfg` / `NewtonSurfaceDeformableBodyMaterialCfg`). Public APIs (`DeformableObject`, `DeformableObjectCfg`, `DeformableObjectData`) stay in `isaaclab.assets`. For property-level changes, point the user at Isaac Lab's dedicated "Migration of Deformables" doc.

## Importers, Teleop, and Isaac Sim API Renames

For URDF/MJCF importer changes, XR teleoperation (OpenXR → Isaac Teleop), and deprecated Isaac Sim module paths (including the `omni.physics.tensors.impl` → `omni.physics.tensors.api` fix), read `references/importers-teleop-isaacsim.md`.

Quick error-to-fix map:
- `ModuleNotFoundError: No module named 'omni.physics.tensors.impl'` → change import to `import omni.physics.tensors.api as physx` (class identities unchanged).
- Deprecated `isaacsim.core.utils.stage/prims/queries` imports → use `isaaclab.sim.utils.*` equivalents.
- `SimulationManager` import failure → `from isaaclab_physx.physics import PhysxManager as SimulationManager` (or `NewtonManager` for Newton).

## Migration Workflow (when handed a 2.x codebase)

1. Fix imports: `SurfaceGripper` → `isaaclab_physx.assets`; `XformPrimView` → `FrameView`; `Imu` → `Pva` (if full state was used); teleop/Isaac Sim paths per reference file.
2. Convert quaternions WXYZ → XYZW (finder tool + runtime detector; remove `convert_quat` calls).
3. Append `.torch` to `.data.*` property reads used as tensors.
4. Replace removed `write_*_to_sim(data, env_ids)` calls with `write_*_to_sim_index(...)` (or `_mask`).
5. Rename `object_*` → `body_*` on RigidObjectCollection; `root_physx_view` → `root_view`.
6. Update schema cfg classes/fields (or accept deprecation warnings until 4.0).
7. Update CLI invocations (`--viz`, unified `train`/`play` entrypoints).
8. Run tests/sims; chase remaining DeprecationWarnings.

## Reference Files

- `references/api-renames.md` — complete rename tables: all RigidObjectCollection method/property renames, all write-method `_index`/`_mask` pairs, schema cfg class map, FrameView renames, Newton/MuJoCo cfg classes. Read when doing a mechanical bulk rename or verifying an exact name.
- `references/importers-teleop-isaacsim.md` — URDF importer 3.0 (deprecated settings, new CLI), MJCF importer (removed/new settings, nested rigid bodies caveat), XR teleop pipeline-builder migration, Isaac Sim deprecated module path table, Kit experience updates.
