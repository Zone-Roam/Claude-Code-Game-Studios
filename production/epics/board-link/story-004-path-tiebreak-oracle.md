# Story 004: 拐点取舍与对拍

> **Epic**: board-link（盘面与连通）
> **Status**: Ready
> **Layer**: Foundation
> **Type**: Logic
> **Estimate**: M
> **Manifest Version**: 2026-10-27
> **Last Updated**: (set by /dev-story)

## Context

**GDD**: `design/gdd/board-link.md`
**Requirement**: `TR-board-link-003`
*(Requirement text lives in `docs/architecture/tr-registry.yaml` — read fresh at review time)*

**ADR Governing Implementation**: ADR-0003: 规则层与界面层的通道
**ADR Decision Summary**: 事件只含数据；同一输入必须给出同一折线（界面和测试都依赖确定性）。规则层纯数据（ADR-0001）。
**ADR Version**: 2026-10-27

**Engine**: none — native H5 (ADR-0001) | **Risk**: LOW
**Engine Notes**: 对拍用的广度优先搜索写在测试里，不进发布包。

**Control Manifest Rules (this layer)**:
- Required: 黄金值/确定性测试；固定种子；ES2017
- Forbidden: 测试里用 `Math.random()`（随机盘面用注入的 `createStream`）
- Guardrail: 规则每帧 ≤ 2 ms

---

## Acceptance Criteria

*From GDD `design/gdd/board-link.md`, scoped to this story:*

- [ ] **GIVEN** 同种的两块在 (2,1) 和 (4,3)，(2,2)、(2,3)、(3,3)、(3,1)、(4,1)、(4,2) 全空，**WHEN** 判定，**THEN** 返回拐点为 (2,3) 的 3 点折线（两条一拐点路径都长 4，取行小的拐点）。
- [ ] **GIVEN** 随机盘面，**WHEN** 用独立写的广度优先搜索对比所有同种对的连通结果，**THEN** 两者在 10 万对以上的样本中完全一致。

---

## Implementation Notes

*Derived from GDD rule 7 / formula path_choice as referenced by ADR-0003:*

第三级：拐弯数与总长都相同，按拐点坐标行优先（先行小、再列小）比较，外圈坐标照常参与；两个拐点时先比从第一块出发的第一个拐点，相同再比第二个。多条时取 `(turns, length, 拐点行优先序)` 最小者。对拍测试：测试内独立写的 BFS（状态 = 格子 + 方向 + 已拐次数）只比较“是否连通”（折线选择由上面的三级顺序单独测）；随机盘面由固定种子的 `createStream` 生成，样本 ≥ 10 万对，盘面含外圈、拒马、底牌（底牌不影响结果）。

---

## Out of Scope

*Handled by neighbouring stories — do not implement here:*

- Story 003: 拐弯数与点数的基本判定、“拐弯少 → 总长短”
- Story 005: `tap` 状态机

---

## Files

- `src/rules/board-link.mjs`（`findPath` 第三级比较）
- `tests/unit/board-link/path-tiebreak-oracle.test.mjs`

---

## QA Test Cases

**Story Type**: Logic | **Test file**: `tests/unit/board-link/path-tiebreak-oracle.test.mjs` | **Gate**: BLOCKING（qa.level standard，tests/unit 必须存在且通过）
**Determinism**: 固定种子，注入 ctx/流，不碰时间/Math.random（control-manifest Forbidden）。夹具放 `tests/helpers/board-fixtures.mjs`。

| # | 对应 AC | Given | When | Then |
|---|---|---|---|---|
| T1 | AC1 | 同种两块在 (2,1)、(4,3)；(2,2)(2,3)(3,3)(3,1)(4,1)(4,2) 全空 | 判定 | 3 点折线，拐点 (2,3)（两条一拐点路径都长 4，取行小者）|
| T2 | AC2 | 固定种子生成随机盘面，独立写的 BFS 对拍器（在测试文件内，不复用被测代码） | 对所有同种对比较「是否连通」 | ≥ 100,000 对样本两者完全一致 |
| T3 | AC2 | 同 T2 | 对连通的对比较 `(turns, length)` 的最小值 | BFS 最优 `(turns, length)` 与被测折线一致（公式 path_choice；AC 只写「连通结果」，拐点序由 T1 钉）— 若作者认为 AC2 仅指是否连通，则删去 T3 |

**预计**：3 个测试（T2 为大样本循环，单测内断言累计）。
**缺口**：(a) 10 万对的运行时间上限未定（建议在 AC 里写预算，避免拖慢 `node --test` 冒烟）；(b) 样本盘面的生成方式（密度、含底牌与否、含拒马与否）未规定；(c) 对拍器必须用与规则层不同的算法，否则同源缺陷对拍不出。

## Test Evidence

**Story Type**: Logic
**Required evidence**:
- Logic: `tests/unit/board-link/path-tiebreak-oracle.test.mjs` — must exist and pass

**Status**: [ ] Not yet created

---

## Dependencies

- Depends on: `production/epics/board-link/story-003-connectivity.md`
- Unlocks: `production/epics/board-link/story-005-tap-match-reveal.md`
