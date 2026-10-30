# Story 015: 选排/选列的打断（暂停、下压、破城）

> **Epic**: round-flow（对局流程与时钟）
> **Status**: Ready
> **Layer**: Core
> **Type**: Integration
> **Estimate**: M
> **Manifest Version**: 2026-10-27
> **Last Updated**: (set by /dev-story)

## Context

**GDD**: `design/gdd/round-flow.md`
**Requirement**: `TR-round-flow-012`
*(Requirement text lives in `docs/architecture/tr-registry.yaml` — read fresh at review time)*

**ADR Governing Implementation**: ADR-0002: 主循环与对局时钟 · ADR-0003: 规则层与界面层的通道
**ADR Decision Summary**: 全页面只有一个 `requestAnimationFrame` 循环，每帧把 `dtReal` 和输入队列交给 `round.frame()`；一回之内的状态（`open`/`play`/`end`/`settle`）、`gameTime`、令牌集合、每帧五步加 ③b 和结算点都归 `round-flow`；`round` 自己按装配顺序建规则对象，`systems` 由装配根传入；种子用 `hash32`。
**ADR Version**: ADR-0002 2026-10-27 · ADR-0003 2026-10-27

**Engine**: none — native H5 (ADR-0001) | **Risk**: HIGH
**Engine Notes**: ADR-0002: 后台时 rAF 是否暂停、可见性事件是否到达、回来第一帧的 `dtReal` 多大均未在真机核实（ADR-0002 Verification Required）；规则层不依赖这些，隐式后台（`dtReal > BG_GAP_MS`）兜底。 ADR-0003: 意图与事件都是纯数据对象，不含函数和 DOM 引用；界面的盘锁判断与规则层不矛盾，以规则层为准。

**Control Manifest Rules (this layer)**:
- Required: 下压取消选排、不取消选列（`skills.onPush()` 直接调用）；本回结束或回书目时选排/选列直接作废，不消耗蓄力
- Forbidden: 把选排/选列当令牌；`skills.onPush` 经事件广播
- Guardrail: 规则每帧 ≤ 2 ms

---

## Acceptance Criteria

*From GDD `design/gdd/round-flow.md`, scoped to this story:*

- [ ] **GIVEN** 选排中，**WHEN** 点暂停印、再点“接着讲”，**THEN** 仍在选排。
- [ ] **GIVEN** 压境、选排中、最下一行有块，**WHEN** 到点下压，**THEN** 判“破城”进入“结束”，选排作废。
- [ ] **GIVEN** 黄忠就绪、已进入选列、压境，**WHEN** 到点下压且最下一行无块，**THEN** 仍在选列，`skills` 收到“重算高亮”而不是“取消”。
- [ ] **GIVEN** 黄忠选列中，**WHEN** 到点下压使最下一行有块、破城，**THEN** 进入“结束”，选列作废。

---

## Implementation Notes

*Derived from GDD 规则 5a“被打断”与边缘情况，ADR-0002 第 3 节第 4 步：*

选排期间盘锁住（`pause`/`background` 令牌）：模式保留，回来后接着选。压境下压了一排：round 调 `skills.onPush()`，关羽在选排 → 取消（行号变了），回到就绪；黄忠在选列 → 按新盘面重算高亮、不取消（列号不变）。下压后若破城，结算点判负进入 `end`，选排/选列作废，蓄力不扣。点“回书目”时作废（令牌清空见 Story 012）。选排时压境照常计时、下压照常发生（选排不是令牌，时钟照走）。

*缺口（GDD 边缘情况有、无 AC）：选排时点暂停印再点“回书目”则选排作废；选排时同一帧先后“点一排”“点张飞牌”，第二次因“此刻”有令牌丢弃（与 Story 004 同源）。请作者确认是否补 AC。*

---

## Out of Scope

*Handled by neighbouring stories — do not implement here:*

- Story 007: `tick` 里的下压与 `onPush` 转发
- Story 012: “回书目”清空令牌
- Story 013、014: 选排/选列的进入、选择、取消

---

## Files

- `src/rules/round-flow.mjs`（模式作废与 `onPush` 联动）
- `tests/integration/round-flow/select-interrupts.test.mjs`

---

## QA Test Cases

*N/A — no qa-lead specs at this tier; implement against the Acceptance Criteria above*

## Test Evidence

**Story Type**: Integration
**Required evidence**:
- Integration: `tests/integration/round-flow/select-interrupts.test.mjs` — must exist and pass
- 所有协作系统（clear-effects、general-skills、battle-pressure、progress-save、view）尚未实现，测试一律用注入的假对象（`tests/helpers/round-fakes.mjs`），用假的 `dtReal` 逐帧驱动；固定种子，不碰时间/`Math.random`

**Status**: [ ] Not yet created

---

## Dependencies

- Depends on: `production/epics/round-flow/story-007-pressure-tick-push-phase.md`, `production/epics/round-flow/story-013-row-select-guan-yu.md`, `production/epics/round-flow/story-014-column-select-huang-zhong.md`
- Unlocks: None
