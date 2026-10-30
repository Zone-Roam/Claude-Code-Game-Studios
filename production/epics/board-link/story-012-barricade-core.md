# Story 012: 拒马（挡线、点不动、相邻碎裂）

> **Epic**: board-link（盘面与连通）
> **Status**: Ready
> **Layer**: Foundation
> **Type**: Logic
> **Estimate**: M
> **Manifest Version**: 2026-10-27
> **Last Updated**: (set by /dev-story)

## Context

**GDD**: `design/gdd/board-link.md`
**Requirement**: `TR-board-link-011`
*(Requirement text lives in `docs/architecture/tr-registry.yaml` — read fresh at review time)*

**ADR Governing Implementation**: ADR-0003: 规则层与界面层的通道
**ADR Decision Summary**: `match.broken`（碎掉的拒马坐标）与 `clear.blocks` 是事件字段，不另设事件；查询清单含 `blocks()`（拒马格）。
**ADR Version**: 2026-10-27

**Engine**: none — native H5 (ADR-0001) | **Risk**: LOW
**Engine Notes**: 纯数据。

**Control Manifest Rules (this layer)**:
- Required: 事件字段按 ADR-0003，只追加不改名；查询接口只读
- Forbidden: 规则层引用页面/时间/随机/存储
- Guardrail: 规则每帧 ≤ 2 ms

---

## Acceptance Criteria

*From GDD `design/gdd/board-link.md`, scoped to this story:*

- [ ] **GIVEN** 两块同种的兵之间唯一的直线上有一块拒马，其他路线都被挡，**WHEN** 依次点它们，**THEN** 返回 `miss`。
- [ ] **GIVEN** 已选 A，**WHEN** 点拒马，**THEN** 选中仍是 A，没有事件。
- [ ] **GIVEN** (3,2) 有拒马，**WHEN** 玩家正常消掉 (3,3) 和 (5,5) 的一对，**THEN** `match.broken` 为 `[(3,2)]`，(3,2) 变空；(4,4) 的拒马（与 (5,5) 斜对）不碎。
- [ ] **GIVEN** 盘上只剩两块拒马，**WHEN** 查询，**THEN** `isEmpty()` 为真，`pairsLeft() = 0`。

---

## Implementation Notes

*Derived from GDD rule 9 / Edge Cases as referenced by ADR-0003:*

拒马占一格上层，不往格子底下压，底下没有牌（I3）；挡线（不是空格）、点不动（已选 A 点拒马，A 仍选中；无选中点拒马什么都不发生）、不是兵，不进 I1、`pairsLeft`、`count`，也不算“盘上有块”。碎：玩家消掉一对（`match` 且 `forced = false`）时，这两块上下左右相邻的拒马全部碎掉（上层置空），记进 `match.broken`；斜对角不算；两边挨着同一块拒马只碎一次、只记一次；赵云强制消除的一对（`forced = true`）不碎。`clearKind`、技能清除、洗牌不碎拒马。拒马不会被 `convertBlocks` 改动（Story 014）。`isEmpty()` = 上层没有兵；`blocks()` 返回拒马格。回填 Story 005 里 `broken` 的空数组。

---

## Out of Scope

*Handled by neighbouring stories — do not implement here:*

- Story 013: 推行时拒马下移/移出
- Story 011: 洗牌第四级碎拒马

---

## Files

- `src/rules/board-link.mjs`（拒马挡线、碎裂、`blocks`、`isEmpty`）
- `tests/unit/board-link/barricade-core.test.mjs`

---

## QA Test Cases

*N/A — no qa-lead specs at this tier; implement against the Acceptance Criteria above*

---

## Test Evidence

**Story Type**: Logic
**Required evidence**:
- Logic: `tests/unit/board-link/barricade-core.test.mjs` — must exist and pass

**Status**: [ ] Not yet created

---

## Dependencies

- Depends on: `production/epics/board-link/story-005-tap-match-reveal.md`, `production/epics/board-link/story-006-force-next-lock.md`
- Unlocks: `production/epics/board-link/story-013-barricade-push.md`, `production/epics/board-link/story-014-convert-sweep.md`
