# Story 008: 结算点：先胜后负、洗牌与死局

> **Epic**: round-flow（对局流程与时钟）
> **Status**: Ready
> **Layer**: Core
> **Type**: Integration
> **Estimate**: M
> **Manifest Version**: 2026-10-27
> **Last Updated**: (set by /dev-story)

## Context

**GDD**: `design/gdd/round-flow.md`
**Requirement**: `TR-round-flow-006`, `TR-round-flow-016`
*(Requirement text lives in `docs/architecture/tr-registry.yaml` — read fresh at review time)*

**ADR Governing Implementation**: ADR-0002: 主循环与对局时钟
**ADR Decision Summary**: 全页面只有一个 `requestAnimationFrame` 循环，每帧把 `dtReal` 和输入队列交给 `round.frame()`；一回之内的状态（`open`/`play`/`end`/`settle`）、`gameTime`、令牌集合、每帧五步加 ③b 和结算点都归 `round-flow`；`round` 自己按装配顺序建规则对象，`systems` 由装配根传入；种子用 `hash32`。
**ADR Version**: 2026-10-27

**Engine**: none — native H5 (ADR-0001) | **Risk**: HIGH
**Engine Notes**: 后台时 rAF 是否暂停、可见性事件是否到达、回来第一帧的 `dtReal` 多大均未在真机核实（ADR-0002 Verification Required）；规则层不依赖这些，隐式后台（`dtReal > BG_GAP_MS`）兜底。

**Control Manifest Rules (this layer)**:
- Required: 结算点先 `pressure.outcome()`（先胜后负），分出胜负进 `end`，否则 `board.ensurePlayable()`，洗了牌申请 `reshuffle` 令牌；有任何令牌时不检查
- Forbidden: 让战场压力主动通知胜负；在 `play` 以外推进 `gameTime`
- Guardrail: 规则每帧 ≤ 2 ms

---

## Acceptance Criteria

*From GDD `design/gdd/round-flow.md`, scoped to this story:*

- [ ] **GIVEN** 一次消除后盘面成死局、其余令牌都已归还，**WHEN** 到结算点，**THEN** 先 `outcome()`；未分胜负则 `ensurePlayable()` 洗牌并持有 `reshuffle` 令牌 400 ms，期间点击丢弃；到点后再到结算点。
- [ ] **GIVEN** 敌将 hp 已为 0、盘上剩下的块正好是死局，**WHEN** 到结算点，**THEN** 直接判胜，不洗牌。
- [ ] **GIVEN** 战场压力的 `outcome()` 被打桩为同时满足胜负，**WHEN** 检查，**THEN** 结果为胜利。
- [ ] **GIVEN** 敌将模式 hearts = 1，**WHEN** 敌将出手，**THEN** 600 ms 内状态仍是“对局”，演出结束后的结算点进入“结束（败）”，`reason = '城破'`。

---

## Implementation Notes

*Derived from GDD 规则 6.5、6.6、7 与 ADR-0002 第 3 节第 5 步：*

结算点触发：令牌集合为空，且自上一个结算点以来有过点击结果、令牌到点、`tick` 里的下压/出手/换阶段，或盘面保底清除；本帧调用过 `tick` 也是结算点。`outcome()` 返回 `{result: 'win' | 'lose' | null, reason}`；“胜利优先”只靠 `outcome()` 先看胜利条件再看失败条件，round 只查询一次（AC 3 的桩由假 `pressure` 实现，即测 round 采用该返回值，不自己再判）。进入 `end` 时不会有令牌（开发版断言）。洗牌：`ensurePlayable()` 先改好数据、返回 `reshuffle`，round 据此申请 `reshuffle` 令牌（400 ms，`RESHUFFLE_SHOW_MS`）并 `emit`；到点后再到一次结算点。AC 4：`hostAttack` 令牌期间不检查胜负，心先在原位变虚线（美术圣经 R5）。`board.ensurePlayable()` 的真实实现已在 `src/rules/board-link.mjs`，本故事仍用假盘面测 round 的调用与令牌。

---

## Out of Scope

*Handled by neighbouring stories — do not implement here:*

- Story 005: 结算点三个触发位置与 ③b 跳过 ④/⑤
- Story 009: `end` 里的 `RoundResult` 与 `settle`

---

## Files

- `src/rules/round-flow.mjs`（`settlePoint` 的先胜后负、洗牌令牌）
- `tests/integration/round-flow/outcome-reshuffle-settle-point.test.mjs`

---

## QA Test Cases

*N/A — no qa-lead specs at this tier; implement against the Acceptance Criteria above*

## Test Evidence

**Story Type**: Integration
**Required evidence**:
- Integration: `tests/integration/round-flow/outcome-reshuffle-settle-point.test.mjs` — must exist and pass
- 所有协作系统（clear-effects、general-skills、battle-pressure、progress-save、view）尚未实现，测试一律用注入的假对象（`tests/helpers/round-fakes.mjs`），用假的 `dtReal` 逐帧驱动；固定种子，不碰时间/`Math.random`

**Status**: [ ] Not yet created

---

## Dependencies

- Depends on: `production/epics/round-flow/story-005-frame-steps-settle-points.md`
- Unlocks: `production/epics/round-flow/story-009-round-result-settle.md`
