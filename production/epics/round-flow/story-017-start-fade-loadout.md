# Story 017: 开讲：150 ms 撤遮罩与出阵武将交接

> **Epic**: round-flow（对局流程与时钟）
> **Status**: Ready
> **Layer**: Core
> **Type**: Integration
> **Estimate**: M
> **Manifest Version**: 2026-10-27
> **Last Updated**: (set by /dev-story)

## Context

**GDD**: `design/gdd/round-flow.md`
**Requirement**: `TR-round-flow-010`, `TR-round-flow-013`
*(Requirement text lives in `docs/architecture/tr-registry.yaml` — read fresh at review time)*

**ADR Governing Implementation**: ADR-0002: 主循环与对局时钟 · ADR-0003: 规则层与界面层的通道
**ADR Decision Summary**: 全页面只有一个 `requestAnimationFrame` 循环，每帧把 `dtReal` 和输入队列交给 `round.frame()`；一回之内的状态（`open`/`play`/`end`/`settle`）、`gameTime`、令牌集合、每帧五步加 ③b 和结算点都归 `round-flow`；`round` 自己按装配顺序建规则对象，`systems` 由装配根传入；种子用 `hash32`。
**ADR Version**: ADR-0002 2026-10-27 · ADR-0003 2026-10-27

**Engine**: none — native H5 (ADR-0001) | **Risk**: HIGH
**Engine Notes**: ADR-0002: 后台时 rAF 是否暂停、可见性事件是否到达、回来第一帧的 `dtReal` 多大均未在真机核实（ADR-0002 Verification Required）；规则层不依赖这些，隐式后台（`dtReal > BG_GAP_MS`）兜底。 ADR-0003: 意图与事件都是纯数据对象，不含函数和 DOM 引用；界面的盘锁判断与规则层不矛盾，以规则层为准。

**Control Manifest Rules (this layer)**:
- Required: 点“开讲”进入子状态 `starting`（`overlay()` 为 `null`，发 `state` 事件），计满 `OPEN_FADE_MS` 才进入 `play`；`loadout` 在点“开讲”那一刻定下并交给 `createSkills`
- Forbidden: 在 `play` 以外推进 `gameTime`；开讲之后换将
- Guardrail: 规则每帧 ≤ 2 ms

---

## Acceptance Criteria

*From GDD `design/gdd/round-flow.md`, scoped to this story:*

- [ ] **GIVEN** 点了“开讲”，**WHEN** 遮罩渐出的 150 ms 内点盘，**THEN** 点击被丢弃，`gameTime` 为 0；渐出结束后点盘有效。
- [ ] **GIVEN** 开讲水牌、`slots = 3`、槽位为 [张飞（主将）, 关羽, 空]，**WHEN** 点“开讲”，**THEN** 武将技能收到出阵武将 [张飞, 关羽]；这一回结束时 `RoundResult.loadout = ['zhang_fei', 'guan_yu']`，`skillsUsed` 只有这两个键。
- [ ] **GIVEN** 水牌上展开着可选武将（这一回可选武将多于槽数）、槽位 [张飞, 关羽, 空]，**WHEN** 点“开讲”，**THEN** 展开收起，`loadout = ['zhang_fei','guan_yu']`，不先换将。
- [ ] **GIVEN** 一回打完回到结算卡，**WHEN** 点“再来一回”，**THEN** 水牌上的槽位与内存里刚才的槽位完全一致（空槽也保持为空，选将规则 14），仍可以换。

---

## Implementation Notes

*Derived from GDD 规则 2、13 与 ADR-0002 第 2 节“开讲撤遮罩”：*

点“开讲”的那一刻，槽里的武将按槽位顺序定为 `loadout`（主将槽不可空，长度至少 1，可小于 `slots`），交给 `systems.createSkills` 建武将牌（最多 3 张），并写进结果对象；之后 round 进入 `open` 的子状态 `starting`，同时发 `state {from: 'open', to: 'starting'}`，`overlay()` 变 `null`（界面据此渐隐）；计满 `OPEN_FADE_MS`（150，登记在 `src/core/constants.mjs`）才进入 `play`、时钟开始走。这 150 ms 的归属 ADR 只写“计满”，计时单位按前台 `dtReal` 累计（见 `_list.md` 疑点）；期间盘上点击按“状态不是 `play`”丢弃，`gameTime` 保持 0。点将区的换将、清空槽走 `{type:'button'}` 意图，由 round 转给选将系统（此处假对象）改槽位，不改变状态；展开着可选武将时点“开讲”：收起展开，按槽里现有的武将开讲。槽位沿用内存里的状态由 `screens.mjs` 持有并在“再来一回”时传回（“下一回”和书目进入按规则 9 重填，不在本史诗）。

---

## Out of Scope

*Handled by neighbouring stories — do not implement here:*

- Story 009: `RoundResult` 其它字段
- Story 016: 水牌按钮出现 500 ms 内的防连点
- 选将与解锁系统本身（假对象，不属本史诗）

---

## Files

- `src/rules/round-flow.mjs`（`starting` 子状态、`loadout` 交接）
- `src/app/screens.mjs`（“再来一回”保留槽位）
- `src/core/constants.mjs`（`OPEN_FADE_MS`）
- `tests/integration/round-flow/start-fade-loadout.test.mjs`

---

## QA Test Cases

*N/A — no qa-lead specs at this tier; implement against the Acceptance Criteria above*

## Test Evidence

**Story Type**: Integration
**Required evidence**:
- Integration: `tests/integration/round-flow/start-fade-loadout.test.mjs` — must exist and pass
- 所有协作系统（clear-effects、general-skills、battle-pressure、progress-save、view）尚未实现，测试一律用注入的假对象（`tests/helpers/round-fakes.mjs`），用假的 `dtReal` 逐帧驱动；固定种子，不碰时间/`Math.random`

**Status**: [ ] Not yet created

---

## Dependencies

- Depends on: `production/epics/round-flow/story-003-state-machine-exit-seed.md`, `production/epics/round-flow/story-009-round-result-settle.md`, `production/epics/round-flow/story-016-overlay-card-guard.md`
- Unlocks: None
