# Story 016: 覆盖卡按钮防连点

> **Epic**: round-flow（对局流程与时钟）
> **Status**: Ready
> **Layer**: Core
> **Type**: Logic
> **Estimate**: M
> **Manifest Version**: 2026-10-27
> **Last Updated**: (set by /dev-story)

## Context

**GDD**: `design/gdd/round-flow.md`
**Requirement**: `TR-round-flow-009`
*(Requirement text lives in `docs/architecture/tr-registry.yaml` — read fresh at review time)*

**ADR Governing Implementation**: ADR-0002: 主循环与对局时钟 · ADR-0003: 规则层与界面层的通道
**ADR Decision Summary**: 全页面只有一个 `requestAnimationFrame` 循环，每帧把 `dtReal` 和输入队列交给 `round.frame()`；一回之内的状态（`open`/`play`/`end`/`settle`）、`gameTime`、令牌集合、每帧五步加 ③b 和结算点都归 `round-flow`；`round` 自己按装配顺序建规则对象，`systems` 由装配根传入；种子用 `hash32`。
**ADR Version**: ADR-0002 2026-10-27 · ADR-0003 2026-10-27

**Engine**: none — native H5 (ADR-0001) | **Risk**: HIGH
**Engine Notes**: ADR-0002: 后台时 rAF 是否暂停、可见性事件是否到达、回来第一帧的 `dtReal` 多大均未在真机核实（ADR-0002 Verification Required）；规则层不依赖这些，隐式后台（`dtReal > BG_GAP_MS`）兜底。 ADR-0003: 意图与事件都是纯数据对象，不含函数和 DOM 引用；界面的盘锁判断与规则层不矛盾，以规则层为准。

**Control Manifest Rules (this layer)**:
- Required: `overlayAgeMs` 在 `overlay()` 变化或进入 `settle` 时清零，持有 `background`/`pause` 时照样累计；按钮意图在 `< CARD_GUARD_MS` 时丢弃；暂停印不受约束
- Forbidden: 用 `setTimeout`/`Date.now()` 计时；在规则层读 DOM
- Guardrail: 规则每帧 ≤ 2 ms

---

## Acceptance Criteria

*From GDD `design/gdd/round-flow.md`, scoped to this story:*

- [ ] **GIVEN** 开讲水牌出现，**WHEN** 按钮出现后 300 ms 点“开讲”，**THEN** 无反应；600 ms 时生效。
- [ ] **GIVEN** 开讲水牌按钮出现后 300 ms，**WHEN** 点一个技能槽，**THEN** 无反应；600 ms 时点击展开可选武将（前提：这一回可选武将多于槽数，否则不展开，见选将规则 12）。
- [ ] **GIVEN** 失败卡出现，**WHEN** 300 ms 时点“再来一回”，**THEN** 无反应；600 ms 时点击生效。
- [ ] **GIVEN** 胜利卡，**WHEN** 收尾完成、按钮出现后 300 ms 点击，**THEN** 无反应；按钮出现后 600 ms 点击生效。

---

## Implementation Notes

*Derived from GDD 规则 9、公式 card_guard 与 ADR-0002 第 2 节“三个和覆盖卡有关的计时”：*

`accept(cardTap) = (now − buttonShownAt ≥ CARD_GUARD_MS)`（默认 500，200–1000）。`overlayAgeMs` 按前台真实时间累计（`dtReal` 为负按 0，超过 `BG_GAP_MS` 的那一帧按 0），与令牌计时不同：持有 `background`/`pause` 时照样累计，否则暂停卡和接着讲卡永远点不动。胜利卡按钮在 `settle` 才出现，从按钮出现算起；失败卡在 `settle` 才出现，卡和按钮同时算起；水牌上的技能槽、可选武将牌、“×”也算水牌上的按钮，展开的可选武将不另算。覆盖卡按钮不受盘锁影响。控制清单要求：暂停卡 500 ms 后“接着讲”有效、失败卡 300 ms 无效 600 ms 有效、胜利卡按钮出现后同理，各有集成测试风格的逐帧用例，用假 `dtReal` 驱动。点“开讲”的 `starting` 子状态在 Story 017。

---

## Out of Scope

*Handled by neighbouring stories — do not implement here:*

- Story 010、011: 暂停卡/接着讲卡的内容与令牌（本故事验证其 500 ms 后点击有效属控制清单要求，不新增 AC）
- Story 017: 点“开讲”之后的 150 ms 与 `loadout` 交接

---

## Files

- `src/rules/round-flow.mjs`（`overlayAgeMs`、按钮意图的防连点）
- `src/core/constants.mjs`（`CARD_GUARD_MS`）
- `tests/unit/round-flow/overlay-card-guard.test.mjs`

---

## QA Test Cases

*N/A — no qa-lead specs at this tier; implement against the Acceptance Criteria above*

## Test Evidence

**Story Type**: Logic
**Required evidence**:
- Logic: `tests/unit/round-flow/overlay-card-guard.test.mjs` — must exist and pass
- 所有协作系统（clear-effects、general-skills、battle-pressure、progress-save、view）尚未实现，测试一律用注入的假对象（`tests/helpers/round-fakes.mjs`），用假的 `dtReal` 逐帧驱动；固定种子，不碰时间/`Math.random`

**Status**: [ ] Not yet created

---

## Dependencies

- Depends on: `production/epics/round-flow/story-003-state-machine-exit-seed.md`, `production/epics/round-flow/story-010-background-hidden.md`, `production/epics/round-flow/story-011-pause-landscape.md`
- Unlocks: `production/epics/round-flow/story-017-start-fade-loadout.md`
