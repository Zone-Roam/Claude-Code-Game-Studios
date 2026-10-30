# Story 002: 令牌集合与前台计时

> **Epic**: round-flow（对局流程与时钟）
> **Status**: Ready
> **Layer**: Core
> **Type**: Logic
> **Estimate**: M
> **Manifest Version**: 2026-10-27
> **Last Updated**: (set by /dev-story)

## Context

**GDD**: `design/gdd/round-flow.md`
**Requirement**: `TR-round-flow-002`
*(Requirement text lives in `docs/architecture/tr-registry.yaml` — read fresh at review time)*

**ADR Governing Implementation**: ADR-0002: 主循环与对局时钟
**ADR Decision Summary**: 全页面只有一个 `requestAnimationFrame` 循环，每帧把 `dtReal` 和输入队列交给 `round.frame()`；一回之内的状态（`open`/`play`/`end`/`settle`）、`gameTime`、令牌集合、每帧五步加 ③b 和结算点都归 `round-flow`；`round` 自己按装配顺序建规则对象，`systems` 由装配根传入；种子用 `hash32`。
**ADR Version**: 2026-10-27

**Engine**: none — native H5 (ADR-0001) | **Risk**: HIGH
**Engine Notes**: 后台时 rAF 是否暂停、可见性事件是否到达、回来第一帧的 `dtReal` 多大均未在真机核实（ADR-0002 Verification Required）；规则层不依赖这些，隐式后台（`dtReal > BG_GAP_MS`）兜底。

**Control Manifest Rules (this layer)**:
- Required: 令牌是按申请顺序的数组；有时长的令牌按前台真实时间计时、本帧新申请的下一帧才计；超过 `TOKEN_MAX_MS` 强制归还且“演出结束”只通知一次
- Forbidden: 在结算顺序之外让规则模块互相调用通知；游戏逻辑用 `setTimeout`/`setInterval`/`Date.now()`
- Guardrail: 规则每帧 ≤ 2 ms

---

## Acceptance Criteria

*From GDD `design/gdd/round-flow.md`, scoped to this story:*

- [ ] **GIVEN** 持有 `effect` 令牌（380 ms），**WHEN** 喂入 30 帧前台帧（共 500 ms），**THEN** 令牌在第 23 帧到点、持有者收到“演出结束”；第 1–22 帧 `gameTime` 不变，第 23 帧起恢复推进。
- [ ] **GIVEN** 两个不同原因的令牌，**WHEN** 只归还其中一个，**THEN** 时钟仍然不走、盘仍然锁住。
- [ ] **GIVEN** 一个持有者到点后迟迟不归还的 `effect` 令牌，**WHEN** 前台时间累计到 `TOKEN_MAX_MS`，**THEN** 令牌不在集合里，持有者在整个过程中只收到过一次“演出结束”（到点时那一次），开发版记录警告；`pause` 令牌持有 20 秒不会被强制归还。
- [ ] **GIVEN** 第 0 帧玩家消掉一对火（申请 `effect` 令牌 380 ms），**WHEN** 之后每帧 16.7 ms，**THEN** 第 0 帧不计令牌时间，第 23 帧到点。

---

## Implementation Notes

*Derived from GDD 规则 4 与 ADR-0002 第 3 节“令牌的数据结构”：*

8 种原因：`effect`（`EFFECT_HIGHLIGHT_MS` 380）、`skill`（`SKILL_SHOW_MS` 950）、`hostAttack`（`HOST_ATTACK_MS` 600）、`phase`（`PHASE_SHOW_MS` 1400）、`reshuffle`（`RESHUFFLE_SHOW_MS` 400）为有时长；`background`、`pause`、`tutorial` 直到点“接着讲”/继续，不受 `TOKEN_MAX_MS` 限制。每项 `{ id, reason, durationMs, elapsedMs, bornFrame, notified, onEnd }`。

计时增量 `dtTok = (dtReal < 0 || dtReal > BG_GAP_MS) ? 0 : dtReal`；持有 `background` 或 `pause` 时为 0；第 ② 步新申请的令牌（`bornFrame` 等于本帧）不计，从下一帧起算。到点的令牌按申请顺序通知持有者 `onEnd(token)`，持有者完成效果、`dispatch(result)`、`release(token)`。`TOKEN_MAX_MS`（默认 5000，2000–10000）到了仍未归还：移出集合；没通知过就补发一次，通知过的不再重发；开发版警告。`release` 重复调用无副作用。

接口：`acquire(reason, durationMs?, onEnd?, detail?) → token`、`release(token)`、`dispatch(result)`、`tokens()`（只读快照 `[{ reason, remainingMs }]`）、`boardLocked()`；申请与归还时 `emit` `tokenStart`/`tokenEnd`（`reason, durationMs, detail`，ADR-0003）。第 ④ 步：集合非空则 `dtGame = 0`。AC 3 里的 `pause` 令牌用 `round.acquire('pause')` 直接申请（暂停印入口在 Story 011）。

---

## Out of Scope

*Handled by neighbouring stories — do not implement here:*

- Story 003: 令牌到点之外的状态转换
- Story 004: 盘锁时丢弃点击（令牌存在时“点击被丢弃”的 AC）
- Story 005: ③b 与 `tick` 的调用条件
- Story 010: `background`/`pause` 重复申请返回同一个令牌

---

## Files

- `src/rules/round-flow.mjs`（`acquire`、`release`、`dispatch`、`tokens`、第 ③ 步）
- `src/core/constants.mjs`（`TOKEN_MAX_MS`、`EFFECT_HIGHLIGHT_MS`、`SKILL_SHOW_MS`、`HOST_ATTACK_MS`、`PHASE_SHOW_MS`）
- `tests/unit/round-flow/token-set.test.mjs`

---

## QA Test Cases

*N/A — no qa-lead specs at this tier; implement against the Acceptance Criteria above*

## Test Evidence

**Story Type**: Logic
**Required evidence**:
- Logic: `tests/unit/round-flow/token-set.test.mjs` — must exist and pass
- 所有协作系统（clear-effects、general-skills、battle-pressure、progress-save、view）尚未实现，测试一律用注入的假对象（`tests/helpers/round-fakes.mjs`），用假的 `dtReal` 逐帧驱动；固定种子，不碰时间/`Math.random`

**Status**: [ ] Not yet created

---

## Dependencies

- Depends on: `production/epics/round-flow/story-001-clock-dtgame.md`
- Unlocks: `production/epics/round-flow/story-004-board-lock-discard.md`, `production/epics/round-flow/story-005-frame-steps-settle-points.md`, `production/epics/round-flow/story-010-background-hidden.md`, `production/epics/round-flow/story-011-pause-landscape.md`, `production/epics/round-flow/story-012-return-to-catalog.md`
