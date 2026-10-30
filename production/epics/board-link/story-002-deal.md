# Story 002: 发牌（满盘压底与压境）

> **Epic**: board-link（盘面与连通）
> **Status**: Ready
> **Layer**: Foundation
> **Type**: Logic
> **Estimate**: M
> **Manifest Version**: 2026-10-27
> **Last Updated**: (set by /dev-story)

## Context

**GDD**: `design/gdd/board-link.md`
**Requirement**: `TR-board-link-001`, `TR-board-link-002`, `TR-board-link-005`, `TR-board-link-010`
*(Requirement text lives in `docs/architecture/tr-registry.yaml` — read fresh at review time)*

**ADR Governing Implementation**: ADR-0002: 主循环与对局时钟
**ADR Decision Summary**: 盘面用 `deal` 流发牌，同一种子同一串操作结果逐字相同；开发版用 `devAssert` 再断言一次 deck 合法与 I1，正式版不带断言（ADR-0001）。
**ADR Version**: 2026-10-27

**Engine**: none — native H5 (ADR-0001) | **Risk**: LOW
**Engine Notes**: 纯数据逻辑；`devAssert` 在 `release` 构建里是空函数，所以不变量检查不能只靠断言。

**Control Manifest Rules (this layer)**:
- Required: 工厂函数加注入；兵种遍历按兵种表顺序；常量集中在 `src/core/constants.mjs`
- Forbidden: `Math.random()` 等（只能用注入的 `deal` 流）；ES2020 起的语法
- Guardrail: 规则每帧 ≤ 2 ms

---

## Acceptance Criteria

*From GDD `design/gdd/board-link.md`, scoped to this story:*

- [ ] **GIVEN** 固定 `seed` 和回目数据，**WHEN** 发牌两次，**THEN** 两次的盘面逐格相同，底牌位置和兵种也相同。
- [ ] **GIVEN** 压境回目 `startRows = 4`，**WHEN** 发牌，**THEN** 第 1–4 行满、第 5–8 行全空，没有底牌。
- [ ] **GIVEN** 满盘测试数据（5 列 × 6 行，Σ deck = 44，兵种构成取第五回），**WHEN** 发牌，**THEN** 上层 30 格全满，底牌 14 张，每格最多 1 张，`pairsLeft() = 22`，每种兵（含底牌）为偶数。

---

## Implementation Notes

*Derived from the GDD rule 4/5 as referenced by ADR-0002:*

按兵种表顺序生成牌堆，用 `deal` 流洗乱，前面的牌按行优先放进要填的上层格；满盘多出的 `Σdeck − cols×rows` 张（buried_count）逐张处理，每张从“底层还没满 `STACK_DEPTH`”的格子里用 `deal` 流等概率挑一格压底。压境模式 `Σdeck = startRows×cols`，只填第 1 到第 `startRows` 行，不压底。第五回示例：鼓 8、刀 6、盾 6、旗 6、酒 6、营 6、弓 6（共 44）；`pairsLeft = (上层兵数 + 底牌数)/2`，拒马不算。I3：空格和拒马格底下没有牌。本故事一并提供只读查询 `cells()`、`count(kind)`、`pairsLeft()`、`depthAt(r,c)`、`buriedCount()`，以及测试用的盘面构造器（建议 `tests/helpers/board-fixtures.mjs`，供后续故事共用）。发牌后无可连对的洗牌在 Story 011。

---

## Out of Scope

*Handled by neighbouring stories — do not implement here:*

- Story 001: 随机流、deck_valid、列数缺省
- Story 011: 发牌后无可连对时的静默洗牌

---

## Files

- `src/rules/board-link.mjs`（`deal`、`cells`、`count`、`pairsLeft`、`depthAt`、`buriedCount`）
- `tests/helpers/board-fixtures.mjs`（计划中的测试盘面构造器）
- `tests/unit/board-link/deal.test.mjs`

---

## QA Test Cases

**Story Type**: Logic | **Test file**: `tests/unit/board-link/deal.test.mjs` | **Gate**: BLOCKING（qa.level standard，tests/unit 必须存在且通过）
**Determinism**: 固定种子，注入 ctx/流，不碰时间/Math.random（control-manifest Forbidden）。夹具放 `tests/helpers/board-fixtures.mjs`。

| # | 对应 AC | Given | When | Then |
|---|---|---|---|---|
| T1 | AC1 | 固定 seed + 回目数据 | 发牌两次（新建两个 board） | `cells()` 逐格相同，底牌位置与兵种相同 |
| T2 | AC2 | 压境 startRows=4（5 列×8 行） | 发牌 | 第 1–4 行满、第 5–8 行全空、无底牌；`pairsLeft() = 10`（公式示例） |
| T3 | AC3 | 满盘 5×6，Σdeck=44，兵种取第五回（鼓8 刀6 盾6 旗6 酒6 营6 弓6） | 发牌 | 上层 30 格全满，底牌 14 张，每格底层 ≤ 1 张 |
| T4 | AC3 | 同上 | `pairsLeft()` | = 22 |
| T5 | AC3 / I1 | 同上 | 按兵种统计（上层+底牌） | 每种兵为偶数 |

**预计**：5 个测试。
**缺口**：GDD Edge Cases「发牌后立即无可连对：照常洗牌但不产生 reshuffle 结果」没有 AC，也不在 1-2 范围内（属 `ensurePlayable` 的调用点/story-010 或 round-flow）— 请指定归属；本故事不为它写用例。

## Test Evidence

**Story Type**: Logic
**Required evidence**:
- Logic: `tests/unit/board-link/deal.test.mjs` — must exist and pass

**Status**: [ ] Not yet created

---

## Dependencies

- Depends on: `production/epics/board-link/story-001-rng-grid-deck.md`
- Unlocks: `production/epics/board-link/story-003-connectivity.md`, `production/epics/board-link/story-005-tap-match-reveal.md`
