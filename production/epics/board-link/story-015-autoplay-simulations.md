# Story 015: 1000 局自动对局（不变量 I1/I2/I3）

> **Epic**: board-link（盘面与连通）
> **Status**: Ready
> **Layer**: Foundation
> **Type**: Integration
> **Estimate**: L
> **Manifest Version**: 2026-10-27
> **Last Updated**: (set by /dev-story)

## Context

**GDD**: `design/gdd/board-link.md`
**Requirement**: `TR-board-link-002`, `TR-board-link-004`, `TR-board-link-005`
*(Requirement text lives in `docs/architecture/tr-registry.yaml` — read fresh at review time)*

**ADR Governing Implementation**: ADR-0002: 主循环与对局时钟
**ADR Decision Summary**: 同一种子同一串操作结果逐字相同，所以自动对局可以固定种子重放；结算点调 `ensurePlayable()`。规则层纯数据，可在 Node 里直接测（ADR-0001）。
**ADR Version**: 2026-10-27

**Engine**: none — native H5 (ADR-0001) | **Risk**: LOW
**Engine Notes**: 仿真只在 Node 里跑，不进发布包。

**Control Manifest Rules (this layer)**:
- Required: 测试确定性：固定种子、不用 `Math.random()`；随机选择用注入的 `createStream`
- Forbidden: 跳过或关闭失败的测试
- Guardrail: 规则每帧 ≤ 2 ms；仿真总耗时应让 CI 能跑完（超时则减样本前先与评审者确认，不得悄悄降到 1000 局以下）

---

## Acceptance Criteria

*From GDD `design/gdd/board-link.md`, scoped to this story:*

- [ ] **GIVEN** 1000 局固定种子的自动对局（`cols = 6`、8 行盘、开局 4 行；每步随机选一对可连对；每 5 步按 1:1:1:1 穿插 `clearKind`（随机一种盘上有的兵）、合法的 `clearCells`（关羽规则斩最下一行）、`pushRowFromTop`（最下一行空时；新行用 `rng('wave')` 按 deck 权重抽 3 对）、`addPairs`（2 对，按 deck 权重抽）），**WHEN** 每个结算点检查，**THEN** I1 和 I2 每次都成立，且所有局最终都能清空。
- [ ] **GIVEN** 1000 局固定种子、`cols = 5`、8 行、开局 4 行（Σ deck = 20），每步随机选一对可连对，每 5 步按 1:1:1:1 穿插 `clearKind`、合法 `clearCells`、`pushRowFromTop`（最下一行无兵时；新行为 2 对兵 + 1 个空格位，空格位按 1:1 取 `null` 或 `'jm'`，用 `rng('wave')` 抽）、`addPairs`，**WHEN** 每个结算点检查，**THEN** I1、I2、I3 都成立，每局不超过 400 步，且全部清空。
- [ ] **GIVEN** 1000 局固定种子的满盘层叠自动对局（5 × 6，Σ deck = 44；每步随机选一对可连对；每 5 步按 1:1:1:1:1 穿插 `clearKind`、按关羽选排规则随机斩一行（含底牌、拒马和补斩）、`addPairs`、`shuffleTopRows`、`placeBlocks(2)`），**WHEN** 每个结算点检查，**THEN** I1、I2、I3 每次都成立，且所有局最终都能清空（剩下的只有拒马也算清空）。

---

## Implementation Notes

*Derived from GDD Acceptance Criteria and ADR-0002:*

三条仿真都放在 `tests/integration/board-link/`，只用公开的修改/查询接口驱动，每个结算点后调用 `ensurePlayable()` 再检查不变量：I1（每种兵含底牌为偶数）、I2（结算点上层至少一对可连）、I3（空格和拒马格底下没有牌）。随机选择（选哪一对、穿插哪个操作、选哪个兵种）全部来自测试内用固定种子建的 `createStream`，不得用 `Math.random()`。关羽选排规则与补斩的写法见 GDD 规则 15（每个有兵的格给 `stack`、拒马格给 `block`、补斩的格上层给 `top`、底牌给 `under`）；该规则在武将技能 GDD 里，测试内实现一个最小等价版本。本故事不新增产品代码，若仿真暴露缺陷，回到对应故事修复。

---

## Out of Scope

*Handled by neighbouring stories — do not implement here:*

- Stories 001–014: 各接口自身的单元行为
- Story 016: 发牌性能

---

## Files

- `tests/integration/board-link/autoplay-simulations.test.mjs`
- `tests/helpers/autoplay.mjs`（计划中的仿真驱动，可选）

---

## QA Test Cases

*N/A — no qa-lead specs at this tier; implement against the Acceptance Criteria above*

---

## Test Evidence

**Story Type**: Integration
**Required evidence**:
- Integration: `tests/integration/board-link/autoplay-simulations.test.mjs` — must exist and pass

**Status**: [ ] Not yet created

---

## Dependencies

- Depends on: `production/epics/board-link/story-006-force-next-lock.md`, `production/epics/board-link/story-007-clear-kind.md`, `production/epics/board-link/story-008-clear-cells-contents.md`, `production/epics/board-link/story-009-push-add-place.md`, `production/epics/board-link/story-011-ensure-playable-clear-deal.md`, `production/epics/board-link/story-013-barricade-push.md`, `production/epics/board-link/story-014-convert-sweep.md`
- Unlocks: `production/epics/board-link/story-016-deal-performance.md`
