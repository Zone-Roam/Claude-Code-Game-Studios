# Story 013: 关羽选排的输入路由

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

**ADR Governing Implementation**: ADR-0003: 规则层与界面层的通道 · ADR-0002: 主循环与对局时钟
**ADR Decision Summary**: 规则层每帧往事件出口 `emit` 纯数据对象，界面每帧 `drainEvents()` 一次并只读查询；界面把指针事件换算成意图（`cell`、`card`、`offBoard`、`pauseStamp`、`button`）放进输入队列，由对局流程在第 ② 步按到达顺序处理。
**ADR Version**: ADR-0003 2026-10-27 · ADR-0002 2026-10-27

**Engine**: none — native H5 (ADR-0001) | **Risk**: HIGH
**Engine Notes**: ADR-0003: 意图与事件都是纯数据对象，不含函数和 DOM 引用；界面的盘锁判断与规则层不矛盾，以规则层为准。 ADR-0002: 后台时 rAF 是否暂停、可见性事件是否到达、回来第一帧的 `dtReal` 多大均未在真机核实（ADR-0002 Verification Required）；规则层不依赖这些，隐式后台（`dtReal > BG_GAP_MS`）兜底。

**Control Manifest Rules (this layer)**:
- Required: 选排是 round 里的输入模式，不是令牌，不停钟、不锁盘、不算一步；`skills.tapCard`、`rowSelectable`、`cutRow` 由 general-skills 实现（此处用假对象）
- Forbidden: 把选排做成令牌；选排期间点盘调用 `board.tap`
- Guardrail: 规则每帧 ≤ 2 ms

---

## Acceptance Criteria

*From GDD `design/gdd/round-flow.md`, scoped to this story:*

- [ ] **GIVEN** 关羽就绪、没有令牌，**WHEN** 点关羽牌，**THEN** 进入选排：没有申请任何令牌，关羽蓄力不变，`gameTime` 照走，敌将步数不变，盘上原来的选中被清掉。
- [ ] **GIVEN** 选排中，**WHEN** 点第 4 行（可选）里的一个空格，**THEN** 放出关羽：蓄力清零，持有 `skill` 令牌 950 ms，退出选排；盘面的 `tap` 没有被调用。
- [ ] **GIVEN** 选排中，**WHEN** 点一个不可选的行，**THEN** 没有反应，仍在选排。
- [ ] **GIVEN** 选排中，**WHEN** 再点关羽牌 / 点赵云牌（已就绪）/ 点台眉空白处，**THEN** 退出选排，关羽蓄力不变；点赵云牌那一次不放赵云。

---

## Implementation Notes

*Derived from GDD 规则 5a 与 ADR-0003 意图表（`cell` / `card` / `offBoard`）：*

进入：关羽就绪、盘没锁时 `{type:'card', general:'guan_yu'}` → `skills.tapCard` 表示“进入选排”（具体返回值 ADR 未定）→ round 清掉盘上选中（`board.clearSelection()`），各行高亮（界面读 `board.rowContents`）。选排期间 `{type:'cell', row, col}` 点到可选行（`skills.rowSelectable(row)`）的任意一格 = 选这一排：调用 `skills.cutRow(row)`（技能申请 `skill` 令牌、蓄力清零），退出选排，**不**交给 `board.tap`；不可选行无反应。取消：再点关羽牌、点其他武将牌（那一下不放他的技能）、或 `{type:'offBoard'}`（台眉、死区、桌沿空白处），都不消耗蓄力。`offBoard` 只在选排/选列中有意义，其他时候忽略。“选排”作为 round 内的输入模式状态，与令牌无关，所以 `gameTime` 照走。

---

## Out of Scope

*Handled by neighbouring stories — do not implement here:*

- Story 014: 黄忠选列与互斥
- Story 015: 选排期间暂停/下压/破城/回书目

---

## Files

- `src/rules/round-flow.mjs`（选排模式、`cell`/`card`/`offBoard` 路由）
- `tests/helpers/round-fakes.mjs`（假 `skills.tapCard/rowSelectable/cutRow`）
- `tests/integration/round-flow/row-select-guan-yu.test.mjs`

---

## QA Test Cases

*N/A — no qa-lead specs at this tier; implement against the Acceptance Criteria above*

## Test Evidence

**Story Type**: Integration
**Required evidence**:
- Integration: `tests/integration/round-flow/row-select-guan-yu.test.mjs` — must exist and pass
- 所有协作系统（clear-effects、general-skills、battle-pressure、progress-save、view）尚未实现，测试一律用注入的假对象（`tests/helpers/round-fakes.mjs`），用假的 `dtReal` 逐帧驱动；固定种子，不碰时间/`Math.random`

**Status**: [ ] Not yet created

---

## Dependencies

- Depends on: `production/epics/round-flow/story-004-board-lock-discard.md`
- Unlocks: `production/epics/round-flow/story-014-column-select-huang-zhong.md`, `production/epics/round-flow/story-015-select-interrupts.md`
