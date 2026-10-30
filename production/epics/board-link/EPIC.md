# Epic: 盘面与连通

> **Layer**: Foundation
> **GDD**: design/gdd/board-link.md
> **Architecture Module**: `src/rules/board-link.mjs`（含它用的 `src/core/rng.mjs`）
> **Status**: Ready
> **Stories**: 16 stories（2026-10-30，见下方 Stories 表）

## Overview

整个游戏的地基：一张带外圈的格子（5 或 6 列，每格两层，多出的牌压底），加一组只算数据、不碰页面的规则函数——发牌、拐弯不超过两次的连线判定、消除和翻牌、拒马、死局洗牌（先洗、再按确定的对调保底），以及给对局流程、清除效果、战场压力、武将技能用的修改接口和查询接口。每个操作都把发生的事作为返回数据交出来，不调用其他系统；四条随机流都从一个种子派生，同一种子加同一串操作，结果逐字相同，所以整块可以用 Node 自带的 `node:test` 直接测。

## Governing ADRs

| ADR | Decision Summary | Engine Risk |
|-----|------------------|-------------|
| ADR-0001: 不用引擎，原生 H5 | 规则层纯数据、不碰页面/时间/随机/存储；开发版 `devAssert`；纯净检查进测试 | LOW |
| ADR-0002: 主循环与对局时钟 | 种子与 `createStream`；结算点调 `ensurePlayable()`；修改接口沿用 GDD 名字（2026-10-30 修订补 `convertBlocks` 等） | LOW |
| ADR-0003: 规则层与界面层的通道 | 结果事件 `match`/`miss`/`clear`/`push`/`add`/`reshuffle` 的字段；查询清单（2026-10-30 修订补 `colContents`） | LOW |

## GDD Requirements

| TR-ID | Requirement | ADR Coverage |
|-------|-------------|--------------|
| TR-board-link-001 | cols 列（回目字段，5 或 6，缺省 6）× 6–8 行的可玩格加一圈永远为空的外圈；12 种兵 id 固定、顺序固定 | ADR-0001 ✅ |
| TR-board-link-002 | 从 seed 派生 4 条互相独立的随机流 deal/shuffle/wave/add；同一种子、同一串操作，结果完全相同 | ADR-0002 ✅ |
| TR-board-link-003 | 连通判定：拐弯 ≤ 2 次，按“拐弯少 → 总长短 → 拐点行优先”取第一条，返回 2–4 个点的折线 | ADR-0003 ✅ |
| TR-board-link-004 | 点击和修改接口只返回数据（match/miss/clear/push/add/reshuffle），不调用其他系统 | ADR-0003、ADR-0002 ✅ |
| TR-board-link-005 | 不变量 I1（每种兵偶数块）：开发版报错，正式版拒绝修改并写日志 | ADR-0001 ✅ |
| TR-board-link-006 | 结算点调用 ensurePlayable()：在已占格内用 shuffle 流洗牌，失败走确定性的对调保底 | ADR-0002 ✅ |
| TR-board-link-007 | 规则函数只接收数据、返回数据，不读写页面元素，不引用时间、随机、存储，可用 node:test 直接测试 | ADR-0001 ✅ |
| TR-board-link-008 | 修改接口 clearKind / clearCells / pushRowFromTop / addPairs / setForceNext / clearSelection 返回数据，破坏 I1 时 {ok:false} 且盘面不变；查询接口只读 | ADR-0002 ⚠️ 部分（只沿用 GDD 名字，接口清单以 GDD 规则 11、14 为准） |
| TR-board-link-009 | 开局发牌加首次可连检查 ≤ 200 ms（8 行满盘 48 块，基准安卓机）；死局洗牌最多 RESHUFFLE_TRIES 次后走保底 | ⚠️ 部分（只有 `architecture.md` 性能预算行） |
| TR-board-link-010 | 盘宽取回目 cols；每格两层 STACK_DEPTH = 1，上层消掉底牌翻上；I1 按全部牌计；查询 depthAt / buriedCount / buriedCells | ADR-0001、ADR-0003 ✅ |
| TR-board-link-011 | 拒马：挡线、点不动、相邻消一对就碎；match.broken、clear.blocks；查询 blocks() | ADR-0003 ✅ |
| TR-board-link-012 | 查询 colContents(c)（黄忠选列），与 rowContents(r) 同形 | ADR-0003 ⚠️ 部分（2026-10-30 修订已补名字，待下次 /architecture-review 复核） |
| TR-board-link-013 | 修改接口 convertBlocks(cells, kind) 及 shuffleTopRows、placeBlocks，都返回数据 | ADR-0002 ⚠️ 部分（2026-10-30 修订已补名字，待复核） |

Untraced Requirements: None（4 条部分覆盖，都在 Foundation 层，接口细节以 GDD 为准）。

## Stories

| # | Story | Type | Status | ADR |
|---|-------|------|--------|-----|
| 001 | [随机流、格子与牌组校验](story-001-rng-grid-deck.md) | Logic | Ready | ADR-0002 |
| 002 | [发牌（满盘压底与压境）](story-002-deal.md) | Logic | Ready | ADR-0002 |
| 003 | [连通判定（拐弯数与折线点数）](story-003-connectivity.md) | Logic | Ready | ADR-0003 |
| 004 | [拐点取舍与对拍](story-004-path-tiebreak-oracle.md) | Logic | Ready | ADR-0003 |
| 005 | [点击状态机、消除、连不上与翻牌](story-005-tap-match-reveal.md) | Logic | Ready | ADR-0003 |
| 006 | [赵云待命与盘锁](story-006-force-next-lock.md) | Logic | Ready | ADR-0002 |
| 007 | [clearKind、clearSelection 与 buriedCells](story-007-clear-kind.md) | Logic | Ready | ADR-0003 |
| 008 | [clearCells 与行列内容查询](story-008-clear-cells-contents.md) | Logic | Ready | ADR-0003 |
| 009 | [pushRowFromTop、addPairs 与 placeBlocks](story-009-push-add-place.md) | Logic | Ready | ADR-0003 |
| 010 | [ensurePlayable（重排、对调、挪牌）](story-010-ensure-playable.md) | Logic | Ready | ADR-0002 |
| 011 | [洗牌第四级（碎拒马与清盘）与发牌后静默洗牌](story-011-ensure-playable-clear-deal.md) | Logic | Ready | ADR-0002 |
| 012 | [拒马（挡线、点不动、相邻碎裂）](story-012-barricade-core.md) | Logic | Ready | ADR-0003 |
| 013 | [压境推行里的拒马与 bottomOccupied](story-013-barricade-push.md) | Logic | Ready | ADR-0003 |
| 014 | [convertBlocks 与 shuffleTopRows](story-014-convert-sweep.md) | Logic | Ready | ADR-0002 |
| 015 | [1000 局自动对局（不变量 I1/I2/I3）](story-015-autoplay-simulations.md) | Integration | Ready | ADR-0002 |
| 016 | [发牌与首次可连检查的性能](story-016-deal-performance.md) | Integration | Ready | ADR-0002 |

## Definition of Done

- Every story implemented, reviewed and closed with `/story-done`
- Every acceptance criterion of design/gdd/board-link.md verified
- Logic and Integration stories have passing tests in `tests/unit/board-link/` 或 `tests/integration/board-link/`
- 规则层纯净检查（`tests/integration/architecture/rules-layer-purity.test.mjs`）对 `src/rules/board-link.mjs`、`src/core/rng.mjs` 通过
- Visual/Feel and UI stories have retained screenshots in `production/qa/evidence/`（本史诗预计没有）
