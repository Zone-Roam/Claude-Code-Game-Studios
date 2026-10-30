# Story 014: 黄忠选列与关羽互斥

> **Epic**: round-flow（对局流程与时钟）
> **Status**: Ready
> **Layer**: Core
> **Type**: Integration
> **Estimate**: S
> **Manifest Version**: 2026-10-27
> **Last Updated**: (set by /dev-story)

## Context

**GDD**: `design/gdd/round-flow.md`
**Requirement**: `TR-round-flow-012`
*(Requirement text lives in `docs/architecture/tr-registry.yaml` — read fresh at review time)*

**ADR Governing Implementation**: ADR-0003: 规则层与界面层的通道 · ADR-0002: 主循环与对局时钟
**ADR Decision Summary**: 规则层每帧往事件出口 `emit` 纯数据对象，界面每帧 `drainEvents()` 一次并只读查询；界面把指针事件换算成意图（`cell`、`card`、`offBoard`、`pauseStamp`、`button`）放进输入队列，由对局流程在第 ② 步按到达顺序处理。
**ADR Version**: ADR-0003 2026-10-27 · ADR-0002 2026-10-27

**Engine**: none — native H5 (ADR-0001) | **Risk**: HIGH
**Engine Notes**: ADR-0003: 意图与事件都是纯数据对象，不含函数和 DOM 引用；界面的盘锁判断与规则层不矛盾，以规则层为准。 ADR-0002: 后台时 rAF 是否暂停、可见性事件是否到达、回来第一帧的 `dtReal` 多大均未在真机核实（ADR-0002 Verification Required）；规则层不依赖这些，隐式后台（`dtReal > BG_GAP_MS`）兜底。

**Control Manifest Rules (this layer)**:
- Required: 选列路由同选排，“排”换成“列”；一个进行时点另一位的牌 = 取消
- Forbidden: 把选列做成令牌；选列期间点盘调用 `board.tap`
- Guardrail: 规则每帧 ≤ 2 ms

---

## Acceptance Criteria

*From GDD `design/gdd/round-flow.md`, scoped to this story:*

- [ ] **GIVEN** 关羽选排中，**WHEN** 点黄忠牌，**THEN** 退出选排，不进入选列，黄忠蓄力不变，不放技能。
- [ ] **GIVEN** 黄忠选列中，**WHEN** 点一个有块的列，**THEN** 黄忠蓄力清零，持有 `skill` 令牌 950 ms，退出选列，`board.tap` 未被调用。

---

## Implementation Notes

*Derived from GDD 规则 5a“黄忠选列”与 ADR-0003 意图表：*

黄忠就绪、盘没锁时点黄忠牌进入选列（不申请令牌）；选列中点“有块的列”（可选列由 general-skills 回答，高亮读 `board.colContents`）= 放技能，其余路由同 Story 013（取消方式相同）。关羽选排和黄忠选列互斥：一个在进行时点另一位的牌 = 取消，那一下不进入对方模式。接口名（`colSelectable`/`cutCol` 之类）GDD/ADR 均未写明，沿用 `skills.tapCard` 的返回约定，见 `_list.md` 疑点。

---

## Out of Scope

*Handled by neighbouring stories — do not implement here:*

- Story 013: 关羽选排本身
- Story 015: 选列被下压、破城、暂停打断

---

## Files

- `src/rules/round-flow.mjs`（选列模式、互斥取消）
- `tests/helpers/round-fakes.mjs`（假黄忠接口）
- `tests/integration/round-flow/column-select-huang-zhong.test.mjs`

---

## QA Test Cases

*N/A — no qa-lead specs at this tier; implement against the Acceptance Criteria above*

## Test Evidence

**Story Type**: Integration
**Required evidence**:
- Integration: `tests/integration/round-flow/column-select-huang-zhong.test.mjs` — must exist and pass
- 所有协作系统（clear-effects、general-skills、battle-pressure、progress-save、view）尚未实现，测试一律用注入的假对象（`tests/helpers/round-fakes.mjs`），用假的 `dtReal` 逐帧驱动；固定种子，不碰时间/`Math.random`

**Status**: [ ] Not yet created

---

## Dependencies

- Depends on: `production/epics/round-flow/story-013-row-select-guan-yu.md`
- Unlocks: `production/epics/round-flow/story-015-select-interrupts.md`
