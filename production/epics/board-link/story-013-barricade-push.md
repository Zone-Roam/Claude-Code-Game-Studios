# Story 013: 压境推行里的拒马与 bottomOccupied

> **Epic**: board-link（盘面与连通）
> **Status**: Ready
> **Layer**: Foundation
> **Type**: Logic
> **Estimate**: S
> **Manifest Version**: 2026-10-27
> **Last Updated**: (set by /dev-story)

## Context

**GDD**: `design/gdd/board-link.md`
**Requirement**: `TR-board-link-011`, `TR-board-link-008`
*(Requirement text lives in `docs/architecture/tr-registry.yaml` — read fresh at review time)*

**ADR Governing Implementation**: ADR-0003: 规则层与界面层的通道
**ADR Decision Summary**: `push {row, empty, dropped}`，`dropped` 为被推出盘面的拒马所在列（2026-10-30 追加，无则为空数组）。
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

- [ ] **GIVEN** 5 列压境盘、最下一行为空，**WHEN** `pushRowFromTop([qi, dao, 'jm', dao, qi])`，**THEN** 返回 `push`，第 1 行第 3 列是拒马、底下没有牌，`pairsLeft()` 只增加 2，每种兵仍为偶数。
- [ ] **GIVEN** 压境盘、拒马在 (3,2)，**WHEN** 推行一次，**THEN** 拒马在 (4,2)。
- [ ] **GIVEN** 压境盘、最下一行只有 (8,4) 一块拒马，**WHEN** 推行，**THEN** 返回 `push` 且 `dropped = [4]`，原 (8,4) 的拒马不在盘上，`blocks()` 少一格，没有碎裂记录。
- [ ] **GIVEN** 压境盘、最下一行有 1 块拒马和 1 块兵，**WHEN** 推行，**THEN** 返回 `{ok:false}`，盘面不变；**WHEN** 查询 `bottomOccupied()`，**THEN** 为真；**GIVEN** 最下一行只有拒马，**THEN** `bottomOccupied()` 为假。

---

## Implementation Notes

*Derived from GDD rules 9, 13, 16, 17 / Edge Cases as referenced by ADR-0003:*

推行时兵和拒马一起下移；最下一行只有拒马（或全空）时推行照常成功，那一行的拒马移出盘面，记进 `push.dropped`，不算碎、不进 `match.broken`；最下一行既有拒马又有兵则返回 `{ok:false}`（破城由战场压力判）。新行里的 `'jm'` 落在第 1 行，底下没有牌（I3），不计入 `pairsLeft`。`bottomOccupied()` 只数兵，拒马不算。压境里盘上只剩拒马时 `isEmpty()` 为真，下一波照常推进，拒马随行下移。

---

## Out of Scope

*Handled by neighbouring stories — do not implement here:*

- Story 009: `pushRowFromTop` 的 I1 检查与选中随行
- Story 012: 拒马挡线与碎裂

---

## Files

- `src/rules/board-link.mjs`（推行的拒马分支、`push.dropped`、`bottomOccupied`）
- `tests/unit/board-link/barricade-push.test.mjs`

---

## QA Test Cases

*N/A — no qa-lead specs at this tier; implement against the Acceptance Criteria above*

---

## Test Evidence

**Story Type**: Logic
**Required evidence**:
- Logic: `tests/unit/board-link/barricade-push.test.mjs` — must exist and pass

**Status**: [ ] Not yet created

---

## Dependencies

- Depends on: `production/epics/board-link/story-009-push-add-place.md`, `production/epics/board-link/story-012-barricade-core.md`
- Unlocks: `production/epics/board-link/story-015-autoplay-simulations.md`
