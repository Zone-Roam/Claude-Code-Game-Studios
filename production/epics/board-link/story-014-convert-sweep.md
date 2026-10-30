# Story 014: convertBlocks 与 shuffleTopRows

> **Epic**: board-link（盘面与连通）
> **Status**: Ready
> **Layer**: Foundation
> **Type**: Logic
> **Estimate**: M
> **Manifest Version**: 2026-10-27
> **Last Updated**: (set by /dev-story)

## Context

**GDD**: `design/gdd/board-link.md`
**Requirement**: `TR-board-link-013`, `TR-board-link-005`
*(Requirement text lives in `docs/architecture/tr-registry.yaml` — read fresh at review time)*

**ADR Governing Implementation**: ADR-0002: 主循环与对局时钟
**ADR Decision Summary**: 修改接口沿用 GDD 名字（2026-10-30 修订补 `convertBlocks` 等）；接口只返回数据，被拒统一 `{ok:false}`。
**ADR Version**: 2026-10-27

**Engine**: none — native H5 (ADR-0001) | **Risk**: LOW
**Engine Notes**: 纯数据。EPIC 标注 TR-013 为“部分覆盖”（名字已补，待下次 `/architecture-review` 复核），接口细节以 GDD 为准。

**Control Manifest Rules (this layer)**:
- Required: 修改接口结束时检查 I1，正式版拒绝并写日志；随机只用注入的流
- Forbidden: `Math.random()`；规则层引用页面/时间/存储
- Guardrail: 规则每帧 ≤ 2 ms

---

## Acceptance Criteria

*From GDD `design/gdd/board-link.md`, scoped to this story:*

- [ ] **GIVEN** 测试构造盘面：(2,1) 上层书、底下刀，(4,5) 上层书，**WHEN** `convertBlocks([(2,1), (4,5)], 'ying')`，**THEN** 返回 `convert`，两格上层变成营、`from` 都是书，(2,1) 底下仍是刀，书和营的总数各变化 2，I1 成立，选中清空。
- [ ] **GIVEN** 目标里有一格是拒马或空格，**WHEN** `convertBlocks`，**THEN** 返回 `{ok:false}`，盘面不变。
- [ ] **GIVEN** 书总数 4（全在上层），**WHEN** `convertBlocks` 只给 1 格书，**THEN** 开发版断言 I1 失败；正式版返回 `{ok:false}`，盘面不变。
- [ ] **GIVEN** 第 1 行全空、第 2、3 行有兵和底牌，**WHEN** `shuffleTopRows`，**THEN** 只打乱第 2、3 行上层的兵，底牌和拒马不动，选中清空。

---

## Implementation Notes

*Derived from GDD rule 13 / Edge Cases as referenced by ADR-0002:*

`convertBlocks(cells, kind)`：`cells` 为不重复的 `{r,c}` 列表，把每格上层的兵就地改成 `kind`；底牌、拒马、位置都不动；每次调用都清选中。成功返回 `convert {cells: [{r,c,from}], kind}`；有目标格上层不是兵（空格、拒马、越界）、`kind` 不是兵种、或改完会破坏 I1 时返回 `{ok:false}`，盘面不变。I1 检查按改动前后逐兵种计数（含底层）：每种兵的增减必须是偶数；目标格本来就是 `kind` 时 `from = kind`、等于没改。不检查 I2（留到结算点）。`shuffleTopRows(stream)`：取从上往下前两个“上层有兵”的行，用 `stream` 打乱这些格的上层兵；底牌、拒马不动；只有一行有兵就只打乱这一行，没有兵返回空的 `sweep`；各兵种总数不变，不检查 I2，选中清空；返回 `sweep {cells}`。

---

## Out of Scope

*Handled by neighbouring stories — do not implement here:*

- Story 009: `placeBlocks`
- Story 010: 结算点 `ensurePlayable()`

---

## Files

- `src/rules/board-link.mjs`（`convertBlocks`、`shuffleTopRows`）
- `tests/unit/board-link/convert-sweep.test.mjs`

---

## QA Test Cases

*N/A — no qa-lead specs at this tier; implement against the Acceptance Criteria above*

---

## Test Evidence

**Story Type**: Logic
**Required evidence**:
- Logic: `tests/unit/board-link/convert-sweep.test.mjs` — must exist and pass

**Status**: [ ] Not yet created

---

## Dependencies

- Depends on: `production/epics/board-link/story-012-barricade-core.md`, `production/epics/board-link/story-008-clear-cells-contents.md`
- Unlocks: None
