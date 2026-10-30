# Story 006: 赵云待命与盘锁

> **Epic**: board-link（盘面与连通）
> **Status**: Ready
> **Layer**: Foundation
> **Type**: Logic
> **Estimate**: S
> **Manifest Version**: 2026-10-27
> **Last Updated**: (set by /dev-story)

## Context

**GDD**: `design/gdd/board-link.md`
**Requirement**: `TR-board-link-004`, `TR-board-link-008`
*(Requirement text lives in `docs/architecture/tr-registry.yaml` — read fresh at review time)*

**ADR Governing Implementation**: ADR-0002: 主循环与对局时钟
**ADR Decision Summary**: 意图队列在下一帧第 ② 步按到达顺序处理；盘锁由对局流程决定，锁住时点击不进盘面；修改接口沿用 GDD 名字（`setForceNext`、`forceNext`）。
**ADR Version**: 2026-10-27

**Engine**: none — native H5 (ADR-0001) | **Risk**: LOW
**Engine Notes**: 无平台 API。

**Control Manifest Rules (this layer)**:
- Required: 意图队列按到达顺序；事件字段按 ADR-0003
- Forbidden: 规则层引用页面/时间/随机/存储
- Guardrail: 规则每帧 ≤ 2 ms

---

## Acceptance Criteria

*From GDD `design/gdd/board-link.md`, scoped to this story:*

- [ ] **GIVEN** 赵云待命，**WHEN** 选中两块连不通的同种兵，**THEN** 返回 `match` 且 `forced = true`、`path` 为 2 点直线，待命关闭，不产生 `miss`。
- [ ] **GIVEN** 赵云待命，**WHEN** 选中两块连得通的同种兵，**THEN** 返回 `match` 且 `forced = true`，待命关闭。
- [ ] **GIVEN** 赵云待命，**WHEN** 选中两块不同种的兵，**THEN** 选中换成第二块，待命仍开着。
- [ ] **GIVEN** 盘被锁住，**WHEN** 玩家点任意块，**THEN** 状态不变，这次点击不会在解锁后补发。

---

## Implementation Notes

*Derived from GDD rules 14, 18 as referenced by ADR-0002/0003:*

`setForceNext(on)` 开关待命，`forceNext()` 查询；每回开局由本系统重置为关。待命只在压境、粮草模式用。选中两块同种就按消除处理，`forced = true` 并关掉待命（“下一对必用掉”）；连得通时 `path` 为正常折线，连不通时为两块中心的 2 点直线；强制消除的一对不碎拒马（Story 012 复核）。盘锁不是本系统的状态：锁住时本系统收不到点击，点击直接丢弃、不缓存；该条 AC 用对局流程的输入入口加一个锁住的桩验证，若 round-flow 尚未实现，用最小的“锁住时不调 `tap`”的测试桩并在测试里注明由 round-flow 故事复核。

---

## Out of Scope

*Handled by neighbouring stories — do not implement here:*

- Story 005: 普通 `match`/`miss`、选中表
- Story 012: 强制消除不碎拒马

---

## Files

- `src/rules/board-link.mjs`（`setForceNext`、`forceNext`、`tap` 的待命分支）
- `tests/unit/board-link/force-next-lock.test.mjs`

---

## QA Test Cases

**Story Type**: Logic | **Test file**: `tests/unit/board-link/force-next-lock.test.mjs` | **Gate**: BLOCKING（qa.level standard，tests/unit 必须存在且通过）
**Determinism**: 固定种子，注入 ctx/流，不碰时间/Math.random（control-manifest Forbidden）。夹具放 `tests/helpers/board-fixtures.mjs`。

| # | 对应 AC | Given | When | Then |
|---|---|---|---|---|
| T1 | AC1 | 赵云待命；选中两块连不通的同种兵 | 点第二块 | `match`，`forced=true`，path 为 2 点直线，待命关闭，无 `miss` |
| T2 | AC2 | 赵云待命；两块同种且连得通 | 点第二块 | `match`，`forced=true`，待命关闭 |
| T3 | AC3 | 赵云待命；选中两块不同种 | 点第二块 | 选中换成第二块，待命仍开 |
| T4 | AC4 | 盘被锁 | 点任意块；再解锁 | 状态不变；解锁后没有补发的点击 |

**预计**：4 个测试。
**缺口**：AC1/AC2 对「forced 的 path」只在连不通时规定 2 点直线；连得通时 path 取普通最优还是 2 点直线，AC 未写 — 请作者定，T2 暂只断言 match/forced/待命关闭。锁的开/关入口（API 名）AC 没写。

## Test Evidence

**Story Type**: Logic
**Required evidence**:
- Logic: `tests/unit/board-link/force-next-lock.test.mjs` — must exist and pass

**Status**: [ ] Not yet created

---

## Dependencies

- Depends on: `production/epics/board-link/story-005-tap-match-reveal.md`
- Unlocks: `production/epics/board-link/story-015-autoplay-simulations.md`
