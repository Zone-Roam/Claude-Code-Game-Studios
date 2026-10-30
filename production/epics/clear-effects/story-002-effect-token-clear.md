# Story 002: 效果令牌 380 ms 与到点清除目标（含底牌）

> **Epic**: clear-effects（清除效果与连斩）
> **Status**: Ready
> **Layer**: Core
> **Type**: Logic
> **Estimate**: M
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

- [ ] **GIVEN** 盘上上层有 6 块营，**WHEN** 玩家消掉一对火，**THEN** 申请 `effect` 令牌 380 ms，期间 `gameTime` 不变、盘锁住；到点后 6 块营全部消失，盘面仍满足 I1。
- [ ] **GIVEN** 盘上上层 4 块营、底下压着 2 张营，**WHEN** 玩家消掉一对火，**THEN** 到点后上层和底下都没有营，`clear.pairs = 3`；被清掉的上层格底下若有别种牌，已翻上来。
- [ ] **GIVEN** 盘上营只剩 2 张底牌，**WHEN** 玩家消掉一对火，**THEN** 申请 `effect` 令牌，到点后两张底牌被清掉，`pairs = 1`，不显示“营已经没了”。
- [ ] **GIVEN** 赵云待命（压境或粮草模式），**WHEN** 强制消除一对马，**THEN** 所有弓（含底牌）被清掉，`combo` 加 1。

---

## Implementation Notes

*Derived from GDD rule 3, Edge Cases and ADR-0002:*

有目标（`count(目标) > 0`，含底牌）时申请 `effect` 令牌，时长 `EFFECT_HIGHLIGHT_MS` = 380 ms（数据文件），`detail` 里给目标格（上层格加压着目标底牌的格）供界面高亮。令牌**到点**（ADR-0002 的 `onEnd`）才调用 `board.clearKind(目标, 'effect')`，不早调；返回的 `clear`（`source:'effect'`，`pairs` 含底牌）交回对局流程转给战场压力，然后归还令牌。`clearKind` 返回 `{ok:false}`（I1 已破）时不发 `clear`。“盘锁住、`gameTime` 不变”是 round-flow 持令牌时的行为：本故事只断言申请了令牌，并用假 `tokens`/假 `gameTime` 验证本模块没有改动 `gameTime`。目标只剩底牌：仍申请令牌，`clear.cells` 为空、`buried` 为张数（Edge Cases 正式口径，不照切片只看上层）。切后台时令牌暂停由 round-flow 负责，本模块不处理计时。
赵云 `forced` 的 `match` 与普通 `match` 同样触发；这一对的 `combo + 1` 由 Story 004 提供，本故事用其查询断言。

---

## Out of Scope

*Handled by neighbouring stories — do not implement here:*

- Story 001: 无目标分支、不触发情形
- Story 003: 效果清除不影响伤害/粮/蓄力/连斩的约束
- Story 004: 连斩计数本身

---

## Files

- `src/rules/clear-effects.mjs`（令牌申请、`onEnd` 清除）
- `tests/unit/clear-effects/effect-token.test.mjs`

---

## QA Test Cases

*N/A — no qa-lead specs at this tier; implement against the Acceptance Criteria above*

## Test Evidence

**Story Type**: Logic
**Required evidence**:
- Logic: `tests/unit/clear-effects/effect-token.test.mjs` — must exist and pass

**Status**: [ ] Not yet created

---

## Dependencies

- Depends on: `production/epics/clear-effects/story-001-effect-table-trigger.md`, `production/epics/clear-effects/story-004-combo-count.md`, `production/epics/board-link/story-007-clear-kind.md`
- Unlocks: `production/epics/clear-effects/story-003-effect-clear-non-player.md`
