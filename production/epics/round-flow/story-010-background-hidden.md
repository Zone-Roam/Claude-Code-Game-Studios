# Story 010: 后台、隐式后台与“接着讲”

> **Epic**: round-flow（对局流程与时钟）
> **Status**: Ready
> **Layer**: Core
> **Type**: Logic
> **Estimate**: M
> **Manifest Version**: 2026-10-27
> **Last Updated**: (set by /dev-story)

## Context

**GDD**: `design/gdd/round-flow.md`
**Requirement**: `TR-round-flow-007`
*(Requirement text lives in `docs/architecture/tr-registry.yaml` — read fresh at review time)*

**ADR Governing Implementation**: ADR-0002: 主循环与对局时钟
**ADR Decision Summary**: 全页面只有一个 `requestAnimationFrame` 循环，每帧把 `dtReal` 和输入队列交给 `round.frame()`；一回之内的状态（`open`/`play`/`end`/`settle`）、`gameTime`、令牌集合、每帧五步加 ③b 和结算点都归 `round-flow`；`round` 自己按装配顺序建规则对象，`systems` 由装配根传入；种子用 `hash32`。
**ADR Version**: 2026-10-27

**Engine**: none — native H5 (ADR-0001) | **Risk**: HIGH
**Engine Notes**: 后台时 rAF 是否暂停、可见性事件是否到达、回来第一帧的 `dtReal` 多大均未在真机核实（ADR-0002 Verification Required）；规则层不依赖这些，隐式后台（`dtReal > BG_GAP_MS`）兜底。

**Control Manifest Rules (this layer)**:
- Required: `background` 令牌最多一个、重复申请返回同一个；后台由 `src/platform/lifecycle.mjs` 直接调用 `round.onHidden()`/`onVisible()`，不进输入队列
- Forbidden: 在非 `play` 状态申请后台令牌；在 `play` 以外推进 `gameTime`
- Guardrail: 规则每帧 ≤ 2 ms

---

## Acceptance Criteria

*From GDD `design/gdd/round-flow.md`, scoped to this story:*

- [ ] **GIVEN** 对局中，**WHEN** 喂入一帧 dtReal = 4000，**THEN** `gameTime` 不变，持有 `background` 令牌，界面收到“显示接着讲卡”。
- [ ] **GIVEN** 连续两次申请 `background`，**WHEN** 点一次“接着讲”，**THEN** 令牌集合为空。
- [ ] **GIVEN** 开讲状态，**WHEN** 页面隐藏后恢复，**THEN** 不申请令牌，不显示“接着讲”卡。
- [ ] **GIVEN** 暂停卡开着，**WHEN** 切到后台再回来，**THEN** 仍显示暂停卡（接着讲、回书目两个按钮）。

---

## Implementation Notes

*Derived from GDD 规则 10、3 与 ADR-0002 第 3、4 节：*

第 ① 步：状态为 `play` 且 `dtReal > BG_GAP_MS`（默认 1000）→ 申请 `background`，本帧到此为止（不推进、不处理点击）。`onHidden()` 只在 `play` 时申请；`onVisible()` 只记“可见了”，“接着讲”卡由状态推出：`overlay()` 持有 `background` 时为 `'resume'`，持有 `pause` 时为 `'pause'`/`'landscape'`（暂停卡优先，两者同时存在时仍显示暂停卡）。“接着讲”走输入队列的 `{type:'button', card, button}` 意图，在第 ② 步按到达顺序处理，归还 `background`。`open`/`end`/`settle` 状态切后台：不申请令牌、不出卡、回来状态不变。切后台时间再长，回来后第一帧也受 `MAX_STEP_MS` 约束。`card`/`button` 的取值 ADR-0003 的意图表没有列出具体字符串，见 `_list.md` 疑点。

*缺口（GDD 边缘情况有、无 AC）：暂停卡和后台同时存在时点“接着讲”同时归还两者；反复切前后台 `background` 最多一个。请作者确认是否补 AC。*

---

## Out of Scope

*Handled by neighbouring stories — do not implement here:*

- Story 011: `pause` 令牌的申请（暂停印、横屏）
- Story 012: “回书目”
- Story 016: 接着讲卡按钮出现后的防连点

---

## Files

- `src/rules/round-flow.mjs`（第 ① 步、`onHidden`、`onVisible`、`overlay`）
- `tests/unit/round-flow/background-hidden.test.mjs`

---

## QA Test Cases

*N/A — no qa-lead specs at this tier; implement against the Acceptance Criteria above*

## Test Evidence

**Story Type**: Logic
**Required evidence**:
- Logic: `tests/unit/round-flow/background-hidden.test.mjs` — must exist and pass
- 所有协作系统（clear-effects、general-skills、battle-pressure、progress-save、view）尚未实现，测试一律用注入的假对象（`tests/helpers/round-fakes.mjs`），用假的 `dtReal` 逐帧驱动；固定种子，不碰时间/`Math.random`

**Status**: [ ] Not yet created

---

## Dependencies

- Depends on: `production/epics/round-flow/story-002-token-set.md`, `production/epics/round-flow/story-003-state-machine-exit-seed.md`
- Unlocks: `production/epics/round-flow/story-011-pause-landscape.md`, `production/epics/round-flow/story-016-overlay-card-guard.md`
