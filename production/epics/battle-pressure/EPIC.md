# Epic: 战场压力

> **Layer**: Feature
> **GDD**: design/gdd/battle-pressure.md
> **Architecture Module**: `src/rules/battle-pressure.mjs`
> **Status**: Ready
> **Stories**: Not yet created — run `/create-stories battle-pressure`

## Overview

挑战感的来源：把单纯的倒计时换成盘面上看得见的威胁，三种模式各对应一类三国场面。敌将反击按玩家的步数蓄力（消一对 +1、连错 +2），出手留到 `tick` 结算，两段血、暴怒换二阶段，二阶段有横扫、冲阵、怒吼、铁索连环等特技和预告；敌军压境按游戏时钟每 `interval`（第一、六、八回 12000 ms）从顶上压下一排，波次表开局用 `wave` 流预生成，压到底就破城；粮草模式连错扣粮。它持有心、粮数、敌将血量与蓄力，给界面 `hud()`、给结果对象 `metrics()`，并给清除效果（`comboReward`）和武将技能（张飞吓退、赵云护盾、刘备补心补粮、黄忠/关羽相关查询）提供接口。清除效果和对局流程里调用它的地方目前都用替身测试，本史诗完成后接上真实模块。

## Governing ADRs

| ADR | Decision Summary | Engine Risk |
|-----|------------------|-------------|
| ADR-0002: 主循环与对局时钟 | 只由 `tick(dtGame)` 推进；装配时注入；`hostAttack`、`phase` 令牌；先看血再出手 | LOW |
| ADR-0003: 规则层与界面层的通道 | `push`/`hostAttack`/`bossPhase`/`heal`/`foodRefill` 等事件字段（2026-10-30 修订补 `chain`、`dropped`、刘备事件）；`hud()` 查询 | LOW |

## GDD Requirements

| TR-ID | Requirement | ADR Coverage |
|-------|-------------|--------------|
| TR-battle-pressure-001 | 只由 tick(dtGame) 推进；压境波次表开局用 wave 流预先生成，最后一波后空行继续下压 | ADR-0002 ✅ |
| TR-battle-pressure-002 | push、scared、lastWave、foodSpent、hostAttack 事件直接发给界面，不经对局流程 | ADR-0003 ✅ |
| TR-battle-pressure-003 | hud() 给界面读；metrics() 在结束时给结果对象 | ADR-0003、ADR-0002 ✅ |
| TR-battle-pressure-004 | 压境只由 tick(dtGame) 推进；波次表每波长度 = cols；最后一波后空行继续下压 | ADR-0002 ✅ |
| TR-battle-pressure-005 | 三种模式共用接口 tick / onMatch / onMiss / onClear / outcome / metrics / hud；comboReward；武将技能用的 scareNextPush / canScare / addFood / resetCharge / charge；刘备、赵云接口 | ADR-0002 ✅ |
| TR-battle-pressure-006 | 敌将按步数：onMatch +1、onMiss +2，出手留到 tick；两段血，暴怒换阶段发 bossPhase 并申请 phase 令牌；先看血再出手 | ADR-0002、ADR-0003 ✅ |
| TR-battle-pressure-007 | 二阶段特技 sweep / charge / roar / chain、护盾、破特技、预告；只往空格放东西；hostAttack、push {row, empty, dropped}、seal / unseal | ADR-0003 ⚠️ 部分（2026-10-30 修订补了 `chain`、`dropped`，待下次 /architecture-review 复核） |
| TR-battle-pressure-008 | 刘备接口 healHeart / canHeal（敌将）、refillFood / canRefill（粮草），其他模式返回 0；事件 heal、foodRefill | ❌ 追溯表记为无 ADR；ADR-0003 已于 2026-10-30 补事件，待复核 |
| TR-battle-pressure-009 | 查询 hasShield() ≡ hud().shield（压境、粮草恒假） | ADR-0003 ⚠️ 部分 |

Untraced Requirements: TR-battle-pressure-008（Feature 层，standard 档只记录，不阻塞）。

## Definition of Done

- Every story implemented, reviewed and closed with `/story-done`
- Every acceptance criterion of design/gdd/battle-pressure.md verified
- Logic and Integration stories have passing tests in `tests/unit/battle-pressure/` 或 `tests/integration/battle-pressure/`
- 清除效果、对局流程里以替身测试的压力相关验收（如 clear-effects 006、007）改用真实模块再跑一遍
- 规则层纯净检查对 `src/rules/battle-pressure.mjs` 通过
- Visual/Feel and UI stories have retained screenshots in `production/qa/evidence/`（演出归界面史诗）

## Implemented ACs (PART A: shared interface + boss mode, 2026-10-30)

Stories were skipped at the user's request on 2026-10-30; built directly against the GDD Acceptance Criteria.
Module `src/rules/battle-pressure.mjs`; tests `tests/unit/battle-pressure/boss.test.mjs`, `tests/integration/battle-pressure/round-boss.test.mjs`; fixtures `tests/helpers/battle-pressure-fakes.mjs`. Test names start with "AC …".

- [x] Boss idle 60000 ms → steps 0 → `AC boss idle 60000 ms…`
- [x] Match +1 / miss +2 → `AC boss steps…`
- [x] 7/8 + match → attack in same-frame tick, empty cells only, hostAttack 600 → `AC boss attack…`
- [x] 7/8 + miss → capped 8 → `AC boss miss at 7/8…`
- [x] Combo pushback 1/1/0, reset on attack → `AC boss combo pushback…`; steps 0 → `AC boss combo at steps 0…`
- [x] roarBack(3,3) → `AC boss roarBack(3,3)…`; stun 1 + miss → `AC boss stun 1…`
- [x] Shield blocks; hasShield ≡ hud().shield (boss part) → `AC boss shield…`; phase 2 shield vs sweep → `AC boss phase 2 shield blocks sweep…`
- [x] Phase change (outcome null, refill, hp/steps, phase token, bossPhase) → `AC boss phase change: hp 1…`; shield + seal kept → `AC boss phase change keeps shield and seal…`
- [x] Rotation sweep/normal/charge/normal/roar → `AC boss phase 2 rotation…`; forecast → `AC boss forecast…`
- [x] breakSpecial phase 2 / phase 1 / null cases → `AC boss breakSpecial before a normal attack…`, `AC boss breakSpecial in phase 1…`
- [x] Sweep, charge (1 free), roar target and unseal, roar ties → `AC boss sweep…`, `AC boss charge…`, `AC boss roar…`, `AC boss roar target…`
- [x] slow=1 step rounding → `AC boss slow=1…`
- [x] Phase 2 last blow wins, no attack → `AC boss phase 2 hp 1…`; 城破 + heartsLost 3 → `AC boss 3 normal attacks…`; special/blocked/broken don't cost hearts → `AC boss phase 2: special, blocked and broken…`; fire clear win → `AC boss phase 2 hp 4…`; 2 free cells → `AC boss only 2 empty cells…`
- [x] Skill token freezes the boss (integration) → `AC any mode holding a skill token…`
- [x] Win before lose → `AC outcome: win and lose both true…`; boss metrics integer → `AC metrics…`
- [x] specials ['chain'], 夏侯渊 names, 文丑 one bar, chain convert / determinism / empty / shield / break → `AC specials [chain]…`, `AC 夏侯渊…`, `AC 文丑…`, `AC chain…` (5 tests)

## Implemented ACs (PART B: press, food, Liu Bei, 2026-10-30)

Tests `tests/unit/battle-pressure/press-food.test.mjs`.

- [x] Press breach at 35000 ms → `AC press breach…`; push → `AC press push…`; same seed table → `AC press wave table…`; 5 columns → `AC press 5 columns without waveList…`
- [x] Cleared board with waves left → `AC press board cleared…`; empty row after last wave + win → `AC press after the last wave…`
- [x] Scare / canScare → `AC press scare:…`; scare armed + cleared board → `AC press scare armed…`; dangerMs 2500 → `AC press danger time…`; combo delay → `AC press combo delay…`
- [x] slow=1 interval 15600 → `AC slow=1 press interval…`
- [x] Press roadblocks: waveList jm, bottom-only jm dropped, no danger/scare, win with only jm → `AC press roadblock wave…`, `AC press bottom row holds only a roadblock…`, `AC press only a roadblock…`, `AC press waves done and only 2 roadblocks…`; no jm in generated 5-col table (in the 5-columns test)
- [x] Food: food_start, match/miss, forced pair, 粮草断绝, fire-to-0 win, fire costs 1, addFood → `AC food…` (7 tests)
- [x] Metrics press/food integers → `AC metrics: press…`; hasShield false outside boss → `AC hasShield…`
- [x] Liu Bei heal / no heal / hearts_net / refill / refill capped / press returns 0 → `AC Liu Bei…` (6 tests)
- [ ] Not here (other systems own them): roadblock breaking by forced/unforced pairs (board-link); loader rejections of `waveList` / `specials` (chapter-design loader).

## Waiting on

- Assembly root: pass `ctx.slow`, `ctx.enemies`, and bind the roar target list via `pressure.bindGenerals(fn)` (or `ctx.generals`) once general-skills exists.
- clear-effects / round-flow pressure ACs re-run against the real module.
