# Epic: 清除效果与连斩

> **Layer**: Core
> **GDD**: design/gdd/clear-effects.md
> **Architecture Module**: `src/rules/clear-effects.mjs`
> **Status**: Ready
> **Stories**: 7 stories（2026-10-30，见下方 Stories 表）

## Overview

规则层里专门制造“释放”的两样东西。兵种效果把火烧连营、铁骑冲阵、水淹七军变成盘上一清一大片的瞬间：消一对火烧掉所有营帐、消一对马冲散所有弓兵、消一对水冲垮所有城寨，压在底下的也清；效果先占一个 380 ms 的 `effect` 令牌，令牌到点才调用盘面的 `clearKind`。连斩是连着消对、中间没有连错（不看时间）；三连斩起，敌将模式经 `pressure.comboReward()` 让敌将退步（每轮出手前最多退 `COMBO_PUSHBACK_CAP` 步）并发出 `comboPushback` 事件，压境模式推迟下一次下压，粮草模式只是喝彩。

## Governing ADRs

| ADR | Decision Summary | Engine Risk |
|-----|------------------|-------------|
| ADR-0002: 主循环与对局时钟 | `effect` 令牌到点由 `onEnd` 结算；连斩不读时钟；装配时把 `pressure` 注入效果模块 | LOW |
| ADR-0003: 规则层与界面层的通道 | `comboPushback` 事件（2026-10-30 定名）；`match` 后的分发顺序 | LOW |

## GDD Requirements

| TR-ID | Requirement | ADR Coverage |
|-------|-------------|--------------|
| TR-clear-effects-002 | 效果申请 effect 令牌 380 ms，令牌到点后才调用 clearKind | ADR-0002 ✅ |
| TR-clear-effects-004 | 连斩 = 不连错的连续消除，不读时钟 | ADR-0002 ✅ |
| TR-clear-effects-005 | 连斩 ≥ COMBO_THRESHOLD 起敌将退步 cut = min(COMBO_PUSHBACK, COMBO_PUSHBACK_CAP − pushedSinceAttack, steps)，经 pressure.comboReward() | ADR-0003 ⚠️ 部分（事件已定名、登记表分发已补 `comboReward`，待下次 /architecture-review 复核） |

已退役，不实现：TR-clear-effects-001（deprecated，按时间算的连斩窗口）、TR-clear-effects-003（superseded-by TR-clear-effects-005）。

Untraced Requirements: None。

## Stories

| # | Story | Type | Status | ADR |
|---|-------|------|--------|-----|
| 001 | [效果兵表、触发判定与“目标已没了”](story-001-effect-table-trigger.md) | Logic | Ready | ADR-0002 |
| 002 | [效果令牌 380 ms 与到点清除目标（含底牌）](story-002-effect-token-clear.md) | Logic | Ready | ADR-0002 |
| 003 | [效果清除是“非玩家清除”](story-003-effect-clear-non-player.md) | Logic | Ready | ADR-0002 |
| 004 | [连斩计数（不连错、不读时钟）](story-004-combo-count.md) | Logic | Ready | ADR-0002 |
| 005 | [技能/敌将出手不改连斩，与连斩字文本](story-005-combo-neutral-events-label.md) | Logic | Ready | ADR-0002 |
| 006 | [敌将模式连斩退步（comboReward）](story-006-boss-pushback-reward.md) | Logic | Ready | ADR-0003 |
| 007 | [压境推迟下压、粮草模式只喝彩](story-007-press-delay-food-reward.md) | Logic | Ready | ADR-0002 |

## Definition of Done

- Every story implemented, reviewed and closed with `/story-done`
- Every acceptance criterion of design/gdd/clear-effects.md verified
- Logic and Integration stories have passing tests in `tests/unit/clear-effects/` 或 `tests/integration/clear-effects/`
- 规则层纯净检查对 `src/rules/clear-effects.mjs` 通过
- Visual/Feel and UI stories have retained screenshots in `production/qa/evidence/`（效果演出归界面史诗，本史诗预计没有）
