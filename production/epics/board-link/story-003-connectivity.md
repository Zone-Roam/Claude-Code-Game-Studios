# Story 003: 连通判定（拐弯数与折线点数）

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
**ADR Decision Summary**: `match` 事件带 `path`（折线），界面据此画墨线；事件是只含数据的普通对象。规则层纯数据，可用 `node:test` 直接测（ADR-0001）。
**ADR Version**: 2026-10-27

**Engine**: none — native H5 (ADR-0001) | **Risk**: LOW
**Engine Notes**: 纯算法；无平台 API。

**Control Manifest Rules (this layer)**:
- Required: 工厂函数加注入；`MAX_TURNS = 2` 为常量（不是调参项）；ES2017 语法基线
- Forbidden: 规则层引用页面、时间、随机、存储；ES2020 起的语法
- Guardrail: 规则每帧 ≤ 2 ms（基准机）

---

## Acceptance Criteria

*From GDD `design/gdd/board-link.md`, scoped to this story:*

- [ ] **GIVEN** 两块同种的兵在同一行且中间全空，**WHEN** 依次点它们，**THEN** 返回 `match`，折线 2 点。
- [ ] **GIVEN** 两块同种的兵需要一个拐点，**WHEN** 依次点它们，**THEN** 返回 `match`，折线 3 点。
- [ ] **GIVEN** 两块同种的兵只能经外圈绕两个弯连上，**WHEN** 依次点它们，**THEN** 返回 `match`，折线 4 点且经过外圈坐标。
- [ ] **GIVEN** 6 × 6 盘上同种的两块在 (2,1) 和 (2,4)，(2,2)、(2,3) 有别的块，第 1 行第 1–4 列全空，**WHEN** 判定，**THEN** 返回经第 1 行的 4 点折线（长 5），不是经外圈的那条（长 7）。

---

## Implementation Notes

*Derived from GDD rule 7 / formula path_choice as referenced by ADR-0003:*

连通 = 存在 `turns ≤ MAX_TURNS` 的折线，`turns(path) = 点数 − 2`，除两端外只经过空格（含外圈 `0..cols+1`、`0..rows+1`）；拒马格不是空格，只有上层的牌和拒马挡路，底牌不挡路也不参与判定。取序第一级“拐弯少”、第二级“总长短”（`length` 为经过的格数含外圈）；第三级拐点行优先在 Story 004。返回 2–4 个点的折线。本故事实现内部判定函数（如 `findPath(a, b)`），不接 `tap`；AC 里的“依次点它们”在本故事用判定函数加测试盘面构造器直接验证，经 `tap` 的全流程在 Story 005 复核。

---

## Out of Scope

*Handled by neighbouring stories — do not implement here:*

- Story 004: 同长度时的拐点行优先、BFS 对拍
- Story 005: `tap` 状态机与 `match`/`miss` 返回数据

---

## Files

- `src/rules/board-link.mjs`（`findPath`）
- `tests/unit/board-link/connectivity.test.mjs`

---

## QA Test Cases

**Story Type**: Logic | **Test file**: `tests/unit/board-link/connectivity.test.mjs` | **Gate**: BLOCKING（qa.level standard，tests/unit 必须存在且通过）
**Determinism**: 固定种子，注入 ctx/流，不碰时间/Math.random（control-manifest Forbidden）。夹具放 `tests/helpers/board-fixtures.mjs`。

| # | 对应 AC | Given | When | Then |
|---|---|---|---|---|
| T1 | AC1 | 同种两块同一行、中间全空 | 依次点两块 | `match`，path 2 点 |
| T2 | AC2 | 同种两块需 1 个拐点 | 依次点 | `match`，path 3 点 |
| T3 | AC3 | 同种两块只能经外圈绕两个弯 | 依次点 | `match`，path 4 点，含外圈坐标（第 0 行/列或 rows+1/cols+1） |
| T4 | AC4 | 6×6，(2,1)、(2,4) 同种，(2,2)(2,3) 有块，第 1 行第 1–4 列全空 | 判定 | 返回经第 1 行的 4 点折线（长 5），不是经外圈（长 7） |

**预计**：4 个测试。
**缺口**：MAX_TURNS=2 的反例（需 3 次拐弯判为不连通）只在 story-005 AC3（miss）间接覆盖，本故事无 AC；如需在此直接断言，请作者补 AC。折线「点数 2–4」与 turns = 点数−2 由 T1–T3 覆盖。

## Test Evidence

**Story Type**: Logic
**Required evidence**:
- Logic: `tests/unit/board-link/connectivity.test.mjs` — must exist and pass

**Status**: [ ] Not yet created

---

## Dependencies

- Depends on: `production/epics/board-link/story-002-deal.md`
- Unlocks: `production/epics/board-link/story-004-path-tiebreak-oracle.md`, `production/epics/board-link/story-005-tap-match-reveal.md`
