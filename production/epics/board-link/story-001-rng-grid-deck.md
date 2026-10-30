# Story 001: 随机流、格子与牌组校验

> **Epic**: board-link（盘面与连通）
> **Status**: In Progress
> **Layer**: Foundation
> **Type**: Logic
> **Estimate**: M
> **Manifest Version**: 2026-10-27
> **Last Updated**: 2026-10-30

## Context

**GDD**: `design/gdd/board-link.md`
**Requirement**: `TR-board-link-001`, `TR-board-link-002`, `TR-board-link-007`
*(Requirement text lives in `docs/architecture/tr-registry.yaml` — read fresh at review time)*

**ADR Governing Implementation**: ADR-0002: 主循环与对局时钟
**ADR Decision Summary**: 种子 = `hash32(chapterId, attempt, salt)`（FNV-1a + fmix32），随机流 = `createStream(seed, name)`（mulberry32）；盘面开局用 `deal/shuffle/wave/add` 四个名字建四条独立流，`rng(name)` 返回对应的流。规则层不碰页面、时间、随机、存储（ADR-0001）。
**ADR Version**: 2026-10-27

**Engine**: none — native H5 (ADR-0001) | **Risk**: LOW
**Engine Notes**: ADR-0001/0002 的平台部分 Knowledge Risk 为 HIGH（WebView 行为未知），但本故事只写纯 ES2017 数据代码（`Math.imul` 是通用标准）；无 Post-Cutoff API。

**Control Manifest Rules (this layer)**:
- Required: `src/core/rng.mjs` 导出 `hash32`、`createStream`；`tests/unit/core/rng.test.mjs` 钉死黄金值；常量（兵种表 12 个 id 固定顺序、`BOARD_COLS = 6`、Tuning Knobs 缺省值）集中在 `src/core/constants.mjs`；静态具名导入导出、相对路径带 `.mjs`；工厂函数加注入，不用模块级可变单例
- Forbidden: 在 `src/rules/`、`src/core/` 里用 `document`、`window`、`localStorage`、`Date.now()`、`performance.now()`、`Math.random()`、`setTimeout`；ES2020 起的语法
- Guardrail: 规则每帧 ≤ 2 ms（基准机）

---

## Acceptance Criteria

*From GDD `design/gdd/board-link.md`, scoped to this story:*

- [ ] **GIVEN** 固定 `seed`，**WHEN** 一局里死局洗牌 0 次、另一局洗牌 3 次，**THEN** 两局 `wave` 流和 `add` 流产生的序列完全相同。
- [ ] **GIVEN** 满盘回目 `cols = 5`、`rows = 6`，**WHEN** Σ deck 为 28 或 62，**THEN** deck_valid 为 false，加载被拒；为 30 或 60 时为 true。
- [ ] **GIVEN** `cols` 缺省，**WHEN** 加载，**THEN** 按 6 列。

---

## Implementation Notes

*Derived from ADR-0002 / ADR-0001 Implementation Guidelines:*

`createStream(seed, name)` 返回 `{ next(), int(n), shuffle(array), pickWeighted(entries) }`，内部 `state = hash32(seed, name)`；四条流各自一个 `name`，彼此不共享状态，所以洗牌次数不影响 `wave`/`add`。盘面工厂在开局时建四条流并提供 `rng(name)`。deck_valid：`∀k: deck[k] mod 2 == 0` 且满盘模式 `cols×rows ≤ Σdeck ≤ cols×rows×(1+STACK_DEPTH)`，压境模式 `Σdeck == cols×startRows`（压境部分在本故事只实现公式，发牌在 Story 002）。`STACK_DEPTH = 1`、`MAX_TURNS = 2` 为常量，不是调参项。格子坐标一律 (行, 列)，外圈范围 `0..cols+1`、`0..rows+1`。格子值：兵种 id、空、拒马 `'jm'`（拒马逻辑在 Story 012）。兵种表按固定顺序 `huo, ying, ma, gong, shui, cheng, dao, gu, dun, shu, qi, jiu`，按兵种遍历一律按此顺序。

---

## Out of Scope

*Handled by neighbouring stories — do not implement here:*

- Story 002: 发牌（洗牌堆、放格子、压底）
- Story 011: 发牌后无可连对时的洗牌

---

## Files

- `src/core/constants.mjs` — created（12 种兵固定顺序、BOARD_COLS、STACK_DEPTH、MAX_TURNS、四条流名等常量）
- `src/core/rng.mjs` — created（hash32、createStream）
- `src/rules/board-link.mjs` — created（createBoard：格子与外圈、rng(name)；deckValid）
- `tests/unit/core/rng.test.mjs` — created（5 个测试，黄金值）
- `tests/unit/board-link/rng-grid-deck.test.mjs` — created（8 个测试）

## QA Test Cases

**Story Type**: Logic | **Test file**: `tests/unit/board-link/rng-grid-deck.test.mjs` | **Gate**: BLOCKING（qa.level standard，tests/unit 必须存在且通过）
**Determinism**: 固定种子，注入 ctx/流，不碰时间/Math.random（control-manifest Forbidden）。夹具放 `tests/helpers/board-fixtures.mjs`。

| # | 对应 AC | Given | When | Then |
|---|---|---|---|---|
| T1 | AC1 | 固定 seed，局 A 死局洗牌 0 次，局 B 洗牌 3 次 | 各取 `rng('wave')`、`rng('add')` 前 N 个输出 | 两局两条流序列逐项相同（四条流 deal/shuffle/wave/add 独立） |
| T2 | AC1 | 同上 | 取 `shuffle` 流 | 两局不同（证明洗牌确实消耗了 shuffle 流，防止 T1 空转）— 此条由 AC1 推出，非额外需求 |
| T3 | AC2 | cols=5, rows=6, Σdeck=28 与 62（各兵种为偶数） | deck_valid | false，加载被拒（边界：fill_ok 下限 30、上限 60） |
| T4 | AC2 | 同上，Σdeck=30 与 60 | deck_valid | true |
| T5 | AC2 + 公式 | 任一兵种 deck[k] 为奇数（Σ 在 30–60 内） | deck_valid | false（公式 `∀k: deck[k] mod 2 == 0`；AC 未明写，来自 GDD Formulas） |
| T6 | AC3 | 回目数据缺省 `cols` | 加载 | 按 6 列（`BOARD_COLS = 6`） |
| T7 | 控制清单（ADR-0002 黄金值） | `hash32` 固定输入；`createStream(seed, name)` 四条流各一个固定 seed | 计算 | 输出等于测试里写死的黄金值（第一次实现时记录，之后改算法必须新写 ADR）；测试文件 `tests/unit/core/rng.test.mjs` |

**预计**：7 个测试（2 个文件：`tests/unit/board-link/rng-grid-deck.test.mjs`、`tests/unit/core/rng.test.mjs`）。
**缺口**：(a) rng 黄金值测试已归入本故事（T7，用户 2026-10-30 批准）；(b) 压境模式 `Σdeck == cols×startRows` 的 deck_valid 分支无 AC；(c) 夹具文件 `tests/helpers/board-fixtures.mjs` 尚不存在（sprint 风险表），本故事或 story-005 建。

## Test Evidence

**Story Type**: Logic
**Required evidence**:
- Logic: `tests/unit/board-link/rng-grid-deck.test.mjs` — must exist and pass

**Status**: [ ] Not yet created

---

## Dependencies

- Depends on: None
- Unlocks: `production/epics/board-link/story-002-deal.md`, `production/epics/board-link/story-003-connectivity.md`
