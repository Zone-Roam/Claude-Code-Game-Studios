# Story 009: pushRowFromTop、addPairs 与 placeBlocks

> **Epic**: board-link（盘面与连通）
> **Status**: Ready
> **Layer**: Foundation
> **Type**: Logic
> **Estimate**: M
> **Manifest Version**: 2026-10-27
> **Last Updated**: (set by /dev-story)

## Context

**GDD**: `design/gdd/board-link.md`
**Requirement**: `TR-board-link-004`, `TR-board-link-005`, `TR-board-link-008`
*(Requirement text lives in `docs/architecture/tr-registry.yaml` — read fresh at review time)*

**ADR Governing Implementation**: ADR-0003: 规则层与界面层的通道
**ADR Decision Summary**: `push {row, empty, dropped}`、`add {cells, placed}` 等字段按事件表；`wave`/`add` 流由战场压力通过 `rng(name)` 取用（ADR-0002）。接口只返回数据。
**ADR Version**: 2026-10-27

**Engine**: none — native H5 (ADR-0001) | **Risk**: LOW
**Engine Notes**: 纯数据；`placeBlocks` 的随机来自注入的流参数，不自取。

**Control Manifest Rules (this layer)**:
- Required: 修改接口结束时检查 I1，被拒统一返回 `{ok:false}` 且盘面不变；随机只用注入的流
- Forbidden: `Math.random()`；规则层引用页面/时间/存储
- Guardrail: 规则每帧 ≤ 2 ms

---

## Acceptance Criteria

*From GDD `design/gdd/board-link.md`, scoped to this story:*

- [ ] **GIVEN** 一行里刀只有 1 块，**WHEN** 调用 `pushRowFromTop`，**THEN** 返回 `{ok:false}`，盘面不变。
- [ ] **GIVEN** 最下一行有块，**WHEN** 调用 `pushRowFromTop`，**THEN** 返回 `{ok:false}`，盘面不变；**GIVEN** 最下一行为空且第 3 行第 2 列的块被选中，**WHEN** 推行，**THEN** 所有块下移一行，选中变为第 4 行第 2 列。
- [ ] **GIVEN** 盘上只有 3 个空格，**WHEN** `addPairs([dao, gu])`，**THEN** 放下 1 对，`placed = 1`，每种兵仍为偶数，没有放在拒马格或压到底下。
- [ ] **GIVEN** 盘上 1 个空格，**WHEN** `placeBlocks(2, …)`，**THEN** 只放 1 块拒马。

---

## Implementation Notes

*Derived from GDD rules 13, 16 / Edge Cases as referenced by ADR-0003:*

`pushRowFromTop(row)`：所有兵和拒马下移一行，第 1 行放入 `row`（`cols` 个元素，每个是兵种 id、空或 `'jm'`；每种兵在这一行里必须是偶数块）；最下一行有兵（拒马不算）或 `row` 会破坏 I1 时返回 `{ok:false}` 且什么都不做；否则 `push {row, dropped}`。成功时选中跟着块下移一行。压境不叠，开发版断言盘上没有底牌。`addPairs(kinds)`：逐对用 `add` 流从空格挑两格放下，只放上层空格、不压底、不放拒马格，空格少于 2 时停止，返回 `add {cells, placed}`（`placed` 是实际放下的对数，可为 0）。`placeBlocks(n, stream)`：逐块用 `stream` 从上层空格等概率挑一格放拒马，最多 `n` 块，空格用完就停，返回 `blocks {cells}`。拒马相关的推行细节（`dropped`、下移、`bottomOccupied`）在 Story 013。

---

## Out of Scope

*Handled by neighbouring stories — do not implement here:*

- Story 013: 推行时拒马的下移与移出、`bottomOccupied()`
- Story 014: `convertBlocks`、`shuffleTopRows`

---

## Files

- `src/rules/board-link.mjs`（`pushRowFromTop`、`addPairs`、`placeBlocks`）
- `tests/unit/board-link/push-add-place.test.mjs`

---

## QA Test Cases

**Story Type**: Logic | **Test file**: `tests/unit/board-link/push-add-place.test.mjs` | **Gate**: BLOCKING（qa.level standard，tests/unit 必须存在且通过）
**Determinism**: 固定种子，注入 ctx/流，不碰时间/Math.random（control-manifest Forbidden）。夹具放 `tests/helpers/board-fixtures.mjs`。

| # | 对应 AC | Given | When | Then |
|---|---|---|---|---|
| T1 | AC1 | 一行里刀只有 1 块 | `pushRowFromTop` | `{ok:false}`，盘面不变 |
| T2 | AC2 | 最下一行有块 | `pushRowFromTop` | `{ok:false}`，盘面不变 |
| T3 | AC2 | 最下一行为空，(3,2) 被选中 | 推行 | 所有块下移一行，选中变 (4,2) |
| T4 | AC3 | 盘上只有 3 个空格 | `addPairs([dao, gu])` | `placed = 1`，每种兵仍为偶数，未放在拒马格或压到底下 |
| T5 | AC4 | 盘上 1 个空格 | `placeBlocks(2, …)` | 只放 1 块拒马 |

**预计**：5 个测试。
**缺口**：最下一行「只有拒马」推行成功并记 `push.dropped`（GDD Edge Cases）无 AC；「有块」只数兵的判定无直接用例；`pushRowFromTop` 的「压境不叠，开发版断言无底牌」无 AC。story-009 为 nice-to-have，本冲刺可能不做。

## Test Evidence

**Story Type**: Logic
**Required evidence**:
- Logic: `tests/unit/board-link/push-add-place.test.mjs` — must exist and pass

**Status**: [ ] Not yet created

---

## Dependencies

- Depends on: `production/epics/board-link/story-005-tap-match-reveal.md`
- Unlocks: `production/epics/board-link/story-013-barricade-push.md`, `production/epics/board-link/story-015-autoplay-simulations.md`
