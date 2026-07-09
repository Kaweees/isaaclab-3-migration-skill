# Isaac Lab 3.0 — Complete API Rename Tables

Contents:
1. Write method index/mask split (RigidObject / Articulation / RigidObjectCollection)
2. RigidObjectCollection method renames
3. RigidObjectCollectionData property renames
4. Schema configuration class map (2.x → 3.0)
5. Newton and MuJoCo cfg classes
6. FrameView renames
7. Ray caster `ray_alignment` values

## 1. Write Method Index/Mask Split

The old `write_*_to_sim(data, env_ids)` methods are **removed**. Each has two replacements:
- `write_*_to_sim_index(data, env_ids)` — partial data, shape `(len(env_ids), ...)`
- `write_*_to_sim_mask(data, env_mask)` — full data, shape `(num_envs, ...)`, `env_mask` is a boolean tensor

RigidObject / Articulation (root state):

| Removed (2.x) | New (3.0) |
|---|---|
| `write_root_pose_to_sim` | `write_root_pose_to_sim_index` / `write_root_pose_to_sim_mask` |
| `write_root_link_pose_to_sim` | `write_root_link_pose_to_sim_index` / `write_root_link_pose_to_sim_mask` |
| `write_root_com_pose_to_sim` | `write_root_com_pose_to_sim_index` / `write_root_com_pose_to_sim_mask` |
| `write_root_velocity_to_sim` | `write_root_velocity_to_sim_index` / `write_root_velocity_to_sim_mask` |
| `write_root_com_velocity_to_sim` | `write_root_com_velocity_to_sim_index` / `write_root_com_velocity_to_sim_mask` |
| `write_root_link_velocity_to_sim` | `write_root_link_velocity_to_sim_index` / `write_root_link_velocity_to_sim_mask` |

Articulation joint writers:

| Removed (2.x) | New (3.0) |
|---|---|
| `write_joint_position_to_sim` | `write_joint_position_to_sim_index` / `_mask` |
| `write_joint_velocity_to_sim` | `write_joint_velocity_to_sim_index` / `_mask` |
| `write_joint_stiffness_to_sim` | `write_joint_stiffness_to_sim_index` / `_mask` |
| `write_joint_damping_to_sim` | `write_joint_damping_to_sim_index` / `_mask` |
| `write_joint_position_limit_to_sim` | `write_joint_position_limit_to_sim_index` / `_mask` |
| `write_joint_velocity_limit_to_sim` | `write_joint_velocity_limit_to_sim_index` / `_mask` |
| `write_joint_effort_limit_to_sim` | `write_joint_effort_limit_to_sim_index` / `_mask` |
| `write_joint_armature_to_sim` | `write_joint_armature_to_sim_index` / `_mask` |
| `write_joint_friction_coefficient_to_sim` | `write_joint_friction_coefficient_to_sim_index` / `_mask` |

RigidObjectCollection (after the object_→body_ rename below):

| Removed (2.x-era name) | New (3.0) |
|---|---|
| `write_body_pose_to_sim` | `write_body_pose_to_sim_index` / `_mask` |
| `write_body_link_pose_to_sim` | `write_body_link_pose_to_sim_index` / `_mask` |
| `write_body_com_pose_to_sim` | `write_body_com_pose_to_sim_index` / `_mask` |
| `write_body_velocity_to_sim` | `write_body_velocity_to_sim_index` / `_mask` |
| `write_body_com_velocity_to_sim` | `write_body_com_velocity_to_sim_index` / `_mask` |
| `write_body_link_velocity_to_sim` | `write_body_link_velocity_to_sim_index` / `_mask` |

Example:

```python
# Before (2.x)
robot.write_root_pose_to_sim(pose_data, env_ids)

# After (3.0) — indexed variant (partial data)
robot.write_root_pose_to_sim_index(root_pose=pose_data, env_ids=env_ids)

# After (3.0) — mask variant (full data, boolean mask)
robot.write_root_pose_to_sim_mask(root_pose=pose_data, env_mask=env_mask)
```

## 2. RigidObjectCollection Method Renames (`object_*` → `body_*`)

Old methods are deprecated (warn, removed in a future release):

| Deprecated (2.x) | New (3.0) |
|---|---|
| `write_object_state_to_sim()` | `write_body_state_to_sim()` |
| `write_object_link_state_to_sim()` | `write_body_link_state_to_sim()` |
| `write_object_pose_to_sim()` | `write_body_pose_to_sim()` |
| `write_object_link_pose_to_sim()` | `write_body_link_pose_to_sim()` |
| `write_object_com_pose_to_sim()` | `write_body_com_pose_to_sim()` |
| `write_object_velocity_to_sim()` | `write_body_com_velocity_to_sim()` |
| `write_object_com_velocity_to_sim()` | `write_body_com_velocity_to_sim()` |
| `write_object_link_velocity_to_sim()` | `write_body_link_velocity_to_sim()` |
| `find_objects()` | `find_bodies()` |

Note the keyword change too: `object_ids=` becomes `body_ids=`, e.g.
`collection.write_body_state_to_sim(state, env_ids=env_ids, body_ids=object_ids)`.

## 3. RigidObjectCollectionData Property Renames

| Deprecated (2.x) | New (3.0) |
|---|---|
| `default_object_state` | `default_body_state` |
| `object_names` | `body_names` |
| `object_link_pose_w` | `body_link_pose_w` |
| `object_link_vel_w` | `body_link_vel_w` |
| `object_com_pose_w` | `body_com_pose_w` |
| `object_com_vel_w` | `body_com_vel_w` |
| `object_state_w` | `body_state_w` |
| `object_link_state_w` | `body_link_state_w` |
| `object_com_state_w` | `body_com_state_w` |
| `object_com_acc_w` | `body_com_acc_w` |
| `object_com_pose_b` | `body_com_pose_b` |
| `object_link_pos_w` | `body_link_pos_w` |
| `object_link_quat_w` | `body_link_quat_w` |
| `object_link_lin_vel_w` | `body_link_lin_vel_w` |
| `object_link_ang_vel_w` | `body_link_ang_vel_w` |
| `object_com_pos_w` | `body_com_pos_w` |
| `object_com_quat_w` | `body_com_quat_w` |
| `object_com_lin_vel_w` | `body_com_lin_vel_w` |
| `object_com_ang_vel_w` | `body_com_ang_vel_w` |
| `object_com_lin_acc_w` | `body_com_lin_acc_w` |
| `object_com_ang_acc_w` | `body_com_ang_acc_w` |
| `object_com_pos_b` | `body_com_pos_b` |
| `object_com_quat_b` | `body_com_quat_b` |
| `object_link_lin_vel_b` | `body_link_lin_vel_b` |
| `object_link_ang_vel_b` | `body_link_ang_vel_b` |
| `object_com_lin_vel_b` | `body_com_lin_vel_b` |
| `object_com_ang_vel_b` | `body_com_ang_vel_b` |
| `object_pose_w` | `body_pose_w` |
| `object_pos_w` | `body_pos_w` |
| `object_quat_w` | `body_quat_w` |
| `object_vel_w` | `body_vel_w` |
| `object_lin_vel_w` | `body_lin_vel_w` |
| `object_ang_vel_w` | `body_ang_vel_w` |
| `object_lin_vel_b` | `body_lin_vel_b` |
| `object_ang_vel_b` | `body_ang_vel_b` |
| `object_acc_w` | `body_acc_w` |
| `object_lin_acc_w` | `body_lin_acc_w` |
| `object_ang_acc_w` | `body_ang_acc_w` |

Bulk-rename rule: on `RigidObjectCollection` and its data class, replace the `object_` prefix with `body_` (and `default_object_state` → `default_body_state`). Do NOT apply this rename to other classes.

## 4. Schema Configuration Class Map

2.x names remain as deprecated aliases (removed in 4.0). Base classes hold solver-common fields; `Physx*` subclasses hold PhysX-specific knobs.

| Isaac Lab 2.x | Isaac Lab 3.0 |
|---|---|
| `RigidBodyPropertiesCfg` | `isaaclab.sim.schemas.RigidBodyBaseCfg` + `isaaclab_physx.sim.schemas.PhysxRigidBodyPropertiesCfg` |
| `JointDrivePropertiesCfg` | `JointDriveBaseCfg` + `PhysxJointDrivePropertiesCfg` |
| `CollisionPropertiesCfg` | `CollisionBaseCfg` + `PhysxCollisionPropertiesCfg` |
| `ArticulationRootPropertiesCfg` | `ArticulationRootBaseCfg` + `PhysxArticulationRootPropertiesCfg` |
| `RigidBodyMaterialCfg` | `RigidBodyMaterialBaseCfg` + `PhysxRigidBodyMaterialCfg` |
| `MeshCollisionPropertiesCfg` family (`ConvexHullPropertiesCfg`, `ConvexDecompositionPropertiesCfg`, `TriangleMeshPropertiesCfg`, `TriangleMeshSimplificationPropertiesCfg`, `SDFMeshPropertiesCfg`) | `MeshCollisionBaseCfg` + `Physx*PropertiesCfg` family in `isaaclab_physx.sim.schemas` |
| `FixedTendonPropertiesCfg`, `SpatialTendonPropertiesCfg` | `PhysxFixedTendonPropertiesCfg`, `PhysxSpatialTendonPropertiesCfg` |

Field renames on `JointDriveBaseCfg` (deprecated aliases forwarded in `__post_init__`; if both old and new are set, the new field silently wins):

| 2.x field | 3.0 field | USD attribute (unchanged) |
|---|---|---|
| `max_velocity` | `max_joint_velocity` | `physxJoint:maxJointVelocity` |
| `max_effort` | `max_force` | `drive:<axis>:physics:maxForce` |

## 5. Newton and MuJoCo Cfg Classes (`isaaclab_newton.sim.schemas`)

| Class | Use case |
|---|---|
| `NewtonCollisionPropertiesCfg` | `newton:contactMargin` / `newton:contactGap` via `NewtonCollisionAPI` |
| `NewtonMeshCollisionPropertiesCfg` | `newton:maxHullVertices` via `NewtonMeshCollisionAPI` |
| `NewtonMaterialPropertiesCfg` | `newton:torsionalFriction` / `newton:rollingFriction` via `NewtonMaterialAPI` |
| `NewtonArticulationRootPropertiesCfg` | `newton:selfCollisionEnabled` via `NewtonArticulationRootAPI` |
| `MujocoRigidBodyPropertiesCfg` | `mjc:gravcomp` (body-level gravity compensation, MuJoCo solver only) |
| `MujocoJointDrivePropertiesCfg` | `mjc:actuatorgravcomp` via `MjcJointAPI` (joint-level routing) |

MuJoCo cfgs subclass their Newton parents (MuJoCo is one of Newton's solvers). Spawners auto-enable body-level `gravcomp` when joint-level `actuatorgravcomp=True` is requested but no MuJoCo rigid-body cfg is provided (otherwise `actuatorgravcomp` would be a no-op). Override by passing an explicit `MujocoRigidBodyPropertiesCfg` in `rigid_props`.

## 6. FrameView Renames (`isaaclab.sim.views`)

Old names are deprecated aliases:

| Isaac Lab 2.x | Isaac Lab 3.0 |
|---|---|
| `BaseXformPrimView` | `BaseFrameView` |
| `UsdXformPrimView` | `UsdFrameView` |
| `XformPrimView` | `FrameView` |
| `FabricXformPrimView` | `FabricFrameView` |
| `NewtonSiteXformPrimView` | `NewtonSiteFrameView` |

`FrameView` is a factory that dispatches to `FabricFrameView` (PhysX) or `NewtonSiteFrameView` (Newton) based on the active backend.

## 7. Ray Caster `ray_alignment` Values

`attach_yaw_only` (bool) on `RayCasterCfg` is deprecated in favor of `ray_alignment`:

| Old (2.x) | New (3.0) | Behavior |
|---|---|---|
| `attach_yaw_only=False` | `ray_alignment="base"` | Rays follow the full sensor orientation |
| `attach_yaw_only=True` | `ray_alignment="yaw"` | Rays follow only the yaw component |
| (not available) | `ray_alignment="world"` | Rays always cast in world frame (no rotation) |

