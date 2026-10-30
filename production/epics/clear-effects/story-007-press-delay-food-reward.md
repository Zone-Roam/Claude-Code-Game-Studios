# Story 007: 压境推迟下压、粮草模式只喝彩

> **Epic**: clear-effects（清除效果与连斩）
> **Status**: Ready
> **Layer**: Core
> **Type**: Logic
> **Estimate**: S
> **Manifest Version**: 2026-10-27
> **Last Updated**: (set by /dev-story)

## Context

**GDD**: `design/gdd/clear-effects.md`
**Requirement**: `TR-clear-effects-???`（GDD 规则 8 的压境/粮草奖励无 active TR；TR-clear-effects-003 已被 005 取代，需要时由 /architecture-review 补登记）
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

- [ ] **GIVEN** 压境模式本段已推迟 2500 ms，**WHEN** 又一次三连斩以上的消除，**THEN** 只推迟 500 ms，本段累计 3000 ms；**WHEN** 下压发生，**THEN** 累计清零。
- [ ] **GIVEN** 粮草模式，**WHEN** 打出五连斩，**THEN** 粮数、规则都不变，只显示“五连斩”。

---

## Implementation Notes

*Derived from GDD rule 8, Formulas (press_delay) and ADR-0002:*

公式 `delay = min(PRESS_DELAY_MS, PRESS_DELAY_CAP_MS − comboDelay_w)`，`nextPush += delay`、`comboDelay_w += delay`（`combo ≥ COMBO_THRESHOLD` 且盘面还会被下压）；每次下压后 `comboDelay_w` 清零。常量：`PRESS_DELAY_MS`=1000（0–2000）、`PRESS_DELAY_CAP_MS`=3000（0–6000），放数据文件。例：两次下压之间打出 3、4、5、6 连斩 → 推迟 1000、1000、1000、0。与 Story 006 同口径：导出纯函数 `pressDelay(...)`，由压力的 `comboReward()` 在压境模式调用；`comboDelay_w`、`nextPush` 归战场压力。粮草模式：`comboReward()` 不影响规则，连斩字只由 `comboLabel`（Story 005）提供。测试用假 pressure。**待确认**：压境奖励在连斩改为不看时间后尚未在切片验证（GDD Open Questions），数值可能调整。

---

## Out of Scope

*Handled by neighbouring stories — do not implement here:*

- 战场压力: `comboReward()` 真实实现、`comboDelay_w` 持有
- Story 005: 连斩字文本
- Story 006: 敌将模式退步

---

## Files

- `src/rules/clear-effects.mjs`（`pressDelay`）
- 连斩常量数据文件（PRESS_DELAY_MS、PRESS_DELAY_CAP_MS）
- `tests/unit/clear-effects/press-delay.test.mjs`

---

## QA Test Cases

*N/A — no qa-lead specs at this tier; implement against the Acceptance Criteria above*

## Test Evidence

**Story Type**: Logic
**Required evidence**:
- Logic: `tests/unit/clear-effects/press-delay.test.mjs` — must exist and pass

**Status**: [ ] Not yet created

---

## Dependencies

- Depends on: `production/epics/clear-effects/story-004-combo-count.md`, `production/epics/clear-effects/story-006-boss-pushback-reward.md`
- Unlocks: None
