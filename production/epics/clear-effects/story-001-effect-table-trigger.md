# Story 001: 效果兵表、触发判定与“目标已没了”

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

- [ ] **GIVEN** 盘上（含底牌）没有城，**WHEN** 玩家消掉一对水，**THEN** 这一对水消掉，喊字位显示“城已经没了”（`targetGone {kind:'cheng'}`），不申请令牌。
- [ ] **GIVEN** 诸葛亮的技能清掉了全部火，**WHEN** 清除完成，**THEN** 营不受影响（效果不连锁）。
- [ ] **GIVEN** 关羽斩一排斩到一对马，**WHEN** 清除完成，**THEN** 弓不受影响，`combo` 不变。

---

## Implementation Notes

*Derived from GDD rules 1–4 and ADR-0002/0003:*

数据表（规则 1）：火 `huo`→营 `ying`（火烧连营）、马 `ma`→弓 `gong`（铁骑冲阵）、水 `shui`→城 `cheng`（水淹七军），放数据文件，不写死在逻辑里。只有 `match`（含赵云 `forced` 一对）是效果兵时触发（规则 2）；`clear` 事件（技能、效果、保底）一律不触发，所以模块对 `clear` 没有处理入口。`board.count(目标)`（含底牌）为 0 时：不申请令牌、不锁盘，返回 `targetGone {kind}`（目标种类，界面取“{目标}已经没了”）。模块创建：`createEffects(ctx)`，`ctx.board`、`ctx.tokens`、`ctx.pressure` 由装配传入；`onMatch(ev)` 的返回形状由实现定，须带 ADR-0003 的字段名。有目标时申请令牌的部分在 Story 002。

---

## Out of Scope

*Handled by neighbouring stories — do not implement here:*

- Story 002: 有目标时申请 `effect` 令牌、到点 `clearKind`
- Story 004: 连斩计数器（本故事的 `combo` 不变断言用 Story 004 的查询）

---

## Files

- `src/rules/clear-effects.mjs`（新建：`createEffects`、效果表、`onMatch` 触发判定）
- 效果表数据文件（路径按项目数据目录约定）
- `tests/unit/clear-effects/trigger.test.mjs`

---

## QA Test Cases

*N/A — no qa-lead specs at this tier; implement against the Acceptance Criteria above*

## Test Evidence

**Story Type**: Logic
**Required evidence**:
- Logic: `tests/unit/clear-effects/trigger.test.mjs` — must exist and pass

**Status**: [ ] Not yet created

---

## Dependencies

- Depends on: `production/epics/board-link/story-005-tap-match-reveal.md`, `production/epics/board-link/story-006-force-next-lock.md`
- Unlocks: `production/epics/clear-effects/story-002-effect-token-clear.md`, `production/epics/clear-effects/story-004-combo-count.md`
