# Story 004: 连斩计数（不连错、不读时钟）

> **Epic**: clear-effects（清除效果与连斩）
> **Status**: Ready
> **Layer**: Core
> **Type**: Logic
> **Estimate**: S
> **Manifest Version**: 2026-10-27
> **Last Updated**: (set by /dev-story)

## Context

**GDD**: `design/gdd/clear-effects.md`
**Requirement**: `TR-clear-effects-004`
*(Requirement text lives in `docs/architecture/tr-registry.yaml` — read fresh at review time)*

**ADR Governing Implementation**: ADR-0002: 主循环与对局时钟
**ADR Decision Summary**: `effect` 令牌到点由 `onEnd` 结算；令牌按申请顺序、前台真实时间计时；连斩不读时钟；装配时把 `pressure` 注入效果模块；`match`/`miss` 先给效果再给压力。
**ADR Version**: 2026-10-27

**Engine**: none — native H5 (ADR-0001) | **Risk**: LOW
**Engine Notes**: 纯数据、ES2017；`src/rules/clear-effects.mjs` 不碰 document/window/localStorage/Date.now()/Math.random()。round-flow（令牌）和 battle-pressure（`pressure.comboReward()`）尚未实现：测试用注入的假对象；装配时 ctx 加 `pressure` 用 `Object.assign`，不用对象展开。

**Control Manifest Rules (this layer)**:
- Required: 分发顺序 `match`/`miss` 先给清除效果、再武将技能、再战场压力、最后 `emit`；效果的 `clear` 先给 `pressure.onClear` 再 `emit`；令牌按前台真实时间计时
- Forbidden: 在结算顺序之外让规则模块互相调用通知；规则层引用页面/时间/随机/存储
- Guardrail: 规则每帧 ≤ 2 ms

---

## Acceptance Criteria

*From GDD `design/gdd/clear-effects.md`, scoped to this story:*

- [ ] **GIVEN** 玩家依次：消、消、消、连错、消，**WHEN** 计算，**THEN** combo 依次为 1、2、3、0、1，maxCombo = 3。
- [ ] **GIVEN** combo = 2，**WHEN** 玩家停 30 秒不动后再消一对，**THEN** combo = 3（不看时间）。
- [ ] **GIVEN** combo = 5，**WHEN** 一次连不上，**THEN** combo = 0，连斩字消失（`combo() < 2`）。
- [ ] **GIVEN** “再来一回”，**WHEN** 开局，**THEN** combo = 0、maxCombo = 0。

---

## Implementation Notes

*Derived from GDD rule 6, Formulas (combo_count) and ADR-0002:*

`match` 时 `combo = combo + 1`、`maxCombo = max(maxCombo, combo)`；`miss` 时 `combo = 0`；其他事件不变。赵云 `forced` 的 `match` 也加 1。范围 0–999，实现上封顶 999。模块**不读时钟**：`onMatch`/`onMiss` 不收时间参数，测试用两次相隔任意“时间”的调用证明结果相同。每次开局新建对象即归零（ADR-0002：每次开局都是新 round 对象，含“再来一回”），不留跨局状态。查询 `combo()`、`maxCombo()` 给界面和对局流程读（`maxCombo` 在一回结束时由对局流程读，规则 9）。

---

## Out of Scope

*Handled by neighbouring stories — do not implement here:*

- Story 005: 非 match/miss 事件不改变连斩；连斩字文本
- Story 006/007: 连斩奖励

---

## Files

- `src/rules/clear-effects.mjs`（`onMatch` 计数、`onMiss`、`combo`、`maxCombo`）
- `tests/unit/clear-effects/combo-count.test.mjs`

---

## QA Test Cases

*N/A — no qa-lead specs at this tier; implement against the Acceptance Criteria above*

## Test Evidence

**Story Type**: Logic
**Required evidence**:
- Logic: `tests/unit/clear-effects/combo-count.test.mjs` — must exist and pass

**Status**: [ ] Not yet created

---

## Dependencies

- Depends on: `production/epics/clear-effects/story-001-effect-table-trigger.md`, `production/epics/board-link/story-005-tap-match-reveal.md`
- Unlocks: `production/epics/clear-effects/story-002-effect-token-clear.md`, `production/epics/clear-effects/story-005-combo-neutral-events-label.md`, `production/epics/clear-effects/story-006-boss-pushback-reward.md`, `production/epics/clear-effects/story-007-press-delay-food-reward.md`
