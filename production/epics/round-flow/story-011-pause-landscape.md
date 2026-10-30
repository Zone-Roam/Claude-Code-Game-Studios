# Story 011: 暂停印与横屏

> **Epic**: round-flow（对局流程与时钟）
> **Status**: Ready
> **Layer**: Core
> **Type**: Logic
> **Estimate**: M
> **Manifest Version**: 2026-10-27
> **Last Updated**: (set by /dev-story)

## Context

**GDD**: `design/gdd/round-flow.md`
**Requirement**: `TR-round-flow-007`
*(Requirement text lives in `docs/architecture/tr-registry.yaml` — read fresh at review time)*

**ADR Governing Implementation**: ADR-0002: 主循环与对局时钟 · ADR-0003: 规则层与界面层的通道
**ADR Decision Summary**: 全页面只有一个 `requestAnimationFrame` 循环，每帧把 `dtReal` 和输入队列交给 `round.frame()`；一回之内的状态（`open`/`play`/`end`/`settle`）、`gameTime`、令牌集合、每帧五步加 ③b 和结算点都归 `round-flow`；`round` 自己按装配顺序建规则对象，`systems` 由装配根传入；种子用 `hash32`。
**ADR Version**: ADR-0002 2026-10-27 · ADR-0003 2026-10-27

**Engine**: none — native H5 (ADR-0001) | **Risk**: HIGH
**Engine Notes**: ADR-0002: 后台时 rAF 是否暂停、可见性事件是否到达、回来第一帧的 `dtReal` 多大均未在真机核实（ADR-0002 Verification Required）；规则层不依赖这些，隐式后台（`dtReal > BG_GAP_MS`）兜底。 ADR-0003: 意图与事件都是纯数据对象，不含函数和 DOM 引用；界面的盘锁判断与规则层不矛盾，以规则层为准。

**Control Manifest Rules (this layer)**:
- Required: 暂停印不受盘锁、不受防连点影响；`pause` 令牌最多一个，持有时有时长令牌的计时暂停
- Forbidden: 在 `play` 以外申请 `pause` 令牌；让覆盖卡的防连点约束暂停印
- Guardrail: 规则每帧 ≤ 2 ms

---

## Acceptance Criteria

*From GDD `design/gdd/round-flow.md`, scoped to this story:*

- [ ] **GIVEN** 持有 `effect` 令牌、已走 200 ms，**WHEN** 点暂停印并在暂停卡上停 5 秒，**THEN** 这 5 秒里令牌没有到点、没有到结算点；点“接着讲”后再过 180 ms 前台时间到点。
- [ ] **GIVEN** 盘锁住（持有 `effect` 令牌），**WHEN** 点暂停印，**THEN** 申请到 `pause` 令牌并显示暂停卡。
- [ ] **GIVEN** 对局中，**WHEN** 手机转成横屏，**THEN** 持有 `pause` 令牌，显示横屏卡；**WHEN** 转回竖屏，**THEN** 显示暂停卡。
- [ ] **GIVEN** 演出中（持有 `skill` 令牌），**WHEN** 同一帧里点暂停印，**THEN** 申请到 `pause` 令牌（暂停印不受盘锁影响）。

---

## Implementation Notes

*Derived from GDD 规则 11、4 与 ADR-0002 第 4 节、ADR-0003 意图表：*

`{type:'pauseStamp'}` 在 `play` 时申请 `pause` 令牌（重复申请返回同一个），`overlay()` 为 `'pause'`；“接着讲”归还 `pause`。`round.setLandscape(on)`：`play` 时转横屏申请 `pause`、`overlay()` 为 `'landscape'`（没有按钮）；转回竖屏换成 `'pause'`。横屏和后台同时发生时，回前台先显示横屏卡，转回竖屏后显示暂停卡。持有 `pause`/`background` 时有时长令牌的计时暂停（Story 002 的 `dtTok`），不会到结算点，也不会判出胜负。`round.onBack()` 在 `play` 时等同点暂停印（ADR-0002 第 4 节）。

*缺口：* `onBack()` 与“对局刚开始就点暂停印立即有效”（ADR-0002 的测试要求）无 GDD AC，请作者确认是否补。

---

## Out of Scope

*Handled by neighbouring stories — do not implement here:*

- Story 010: `background` 令牌
- Story 012: 点“回书目”
- Story 016: 暂停卡按钮出现后 500 ms 的防连点

---

## Files

- `src/rules/round-flow.mjs`（`pauseStamp` 处理、`setLandscape`、`onBack`）
- `tests/unit/round-flow/pause-landscape.test.mjs`

---

## QA Test Cases

*N/A — no qa-lead specs at this tier; implement against the Acceptance Criteria above*

## Test Evidence

**Story Type**: Logic
**Required evidence**:
- Logic: `tests/unit/round-flow/pause-landscape.test.mjs` — must exist and pass
- 所有协作系统（clear-effects、general-skills、battle-pressure、progress-save、view）尚未实现，测试一律用注入的假对象（`tests/helpers/round-fakes.mjs`），用假的 `dtReal` 逐帧驱动；固定种子，不碰时间/`Math.random`

**Status**: [ ] Not yet created

---

## Dependencies

- Depends on: `production/epics/round-flow/story-002-token-set.md`, `production/epics/round-flow/story-010-background-hidden.md`
- Unlocks: `production/epics/round-flow/story-012-return-to-catalog.md`, `production/epics/round-flow/story-016-overlay-card-guard.md`
