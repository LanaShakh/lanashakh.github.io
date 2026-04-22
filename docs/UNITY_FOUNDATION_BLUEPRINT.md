# Unity Foundation Blueprint

This document specifies the minimum architecture needed to build a scalable game without future rewrites.

---

## 1) Layered Architecture

Use strict layers with one-way dependencies:

`Presentation -> Infrastructure -> Gameplay -> Core`

### Core (pure C#)
- No `MonoBehaviour`
- No Unity API
- Pure domain rules and state transitions
- Easy to unit test

### Gameplay
- Orchestrates game rules and feature flows
- Uses Core entities and services via interfaces
- Contains branch progression logic (`Autonomy` vs `Control`)

### Infrastructure
- Unity-specific adapters and technical services:
  - Save/load
  - Input mapping
  - Audio adapters
  - Addressables/resource loading
  - Event bus implementation

### Presentation
- Scenes, prefabs, UI, camera, VFX
- Reads and displays state from Gameplay/Core
- Must not contain business logic

---

## 2) Folder and Assembly Boundaries

Required directories:

```text
Assets/_Project/Core
Assets/_Project/Gameplay
Assets/_Project/Infrastructure
Assets/_Project/Presentation
Assets/_Project/Data
Assets/_Project/Scenes
Assets/_Project/Prefabs
Assets/_Project/UI
Assets/_Project/Tests
```

Create `asmdef` files:

- `Project.Core`
- `Project.Gameplay`
- `Project.Infrastructure`
- `Project.Presentation`

Dependency rules:

- `Core`: no project dependencies
- `Gameplay` -> `Core`
- `Infrastructure` -> `Gameplay`, `Core`
- `Presentation` -> `Infrastructure`, `Gameplay`, `Core`

Do not allow reverse references.

---

## 3) Canonical GameState

Keep all authoritative runtime state in one model.

Example sections:

- `TimeState`: day index, phase (morning/day/evening/night)
- `ThreatState`: city alert level, lockdown flags
- `BranchState`: `autonomyScore`, `controlScore`
- `QuestState`: active objectives, completion flags
- `DistrictState`: district access, district conditions
- `PlayerState`: resources, health/stress/energy, key inventory
- `WorldFlags`: irreversible choices and consequences

Rules:

- Scene objects do not own truth.
- Scene objects display, request, and react to state changes.

---

## 4) Data-Driven Configuration

Use `ScriptableObject` for configurable data:

- Device definitions (risk, utility, sabotage profile)
- Quest definitions (conditions, rewards, fail states)
- Event tables (daily incidents, escalation thresholds)
- Difficulty profiles
- NPC behavior presets

Benefits:

- Fast balancing without code edits
- Lower regression risk
- Designer-friendly iteration

---

## 5) Event-Driven Communication

Use typed domain events instead of direct object calls.

Typical events:

- `DayStarted`
- `NightStarted`
- `DeviceCompromised`
- `BranchScoreChanged`
- `QuestAdvanced`
- `DistrictLockedDown`
- `BossEncounterStarted`

Rules:

- Systems publish domain events.
- Subscribers react independently.
- Avoid bidirectional hard references.

---

## 6) Save System with Migrations

Save schema must include:

- `saveVersion`
- `timestamp`
- payload for canonical `GameState`

Mandatory behaviors:

1. Validate save payload before load.
2. Run migrations when `saveVersion` is old.
3. Keep at least two slots: `latest` and `backup`.
4. Autosave only at safe checkpoints.

Never ship without versioned saves.

---

## 7) Composition-First Gameplay Objects

Prefer small reusable components over deep inheritance.

Example component set:

- `Interactable`
- `Hackable`
- `Breakable`
- `PowerConsumer`
- `QuestTrigger`
- `LootSource`

A location-specific object is assembled from components and data, not special-case scripts.

---

## 8) Vertical Slice Contract

First milestone content:

- Apartment (safe/unsafe transitions)
- Street segment (resource and threat pressure)
- Appliance store (boss scenario)
- One day/night cycle
- Two strategic paths (`Autonomy` and `Control`)

Required systems for slice validity:

- Branch score updates
- Quest progression
- Save/load with migration-ready schema
- Event bus integration
- Win/lose criteria

---

## 9) Anti-Rewrite Guardrails

Do not allow:

- Giant `GameManager` classes
- Quest logic embedded in UI scripts
- Hardcoded scene object names in game rules
- Excessive `FindObjectOfType` usage
- System state hidden in MonoBehaviours only
- Non-versioned save format

If any appears, refactor immediately.

---

## 10) Foundation Build Order

Use this exact implementation sequence:

1. Project setup + folder/asmdef structure
2. `GameState` model + serialization contracts
3. Event bus + base domain events
4. Save/load service + version migrations
5. Bootstrap scene + service initialization
6. Day/night state machine
7. Branch progression (`Autonomy`/`Control`)
8. First quest chain
9. Boss encounter flow
10. Instrumentation and debug panel

Only after this: expand world content.

---

## 11) Definition of Architectural Success

Architecture is successful if:

- A new district can be introduced without modifying Core.
- A new quest branch reuses existing event/state primitives.
- Save file from v1 still loads after schema expansion.
- Rebalancing requires mostly data changes.
- Removing one mechanic does not collapse unrelated systems.

