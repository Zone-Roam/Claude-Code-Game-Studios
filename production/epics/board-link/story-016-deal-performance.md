# Story 016: 发牌与首次可连检查的性能

> **Epic**: board-link（盘面与连通）
> **Status**: Ready
> **Layer**: Foundation
> **Type**: Integration
> **Estimate**: S
> **Manifest Version**: 2026-10-27
> **Last Updated**: (set by /dev-story)

## Context

**GDD**: `design/gdd/board-link.md`
**Requirement**: `TR-board-link-009`
*(Requirement text lives in `docs/architecture/tr-registry.yaml` — read fresh at review time)*

**ADR Governing Implementation**: ADR-0002: 主循环与对局时钟
**ADR Decision Summary**: 规则每帧 ≤ 2 ms（基准机）；死局洗牌那一帧例外，`RESHUFFLE_TRIES` 次全失败的耗时在 Node 里测，超过 16 ms 就调低 `RESHUFFLE_TRIES`。EPIC 标注本条为“部分覆盖”（只有 `architecture.md` 性能预算行）。
**ADR Version**: 2026-10-27

**Engine**: none — native H5 (ADR-0001) | **Risk**: LOW
**Engine Notes**: 基准机“在技术准备阶段选定”，目前未选定；Node 测量只是代理值，真机数据待平台探测后补（`docs/engine-reference/web-h5/VERSION.md` 标明平台事实全部待核实）。

**Control Manifest Rules (this layer)**:
- Required: 规则每帧 ≤ 2 ms；Node 里测 `RESHUFFLE_TRIES` 全失败的耗时
- Forbidden: 在规则层 `src/rules/` 里用 `performance.now()`（计时代码只能在测试里）
- Guardrail: 发牌加首次可连检查 ≤ 200 ms（8 行 6 列满盘再压满底牌 96 张，基准安卓机）

---

## Acceptance Criteria

*From GDD `design/gdd/board-link.md`, scoped to this story:*

- [ ] **GIVEN** 8 行 6 列满盘再压满底牌（96 张），**WHEN** 在技术准备阶段选定的测试用低端安卓机上发牌，**THEN** 发牌加首次可连检查 ≤ 200 ms（美术圣经第 8 节）。

---

## Implementation Notes

*Derived from ADR-0002 Performance Guardrails:*

在 Node 里用 `performance.now()`（只在测试文件里，不在规则层）测同一场景：先量发牌加首次可连检查，另量 `RESHUFFLE_TRIES` 次全失败的洗牌耗时，超过 16 ms 就调低 `RESHUFFLE_TRIES`（范围 20–200，默认 100）。Node 的数字只做回归基线，不替代真机；AC 的真机量测待基准机选定后，把结果记进 `production/qa/evidence/` 或 story 的完成备注。Node 测量应设宽松上限并记录实测值，避免时间相关断言造成不稳定（测试规范要求确定性）。

---

## Out of Scope

*Handled by neighbouring stories — do not implement here:*

- Story 010/011: 洗牌逻辑本身
- Story 015: 对局仿真

---

## Files

- `tests/integration/board-link/deal-performance.test.mjs`
- `src/rules/board-link.mjs`（仅当需要优化时改动）

---

## QA Test Cases

*N/A — no qa-lead specs at this tier; implement against the Acceptance Criteria above*

---

## Test Evidence

**Story Type**: Integration
**Required evidence**:
- Integration: `tests/integration/board-link/deal-performance.test.mjs` OR playtest/device-measurement doc — must exist

**Status**: [ ] Not yet created

---

## Dependencies

- Depends on: `production/epics/board-link/story-015-autoplay-simulations.md`
- Unlocks: None
