# Story 003: 一回的状态机、出口与种子

> **Epic**: round-flow（对局流程与时钟）
> **Status**: Ready
> **Layer**: Core
> **Type**: Logic
> **Estimate**: M
> **Manifest Version**: 2026-10-27
> **Last Updated**: (set by /dev-story)

## Context

**GDD**: `design/gdd/round-flow.md`
**Requirement**: `TR-round-flow-008`, `TR-round-flow-015`
*(Requirement text lives in `docs/architecture/tr-registry.yaml` — read fresh at review time)*

**ADR Governing Implementation**: ADR-0002: 主循环与对局时钟
**ADR Decision Summary**: 全页面只有一个 `requestAnimationFrame` 循环，每帧把 `dtReal` 和输入队列交给 `round.frame()`；一回之内的状态（`open`/`play`/`end`/`settle`）、`gameTime`、令牌集合、每帧五步加 ③b 和结算点都归 `round-flow`；`round` 自己按装配顺序建规则对象，`systems` 由装配根传入；种子用 `hash32`。
**ADR Version**: 2026-10-27

**Engine**: none — native H5 (ADR-0001) | **Risk**: HIGH
**Engine Notes**: 后台时 rAF 是否暂停、可见性事件是否到达、回来第一帧的 `dtReal` 多大均未在真机核实（ADR-0002 Verification Required）；规则层不依赖这些，隐式后台（`dtReal > BG_GAP_MS`）兜底。

**Control Manifest Rules (this layer)**:
- Required: `end → settle` 只由 `round.endingDone()` 触发；画面切换（新建 round）只在 `screens.mjs`；种子 `seed = hash32(chapterId, attempt, salt)`
- Forbidden: 在 `play` 以外推进 `gameTime`；`round-flow.mjs` 里读 `Math.random`、`Date.now`、网址参数（`salt` 由 `main.mjs` 取，规则层之外）
- Guardrail: 规则每帧 ≤ 2 ms

---

## Acceptance Criteria

*From GDD `design/gdd/round-flow.md`, scoped to this story:*

- [ ] **GIVEN** 胜利，**WHEN** 进入“结束”，**THEN** 界面在 2000 ms（`ENDING_WIN_MS`）后调用 `endingDone()`，之前状态一直是“结束”；失败时为 300 ms。
- [ ] **GIVEN** 网址参数 `seed=42`、同一回目第 1 次开局，**WHEN** 刷新页面后再第 1 次开局，**THEN** 两次 `seed` 相同；**WHEN** 点“再来一回”，**THEN** `attempt = 2`，`seed` 不同。
- [ ] **GIVEN** 最后一回胜利，**WHEN** 结算卡出现，**THEN** 只有“再来一回”和“书目”。

---

## Implementation Notes

*Derived from GDD 规则 1、8、12、13 与 ADR-0002 第 2、5 节：*

状态 `open`（子状态 `starting` 在 Story 017）/ `play` / `end` / `settle`，转换时 `emit` `state {from, to}`。`end` 内停钟、锁盘；`endingDone()` 把 `end` 变 `settle`，这是全项目唯一由界面计时推进的规则状态：界面用每帧 `dtReal` 累计前台时间，满 `ENDING_WIN_MS`（2000）/`ENDING_LOSE_MS`（300）才调用；round 只保证“不调用就一直是 `end`”（AC 1 的 2000/300 ms 本身是界面行为，round 测试只验这一点，常量登记在 `src/core/constants.mjs`）。`settle` 里的卡片按钮出 `exit {to: 'next' | 'retry' | 'catalog'}` 事件，`screens.mjs` 据此新建 round。本故事先用最小的“结算点判出胜负就进 `end`”桩（假 `pressure.outcome()`）进入 `end`；`RoundResult` 与 `settle` 调用在 Story 009，结算点完整逻辑在 Story 005、008。

`attempt` 存在 `screens.mjs` 会话内存、按回目 id 分开，每次新建 round 前加 1，不存档（“再来一回”、从书目重进都加）。`seed = hash32(chapterId, attempt, salt)`，`hash32` 已在 `src/core/rng.mjs`；`salt` 页面加载时随机，开发版和测试包读网址参数 `seed=N` 则 `salt = N`，正式包不读。主循环 `src/app/main-loop.mjs` 是唯一调用 `requestAnimationFrame` 的地方：先排下一帧，再 `round.frame(dtReal, inputQueue.takeAll())`，`view` 由外部注入（view 本身不属于本史诗）。

*缺口：* AC 3 的“只有两个按钮”是卡片内容（界面）；round-flow 能验证的只有“没有下一回时不接受 `next` 出口”，ADR 未写这条，见 `_list.md` 的疑点。

---

## Out of Scope

*Handled by neighbouring stories — do not implement here:*

- Story 009: `RoundResult` 与 `progress.settle`
- Story 016: 结算卡按钮的防连点
- Story 017: 开讲 `starting` 子状态与出阵武将

---

## Files

- `src/rules/round-flow.mjs`（`state`、`endingDone`、`exit` 事件）
- `src/app/screens.mjs`（`attempt` 计数、种子、`salt`）
- `src/app/main-loop.mjs`（帧驱动，薄壳）
- `src/core/constants.mjs`（`ENDING_WIN_MS`、`ENDING_LOSE_MS`）
- `tests/unit/round-flow/state-machine-exit-seed.test.mjs`

---

## QA Test Cases

*N/A — no qa-lead specs at this tier; implement against the Acceptance Criteria above*

## Test Evidence

**Story Type**: Logic
**Required evidence**:
- Logic: `tests/unit/round-flow/state-machine-exit-seed.test.mjs` — must exist and pass
- 所有协作系统（clear-effects、general-skills、battle-pressure、progress-save、view）尚未实现，测试一律用注入的假对象（`tests/helpers/round-fakes.mjs`），用假的 `dtReal` 逐帧驱动；固定种子，不碰时间/`Math.random`

**Status**: [ ] Not yet created

---

## Dependencies

- Depends on: `production/epics/round-flow/story-001-clock-dtgame.md`
- Unlocks: `production/epics/round-flow/story-005-frame-steps-settle-points.md`, `production/epics/round-flow/story-009-round-result-settle.md`, `production/epics/round-flow/story-010-background-hidden.md`, `production/epics/round-flow/story-016-overlay-card-guard.md`, `production/epics/round-flow/story-017-start-fade-loadout.md`
