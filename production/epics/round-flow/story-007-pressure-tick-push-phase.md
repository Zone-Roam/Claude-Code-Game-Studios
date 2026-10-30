# Story 007: tick 驱动、下压与换阶段

> **Epic**: round-flow（对局流程与时钟）
> **Status**: Ready
> **Layer**: Core
> **Type**: Integration
> **Estimate**: M
> **Manifest Version**: 2026-10-27
> **Last Updated**: (set by /dev-story)

## Context

**GDD**: `design/gdd/round-flow.md`
**Requirement**: `TR-round-flow-011`
*(Requirement text lives in `docs/architecture/tr-registry.yaml` — read fresh at review time)*

**ADR Governing Implementation**: ADR-0002: 主循环与对局时钟 · ADR-0003: 规则层与界面层的通道
**ADR Decision Summary**: 全页面只有一个 `requestAnimationFrame` 循环，每帧把 `dtReal` 和输入队列交给 `round.frame()`；一回之内的状态（`open`/`play`/`end`/`settle`）、`gameTime`、令牌集合、每帧五步加 ③b 和结算点都归 `round-flow`；`round` 自己按装配顺序建规则对象，`systems` 由装配根传入；种子用 `hash32`。
**ADR Version**: ADR-0002 2026-10-27 · ADR-0003 2026-10-27

**Engine**: none — native H5 (ADR-0001) | **Risk**: HIGH
**Engine Notes**: ADR-0002: 后台时 rAF 是否暂停、可见性事件是否到达、回来第一帧的 `dtReal` 多大均未在真机核实（ADR-0002 Verification Required）；规则层不依赖这些，隐式后台（`dtReal > BG_GAP_MS`）兜底。 ADR-0003: 意图与事件都是纯数据对象，不含函数和 DOM 引用；界面的盘锁判断与规则层不矛盾，以规则层为准。

**Control Manifest Rules (this layer)**:
- Required: 只有 `dtGame > 0` 才调用 `pressure.tick(dtGame)`；`tick` 里的下压和敌将出手当场生效，之后才申请令牌
- Forbidden: 在 `play` 以外推进 `gameTime`；让战场压力主动通知胜负（只回答 `outcome()` 查询）
- Guardrail: 规则每帧 ≤ 2 ms

---

## Acceptance Criteria

*From GDD `design/gdd/round-flow.md`, scoped to this story:*

- [ ] **GIVEN** 敌将，**WHEN** 无操作喂入 600 帧（约 10 秒），**THEN** `tick` 被调用 600 次，敌将没有出手。
- [ ] **GIVEN** 敌将一阶段 hp = 1、有二阶段，**WHEN** 连上一对，**THEN** 点击后的结算点不进入“结束”；同一帧 `tick` 后持有 `phase` 令牌；之后 1400 ms 前台时间里 `gameTime` 不变、点击被丢弃；令牌到点后时钟恢复。
- [ ] **GIVEN** 压境到点下压，**WHEN** 下压发生，**THEN** 盘面当场下移、不申请令牌，盘不锁；敌将出手时当场扣心和增兵，之后持有 `hostAttack` 600 ms。

---

## Implementation Notes

*Derived from GDD 规则 6.4、6.6 与 ADR-0002 第 3 节第 4 步：*

`phase`/`hostAttack` 令牌由战场压力在 `tick` 里经 `ctx.acquire` 申请（`PHASE_SHOW_MS` 1400、`HOST_ATTACK_MS` 600），round 不替它申请。敌将不看 `dtGame` 大小，只用它判断“这一帧时钟走了”。压境 `tick` 里下压一排后（`push` 已 `emit`），round 当场调用 `skills.onPush()`（直接调用，不经事件）。一阶段打空时 `outcome()` 返回 `null`，本帧 `tick` 里换阶段，`phase` 播完后的结算点照常检查；每次点击后的结算点先于 `tick`，所以打空血的那一刀不会再引出一次出手。`tick` 里没有下压、出手、换阶段时结算点只判胜负、不调用 `ensurePlayable()`。`pressure`、`skills` 全部用假对象（battle-pressure、general-skills 尚未实现）。

---

## Out of Scope

*Handled by neighbouring stories — do not implement here:*

- Story 005: `tick` 的调用条件（有令牌不调用）
- Story 008: 结算点判胜负与洗牌
- Story 015: `skills.onPush()` 对选排/选列的取消与重算

---

## Files

- `src/rules/round-flow.mjs`（第 ④ 步 `tick`、`onPush` 转发）
- `tests/helpers/round-fakes.mjs`（假 `pressure.tick` 可编排下压/出手/换阶段）
- `tests/integration/round-flow/pressure-tick-push-phase.test.mjs`

---

## QA Test Cases

*N/A — no qa-lead specs at this tier; implement against the Acceptance Criteria above*

## Test Evidence

**Story Type**: Integration
**Required evidence**:
- Integration: `tests/integration/round-flow/pressure-tick-push-phase.test.mjs` — must exist and pass
- 所有协作系统（clear-effects、general-skills、battle-pressure、progress-save、view）尚未实现，测试一律用注入的假对象（`tests/helpers/round-fakes.mjs`），用假的 `dtReal` 逐帧驱动；固定种子，不碰时间/`Math.random`

**Status**: [ ] Not yet created

---

## Dependencies

- Depends on: `production/epics/round-flow/story-005-frame-steps-settle-points.md`, `production/epics/round-flow/story-006-notify-order-dispatch.md`
- Unlocks: `production/epics/round-flow/story-015-select-interrupts.md`
