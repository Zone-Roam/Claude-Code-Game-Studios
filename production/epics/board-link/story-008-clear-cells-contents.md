# Story 008: clearCells 与行列内容查询

> **Epic**: board-link（盘面与连通）
> **Status**: Ready
> **Layer**: Foundation
> **Type**: Logic
> **Estimate**: M
> **Manifest Version**: 2026-10-27
> **Last Updated**: (set by /dev-story)

## Context

**GDD**: `design/gdd/board-link.md`
**Requirement**: `TR-board-link-004`, `TR-board-link-005`, `TR-board-link-008`, `TR-board-link-012`
*(Requirement text lives in `docs/architecture/tr-registry.yaml` — read fresh at review time)*

**ADR Governing Implementation**: ADR-0003: 规则层与界面层的通道
**ADR Decision Summary**: 查询清单含 `rowContents(r)`、`colContents(c)`（2026-10-30 修订补入）；`clear` 事件字段含 `blocks`、`buried`、`revealed`、`pairs`。接口名沿用 GDD（ADR-0002）。
**ADR Version**: 2026-10-27

**Engine**: none — native H5 (ADR-0001) | **Risk**: LOW
**Engine Notes**: 纯数据。`colContents` 与 ADR 的名字对应属“部分覆盖”（见 EPIC 的 TR-012），接口细节以 GDD 为准。

**Control Manifest Rules (this layer)**:
- Required: 修改接口结束时检查 I1（正式版拒绝并写日志）；事件字段按 ADR-0003
- Forbidden: 规则层引用页面/时间/随机/存储
- Guardrail: 规则每帧 ≤ 2 ms

---

## Acceptance Criteria

*From GDD `design/gdd/board-link.md`, scoped to this story:*

- [ ] **GIVEN** 第 6 行上层有刀、鼓、拒马、盾、盾，鼓底下压着书，**WHEN** 武将技能按选排规则调用 `clearCells`（这一行 `stack` 和 `block`，加上补斩一块刀、一块鼓、一张书），**THEN** 第 6 行全空，拒马碎掉，`pairs` 只数兵（拒马不算），I1 成立。
- [ ] **GIVEN** `clearCells` 的目标会让某种兵（含底牌）剩单数，**WHEN** 正式版调用，**THEN** 返回 `{ok:false}`，盘面不变。
- [ ] **GIVEN** 5 列 6 行、第 2 列从上到下是 营、书、拒马、刀、营、鼓，且第 1 行营底下压着旗，**WHEN** `colContents(2)`，**THEN** 上层兵 5 块、底牌 1 张（旗）、拒马 1 格，且 `clearCells` 射该列（兵给 `stack`、拒马给 `block`，加补斩）后 `pairs = 5`（与武将技能 `huang_cut` 例子一致）。

---

## Implementation Notes

*Derived from GDD rules 13, 15 / Edge Cases as referenced by ADR-0003:*

`clearCells(targets, source)`：每个目标 `{r,c,layer}`，`layer` 取 `top`（上层这张，有底牌就翻上来）、`under`（只拿掉底下那张）、`stack`（上层和底下一起拿掉，格子变空）、`block`（碎掉这格拒马）。同一格同时给 `top` 和 `under` 等同 `stack`；目标格为空、或 `under` 时底下没牌则忽略该目标。成功返回 `clear {source, cells, buried, blocks, revealed, pairs}`，`pairs = (上层张数 + 底牌张数)/2`，拒马不算。I1 检查按这次拿掉的全部牌（上层加底层）逐兵种计数，任何一种为单数整次拒绝：开发版抛错并指出兵种，正式版返回 `{ok:false}`、盘面不变、写日志。`top` 目标翻出的底牌记进 `revealed`。`rowContents(r)` / `colContents(c)` 同形：返回上层兵 `{r,c,kind}`、底牌 `{r,c,kind}`、拒马格 `{r,c}` 三张表。

---

## Out of Scope

*Handled by neighbouring stories — do not implement here:*

- Story 007: `clearKind`
- 武将技能系统的选排/选列规则本身（`huang_cut` 等）不在本史诗

---

## Files

- `src/rules/board-link.mjs`（`clearCells`、`rowContents`、`colContents`）
- `tests/unit/board-link/clear-cells-contents.test.mjs`

---

## QA Test Cases

**Story Type**: Logic | **Test file**: `tests/unit/board-link/clear-cells-contents.test.mjs` | **Gate**: BLOCKING（qa.level standard，tests/unit 必须存在且通过）
**Determinism**: 固定种子，注入 ctx/流，不碰时间/Math.random（control-manifest Forbidden）。夹具放 `tests/helpers/board-fixtures.mjs`。

| # | 对应 AC | Given | When | Then |
|---|---|---|---|---|
| T1 | AC1 | 第 6 行上层：刀、鼓、拒马、盾、盾，鼓下压书 | `clearCells`（该行 stack+block，加补斩刀、鼓、书各一） | 第 6 行全空；拒马碎；`pairs` 只数兵；I1 成立 |
| T2 | AC2 | 目标会让某兵种（含底牌）剩单数 | 正式版调 `clearCells` | `{ok:false}`，盘面不变 |
| T3 | AC3 | 5 列 6 行；第 2 列自上而下 营、书、拒马、刀、营、鼓；第 1 行营下压旗 | `colContents(2)` | 上层兵 5 块、底牌 1 张（旗）、拒马 1 格 |
| T4 | AC3 | 同上 | `clearCells` 射该列（兵给 stack、拒马给 block，加补斩） | `pairs = 5`（与 huang_cut 示例一致） |

**预计**：4 个测试。
**缺口**：开发版「剩单数抛错并指出兵种」（GDD Edge Cases）无 AC，且正式版「写日志」也无断言口；`top` 目标翻出 `revealed` 无 AC；`rowContents` 无 AC。本计划不写这些用例，待作者补 AC。需确认「开发/正式版」切换在测试中如何注入。

## Test Evidence

**Story Type**: Logic
**Required evidence**:
- Logic: `tests/unit/board-link/clear-cells-contents.test.mjs` — must exist and pass

**Status**: [ ] Not yet created

---

## Dependencies

- Depends on: `production/epics/board-link/story-007-clear-kind.md`
- Unlocks: `production/epics/board-link/story-011-ensure-playable-clear-deal.md`, `production/epics/board-link/story-015-autoplay-simulations.md`
