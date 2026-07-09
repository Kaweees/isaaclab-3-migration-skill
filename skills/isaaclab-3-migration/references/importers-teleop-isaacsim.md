# Isaac Lab 3.0 — Importers, XR Teleop, and Isaac Sim API Migration

Contents:
1. URDF importer 3.0
2. MJCF importer
3. XR teleoperation: OpenXR → Isaac Teleop
4. Deprecated Isaac Sim module paths
5. Kit experience (`.kit`) updates
6. PhysX Tensors API module path

## 1. URDF Importer 3.0

Rewritten around the `urdf-usd-converter` library. The old C++ Kit-command API (`URDFParseFile`/`URDFImportRobot`, `acquire_urdf_interface()`) is replaced by a Python pipeline. The version pin to `isaacsim.asset.importer.urdf-2.4.31` is removed — the converter uses whatever version is installed.

**Deprecated `UrdfConverterCfg` settings** (kept for compat, log warnings):
- `convert_mimic_joints_to_normal_joints` — no longer supported
- `replace_cylinders_with_capsules` — no longer supported
- `root_link_name` — no longer supported
- `JointDriveCfg.NaturalFrequencyGainsCfg` gains mode — deprecated (its `compute_natural_stiffness` dependency was removed); gains are left at importer values. Use `PDGainsCfg` instead.
- `make_instanceable` (base class) — ignored; assets are instanceable by default.

**Still supported**: `merge_fixed_joints` — now a URDF XML pre-processing step run before USD conversion (fixed joints removed; child visual/collision/inertial merged into parent with correct transforms).

**Output path change**: `usd_file_name` is set automatically from the robot name; output lands at `{usd_dir}/{robot_name}/{robot_name}.usda` and cannot be overridden.

CLI:

```bash
# Before (2.x)
./isaaclab.sh -p scripts/tools/convert_urdf.py robot.urdf /output/dir/robot.usd --fix-base --merge-joints

# After (3.0) — output is a directory, filename is automatic
./isaaclab.sh -p scripts/tools/convert_urdf.py robot.urdf /output/dir \
  --fix-base --joint-stiffness 100.0 --joint-damping 1.0 --viz kit
# --merge-joints is still accepted (triggers the pre-processing step)
```

Python API:

```python
from isaaclab.sim.converters import UrdfConverter, UrdfConverterCfg

cfg = UrdfConverterCfg(
    asset_path="robot.urdf",
    usd_dir="/output/dir",
    # usd_file_name is determined automatically from the robot name
    fix_base=True,
    merge_fixed_joints=True,  # supported via pre-processing
    joint_drive=UrdfConverterCfg.JointDriveCfg(
        gains=UrdfConverterCfg.JointDriveCfg.PDGainsCfg(stiffness=None, damping=None),
    ),
)
```

## 2. MJCF Importer

Rewritten around `mujoco-usd-converter`; old Kit-command API (`MJCFCreateAsset`, `ImportConfig`) replaced by pure-Python `MJCFImporter`/`MJCFImporterConfig`.

**Important structural change**: the new importer produces USD with **nested rigid bodies** (`RigidBodyAPI` on each link prim) instead of a flat hierarchy with a single articulation root. Verify any code that traverses the USD structure of MJCF-imported assets handles nested rigid body prims.

**Removed `MjcfConverterCfg` settings** (now automatic from MJCF content):
- `fix_base` — inferred from the MJCF `<freejoint>` tag
- `link_density` — read from the MJCF model
- `import_inertia_tensor` — always imported
- `import_sites` — always imported
- `make_instanceable` — ignored

**New settings**: `merge_mesh` (merge meshes to optimize), `collision_from_visuals` (generate collision geometry from visuals), `collision_type` (`"default"`, `"Convex Hull"`, `"Convex Decomposition"`).

**Naming note**: Isaac Sim renamed `self_collision` to `allow_self_collision`, but `MjcfConverterCfg` keeps `self_collision` and maps it internally.

CLI:

```bash
# Before (2.x)
./isaaclab.sh -p scripts/tools/convert_mjcf.py h1.xml out/h1.usd --import-sites --make-instanceable

# After (3.0) — old flags (--fix-base, --make-instanceable, --import-sites) are gone
./isaaclab.sh -p scripts/tools/convert_mjcf.py h1.xml out/h1.usd --merge-mesh --self-collision --viz kit
# New flags: --merge-mesh, --collision-from-visuals, --collision-type, --self-collision
```

Python API:

```python
cfg = MjcfConverterCfg(
    asset_path="robot.xml",
    usd_dir="/output/dir",
    merge_mesh=True,
    collision_from_visuals=False,
    self_collision=False,
)
```

## 3. XR Teleoperation: OpenXR → Isaac Teleop

`isaaclab.devices.openxr` is deprecated, replaced by Isaac Teleop via the `isaaclab_teleop` extension. Install:

```bash
pip install isaacteleop~=1.0 --extra-index-url https://pypi.nvidia.com
```

Import map:

| Deprecated (2.x) | New (3.0) |
|---|---|
| `from isaaclab.devices.openxr import OpenXRDevice` | `from isaaclab_teleop import IsaacTeleopDevice` |
| `from isaaclab.devices.openxr import OpenXRDeviceCfg` | `from isaaclab_teleop import IsaacTeleopCfg` |
| `from isaaclab.devices.openxr import XrCfg` | `from isaaclab_teleop import XrCfg` |
| `from isaaclab.devices.openxr import ManusVive` | `IsaacTeleopDevice` with Manus plugin configured |
| `from isaaclab.devices import RetargeterBase` | Isaac Teleop `BaseRetargeter` + pipeline builder pattern |
| `from isaaclab.devices.openxr.retargeters import Se3AbsRetargeter` | `from isaacteleop.retargeters import Se3AbsRetargeter` |

Env config change: the `teleop_devices: DevicesCfg` field with `OpenXRDeviceCfg` is replaced by an `isaac_teleop: IsaacTeleopCfg` field with a **pipeline builder callable**. The builder wires source nodes (`ControllersSource`, `HandsSource`), retargeters (`Se3AbsRetargeter`, `GripperRetargeter`), a `TensorReorderer`, and returns an `OutputCombiner`. Set it in `__post_init__`:

```python
from isaaclab_teleop import IsaacTeleopCfg, XrCfg

@configclass
class MyEnvCfg(ManagerBasedRLEnvCfg):
    xr: XrCfg = XrCfg(anchor_pos=(0.0, 0.0, 0.0))

    def __post_init__(self):
        super().__post_init__()
        self.isaac_teleop = IsaacTeleopCfg(
            pipeline_builder=_build_pipeline,   # callable returning OutputCombiner
            sim_device=self.sim.device,
            xr_cfg=self.xr,
        )
```

A representative `_build_pipeline` connects `ControllersSource`/`HandsSource` through a `world_T_anchor` transform, an `Se3AbsRetargeter` for the end-effector pose, a `GripperRetargeter` for grip, then a `TensorReorderer` producing `[pos_x, pos_y, pos_z, quat_x, quat_y, quat_z, quat_w, gripper_value]`, combined via `OutputCombiner({"action": ...})`. See Isaac Lab's Isaac Teleop feature docs for the full example.

Backward compat: `OpenXRDevice`, `OpenXRDeviceCfg`, `ManusVive(Cfg)`, and the old retargeters still exist with `DeprecationWarning`s; deprecated retargeters moved to `isaaclab_teleop.deprecated.openxr.retargeters`. All will be removed in a future release.

## 4. Deprecated Isaac Sim Module Paths

Isaac Sim 6.0 deprecates `isaacsim.core.*`, `isaacsim.sensors.*`, and `isaacsim.robot.wheeled_robots` in favor of `*.experimental.*`. Isaac Lab's public API is unaffected; only direct Isaac Sim imports need updating. **Prefer the Isaac Lab in-tree replacement where one exists:**

| Deprecated Isaac Sim path | Recommended replacement |
|---|---|
| `isaacsim.core.utils.stage` | `isaaclab.sim.utils.stage` (`get_current_stage`, `create_new_stage`, `open_stage`, `save_stage`, `close_stage`, `clear_stage`, `update_stage`, `use_stage`) |
| `isaacsim.core.utils.prims` | `isaaclab.sim.utils.prims` (`create_prim`, `delete_prim`, `change_prim_property`, `bind_visual_material`, `bind_physics_material`, `add_usd_reference`) |
| `isaacsim.core.utils.queries` | `isaaclab.sim.utils.queries` (`find_matching_prims`, `find_matching_prim_paths`, `get_first_matching_child_prim`) |
| `isaacsim.core.utils.transforms` | `isaaclab.sim.utils.transforms` |
| `isaacsim.core.utils.semantics` | `isaaclab.sim.utils.semantics` |
| `isaacsim.core.utils.extensions.enable_extension` | `isaacsim.core.experimental.utils.app.enable_extension` |
| `isaacsim.core.utils.viewports.set_camera_view` | `isaacsim.core.rendering_manager.ViewportManager.set_camera_view` (or `omni.kit.viewport.utility.camera_state.ViewportCameraState`) |
| `isaacsim.core.prims.XFormPrim` / `XFormPrimView` | `isaaclab.sim.views.FrameView`; for `Articulation`/`RigidPrim` use `isaacsim.core.experimental.prims` |
| `isaacsim.core.simulation_manager.SimulationManager` | `isaaclab_physx.physics.PhysxManager` or `isaaclab_newton.physics.NewtonManager` |
| `isaacsim.core.cloner` | `isaaclab.cloner` |
| `isaacsim.replicator.mobility_gen` | `isaacsim.replicator.experimental.mobility_gen` |
| `isaacsim.sensors.<name>` | `isaacsim.sensors.experimental.<name>` |
| `isaacsim.robot.wheeled_robots` | `isaacsim.robot.experimental.wheeled_robots` (+ `.nodes` for OmniGraph nodes) |

Backend-symmetric local-alias pattern for `SimulationManager`:

```python
from isaaclab_physx.physics import PhysxManager as SimulationManager
# or, for the Newton backend
from isaaclab_newton.physics import NewtonManager as SimulationManager
```

Note: an earlier preview briefly exposed `isaaclab_physx.physics.SimulationManager` as a public alias — that alias is **removed**; use `PhysxManager` directly.

Retired standalone reproducers (`check_camera.py`, `check_floating_base_made_fixed.py`, `check_legged_robot_clone.py`, `check_rep_texture_randomizer.py`, `check_ref_count.py` under `source/isaaclab/test/deps/isaacsim`) are gone; use `isaaclab.sim` with the new experimental APIs.

## 5. Kit Experience (`.kit`) Updates

If maintaining a custom Kit experience derived from Isaac Lab's `apps/`:
- Remove the `extsDeprecated` extension search path entry (removed from all stock Isaac Lab experiences).
- Switch explicit Isaac Sim extension dependencies to the non-deprecated equivalents (`isaacsim.core.experimental.*`, `isaacsim.sensors.experimental.*`, `isaacsim.robot.experimental.wheeled_robots`).
- Remove unused extensions that pull in `isaacsim.core.api` — keeping them resurrects the deprecated stack.

## 6. PhysX Tensors API Module Path

The internal `impl` submodule of `omni.physics.tensors` was removed. Types (`ArticulationView`, `RigidBodyView`, `SimulationView`, ...) now live directly under `omni.physics.tensors.api`. Symptom: `ModuleNotFoundError: No module named 'omni.physics.tensors.impl'`.

```python
# Before
import omni.physics.tensors.impl.api as physx
# After
import omni.physics.tensors.api as physx
```

Class identities are unchanged — only the module path moved. Update type hints accordingly (`omni.physics.tensors.api.ArticulationView`).

## Need Help?

- IsaacLab GitHub Issues: https://github.com/isaac-sim/IsaacLab/issues
- CHANGELOG: https://github.com/isaac-sim/IsaacLab/blob/main/source/isaaclab/docs/CHANGELOG.rst
- Discord: https://discord.gg/nvidiaomniverse
