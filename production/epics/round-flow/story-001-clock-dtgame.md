# Story 001: 游戏时钟 dt_game 与对局骨架

> **Epic**: round-flow（对局流程与时钟）
> **Status**: Ready
> **Layer**: Core
> **Type**: Logic
> **Estimate**: M
> **Manifest Version**: 2026-10-27
> **Last Updated**: (set by /dev-story)

## Context

**GDD**: `design/gdd/round-flow.md`
**Requirement**: `TR-round-flow-001`
*(Requirement text lives in `docs/architecture/tr-registry.yaml` — read fresh at review time)*

**ADR Governing Implementation**: ADR-0002: 主循环与对局时钟
**ADR Decision Summary**: 全页面只有一个 `requestAnimationFrame` 循环，每帧把 `dtReal` 和输入队列交给 `round.frame()`；一回之内的状态（`open`/`play`/`end`/`settle`）、`gameTime`、令牌集合、每帧五步加 ③b 和结算点都归 `round-flow`；`round` 自己按装配顺序建规则对象，`systems` 由装配根传入；种子用 `hash32`。
**ADR Version**: 2026-10-27

**Engine**: none — native H5 (ADR-0001) | **Risk**: HIGH
**Engine Notes**: 后台时 rAF 是否暂停、可见性事件是否到达、回来第一帧的 `dtReal` 多大均未在真机核实（ADR-0002 Verification Required）；规则层不依赖这些，隐式后台（`dtReal > BG_GAP_MS`）兜底。

**Control Manifest Rules (this layer)**:
- Required: 时钟只在 `play` 推进；`gameTime` 对外是函数 `() => ms`；`round-flow.mjs` 不写缺省 `systems`，由调用方传入
- Forbidden: 在 `play` 以外推进 `gameTime`；用固定步长累积器；`round-flow.mjs` import Feature 层模块
- Guardrail: 规则每帧 ≤ 2 ms

---

## Acceptance Criteria

*From GDD `design/gdd/round-flow.md`, scoped to this story:*

- [ ] **GIVEN** 对局中且没有令牌，**WHEN** 喂入 60 帧、每帧 dtReal = 16.7，**THEN** `gameTime` 增加 1002 ± 1。
- [ ] **GIVEN** 对局中，**WHEN** 喂入一帧 dtReal = −5，**THEN** `gameTime` 不变。
- [ ] **GIVEN** 对局中，**WHEN** 喂入一帧 dtReal = 600，**THEN** `gameTime` 增加 250。

---

## Implementation Notes

*Derived from GDD 公式 dt_game 与 ADR-0002 第 3 节第 4 步：*

`dtGame = running ? clamp(dtReal, 0, MAX_STEP_MS) : 0`，`running = (state == play) AND (tokens == ∅) AND (dtReal ≤ BG_GAP_MS)`。输出范围 0 到 `MAX_STEP_MS`。默认 `MAX_STEP_MS = 250`、`BG_GAP_MS = 1000`（须大于 `MAX_STEP_MS`），写进 `src/core/constants.mjs`（目前只有 `RESHUFFLE_SHOW_MS`）；后面各故事需要的常量由各自故事补，测试一律经 `createRound({ constants })` 注入。夹取只在 round-flow 里做一次，`dtReal` 原样从 `main-loop` 传来。

本故事建 `createRound({ chapter, seed, constants, progress, systems })` 的骨架：`frame(dtReal, intents)`、`state()`、`gameTime()`、`systems()`，装配顺序按 ADR-0002 第 3 节（`createBoard` → ctx → `createPressure` → `createEffects`、`createSkills`，后两者用 `Object.assign({}, ctx, { pressure })`，不用对象展开）。**其余系统（clear-effects、general-skills、battle-pressure、progress-save、view）尚未实现，一律用注入的假工厂**，假工厂放新文件 `tests/helpers/round-fakes.mjs`（记录调用顺序的 call log，后续故事沿用并扩充）。测试里对局状态直接构造成 `play`（点“开讲”路径在 Story 017）。

*缺口（GDD 无 AC，ADR-0002 有要求）：`ctx.gameTime` 必须是函数而非值；装配顺序；`systems` 缺失时报错。请作者确认是否补 AC，否则只写装配顺序一条用例。*

---

## Out of Scope

*Handled by neighbouring stories — do not implement here:*

- Story 002: 令牌集合（有令牌时不推进的 AC 随令牌一起测）
- Story 003: `open`→`play`→`end`→`settle` 的转换
- Story 010: 隐式后台（dtReal > BG_GAP_MS 时申请 `background`）

---

## Files

- `src/rules/round-flow.mjs`（`createRound`、`frame` 骨架、`gameTime`）
- `src/core/constants.mjs`（`MAX_STEP_MS`、`BG_GAP_MS`）
- `tests/helpers/round-fakes.mjs`（假工厂与 call log）
- `tests/unit/round-flow/clock-dtgame.test.mjs`

---

## QA Test Cases

*N/A — no qa-lead specs at this tier; implement against the Acceptance Criteria above*

## Test Evidence

**Story Type**: Logic
**Required evidence**:
- Logic: `tests/unit/round-flow/clock-dtgame.test.mjs` — must exist and pass
- 所有协作系统（clear-effects、general-skills、battle-pressure、progress-save、view）尚未实现，测试一律用注入的假对象（`tests/helpers/round-fakes.mjs`），用假的 `dtReal` 逐帧驱动；固定种子，不碰时间/`Math.random`

**Status**: [ ] Not yet created

---

## Dependencies

- Depends on: None
- Unlocks: `production/epics/round-flow/story-002-token-set.md`, `production/epics/round-flow/story-003-state-machine-exit-seed.md`
