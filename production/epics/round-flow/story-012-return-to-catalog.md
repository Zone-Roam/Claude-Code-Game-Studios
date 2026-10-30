# Story 012: “回书目”放弃一回

> **Epic**: round-flow（对局流程与时钟）
> **Status**: Ready
> **Layer**: Core
> **Type**: Integration
> **Estimate**: S
> **Manifest Version**: 2026-10-27
> **Last Updated**: (set by /dev-story)

## Context

**GDD**: `design/gdd/round-flow.md`
**Requirement**: `TR-round-flow-007`
*(Requirement text lives in `docs/architecture/tr-registry.yaml` — read fresh at review time)*

**ADR Governing Implementation**: ADR-0002: 主循环与对局时钟 · ADR-0004: 本机存档
**ADR Decision Summary**: 全页面只有一个 `requestAnimationFrame` 循环，每帧把 `dtReal` 和输入队列交给 `round.frame()`；一回之内的状态（`open`/`play`/`end`/`settle`）、`gameTime`、令牌集合、每帧五步加 ③b 和结算点都归 `round-flow`；`round` 自己按装配顺序建规则对象，`systems` 由装配根传入；种子用 `hash32`。
**ADR Version**: ADR-0002 2026-10-27 · ADR-0004 2026-10-27

**Engine**: none — native H5 (ADR-0001) | **Risk**: HIGH
**Engine Notes**: ADR-0002: 后台时 rAF 是否暂停、可见性事件是否到达、回来第一帧的 `dtReal` 多大均未在真机核实（ADR-0002 Verification Required）；规则层不依赖这些，隐式后台（`dtReal > BG_GAP_MS`）兜底。 ADR-0004: 本故事只测 round 对 `progress.settle` 的调用（假 `progress`），不碰存储；宿主是否持久保存未知。

**Control Manifest Rules (this layer)**:
- Required: “回书目”清空全部令牌、不通知任何持有者、不交结果对象、不写存档
- Forbidden: 回书目时调用 `progress.settle`；在 `round-flow.mjs` 里 import Feature 层模块
- Guardrail: 规则每帧 ≤ 2 ms

---

## Acceptance Criteria

*From GDD `design/gdd/round-flow.md`, scoped to this story:*

- [ ] **GIVEN** 持有 `skill` 令牌，**WHEN** 点暂停印再点“回书目”，**THEN** 令牌集合清空，技能没有生效，`settle()` 没有被调用，存档不变。
- [ ] **GIVEN** 对局中点暂停印再点“回书目”，**WHEN** 回到书目，**THEN** 没有交出结果对象，存档不变。

---

## Implementation Notes

*Derived from GDD 规则 11 与 ADR-0002 第 4 节：*

“回书目”走输入队列的按钮意图，在第 ② 步处理：清空令牌（不调用任何 `onEnd`），`emit` `exit {to: 'catalog'}`，`screens.mjs` 丢弃当前 round；这一回不算，`attempt` 照常加 1（计数在 Story 003 的 `screens.mjs`）。`round.result()` 保持 `null`。测试用假 `progress`（记录 `settle` 调用次数与一个内存“存档”对象，断言前后不变）和假 `skills`（`onEnd` 里会改盘面，断言未被调用）。

---

## Out of Scope

*Handled by neighbouring stories — do not implement here:*

- Story 003: `attempt` 计数
- Story 015: 选排/选列在回书目时作废

---

## Files

- `src/rules/round-flow.mjs`（“回书目”意图处理）
- `tests/helpers/round-fakes.mjs`（假 `progress` 与内存存档）
- `tests/integration/round-flow/return-to-catalog.test.mjs`

---

## QA Test Cases

*N/A — no qa-lead specs at this tier; implement against the Acceptance Criteria above*

## Test Evidence

**Story Type**: Integration
**Required evidence**:
- Integration: `tests/integration/round-flow/return-to-catalog.test.mjs` — must exist and pass
- 所有协作系统（clear-effects、general-skills、battle-pressure、progress-save、view）尚未实现，测试一律用注入的假对象（`tests/helpers/round-fakes.mjs`），用假的 `dtReal` 逐帧驱动；固定种子，不碰时间/`Math.random`

**Status**: [ ] Not yet created

---

## Dependencies

- Depends on: `production/epics/round-flow/story-002-token-set.md`, `production/epics/round-flow/story-009-round-result-settle.md`, `production/epics/round-flow/story-011-pause-landscape.md`
- Unlocks: None
