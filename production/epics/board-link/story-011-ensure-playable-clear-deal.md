# Story 011: 洗牌第四级（碎拒马与清盘）与发牌后静默洗牌

> **Epic**: board-link（盘面与连通）
> **Status**: Ready
> **Layer**: Foundation
> **Type**: Logic
> **Estimate**: M
> **Manifest Version**: 2026-10-27
> **Last Updated**: (set by /dev-story)

## Context

**GDD**: `design/gdd/board-link.md`
**Requirement**: `TR-board-link-006`, `TR-board-link-011`
*(Requirement text lives in `docs/architecture/tr-registry.yaml` — read fresh at review time)*

**ADR Governing Implementation**: ADR-0002: 主循环与对局时钟
**ADR Decision Summary**: `ensurePlayable()` 当场改盘并返回 `reshuffle`/`clear`/`null`；第四级的 `clear` 经 ADR-0003 的 `clear` 事件字段（含 `blocks`）交出。发牌后的洗牌不产生结果对象，所以不演出。
**ADR Version**: 2026-10-27

**Engine**: none — native H5 (ADR-0001) | **Risk**: LOW
**Engine Notes**: 纯数据；第四级在开发版是断言失败，正式版才执行碎拒马与清盘。

**Control Manifest Rules (this layer)**:
- Required: 开发版 `devAssert`、正式版兜底执行；事件字段按 ADR-0003
- Forbidden: `Math.random()`；规则层引用页面/时间/存储
- Guardrail: 规则每帧 ≤ 2 ms；死局洗牌例外（见 Story 010）

---

## Acceptance Criteria

*From GDD `design/gdd/board-link.md`, scoped to this story:*

- [ ] **GIVEN** 盘上有拒马，且死局的第二、三、四级各构造一张盘面（第四级：上层只剩 2 块同种兵，被 4 块拒马围死，没有底牌），**WHEN** `ensurePlayable()`，**THEN** 第二、三级拒马全部不动、返回 `reshuffle {fallback: true}`、有可连对；第四级拒马全部碎掉、盘上至少有一对可连，`clear.blocks` 记下碎掉的拒马。
- [ ] **GIVEN** 发牌后没有可连对，**WHEN** 发牌，**THEN** 盘面已洗好，没有产生 `reshuffle` 结果（不演出）。

---

## Implementation Notes

*Derived from GDD rule 12 / rule 4 as referenced by ADR-0002:*

第四级清盘：挪牌也救不回来（没有底牌可挪，或上层块被拒马围死）时，开发版断言失败；正式版先把全部拒马碎掉（用户决定，2026-10-30：先碎拒马；这是“洗牌不碎拒马”的唯一例外，只在第一至三级都救不回来时发生），再从第一级试一次，仍不行就把剩下的块全部清掉，返回 `clear {source: 're…}`（以 GDD 规则 12 第四级原文为准），`clear.blocks` 记下碎掉的拒马。发牌后若无可连对，按同一套洗牌逻辑洗，但不返回 `reshuffle` 结果。“洗牌永远不会抢在效果前”的结算点约束归对局流程。

---

## Out of Scope

*Handled by neighbouring stories — do not implement here:*

- Story 010: 第一至三级
- Story 012: 拒马挡线与碎裂的主逻辑

---

## Files

- `src/rules/board-link.mjs`（`ensurePlayable` 第四级、`deal` 末尾的静默洗牌）
- `tests/unit/board-link/ensure-playable-clear-deal.test.mjs`

---

## QA Test Cases

*N/A — no qa-lead specs at this tier; implement against the Acceptance Criteria above*

---

## Test Evidence

**Story Type**: Logic
**Required evidence**:
- Logic: `tests/unit/board-link/ensure-playable-clear-deal.test.mjs` — must exist and pass

**Status**: [ ] Not yet created

---

## Dependencies

- Depends on: `production/epics/board-link/story-010-ensure-playable.md`, `production/epics/board-link/story-008-clear-cells-contents.md`
- Unlocks: `production/epics/board-link/story-015-autoplay-simulations.md`
