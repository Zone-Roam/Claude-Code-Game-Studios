# Story 007: clearKind、clearSelection 与 buriedCells

> **Epic**: board-link（盘面与连通）
> **Status**: Ready
> **Layer**: Foundation
> **Type**: Logic
> **Estimate**: M
> **Manifest Version**: 2026-10-27
> **Last Updated**: (set by /dev-story)

## Context

**GDD**: `design/gdd/board-link.md`
**Requirement**: `TR-board-link-004`, `TR-board-link-005`, `TR-board-link-008`, `TR-board-link-010`
*(Requirement text lives in `docs/architecture/tr-registry.yaml` — read fresh at review time)*

**ADR Governing Implementation**: ADR-0003: 规则层与界面层的通道
**ADR Decision Summary**: `clear` 事件字段 `source, kind?, cells, buried, blocks?, revealed, pairs`；`clear` 是“非玩家清除”，只由本系统产生；修改接口只返回数据，不调用其他系统。接口名沿用 GDD（ADR-0002）。
**ADR Version**: 2026-10-27

**Engine**: none — native H5 (ADR-0001) | **Risk**: LOW
**Engine Notes**: 纯数据。

**Control Manifest Rules (this layer)**:
- Required: 修改接口结束时检查 I1；开发版 `devAssert`，正式版拒绝并写日志；事件字段按 ADR-0003
- Forbidden: 规则层引用页面/时间/随机/存储
- Guardrail: 规则每帧 ≤ 2 ms

---

## Acceptance Criteria

*From GDD `design/gdd/board-link.md`, scoped to this story:*

- [ ] **GIVEN** `clearKind('ying', 'effect')`，盘上上层 4 块营、底下 2 张营，其中一张营压在一块上层营底下，**WHEN** 调用，**THEN** 返回 `clear`，`cells` 4 格、`buried = 2`、`pairs = 3`，盘上（含底层）没有营；那一格变空，其余被清的格底下有别种牌的翻上来。
- [ ] **GIVEN** 盘上有拒马，**WHEN** `clearKind` 清掉拒马旁边的块，**THEN** 拒马不碎。
- [ ] **GIVEN** 第 2 行第 3 列被选中，**WHEN** `clearKind` 清掉了这一块，**THEN** 选中清空；**WHEN** 调用 `clearSelection()`，**THEN** 选中清空。
- [ ] **GIVEN** 盘上某种兵上层没有、底下有，**WHEN** 调用 `buriedCells(kind)`，**THEN** 按行优先返回压着它的格子。

---

## Implementation Notes

*Derived from GDD rules 13, 15 / Edge Cases as referenced by ADR-0003:*

`clearKind(kind, source)`：先拿掉底层里这种兵，再清上层这种兵；上层清掉后底层还有别种的就翻上来；若上层清掉的格底下压着同种，先拿掉底层同种，该格变空（不先翻上来再残留）。返回 `clear {source, kind, cells, buried, revealed, pairs}`，`pairs = (cells + buried)/2`；这种兵只剩底牌时照样清，`cells` 为空、`buried` 为张数。清掉的格若是选中的块（或翻上来另一张牌）则选中清空。`clearKind` 不碎拒马（只有关羽斩行的 `block` 层例外，Story 008）。`buriedCells(kind)`：按行优先返回底层最上面那张是 `kind` 的全部格子。`clearSelection()` 清选中。拒马相关用例用测试盘面构造器直接放 `'jm'`。

---

## Out of Scope

*Handled by neighbouring stories — do not implement here:*

- Story 008: `clearCells`、`rowContents`/`colContents`
- Story 012: 拒马碎裂的逻辑

---

## Files

- `src/rules/board-link.mjs`（`clearKind`、`clearSelection`、`buriedCells`）
- `tests/unit/board-link/clear-kind.test.mjs`

---

## QA Test Cases

**Story Type**: Logic | **Test file**: `tests/unit/board-link/clear-kind.test.mjs` | **Gate**: BLOCKING（qa.level standard，tests/unit 必须存在且通过）
**Determinism**: 固定种子，注入 ctx/流，不碰时间/Math.random（control-manifest Forbidden）。夹具放 `tests/helpers/board-fixtures.mjs`。

| # | 对应 AC | Given | When | Then |
|---|---|---|---|---|
| T1 | AC1 | 上层 4 块营、底下 2 张营（其中 1 张压在一块上层营下） | `clearKind('ying','effect')` | `clear`，`cells` 4 格，`buried = 2`，`pairs = 3`；盘上（含底层）无营 |
| T2 | AC1 | 同上 | 检查各格 | 压营的那一格变空；其余被清格底下有别种牌的翻上来（先拿底层同种，再清上层，不残留） |
| T3 | AC2 | 盘上有拒马，旁边是被清的块 | `clearKind` | 拒马不碎 |
| T4 | AC3 | (2,3) 被选中 | `clearKind` 清掉该块 | 选中清空 |
| T5 | AC3 | 有选中 | `clearSelection()` | 选中清空 |
| T6 | AC4 | 某种兵上层没有、底下有 | `buriedCells(kind)` | 行优先返回压着它的格子 |

**预计**：6 个测试。
**缺口**：GDD Edge Case「这种兵只剩底牌：cells 为空、buried 为张数、pairs 照算」无 AC，但与 T6 同类，建议作者补一条 AC 再写；`pairs` 公式 = (cells + buried)/2 — 不含拒马；清掉后 I1（每种兵偶数）断言可并入 T1。

## Test Evidence

**Story Type**: Logic
**Required evidence**:
- Logic: `tests/unit/board-link/clear-kind.test.mjs` — must exist and pass

**Status**: [ ] Not yet created

---

## Dependencies

- Depends on: `production/epics/board-link/story-005-tap-match-reveal.md`
- Unlocks: `production/epics/board-link/story-008-clear-cells-contents.md`, `production/epics/board-link/story-015-autoplay-simulations.md`
