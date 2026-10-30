# Story 005: 技能/敌将出手不改连斩，与连斩字文本

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

- [ ] **GIVEN** combo = 4，**WHEN** 玩家放出诸葛亮（清掉 4 对）、再消一对，**THEN** combo = 5。
- [ ] **GIVEN** combo = 3，**WHEN** 敌将出手（普通、特技或被挡），**THEN** combo 仍为 3。
- [ ] **GIVEN** combo 从 12 变为 13，**WHEN** 显示，**THEN** 连斩字为“连斩不断”（二到十二为“N连斩”汉字，如五连斩；`combo < 2` 不显示）。

---

## Implementation Notes

*Derived from GDD rules 6–7 and Edge Cases:*

既不加也不断连斩的事件：效果清除、技能清除（关羽斩一排和补斩、诸葛亮清兵）、释放技能本身、关羽选排和取消、死局洗牌、敌将出手（含特技、增兵、二阶段切换）、点空格取消、换选中。实现上模块只对 `match`/`miss` 有入口，测试断言对 `clear`、`hostAttack`、`reshuffle`、`state` 等事件调用后 `combo()` 不变。连斩字文本（规则 7）：提供纯函数 `comboLabel(combo)` 返回“二连斩”…“十二连斩”/“连斩不断”/空；位置“盘上第二块上方一格”归界面。**待确认**：文本归本模块还是界面史诗（GDD 规则 7 写“本系统提供状态”）；若归界面，本故事只保留前两条 AC，第三条改在界面史诗验证。

---

## Out of Scope

*Handled by neighbouring stories — do not implement here:*

- Story 004: 计数本身
- 界面史诗: 连斩字的位置、朱色连线、动画

---

## Files

- `src/rules/clear-effects.mjs`（`comboLabel`）
- `tests/unit/clear-effects/combo-neutral-label.test.mjs`

---

## QA Test Cases

*N/A — no qa-lead specs at this tier; implement against the Acceptance Criteria above*

## Test Evidence

**Story Type**: Logic
**Required evidence**:
- Logic: `tests/unit/clear-effects/combo-neutral-label.test.mjs` — must exist and pass

**Status**: [ ] Not yet created

---

## Dependencies

- Depends on: `production/epics/clear-effects/story-004-combo-count.md`
- Unlocks: None
