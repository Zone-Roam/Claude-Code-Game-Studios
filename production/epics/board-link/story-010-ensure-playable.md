# Story 010: ensurePlayable（重排、对调、挪牌）

> **Epic**: board-link（盘面与连通）
> **Status**: Ready
> **Layer**: Foundation
> **Type**: Logic
> **Estimate**: L
> **Manifest Version**: 2026-10-27
> **Last Updated**: (set by /dev-story)

## Context

**GDD**: `design/gdd/board-link.md`
**Requirement**: `TR-board-link-006`, `TR-board-link-009`
*(Requirement text lives in `docs/architecture/tr-registry.yaml` — read fresh at review time)*

**ADR Governing Implementation**: ADR-0002: 主循环与对局时钟
**ADR Decision Summary**: 对局流程在结算点调用 `ensurePlayable()`，本系统当场改好盘面并返回 `reshuffle {fallback}`（不需要则返回 `null`），不申请令牌；`shuffle` 流与 `wave`/`add` 互相独立。
**ADR Version**: 2026-10-27

**Engine**: none — native H5 (ADR-0001) | **Risk**: LOW
**Engine Notes**: 死局洗牌的最坏耗时在 Node 里测。

**Control Manifest Rules (this layer)**:
- Required: 规则每帧 ≤ 2 ms；死局洗牌那一帧例外，`RESHUFFLE_TRIES` 次全失败的耗时在 Node 里测，超过 16 ms 就调低 `RESHUFFLE_TRIES`
- Forbidden: `Math.random()`；规则层引用页面/时间/存储
- Guardrail: 同上；`RESHUFFLE_TRIES` 默认 100（范围 20–200，Tuning Knob）

---

## Acceptance Criteria

*From GDD `design/gdd/board-link.md`, scoped to this story:*

- [ ] **GIVEN** 一张满盘、没有任何可连对的构造盘面（含底牌），**WHEN** 调用 `ensurePlayable()`，**THEN** 返回 `reshuffle`，盘面当场已洗好：至少有一对可连，各兵种数量（含底牌）不变，每格底层张数不变，拒马不动，选中已清空。
- [ ] **GIVEN** 盘上只剩 (4,4) 一格，上层刀、底下刀，**WHEN** 调用 `ensurePlayable()`，**THEN** 底下的刀挪到行优先第一个空格，返回 `reshuffle {fallback: true}`，上层两块刀可连。
- [ ] **GIVEN** 一张有可连对的盘面，**WHEN** 调用 `ensurePlayable()`，**THEN** 返回 `null`，盘面不变。
- [ ] **GIVEN** 注入一个永远给出同一排列的 `shuffle` 流，使排列 RESHUFFLE_TRIES 次都无可连对，**WHEN** 洗牌，**THEN** 走对调，对调后有可连对，位置集合不变，返回 `reshuffle {fallback: true}`。

---

## Implementation Notes

*Derived from GDD rule 12 / formula reshuffle_bound as referenced by ADR-0002:*

第一级重排：把全部牌（上层和底层）在它们当前占的位置里用 `shuffle` 流重排，位置集合不变，叠的形状不变，拒马不动；排完看上层有没有可连对，没有就再排，最多 `RESHUFFLE_TRIES` 次。第二级对调（确定性、不用随机数）：按行优先找第一对“当作同种时能连通”的上层已占格 (p, q)，再按位置顺序（行优先，每格先上层后底层）找第一张与 p 同种且不是 p 上层的牌 r（可为底牌），把 q 的上层和 r 对调。第三级挪牌：找不到 (p, q)（例如最后一对叠在同一格）就把底牌按行优先一张张翻到当时第一个空格的上层，直到挪完或没有空格；上层有可连对就结束，没有就从第一级重来一次。第二、三级返回 `fallback = true`。洗牌后选中一律清空；洗牌次数只写开发版日志，不进结果对象。工作量上限：重排次数 ≤ `RESHUFFLE_TRIES × 2`，再加至多一次对调、一次挪牌、一次碎拒马重试。第四级在 Story 011。

---

## Out of Scope

*Handled by neighbouring stories — do not implement here:*

- Story 011: 第四级（碎拒马、清盘）、发牌后静默洗牌
- Story 016: 性能测量

---

## Files

- `src/rules/board-link.mjs`（`ensurePlayable`、`hasPlayablePair`）
- `tests/unit/board-link/ensure-playable.test.mjs`

---

## QA Test Cases

**Story Type**: Logic | **Test file**: `tests/unit/board-link/ensure-playable.test.mjs` | **Gate**: BLOCKING（qa.level standard，tests/unit 必须存在且通过）
**Determinism**: 固定种子，注入 ctx/流，不碰时间/Math.random（control-manifest Forbidden）。夹具放 `tests/helpers/board-fixtures.mjs`。

| # | 对应 AC | Given | When | Then |
|---|---|---|---|---|
| T1 | AC1 | 满盘、无任何可连对的构造盘面（含底牌） | `ensurePlayable()` | 返回 `reshuffle`；盘面已洗好且至少一对可连 |
| T2 | AC1 | 同上 | 比较前后 | 各兵种数量（含底牌）不变，每格底层张数不变，拒马不动，选中清空 |
| T3 | AC2 | 盘上只剩 (4,4)：上层刀、底下刀 | `ensurePlayable()` | 底下的刀挪到行优先第一个空格；返回 `reshuffle {fallback:true}`；两块刀上层可连 |
| T4 | AC3 | 有可连对的盘面 | `ensurePlayable()` | 返回 `null`，盘面不变 |
| T5 | AC4 | 注入永远给出同一排列的 `shuffle` 流，RESHUFFLE_TRIES 次都无可连对 | 洗牌 | 走对调：对调后有可连对，位置集合不变，返回 `reshuffle {fallback:true}` |

**预计**：5 个测试。
**缺口**：(a) reshuffle_bound 公式（重排次数 ≤ RESHUFFLE_TRIES×2）无 AC，且 16 ms 耗时护栏属 story-016，不在本冲刺 — 本计划不写；(b) 碎拒马重试属 story-011；(c) 「构造无可连对盘面」需手工夹具，T1 的构造难度高（L 估时），建议先做夹具；(d) 「发牌后立即无可连对不产生 reshuffle 结果」无 AC。

## Test Evidence

**Story Type**: Logic
**Required evidence**:
- Logic: `tests/unit/board-link/ensure-playable.test.mjs` — must exist and pass

**Status**: [ ] Not yet created

---

## Dependencies

- Depends on: `production/epics/board-link/story-005-tap-match-reveal.md`, `production/epics/board-link/story-001-rng-grid-deck.md`
- Unlocks: `production/epics/board-link/story-011-ensure-playable-clear-deal.md`, `production/epics/board-link/story-015-autoplay-simulations.md`
