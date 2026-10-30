# Story 004: 盘锁与“本帧开始时或此刻”的丢弃

> **Epic**: round-flow（对局流程与时钟）
> **Status**: Ready
> **Layer**: Core
> **Type**: Logic
> **Estimate**: S
> **Manifest Version**: 2026-10-27
> **Last Updated**: (set by /dev-story)

## Context

**GDD**: `design/gdd/round-flow.md`
**Requirement**: `TR-round-flow-003`
*(Requirement text lives in `docs/architecture/tr-registry.yaml` — read fresh at review time)*

**ADR Governing Implementation**: ADR-0002: 主循环与对局时钟 · ADR-0003: 规则层与界面层的通道
**ADR Decision Summary**: 全页面只有一个 `requestAnimationFrame` 循环，每帧把 `dtReal` 和输入队列交给 `round.frame()`；一回之内的状态（`open`/`play`/`end`/`settle`）、`gameTime`、令牌集合、每帧五步加 ③b 和结算点都归 `round-flow`；`round` 自己按装配顺序建规则对象，`systems` 由装配根传入；种子用 `hash32`。
**ADR Version**: ADR-0002 2026-10-27 · ADR-0003 2026-10-27

**Engine**: none — native H5 (ADR-0001) | **Risk**: HIGH
**Engine Notes**: ADR-0002: 后台时 rAF 是否暂停、可见性事件是否到达、回来第一帧的 `dtReal` 多大均未在真机核实（ADR-0002 Verification Required）；规则层不依赖这些，隐式后台（`dtReal > BG_GAP_MS`）兜底。 ADR-0003: 意图与事件都是纯数据对象，不含函数和 DOM 引用；界面的盘锁判断与规则层不矛盾，以规则层为准。

**Control Manifest Rules (this layer)**:
- Required: 意图在“状态不是 `play`、或本帧开始时、或此刻有令牌”时丢弃，不缓存、不补发
- Forbidden: 缓存被丢弃的点击；让界面的盘锁判断代替规则层的判断（两道判断以规则层为准）
- Guardrail: 规则每帧 ≤ 2 ms

---

## Acceptance Criteria

*From GDD `design/gdd/round-flow.md`, scoped to this story:*

- [ ] **GIVEN** 持有 `effect` 令牌，**WHEN** 玩家点块，**THEN** 点击被丢弃，令牌归还后不会补发。
- [ ] **GIVEN** 持有 `effect` 令牌、还剩 10 ms，**WHEN** 这一帧（dtReal 16.7）同时到达一次点盘，**THEN** 点击被丢弃；令牌在这一帧到点，之后也不补执行。
- [ ] **GIVEN** 张飞、赵云都就绪、没有令牌，**WHEN** 同一帧里先后到达“点张飞”“点赵云”两次点击，**THEN** 只放出张飞，第二次点击被丢弃。

---

## Implementation Notes

*Derived from GDD 规则 5、6.7 第 ② 步与 ADR-0002 第 3 节第 2 步：*

盘锁 ⇔ 状态不是 `play`，或令牌集合不为空（`boardLocked()`）。盘上点击（`{type:'cell'}`）、武将牌点击（`{type:'card'}`）、`offBoard` 在“状态不是 `play`，或**本帧开始时**的令牌集合不为空，或**此刻**的令牌集合不为空”时直接丢弃。因为第 ② 步在第 ③ 步之前，演出最后一帧到达的点击仍按“本帧开始时有令牌”丢弃；同一帧里排在放技能或触发效果之后的点击按“此刻有令牌”丢弃。丢弃的点击不进队列、令牌归还后不补执行。测试用假 `board.tap`、假 `skills.tapCard` 断言“未被调用”；假 `skills.tapCard('zhang_fei')` 在被调用时同步 `acquire('skill')`。

暂停印和覆盖卡按钮不受盘锁影响（Story 011、016）。

---

## Out of Scope

*Handled by neighbouring stories — do not implement here:*

- Story 005: 点击后的就地结算点
- Story 011: `pauseStamp` 不受盘锁影响
- Story 013: 选排/选列期间的点击路由
- Story 016: 覆盖卡按钮防连点

---

## Files

- `src/rules/round-flow.mjs`（`boardLocked`、第 ② 步的丢弃判断）
- `tests/unit/round-flow/board-lock-discard.test.mjs`

---

## QA Test Cases

*N/A — no qa-lead specs at this tier; implement against the Acceptance Criteria above*

## Test Evidence

**Story Type**: Logic
**Required evidence**:
- Logic: `tests/unit/round-flow/board-lock-discard.test.mjs` — must exist and pass
- 所有协作系统（clear-effects、general-skills、battle-pressure、progress-save、view）尚未实现，测试一律用注入的假对象（`tests/helpers/round-fakes.mjs`），用假的 `dtReal` 逐帧驱动；固定种子，不碰时间/`Math.random`

**Status**: [ ] Not yet created

---

## Dependencies

- Depends on: `production/epics/round-flow/story-002-token-set.md`
- Unlocks: `production/epics/round-flow/story-005-frame-steps-settle-points.md`, `production/epics/round-flow/story-013-row-select-guan-yu.md`
