# Story 009: 进入“结束”、RoundResult 与进度结算

> **Epic**: round-flow（对局流程与时钟）
> **Status**: Ready
> **Layer**: Core
> **Type**: Logic
> **Estimate**: M
> **Manifest Version**: 2026-10-27
> **Last Updated**: (set by /dev-story)

## Context

**GDD**: `design/gdd/round-flow.md`
**Requirement**: `TR-round-flow-006`, `TR-round-flow-013`, `TR-round-flow-014`, `TR-round-flow-015`
*(Requirement text lives in `docs/architecture/tr-registry.yaml` — read fresh at review time)*

**ADR Governing Implementation**: ADR-0002: 主循环与对局时钟 · ADR-0004: 本机存档
**ADR Decision Summary**: 全页面只有一个 `requestAnimationFrame` 循环，每帧把 `dtReal` 和输入队列交给 `round.frame()`；一回之内的状态（`open`/`play`/`end`/`settle`）、`gameTime`、令牌集合、每帧五步加 ③b 和结算点都归 `round-flow`；`round` 自己按装配顺序建规则对象，`systems` 由装配根传入；种子用 `hash32`。
**ADR Version**: ADR-0002 2026-10-27 · ADR-0004 2026-10-27

**Engine**: none — native H5 (ADR-0001) | **Risk**: HIGH
**Engine Notes**: ADR-0002: 后台时 rAF 是否暂停、可见性事件是否到达、回来第一帧的 `dtReal` 多大均未在真机核实（ADR-0002 Verification Required）；规则层不依赖这些，隐式后台（`dtReal > BG_GAP_MS`）兜底。 ADR-0004: 本故事只测 round 对 `progress.settle` 的调用（假 `progress`），不碰存储；宿主是否持久保存未知。

**Control Manifest Rules (this layer)**:
- Required: 进入 `end` 时停钟、锁盘、立即调用一次 `progress.settle(RoundResult)`；`end → settle` 只由 `round.endingDone()` 触发
- Forbidden: 在 `round-flow.mjs` 里 import Feature 层模块（`progress` 从装配根传入）；引用页面/时间/存储
- Guardrail: 规则每帧 ≤ 2 ms

---

## Acceptance Criteria

*From GDD `design/gdd/round-flow.md`, scoped to this story:*

- [ ] **GIVEN** 敌将模式在二阶段输掉，**WHEN** 进入“结束”，**THEN** `RoundResult.bossPhase = 2`；粮草模式结束时 `bossPhase = null`。
- [ ] **GIVEN** 一回结束，**WHEN** 进入“结束”，**THEN** 同一帧交出 `RoundResult`，字段齐全、类型正确，赢时 `reason` 为 null，`metrics` 的形状与模式一致。

---

## Implementation Notes

*Derived from GDD 规则 8 与 ADR-0002 第 3 节“进入 end”、ADR-0004 第 3 节（按 chapterId + attempt 去重）：*

```
RoundResult { chapterId, mode: 'press'|'food'|'boss', win, reason: null|'破城'|'粮草断绝'|'城破',
  gameTimeMs (向下取整), maxCombo, attempt (从 1), loadout (1–3 个 id，槽位顺序),
  skillsUsed {generalId: int} (只含出阵武将), bossPhase: null|1|2 (敌将模式取结束时 pressure.hud().phase),
  metrics: {dangerMs} | {foodLeft, misses} | {heartsLost} }
```

round 把 `SettleOutcome` 存在 round 对象上（`settleOutcome()`、`result()`），一回只进入一次 `end`，所以只调用一次 `settle()`；去重在 progress-save 那边，round 这边开发版断言只进入一次 `end`、进入时令牌集合为空。`bossPhase` 只做记录和失败提示，不参与评星（ADR 未提，字段按 GDD）。`attempt`、`loadout`、`skillsUsed`（`skills`）、`maxCombo`（`effects`）、`metrics()`（`pressure`）全来自注入的假系统和 `createRound` 的参数。

*缺口：* `maxCombo`、`skillsUsed` 的读取接口名 GDD/ADR 只写“来自清除效果与连斩”“来自武将技能”，未定方法名，见 `_list.md` 的疑点。

---

## Out of Scope

*Handled by neighbouring stories — do not implement here:*

- Story 003: `end → settle` 与 `exit` 事件
- Story 005: 结算点何时触发
- Story 017: `loadout` 在点“开讲”时如何定下

---

## Files

- `src/rules/round-flow.mjs`（`enterEnd`、`result`、`settleOutcome`）
- `tests/helpers/round-fakes.mjs`（假 `progress.settle`）
- `tests/unit/round-flow/round-result-settle.test.mjs`

---

## QA Test Cases

*N/A — no qa-lead specs at this tier; implement against the Acceptance Criteria above*

## Test Evidence

**Story Type**: Logic
**Required evidence**:
- Logic: `tests/unit/round-flow/round-result-settle.test.mjs` — must exist and pass
- 所有协作系统（clear-effects、general-skills、battle-pressure、progress-save、view）尚未实现，测试一律用注入的假对象（`tests/helpers/round-fakes.mjs`），用假的 `dtReal` 逐帧驱动；固定种子，不碰时间/`Math.random`

**Status**: [ ] Not yet created

---

## Dependencies

- Depends on: `production/epics/round-flow/story-003-state-machine-exit-seed.md`, `production/epics/round-flow/story-008-outcome-reshuffle-settle-point.md`
- Unlocks: `production/epics/round-flow/story-012-return-to-catalog.md`, `production/epics/round-flow/story-017-start-fade-loadout.md`
