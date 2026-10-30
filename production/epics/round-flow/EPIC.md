# Epic: 对局流程与时钟

> **Layer**: Core
> **GDD**: design/gdd/round-flow.md
> **Architecture Module**: `src/rules/round-flow.mjs`（每帧由 `src/app/main-loop.mjs` 驱动；`attempt` 计数归 `src/app/screens.mjs`）
> **Status**: Ready
> **Stories**: 17 stories（2026-10-30，见下方 Stories 表）

## Overview

一回仗的骨架：开讲水牌（含点将）→ 对局 → 胜或败 → 结算卡 → 下一回或再来一回。它持有全局唯一的游戏时钟，时钟只在“对局中、没有任何令牌”时走；效果结算、技能亮相、敌将出手和换阶段、洗牌、切后台、暂停都用令牌停钟锁盘，所以演出时间永远不算进玩家的压力。它还规定一次操作里各系统按什么顺序结算（清除效果 → 武将技能 → 战场压力 → 界面）、每帧的固定步骤（含 2026-10-30 补的 ③b 结算点）、只在结算点查胜负，并在一回结束时交出 `RoundResult`（含 `loadout`、`bossPhase`、`attempt`）。

## Governing ADRs

| ADR | Decision Summary | Engine Risk |
|-----|------------------|-------------|
| ADR-0002: 主循环与对局时钟 | `gameTime`、令牌集合、每帧五步加 ③b、装配顺序、`RoundResult` 字段、种子 | LOW |
| ADR-0003: 规则层与界面层的通道 | 输入意图（含 `offBoard`）、盘锁时丢弃点击、事件分发 | LOW |
| ADR-0004: 本机存档 | 进入“结束”时同步 `settle(RoundResult)`，按 `chapterId + attempt` 去重 | LOW |

## GDD Requirements

| TR-ID | Requirement | ADR Coverage |
|-------|-------------|--------------|
| TR-round-flow-001 | 唯一的游戏时钟 gameTime：只在“对局”且没有令牌时推进，单帧 ≤ MAX_STEP_MS，dtReal > BG_GAP_MS 视为隐式后台 | ADR-0002 ✅ |
| TR-round-flow-002 | 令牌集合：8 种原因（含 phase），有时长的按前台真实时间计时，超过 TOKEN_MAX_MS 强制归还且效果只完成一次 | ADR-0002 ✅ |
| TR-round-flow-003 | 盘锁 ⇔ 状态不是“对局”或令牌集合不为空；盘锁时的点击直接丢弃、不缓存 | ADR-0002、ADR-0003 ✅ |
| TR-round-flow-004 | 每帧五步加 ③b（隐式后台 → 点击 → 令牌计时 → ③b → tick → 结算点），每次点击后就地结算 | ADR-0002 ✅ |
| TR-round-flow-005 | match/miss 按固定顺序同步通知：清除效果 → 武将技能 → 战场压力 → 界面；其他结果按分发表 | ADR-0002、ADR-0003 ✅ |
| TR-round-flow-006 | 胜负只在结算点查询 outcome()（先胜后负）；进入“结束”立即 settle(RoundResult) | ADR-0002、ADR-0004 ✅ |
| TR-round-flow-007 | 后台、暂停、横屏用 background/pause 令牌表达；“回书目”清空令牌、不通知持有者 | ADR-0002 ✅ |
| TR-round-flow-008 | seed = hash32(chapterId, attempt, salt)；salt 页面加载时随机；seed=N 只在开发版和测试包读取 | ADR-0002、ADR-0001 ✅ |
| TR-round-flow-009 | 覆盖卡按钮出现后 CARD_GUARD_MS 内不响应 | ADR-0002、ADR-0003 ✅ |
| TR-round-flow-010 | 点“开讲”后遮罩 150 ms 撤完才进入“对局”；这 150 ms 内点盘被丢弃、gameTime 保持 0 | ADR-0002 ⚠️ 部分（150 ms 归谁计没写，按 GDD 规则 2） |
| TR-round-flow-011 | phase 令牌：敌将换二阶段时由战场压力在 tick 里申请，PHASE_SHOW_MS 1400 ms，停钟锁盘 | ADR-0002 ✅ |
| TR-round-flow-012 | 选排/选列输入路由：不占令牌、不算步；点盘 = 选行/列，点武将牌或盘外（offBoard）= 取消；关羽、黄忠互斥；下压取消选排、不取消选列 | ADR-0003 ⚠️ 部分（黄忠选列、下压通知 `skills.onPush()` 已于 2026-10-30 定名，待复核） |
| TR-round-flow-013 | RoundResult.loadout：实际出阵武将 id，槽位顺序，1–3 个；开讲时定下并转给武将技能 | ADR-0002、ADR-0004 ✅ |
| TR-round-flow-014 | RoundResult.bossPhase: null / 1 / 2（结束时 hud().phase；只做记录和失败提示，不评星） | ⚠️ 部分（ADR 未提，字段按 GDD） |
| TR-round-flow-015 | RoundResult.attempt：本会话本回目第几次开局，从 1 开始，回书目也加 1；进度按 chapterId + attempt 去重 | ADR-0002 ✅ |
| TR-round-flow-016 | 令牌到点使集合变空且有结果交回时就地做结算点（先 outcome()，再 ensurePlayable()）；分出胜负或洗牌时本帧不调 tick | ADR-0002 ✅ |

Untraced Requirements: None（3 条部分覆盖，都在 Core 层，按 GDD 实现）。

## Stories

| # | Story | Type | Status | ADR |
|---|-------|------|--------|-----|
| 001 | [游戏时钟 dt_game 与对局骨架](story-001-clock-dtgame.md) | Logic | Ready | ADR-0002 |
| 002 | [令牌集合与前台计时](story-002-token-set.md) | Logic | Ready | ADR-0002 |
| 003 | [一回的状态机、出口与种子](story-003-state-machine-exit-seed.md) | Logic | Ready | ADR-0002 |
| 004 | [盘锁与“本帧开始时或此刻”的丢弃](story-004-board-lock-discard.md) | Logic | Ready | ADR-0002 |
| 005 | [帧步骤、就地结算点与 ③b](story-005-frame-steps-settle-points.md) | Integration | Ready | ADR-0002 |
| 006 | [match/miss 通知顺序与结果分发表](story-006-notify-order-dispatch.md) | Integration | Ready | ADR-0002 |
| 007 | [tick 驱动、下压与换阶段](story-007-pressure-tick-push-phase.md) | Integration | Ready | ADR-0002 |
| 008 | [结算点：先胜后负、洗牌与死局](story-008-outcome-reshuffle-settle-point.md) | Integration | Ready | ADR-0002 |
| 009 | [进入“结束”、RoundResult 与进度结算](story-009-round-result-settle.md) | Logic | Ready | ADR-0002 |
| 010 | [后台、隐式后台与“接着讲”](story-010-background-hidden.md) | Logic | Ready | ADR-0002 |
| 011 | [暂停印与横屏](story-011-pause-landscape.md) | Logic | Ready | ADR-0002 |
| 012 | [“回书目”放弃一回](story-012-return-to-catalog.md) | Integration | Ready | ADR-0002 |
| 013 | [关羽选排的输入路由](story-013-row-select-guan-yu.md) | Integration | Ready | ADR-0003 |
| 014 | [黄忠选列与关羽互斥](story-014-column-select-huang-zhong.md) | Integration | Ready | ADR-0003 |
| 015 | [选排/选列的打断（暂停、下压、破城）](story-015-select-interrupts.md) | Integration | Ready | ADR-0002 |
| 016 | [覆盖卡按钮防连点](story-016-overlay-card-guard.md) | Logic | Ready | ADR-0002 |
| 017 | [开讲：150 ms 撤遮罩与出阵武将交接](story-017-start-fade-loadout.md) | Integration | Ready | ADR-0002 |

## Definition of Done

- Every story implemented, reviewed and closed with `/story-done`
- Every acceptance criterion of design/gdd/round-flow.md verified
- Logic and Integration stories have passing tests in `tests/unit/round-flow/` 或 `tests/integration/round-flow/`
- 规则层纯净检查对 `src/rules/round-flow.mjs` 通过（时钟只经 `frame(dtReal)` 注入）
- Visual/Feel and UI stories have retained screenshots in `production/qa/evidence/`（覆盖卡、开讲水牌如在本史诗内做）
