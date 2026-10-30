# Story 006: 敌将模式连斩退步（comboReward）

> **Epic**: clear-effects（清除效果与连斩）
> **Status**: Ready
> **Layer**: Core
> **Type**: Logic
> **Estimate**: M
> **Manifest Version**: 2026-10-27
> **Last Updated**: (set by /dev-story)

## Context

**GDD**: `design/gdd/clear-effects.md`
**Requirement**: `TR-clear-effects-005`
*(Requirement text lives in `docs/architecture/tr-registry.yaml` — read fresh at review time)*

**ADR Governing Implementation**: ADR-0003: 规则层与界面层的通道
**ADR Decision Summary**: 事件名为契约（只追加）：`comboPushback {cut}` 由战场压力在 `comboReward()` 退步 `cut > 0` 时发，`cut` 为 0 不发；`targetGone {kind}`；`clear {source, kind?, cells, buried, revealed, pairs}`；规则层只返回数据，界面只读查询（`effects.combo()`）。
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

- [ ] **GIVEN** 敌将模式一阶段 steps = 5、本轮未退过，**WHEN** 打出第 3、4、5 连斩，**THEN** 每次消除后的 steps 依次为 5、5、6（前两次 `comboReward()` 各返回 1 并显示“压住一步”，第三次返回 0）。
- [ ] **GIVEN** 敌将模式 steps = 0，**WHEN** 第 3 连斩，**THEN** `comboReward()` 返回 0，不显示“压住一步”，这一对后 steps = 1。
- [ ] **GIVEN** 本轮已退 2 步，**WHEN** 敌将出手，**THEN** `pushedSinceAttack = 0`、steps = 0；**WHEN** steps 回到 1 以上后再打出三连斩以上，**THEN** `comboReward()` 返回 1。
- [ ] **GIVEN** 敌将模式 combo 将变为 2，**WHEN** 消除，**THEN** 不调用 `comboReward()`。

---

## Implementation Notes

*Derived from GDD rule 8, Formulas (boss_pushback) and ADR-0003:*

`combo ≥ COMBO_THRESHOLD`（默认 3）时，每次 `match` 本模块调用一次 `ctx.pressure.comboReward()`，先于压力自己的 `match` 处理，所以三连斩起那一对“先退 1 步、再因这一对涨 1 步”，净不涨；steps 为 0 退不了，照涨 1（用户 2026-10-30 决定）。公式 `cut = min(COMBO_PUSHBACK, COMBO_PUSHBACK_CAP − pushedSinceAttack, steps)`，`cut > 0` 时 `steps' = steps − cut`、`pushedSinceAttack += cut`；出手或换阶段 `pushedSinceAttack = 0`。常量放数据文件：`COMBO_THRESHOLD`=3（2–5）、`COMBO_PUSHBACK`=1（1–2）、`COMBO_PUSHBACK_CAP`=2（1–4）。数值归本系统，`pushedSinceAttack` 与 `comboReward()` 的实现归战场压力；本故事导出纯函数 `pushbackCut(...)` 作为公式的唯一实现供压力调用，并写测试。`cut > 0` 时由压力发 `comboPushback {cut}`（`cut` 为 0 不发；`interrupt` 已作废，不得再发）。张飞震慑中仍可退步，退到 0 为止。battle-pressure 尚不存在：测试用假 pressure（其 `comboReward` 调 `pushbackCut` 并维护 steps/pushedSinceAttack），断言调用次数、返回值、steps 序列。**待确认**：公式函数放本模块、由压力调用，是否与 battle-pressure 设计一致（GDD 只说“数值归本系统”）；ADR-0003 对 TR-005 标为“部分”，待下次 /architecture-review 复核。

---

## Out of Scope

*Handled by neighbouring stories — do not implement here:*

- 战场压力（battle-pressure 史诗）: `comboReward()` 真实实现、`pushedSinceAttack` 持有与清零、发 `comboPushback`
- 界面史诗: “压住一步”朱色斩痕
- Story 007: 压境、粮草模式

---

## Files

- `src/rules/clear-effects.mjs`（调用 `comboReward`、`pushbackCut`）
- 连斩常量数据文件
- `tests/unit/clear-effects/boss-pushback.test.mjs`

---

## QA Test Cases

*N/A — no qa-lead specs at this tier; implement against the Acceptance Criteria above*

## Test Evidence

**Story Type**: Logic
**Required evidence**:
- Logic: `tests/unit/clear-effects/boss-pushback.test.mjs` — must exist and pass

**Status**: [ ] Not yet created

---

## Dependencies

- Depends on: `production/epics/clear-effects/story-004-combo-count.md`
- Unlocks: `production/epics/clear-effects/story-007-press-delay-food-reward.md`
