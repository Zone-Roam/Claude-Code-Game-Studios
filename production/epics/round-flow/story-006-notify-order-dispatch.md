# Story 006: match/miss 通知顺序与结果分发表

> **Epic**: round-flow（对局流程与时钟）
> **Status**: Ready
> **Layer**: Core
> **Type**: Integration
> **Estimate**: M
> **Manifest Version**: 2026-10-27
> **Last Updated**: (set by /dev-story)

## Context

**GDD**: `design/gdd/round-flow.md`
**Requirement**: `TR-round-flow-005`
*(Requirement text lives in `docs/architecture/tr-registry.yaml` — read fresh at review time)*

**ADR Governing Implementation**: ADR-0002: 主循环与对局时钟 · ADR-0003: 规则层与界面层的通道
**ADR Decision Summary**: 全页面只有一个 `requestAnimationFrame` 循环，每帧把 `dtReal` 和输入队列交给 `round.frame()`；一回之内的状态（`open`/`play`/`end`/`settle`）、`gameTime`、令牌集合、每帧五步加 ③b 和结算点都归 `round-flow`；`round` 自己按装配顺序建规则对象，`systems` 由装配根传入；种子用 `hash32`。
**ADR Version**: ADR-0002 2026-10-27 · ADR-0003 2026-10-27

**Engine**: none — native H5 (ADR-0001) | **Risk**: HIGH
**Engine Notes**: ADR-0002: 后台时 rAF 是否暂停、可见性事件是否到达、回来第一帧的 `dtReal` 多大均未在真机核实（ADR-0002 Verification Required）；规则层不依赖这些，隐式后台（`dtReal > BG_GAP_MS`）兜底。 ADR-0003: 意图与事件都是纯数据对象，不含函数和 DOM 引用；界面的盘锁判断与规则层不矛盾，以规则层为准。

**Control Manifest Rules (this layer)**:
- Required: `match`/`miss` 依次给清除效果 → 武将技能 → 战场压力 → `emit`（界面）；效果、技能的 `clear` 先给 `pressure.onClear` 再 `emit`
- Forbidden: 在结算顺序之外让规则模块互相调用通知（顺序只在 `round-flow` 里写一次）；全局事件总线让规则模块订阅彼此
- Guardrail: 规则每帧 ≤ 2 ms

---

## Acceptance Criteria

*From GDD `design/gdd/round-flow.md`, scoped to this story:*

- [ ] **GIVEN** 敌将一阶段 steps 7 / 8、hp 5，**WHEN** 一帧里连上一对（没触发效果），**THEN** 同一帧第 ④ 步 `tick` 出手，持有 `hostAttack` 600 ms。
- [ ] **GIVEN** 敌将一阶段 steps 7 / 8，**WHEN** 连上一对火（申请 `effect` 380 ms），**THEN** 这一帧不调用 `tick`、不出手；令牌归还后的第一次 `tick` 才出手（如果那时 `hp > 0`）。
- [ ] **GIVEN** 粮草模式 food = 1、盘上只剩 1 对火和 3 对营，**WHEN** 玩家消掉火，**THEN** 先扣粮到 0，效果演出 380 ms 后清掉营，到结算点时盘已空，`outcome()` 判胜。

---

## Implementation Notes

*Derived from GDD 规则 6.3–6.4 与 ADR-0002 第 3 节、ADR-0003 事件清单：*

`board.tap` 返回 `match`/`miss` 后同步依次调 `effects.onMatch` → `skills.onMatch` → `pressure.onMatch`（`miss` 为 `pressure.onMiss`）→ `emit`；因为效果在压力之前，三连斩那一对对敌将是“先退 1 步、再走 1 步”。步数走满的出手**不在通知里**，留到本帧 `tick`；第 ② 步申请了令牌（触发效果）则等令牌归还后的第一次 `tick`（令牌到点那一帧先过 ③b）。分发表：效果/技能/关羽斩一排的 `clear` 在令牌到点后转 `pressure.onClear` 再 `emit`（技能的画朱勾残影在界面）；张飞、赵云、诸葛亮对压力的效果由技能直接调压力接口，不经本系统；`reshuffle` 当场 `emit` 并申请 400 ms 令牌；`source: 'reshuffle'` 的保底 `clear` 给 `pressure.onClear` 再 `emit`；`push`/`hostAttack`/`bossPhase` 由压力直接 `emit`，不经 round。压力自己调用的 `addPairs`、`pushRowFromTop` 等结果由压力直接拿到。

假对象写进共同的 call log，断言顺序为 `effects.onMatch, skills.onMatch, pressure.onMatch, emit`。

*缺口（GDD 无 AC、规则 6.3 有）：通知顺序本身、`miss` 路径（`pressure.onMiss`）、保底清除的分发。请作者确认是否补 AC，否则本计划把“顺序”一条按规则 6.3 写成用例（不属于任何 GDD AC）。*

---

## Out of Scope

*Handled by neighbouring stories — do not implement here:*

- Story 005: 帧步骤与 ③b
- Story 007: `tick` 里的下压、换阶段
- Story 008: 结算点的洗牌用例

---

## Files

- `src/rules/round-flow.mjs`（`notifyMatch`、`dispatch` 分发表）
- `tests/helpers/round-fakes.mjs`（带 call log 的假 effects/skills/pressure）
- `tests/integration/round-flow/notify-order-dispatch.test.mjs`

---

## QA Test Cases

*N/A — no qa-lead specs at this tier; implement against the Acceptance Criteria above*

## Test Evidence

**Story Type**: Integration
**Required evidence**:
- Integration: `tests/integration/round-flow/notify-order-dispatch.test.mjs` — must exist and pass
- 所有协作系统（clear-effects、general-skills、battle-pressure、progress-save、view）尚未实现，测试一律用注入的假对象（`tests/helpers/round-fakes.mjs`），用假的 `dtReal` 逐帧驱动；固定种子，不碰时间/`Math.random`

**Status**: [ ] Not yet created

---

## Dependencies

- Depends on: `production/epics/round-flow/story-005-frame-steps-settle-points.md`
- Unlocks: `production/epics/round-flow/story-007-pressure-tick-push-phase.md`
