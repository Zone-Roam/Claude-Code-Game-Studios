# Story 003: 效果清除是“非玩家清除”

> **Epic**: clear-effects（清除效果与连斩）
> **Status**: Ready
> **Layer**: Core
> **Type**: Logic
> **Estimate**: S
> **Manifest Version**: 2026-10-27
> **Last Updated**: (set by /dev-story)

## Context

**GDD**: `design/gdd/clear-effects.md`
**Requirement**: `TR-clear-effects-002`
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

- [ ] **GIVEN** 敌将模式 hp = 12，**WHEN** 火烧掉上层 4 块营和底下 2 张营，**THEN** 敌将 hp 因效果减少 3（加上火这一对本身的 1，共减 4）。
- [ ] **GIVEN** 粮草模式 food = 8，**WHEN** 火烧掉 6 块营，**THEN** food 只因火这一对减 1，变为 7。
- [ ] **GIVEN** 火烧清掉 3 对营，**WHEN** 清除完成，**THEN** 所有武将的蓄力不变，敌将步数不因清除改变，`combo` 不变。

---

## Implementation Notes

*Derived from GDD rule 5:*

效果的 `clear` 带 `source:'effect'`，`pairs` 含底牌（4 块 + 2 张 → 3 对）。伤害、耗粮、蓄力、步数的数值由战场压力和武将技能按 `clear.source` 处理（二者尚未实现）。本故事只保证本模块：只发 `source:'effect'` 且 `pairs` 正确的 `clear`；不调用 `pressure.comboReward()`、不碰蓄力、不改 `combo`/`maxCombo`；不碎拒马。测试用假 `pressure`（记录 `onClear` 调用）验证。hp = 12 → 减 4、food 8 → 7 的最终数值要等战场压力实现后在其集成测试里补验。

---

## Out of Scope

*Handled by neighbouring stories — do not implement here:*

- 战场压力（battle-pressure 史诗）: 按 `source:'effect'` 计伤害/不耗粮/不推步数的实现与其测试
- Story 002: 令牌与清除本身

---

## Files

- `src/rules/clear-effects.mjs`（仅在需要时调整）
- `tests/unit/clear-effects/effect-clear-source.test.mjs`

---

## QA Test Cases

*N/A — no qa-lead specs at this tier; implement against the Acceptance Criteria above*

## Test Evidence

**Story Type**: Logic
**Required evidence**:
- Logic: `tests/unit/clear-effects/effect-clear-source.test.mjs` — must exist and pass
- hp/food 数值断言：待 battle-pressure 实现后补集成验证（本故事只验本模块输出）

**Status**: [ ] Not yet created

---

## Dependencies

- Depends on: `production/epics/clear-effects/story-002-effect-token-clear.md`
- Unlocks: None
