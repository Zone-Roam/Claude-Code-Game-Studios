# Story 005: 帧步骤、就地结算点与 ③b

> **Epic**: round-flow（对局流程与时钟）
> **Status**: Ready
> **Layer**: Core
> **Type**: Integration
> **Estimate**: L
> **Manifest Version**: 2026-10-27
> **Last Updated**: (set by /dev-story)

## Context

**GDD**: `design/gdd/round-flow.md`
**Requirement**: `TR-round-flow-004`, `TR-round-flow-016`
*(Requirement text lives in `docs/architecture/tr-registry.yaml` — read fresh at review time)*

**ADR Governing Implementation**: ADR-0002: 主循环与对局时钟
**ADR Decision Summary**: 全页面只有一个 `requestAnimationFrame` 循环，每帧把 `dtReal` 和输入队列交给 `round.frame()`；一回之内的状态（`open`/`play`/`end`/`settle`）、`gameTime`、令牌集合、每帧五步加 ③b 和结算点都归 `round-flow`；`round` 自己按装配顺序建规则对象，`systems` 由装配根传入；种子用 `hash32`。
**ADR Version**: 2026-10-27

**Engine**: none — native H5 (ADR-0001) | **Risk**: HIGH
**Engine Notes**: 后台时 rAF 是否暂停、可见性事件是否到达、回来第一帧的 `dtReal` 多大均未在真机核实（ADR-0002 Verification Required）；规则层不依赖这些，隐式后台（`dtReal > BG_GAP_MS`）兜底。

**Control Manifest Rules (this layer)**:
- Required: 每帧 ① 隐式后台 → ② 点击 → ③ 令牌计时 → ③b → ④ `tick`（`dtGame > 0` 才调）→ ⑤ 结算点；每次点击后令牌仍为空就地做结算点
- Forbidden: 在 `play` 以外推进 `gameTime`；结算顺序之外让规则模块互相调用通知
- Guardrail: 规则每帧 ≤ 2 ms

---

## Acceptance Criteria

*From GDD `design/gdd/round-flow.md`, scoped to this story:*

- [ ] **GIVEN** 敌将模式、hearts 从 1 被这一次出手打到 0（`hostAttack` 令牌 600 ms 进行中，剩最后一帧）、盘上有一对可连的块，**WHEN** 令牌到点的那一帧里先到一次点这一对的点击，**THEN** 点击被丢弃（`match` 未被调用），本帧结算点进入“结束（败）”，`reason = '城破'`，`metrics.heartsLost` 含这一颗。
- [ ] **GIVEN** 敌将 hp > 0、步数已走满、盘上只剩一类 `effect` 目标且清完即空盘，**WHEN** 点出该效果、`effect` 令牌到点，**THEN** 同一帧（帧步骤 ③b）不调用 `tick`，`outcome()` 判胜，敌将未出手、盘面没有补兵。
- [ ] **GIVEN** 持有任何令牌，**WHEN** 一帧过去，**THEN** 没有调用 `tick`。
- [ ] **GIVEN** 粮草模式 food = 1、盘上还有几对，**WHEN** 卡顿的一帧里先到一次“连不上”、再到一次能清空盘面的消除，**THEN** 第一次点击后就地结算判“粮草断绝”，第二次点击被丢弃。

---

## Implementation Notes

*Derived from GDD 规则 6.5–6.7 与 ADR-0002 第 3 节（含 2026-10-30 补的 3b）：*

结算点有三个触发位置：每处理完一次点击且令牌仍为空；**③b**——第 ③ 步里令牌因到点或强制归还而使集合变空、且有结果交回（`dispatch`）时，先 `outcome()`，分出胜负就进 `end` 并**跳过 ④ 和 ⑤**，没分出则 `ensurePlayable()`，洗了牌就申请 `reshuffle` 令牌并跳过 ④；集合仍不为空则不做；第 ⑤ 步——本帧调用过 `tick` 之后。第 ④ 步：集合为空且状态为 `play` 才算 `dtGame > 0` 并调用 `pressure.tick(dtGame)`。状态已不是 `play` 后，本帧后面的点击因状态改变而丢弃；洗牌后后面的点击因“此刻”有令牌而丢弃。

本故事让结算点只做“`outcome()` 分出胜负就进 `end`”和调用 `ensurePlayable()`；先胜后负、洗牌令牌、`hp` 为 0 的死局等细节的专门用例在 Story 008。所有协作系统（`pressure.tick/outcome/onMatch`、`board.tap/ensurePlayable`）用假对象，在 `tests/helpers/round-fakes.mjs` 里加“可编排的 `outcome` 序列”与“`tick` 调用计数”。控制清单要求五步顺序有集成测试，用假的 `dtReal` 逐帧驱动。

---

## Out of Scope

*Handled by neighbouring stories — do not implement here:*

- Story 006: `match`/`miss` 的通知顺序与分发表
- Story 007: `tick` 里的下压、出手、换阶段
- Story 008: 结算点的先胜后负、洗牌、死局用例
- Story 009: `RoundResult` 的字段与 `settle` 调用（本故事只验 `reason`、`metrics`）
- Story 010: 第 ① 步隐式后台

---

## Files

- `src/rules/round-flow.mjs`（`frame` 五步加 ③b、`settlePoint`）
- `tests/helpers/round-fakes.mjs`（可编排的假 `pressure`/`board`）
- `tests/integration/round-flow/frame-steps-settle-points.test.mjs`

---

## QA Test Cases

*N/A — no qa-lead specs at this tier; implement against the Acceptance Criteria above*

## Test Evidence

**Story Type**: Integration
**Required evidence**:
- Integration: `tests/integration/round-flow/frame-steps-settle-points.test.mjs` — must exist and pass
- 所有协作系统（clear-effects、general-skills、battle-pressure、progress-save、view）尚未实现，测试一律用注入的假对象（`tests/helpers/round-fakes.mjs`），用假的 `dtReal` 逐帧驱动；固定种子，不碰时间/`Math.random`

**Status**: [ ] Not yet created

---

## Dependencies

- Depends on: `production/epics/round-flow/story-002-token-set.md`, `production/epics/round-flow/story-003-state-machine-exit-seed.md`, `production/epics/round-flow/story-004-board-lock-discard.md`
- Unlocks: `production/epics/round-flow/story-006-notify-order-dispatch.md`, `production/epics/round-flow/story-007-pressure-tick-push-phase.md`, `production/epics/round-flow/story-008-outcome-reshuffle-settle-point.md`
