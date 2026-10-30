# Story 005: 点击状态机、消除、连不上与翻牌

> **Epic**: board-link（盘面与连通）
> **Status**: Ready
> **Layer**: Foundation
> **Type**: Logic
> **Estimate**: M
> **Manifest Version**: 2026-10-27
> **Last Updated**: (set by /dev-story)

## Context

**GDD**: `design/gdd/board-link.md`
**Requirement**: `TR-board-link-004`, `TR-board-link-010`
*(Requirement text lives in `docs/architecture/tr-registry.yaml` — read fresh at review time)*

**ADR Governing Implementation**: ADR-0003: 规则层与界面层的通道
**ADR Decision Summary**: 事件类型清单为契约（名字不改，只追加）：`match {kind, a, b, path, forced, broken, revealed}`、`miss {kind, a, b}`；规则层只返回数据，由对局流程在第 ④ 步 `emit`，界面只读查询接口。
**ADR Version**: 2026-10-27

**Engine**: none — native H5 (ADR-0001) | **Risk**: LOW
**Engine Notes**: 纯数据；返回对象不含函数和 DOM 引用。

**Control Manifest Rules (this layer)**:
- Required: 事件字段按 ADR-0003 的事件表；规则层不调用其他系统
- Forbidden: 全局事件总线让规则系统互相订阅；规则层引用页面/时间/随机/存储
- Guardrail: 规则每帧 ≤ 2 ms

---

## Acceptance Criteria

*From GDD `design/gdd/board-link.md`, scoped to this story:*

- [ ] **GIVEN** (2,3) 上层是刀、底下压着鼓，**WHEN** 玩家消掉这块刀和另一块刀，**THEN** `match.revealed` 含 `{2,3,鼓}`，(2,3) 上层变成鼓。
- [ ] **GIVEN** (2,3) 上层是刀、底下是鼓，**WHEN** 玩家点 (2,3)，**THEN** `selection()` 为 `{r:2, c:3}` 且 `cells()` 里该格的 kind 是刀（不是鼓）；**GIVEN** 同一盘面把所有底牌删掉后另存一份，**WHEN** 对两份盘面的所有同种上层对做连通判定，**THEN** 两份结果（是否连通、折线）逐对完全相同。
- [ ] **GIVEN** 两块同种的兵之间任何不超过两个弯的路线都被挡住、赵云未待命，**WHEN** 依次点它们，**THEN** 返回 `miss`，选中换成第二块，盘面不变。
- [ ] **GIVEN** 已选一块，**WHEN** 点空格或外圈，**THEN** 取消选中；**GIVEN** 没有选中，**WHEN** 点空格，**THEN** 没有任何变化。

---

## Implementation Notes

*Derived from GDD rules 5, 6, 8 as referenced by ADR-0003:*

点击表（规则 6）：无选中点有块的格→选中；无选中点空格/外圈/拒马→无事；已选 A 点 A→取消；点空格或外圈→取消；点拒马→无事（拒马细节在 Story 012）；点不同种 B→选中换成 B；点同种 B→判定。同种且连通返回 `match {kind, a, b, path, forced:false, broken, revealed}`，两格上层置空，有底牌的翻上来并记进 `revealed` 的 `{r,c,kind}`，选中清空；同种不连通且赵云未待命返回 `miss {kind, a, b}`，选中换成 B。同一帧两次点击按到达顺序处理。底牌不能点、不能选中。拒马碎裂（`broken`）本故事先返回空数组，在 Story 012 填实。I3：翻牌保证空格底下没有牌。

---

## Out of Scope

*Handled by neighbouring stories — do not implement here:*

- Story 006: 赵云待命（`forced`）、盘锁
- Story 012: 拒马挡线、点拒马、`broken`

---

## Files

- `src/rules/board-link.mjs`（`tap`、`selection`、翻牌）
- `tests/unit/board-link/tap-match-reveal.test.mjs`

---

## QA Test Cases

**Story Type**: Logic | **Test file**: `tests/unit/board-link/tap-match-reveal.test.mjs` | **Gate**: BLOCKING（qa.level standard，tests/unit 必须存在且通过）
**Determinism**: 固定种子，注入 ctx/流，不碰时间/Math.random（control-manifest Forbidden）。夹具放 `tests/helpers/board-fixtures.mjs`。

| # | 对应 AC | Given | When | Then |
|---|---|---|---|---|
| T1 | AC1 | (2,3) 上层刀、底下鼓；盘上另有一块可连的刀 | 消掉这对刀 | `match.revealed` 含 `{2,3,鼓}`；(2,3) 上层变鼓 |
| T2 | AC2 | (2,3) 上层刀、底下鼓 | 点 (2,3) | `selection()` 为 `{r:2,c:3}`；`cells()` 该格 kind 是刀 |
| T3 | AC2（隐藏信息） | 同一盘面 + 删除所有底牌后的副本 | 两份盘面的所有同种上层对做连通判定 | 每对（是否连通、折线）完全相同 |
| T4 | AC3 | 两块同种之间任何 ≤2 弯路线都被挡、赵云未待命 | 依次点两块 | `miss`，选中换成第二块，盘面不变 |
| T5 | AC4 | 已选一块 | 点空格；点外圈 | 取消选中（两次各验） |
| T6 | AC4 | 无选中 | 点空格 | 无任何变化 |

**预计**：6 个测试。
**缺口**（GDD Edge Cases 有、本故事无 AC）：点同一格取消选中；点拒马无反应且保持选中；同帧两次点击按到达顺序；拒马碎裂（`match.broken` 只记一次、赵云强制不碎）— 后者可能属 story-012。请作者确认是否补 AC，否则本计划不写这些用例。T3 的依赖：board 需能构造「删底牌副本」的夹具。

## Test Evidence

**Story Type**: Logic
**Required evidence**:
- Logic: `tests/unit/board-link/tap-match-reveal.test.mjs` — must exist and pass

**Status**: [ ] Not yet created

---

## Dependencies

- Depends on: `production/epics/board-link/story-002-deal.md`, `production/epics/board-link/story-004-path-tiebreak-oracle.md`
- Unlocks: `production/epics/board-link/story-006-force-next-lock.md`, `production/epics/board-link/story-007-clear-kind.md`, `production/epics/board-link/story-012-barricade-core.md`
