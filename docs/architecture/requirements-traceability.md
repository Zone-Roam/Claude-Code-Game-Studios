# Architecture Traceability Index
Last Updated: 2026-10-30
Engine: none configured (`engine.name` unset on purpose; ADR-0001). Platform reference: `docs/engine-reference/web-h5/VERSION.md` (WebView version NOT DETERMINED; probe not run)
Source review: `docs/architecture/architecture-review-2026-10-30.md` (Mode: full, Workflow: standard)

> ADR-0001..0004 are `Accepted` (user, 2026-10-27; revised in place 2026-10-30). ✅ = an Accepted
> ADR addresses the requirement. Rows marked "carried" were ⚠️ on 2026-10-27 and were not
> re-opened in the 2026-10-30 run. GDDs are `In Review`: re-run after their re-review.

## Coverage Summary
- Registry: 77 IDs (50 from 2026-10-27 + 27 added 2026-10-30); 3 not active (clear-effects-001 deprecated; clear-effects-003 → -005; progress-save-006 → -008)
- Total active requirements: 74
- ✅ Covered (Accepted ADR): 56 (76%)
- 🟡 Covered, ADR still Proposed: 0
- ⚠️ Partial: 15 (20%)
- ❌ Gaps: 3 (4%)
- ❓ Not assessed: 0

| Layer | Systems | Requirements | ✅ | 🟡 | ⚠️ | ❌ |
|---|---|---|---|---|---|---|
| Foundation | board-link | 13 | 9 | 0 | 4 | **0** |
| Core | round-flow, clear-effects | 19 | 15 | 0 | 4 | **0** |
| Feature | battle-pressure, general-skills, general-loadout, chapter-design, progress-save | 30 | 21 | 0 | 7 | 2 |
| Presentation | ui-interaction | 12 | 11 | 0 | 0 | 1 |
| **Total** | 9 | **74** | **56** | **0** | **15** | **3** |

(Feature row: battle-pressure 9, general-skills 6, general-loadout 2, chapter-design 6, progress-save 7 active = 30.)

## Full Matrix

Layer = the GDD's own layer (`systems-index.md`). Section numbers (§n) are the ADR's `## Decision` subsections.

| Requirement ID | GDD | System | Layer | Requirement (gist) | ADR coverage | Status |
|---|---|---|---|---|---|---|
| TR-board-link-001 | board-link.md | 盘面与连通 | Foundation | `cols` (5/6) × (6–8) grid + empty outer ring; 12 fixed kind ids | ADR-0001 cites it but addresses only module purity; no ADR defines the grid or kind table (module-internal, fully specified by the GDD) | ✅ |
| TR-board-link-002 | board-link.md | 盘面与连通 | Foundation | four independent seeded streams deal/shuffle/wave/add | ADR-0002 §5 (`hash32`, `createStream`) | ✅ |
| TR-board-link-003 | board-link.md | 盘面与连通 | Foundation | connectivity ≤ 2 turns, tie-break order, 2–4 point polyline | ADR-0003 §1 (`match.path`), ADR-0001 (cited) | ✅ |
| TR-board-link-004 | board-link.md | 盘面与连通 | Foundation | interfaces return data only, never call other systems | ADR-0003 §1 (`emit`), ADR-0002 §3 | ✅ |
| TR-board-link-005 | board-link.md | 盘面与连通 | Foundation | invariant I1: dev throws, release refuses and logs | ADR-0001 §4 (`devAssert`; refusal logic kept in release) | ✅ |
| TR-board-link-006 | board-link.md | 盘面与连通 | Foundation | `ensurePlayable()` at settle point, shuffle then deterministic swap fallback | ADR-0002 §3 step 5 | ✅ |
| TR-board-link-007 | board-link.md | 盘面与连通 | Foundation | pure data-in/data-out rules, no page/time/random/storage, testable with `node:test` | ADR-0001 §3, §4 check 4, §5; `tests/integration/architecture/rules-layer-purity.test.mjs` | ✅ |
| TR-board-link-008 | board-link.md | 盘面与连通 | Foundation | mutation interfaces return data, `{ok:false}` when I1 would break; read-only query list | `architecture.md` API Boundaries only; ADR-0002 line 194 adopts GDD names for round-flow callbacks, not for the board's mutation interface | ⚠️ Partial |
| TR-board-link-009 | board-link.md | 盘面与连通 | Foundation | deal + first playable check ≤ 200 ms on 48 cells; reshuffle bounded by RESHUFFLE_TRIES | `architecture.md` budget row only; ADR-0003 perf row is the view-side build; ADR-0002 perf row ignores `ensurePlayable()` cost | ⚠️ Partial |
| TR-board-link-010 | board-link.md | 盘面与连通 | Foundation | 盘宽取回目 `cols`（5/6，缺省 6）；每格两层 `STACK_DEPTH = 1`，上层消掉底牌翻上（`revealed`）；I1 按全部牌（含底层）计 | ADR-0001（常量表）、ADR-0003（`match/clear.revealed`、`depthAt`、`buriedCount`） | ✅ |
| TR-board-link-011 | board-link.md | 盘面与连通 | Foundation | 拒马：挡线、点不动、相邻消一对就碎；`match.broken`、`clear.blocks`；查询 `blocks()` | ADR-0003 §1 | ✅ |
| TR-board-link-012 | board-link.md | 盘面与连通 | Foundation | 查询 `colContents(c)`（黄忠；与 `rowContents(r)` 同形：上层兵、底牌、拒马格三张表；旧名 `colCells` 不用） | ADR-0003 §1 查询清单只列 `rowContents` | ⚠️ |
| TR-board-link-013 | board-link.md | 盘面与连通 | Foundation | 修改接口 `convertBlocks(cells, kind)`（只改上层；按兵种前后计数查 I1；空格/拒马/越界整次 `{ok:false}`；清选中）及 `shuffleTopRows`、`placeBlocks`（只放空格） | ADR-0002 Key Interfaces 只说“沿用 GDD 名字”；无 ADR 列出 | ⚠️ |
| TR-round-flow-001 | round-flow.md | 对局流程与时钟 | Core | single `gameTime`, clamped, implicit background | ADR-0002 §1, §3 steps 1 and 4 | ✅ |
| TR-round-flow-002 | round-flow.md | 对局流程与时钟 | Core | token set, 8 reasons (incl. `phase`), foreground timing, `TOKEN_MAX_MS` | ADR-0002 §3 step 3 + token structure | ✅ |
| TR-round-flow-003 | round-flow.md | 对局流程与时钟 | Core | board lock ⇔ not play or tokens held; taps dropped, not queued | ADR-0002 §3 step 2; ADR-0003 §2 | ✅ |
| TR-round-flow-004 | round-flow.md | 对局流程与时钟 | Core | five-step frame, in-place settle after each tap | ADR-0002 §3 (step 5 trigger list is incomplete, see report R1) | ✅ |
| TR-round-flow-005 | round-flow.md | 对局流程与时钟 | Core | fixed notify order effects → skills → pressure → UI | ADR-0002 §3 step 2; ADR-0003 §1; registry `match_miss_dispatch` | ✅ |
| TR-round-flow-006 | round-flow.md | 对局流程与时钟 | Core | `outcome()` only at settle point, win first; `settle(RoundResult)` on entering end | ADR-0002 §3 step 5 + "进入 end"; ADR-0004 (synchronous return) | ✅ |
| TR-round-flow-007 | round-flow.md | 对局流程与时钟 | Core | background/pause/landscape as tokens; "回书目" clears tokens silently | ADR-0002 §4 | ✅ |
| TR-round-flow-008 | round-flow.md | 对局流程与时钟 | Core | `seed = hash32(chapterId, attempt, salt)`; `seed=N` only in dev/test builds | ADR-0002 §2 (`attempt`), §5; ADR-0001 §4 (`build-flags`) | ✅ |
| TR-round-flow-009 | round-flow.md | 对局流程与时钟 | Core | overlay-card buttons ignore taps for `CARD_GUARD_MS` | ADR-0002 §3 step 2, ADR-0003 §2 table assign it to the rule layer, but no ADR says who records "button shown at" | ✅ |
| TR-round-flow-010 | round-flow.md | 对局流程与时钟 | Core | after "开讲", 150 ms mask fade before play; taps in that window dropped, `gameTime` stays 0 | ADR-0002 §2 has the `open` state; the 150 ms timing owner is not stated | ⚠️ Partial |
| TR-round-flow-011 | round-flow.md | 对局流程与时钟 | Core | `phase` 令牌：敌将换二阶段 `PHASE_SHOW_MS` 1400 ms，停钟锁盘，由战场压力在 `tick` 里申请（令牌种类变为 8） | ADR-0002 GDD 表（规则 4 行） | ✅ |
| TR-round-flow-012 | round-flow.md | 对局流程与时钟 | Core | 选排/选列输入路由：不占令牌、不算步；选排中点盘 = 选行，点牌或盘外（`{type:'offBoard'}`）= 取消；关羽、黄忠互斥；下压取消选排、不取消选列（重画高亮） | ADR-0003 §2（关羽 + `offBoard`）；黄忠选列、下压两条通知无 ADR | ⚠️ |
| TR-round-flow-013 | round-flow.md | 对局流程与时钟 | Core | `RoundResult.loadout`：实际出阵武将 id，槽位顺序，1-3 个；开讲时定下并转给武将技能 | ADR-0002 §3 装配第 5 步、Revision History；ADR-0004 §3 | ✅ |
| TR-round-flow-014 | round-flow.md | 对局流程与时钟 | Core | `RoundResult.bossPhase: null｜1｜2`（结束时 `hud().phase`；只做记录和失败提示，不评星） | 无 ADR 提到 | ⚠️ |
| TR-round-flow-015 | round-flow.md | 对局流程与时钟 | Core | `RoundResult.attempt`：本会话本回目第几次开局，从 1 起，“回书目”也加 1；进度按 `chapterId + attempt` 去重 | ADR-0002 §2（`attempt` 归 `screens.mjs`）、§5、Revision History | ✅ |
| TR-round-flow-016 | round-flow.md | 对局流程与时钟 | Core | 令牌到点使集合变空且有 `dispatch` 时就地结算（先 `outcome()`，再 `ensurePlayable()`），分出胜负则本帧不调 `tick` | ADR-0002 §3 第 3b 步 | ✅ |
| TR-clear-effects-001 | clear-effects.md | 清除效果与连斩 | Core | combo window on game clock (3000 ms), threshold 3 | ADR-0002 §3 step 4 (`gameTime` sole source) | deprecated |
| TR-clear-effects-002 | clear-effects.md | 清除效果与连斩 | Core | `effect` token 380 ms, `clearKind` at token end | ADR-0002 §3 step 3 (`onEnd`) | ✅ |
| TR-clear-effects-003 | clear-effects.md | 清除效果与连斩 | Core | combo reward cashed through pressure; interrupt cap 50 per attack cycle | ADR-0003 §1 (`interrupt` event only); the `effects → pressure.comboReward()` call is in no ADR | superseded-by -005 |
| TR-clear-effects-004 | clear-effects.md | 清除效果与连斩 | Core | 连斩 = 不连错的连续消除，不读时钟（取代 TR-clear-effects-001） | ADR-0002（连斩不读时钟） | ✅ |
| TR-clear-effects-005 | clear-effects.md | 清除效果与连斩 | Core | 连斩 ≥ 3 起敌将退步 `cut = min(COMBO_PUSHBACK, CAP − pushedSinceAttack, steps)`，每出手周期最多 2；`cut > 0` 时发事件 `comboPushback {cut}`（取代 TR-clear-effects-003） | ADR-0003 §1 事件表（名字标“暂定”）；registry `match_miss_dispatch` 未列 `effects → pressure.comboReward()` | ⚠️ |
| TR-battle-pressure-001 | battle-pressure.md | 战场压力 | Feature | advances only by `tick(dtGame)`; wave table pre-generated from `wave` stream | ADR-0002 §3 step 4, §5 | ✅ |
| TR-battle-pressure-002 | battle-pressure.md | 战场压力 | Feature | `push/scared/lastWave/foodSpent/hostAttack` go straight to the UI | ADR-0003 §1 table, but payloads differ from the GDD (`push.empty`, `foodSpent.cause`, `hostAttack.line` missing) | ✅ |
| TR-battle-pressure-003 | battle-pressure.md | 战场压力 | Feature | `hud()` for the UI, `metrics()` into the result object | ADR-0003 §1 (queries); ADR-0002 §3 | ✅ |
| TR-battle-pressure-004 | battle-pressure.md | 战场压力 | Feature | never announces win/loss, only answers `outcome()` | ADR-0002 §3 step 5; `architecture.md` | ✅ |
| TR-battle-pressure-005 | battle-pressure.md | 战场压力 | Feature | shared three-mode interface incl. `comboReward`, `scareNextPush`, `canScare`, `addFood`, `resetCharge`, `charge`; pressure acquires `hostAttack` | ADR-0002 line 194 names only the round-flow callbacks; ADR-0003 line 147 `createPressure(config, { board, emit, ... })` omits `acquire` | ✅ |
| TR-battle-pressure-006 | battle-pressure.md | 战场压力 | Feature | 敌将按步数：`onMatch` +1、`onMiss` +2；出手留到 `tick`；两段血、暴怒换阶段发 `bossPhase {phase, name}`、申请 `phase` 令牌；先看血再出手 | ADR-0002 §3 第 4 步、ADR-0003 §1 | ✅ |
| TR-battle-pressure-007 | battle-pressure.md | 战场压力 | Feature | 二阶段特技（横扫、冲阵、虎啸、铁索连环 `chain`）、护盾、破特技、预告；只往空格放东西；`hostAttack {kind, special, cells…}`；`push {row, empty, dropped}`；`seal/unseal` | ADR-0003 §1：`special` 只列 sweep/charge/roar，`push` 缺 `dropped` | ⚠️ |
| TR-battle-pressure-008 | battle-pressure.md | 战场压力 | Feature | 刘备接口：`healHeart(n)`、`canHeal()`（敌将）、`refillFood(n)`、`canRefill()`（粮草），压境返回 0；事件 `heal {heart}`、`foodRefill {amount}` | 无（ADR-0002 装配、ADR-0003 事件表都没有） | ❌ |
| TR-battle-pressure-009 | battle-pressure.md | 战场压力 | Feature | 查询 `hasShield()` ≡ `hud().shield`（压境、粮草恒假），武将技能据此判断赵云能不能放 | ADR-0003 有 `hud().shield`；ADR-0002 装配第 5 步只列 `raiseShield` | ⚠️ |
| TR-general-skills-001 | general-skills.md | 武将技能 | Feature | charge by matching kind; `skill` token 950 ms, effect lands at token end | ADR-0002 §3 step 3 (`onEnd`) | ✅ |
| TR-general-skills-002 | general-skills.md | 武将技能 | Feature | per-card state and hint text readable by the UI | ADR-0003 §1 (`skills.cards()`, `cardHint`) | ✅ |
| TR-general-skills-003 | general-skills.md | 武将技能 | Feature | 出阵武将由选将给出，最多 3 位（`SLOT_MAX`），武将牌顺序 = 槽位顺序 | ADR-0002 装配第 5 步、ADR-0003 `skills.cards()` | ✅ |
| TR-general-skills-004 | general-skills.md | 武将技能 | Feature | 关羽点选一排斩、黄忠点选一列射穿：令牌开始时算目标（含底牌、拒马），到点一次 `clearCells` | ADR-0003 §2 只有关羽 | ⚠️ |
| TR-general-skills-005 | general-skills.md | 武将技能 | Feature | 结果横幅事件：诸葛亮（清{兵}{对数}对，可加“破{特技}”）、刘备（补一颗心 / 众将用命 / 补 N 份粮）；关羽、黄忠不出 | ADR-0003 `skillResult`（暂定名，只写诸葛亮） | ⚠️ |
| TR-general-skills-006 | general-skills.md | 武将技能 | Feature | 刘备众将蓄力：内部 `giveCharge(fromId, n)`，事件 `gift {generals}`；虎啸选目标读改后的 `charge / need` | 无 | ❌ |
| TR-general-loadout-001 | general-loadout.md | 选将与解锁 | Feature | 槽位 `slots`、主将 `lead` 锁定、`recommend`、`unlock`/`starters`、`showPicker`、`available`（无蓄力兵不算）；点将走水牌覆盖卡按钮 | ADR-0003 §2 `button` 意图、ADR-0002（水牌点将） | ✅ |
| TR-general-loadout-002 | general-loadout.md | 选将与解锁 | Feature | 记住阵容：每回结算写 `loadout`，赢输都写，放弃不写；空数组不写；已解锁武将不存，由各回 `wins` 推出 | ADR-0004 §3 `loadout` 条目 | ✅ |
| TR-chapter-design-001 | chapter-design.md | 回目编排与难度 | Feature | chapters/enemies/texts as data; per-chapter load validation | ADR-0001 §2 (`src/data/chapters.mjs`, `chapter-loader.mjs`) | ✅ |
| TR-chapter-design-002 | chapter-design.md | 回目编排与难度 | Feature | `slow`/`seed` only in dev/test, `ch` only in dev, none in release | ADR-0001 §4 (`readUrlFlags`, three build-flags) | ✅ |
| TR-chapter-design-003 | chapter-design.md | 回目编排与难度 | Feature | text templates filled with effective parameters (after `slow`) | ADR-0003 §1 line 98 (texts looked up, loader template function); body text only, no ADR Requirements-table row cites it | ✅ |
| TR-chapter-design-004 | chapter-design.md | 回目编排与难度 | Feature | ordered "loadable chapters" list; next/preview follow it; all rejected → error page | ADR-0002 §2 defines the `error` screen only; the loadable-list contract is in no ADR | ⚠️ Partial |
| TR-chapter-design-005 | chapter-design.md | 回目编排与难度 | Feature | headless simulation script for tuning (seeded, bot player, win rate/median time) | ADR-0001 §5, ADR-0002 Consequences (rules run headless in Node); implicit | ✅ |
| TR-chapter-design-006 | chapter-design.md | 回目编排与难度 | Feature | 回目新字段 `cols`、`slots`、`lead`、`recommend`、`unlock`、`starters`、`boss.steps`、`boss.phase2` 进加载校验（拒绝 / 只警告） | ADR-0001 只点名 `cols` | ⚠️ |
| TR-progress-save-001 | progress-save.md | 进度、三星与存档 | Feature | key `pslk.save`, v1 record, version first then per-entry validation | ADR-0004 §1, §3 | ✅ |
| TR-progress-save-002 | progress-save.md | 进度、三星与存档 | Feature | write only on `settle()`; re-read and merge by max | ADR-0004 §3 + guidelines | ✅ |
| TR-progress-save-003 | progress-save.md | 进度、三星与存档 | Feature | boot read + `pslk.probe`; three states, four notices | ADR-0004 §3 (`boot`, `storageState`, `nextNotice`) | ✅ |
| TR-progress-save-004 | progress-save.md | 进度、三星与存档 | Feature | stepwise migration; newer version read-only; corrupt save to `pslk.save.bad` | ADR-0004 §1, §3 | ✅ |
| TR-progress-save-005 | progress-save.md | 进度、三星与存档 | Feature | no network, no collection, no upload | ADR-0001 §4 check 3; ADR-0004 | ✅ |
| TR-progress-save-006 | progress-save.md | 进度、三星与存档 | Feature | one settle per round; second `settle()` errors in dev, ignored otherwise | No ADR states it; only implied by "new round object per round" (ADR-0002 §2) | superseded-by -008 |
| TR-progress-save-007 | progress-save.md | 进度、三星与存档 | Feature | 每回可选字段 `loadout`：`v` 仍 1、不迁移；形状错只丢这一项；合并不取较大值 | ADR-0004 §3 | ✅ |
| TR-progress-save-008 | progress-save.md | 进度、三星与存档 | Feature | `settle()` 按 `chapterId + attempt` 去重：重复调用返回同一个 `SettleOutcome`，`plays` 不加、不写（取代 TR-progress-save-006） | ADR-0002 写“第二次开发版报错、正式版忽略”；ADR-0004 未提 `attempt` | ⚠️ |
| TR-ui-interaction-001 | ui-interaction.md | 界面与交互 | Presentation | catalog/round/error screens + 6 overlay cards; cover only while board locked (R1) | ADR-0002 §2; ADR-0003 §1 (`round.overlay()`) | ✅ |
| TR-ui-interaction-002 | ui-interaction.md | 界面与交互 | Presentation | `fit_scale` three tiers then global scale; stage ≤ 480; relayout next frame | ADR-0003 §3 (`computeLayout`) | ✅ |
| TR-ui-interaction-003 | ui-interaction.md | 界面与交互 | Presentation | `isPrimary` only; select on press; card tap on release with four guards | ADR-0003 §2 | ✅ |
| TR-ui-interaction-004 | ui-interaction.md | 界面与交互 | Presentation | transform/opacity only, no filter/blend, DOM ≤ 500, ≤ 3 nodes per tile, one SVG link layer | ADR-0003 §3 + guidelines; ADR-0001 §4 check 2 (filter, blend only) | ✅ |
| TR-ui-interaction-005 | ui-interaction.md | 界面与交互 | Presentation | two type roles, `text-size-adjust: 100%`, `color-scheme: light`, reduced motion | ADR-0003 §3 page settings (host font scaling / forced dark not in its Verification Required) | ✅ |
| TR-ui-interaction-006 | ui-interaction.md | 界面与交互 | Presentation | visibility/orientation/back key become direct calls; shout queue priority | ADR-0002 §4; ADR-0003 §1 | ✅ |
| TR-ui-interaction-007 | ui-interaction.md | 界面与交互 | Presentation | tap-to-feedback ≤ 100 ms; P95 ≤ 20 ms; climax ≥ 30 fps; cold start ≤ 2 s | ADR-0003 Verification Required + Validation; `architecture.md` Performance Budgets | ✅ |
| TR-ui-interaction-008 | ui-interaction.md | 界面与交互 | Presentation | package ≤ 2,000,000 bytes; no emoji; inline SVG icons | ADR-0001 §4 check 1 (size) and ADR-0003 §3 (sprite); emoji ban has no build check | ✅ |
| TR-ui-interaction-009 | ui-interaction.md | 界面与交互 | Presentation | dev-build diagnostics: per-frame R1 assertion, DOM count, scale warning, `will-change` count, frame meter | ADR-0003 mentions a once-per-round DOM assertion and an outbox warning only; frame meter deferred in `architecture.md` | ✅ |
| TR-ui-interaction-010 | ui-interaction.md | 界面与交互 | Presentation | tier: instant up, down only after 1000 ms foreground dwell | ADR-0003 §2 lists the 1000 ms dwell among view-owned timers | ✅ |
| TR-ui-interaction-011 | ui-interaction.md | 界面与交互 | Presentation | 震动：只 `navigator.vibrate(ms)`（暴怒 60、击碎 80），先 `typeof === 'function'` 再 `try/catch`，iOS 不替代；少动、暂停/横屏卡、后台不震；探测页加 `vibrate` 键 | 无（VERSION.md 未知项也没有） | ❌ |
| TR-ui-interaction-012 | ui-interaction.md | 界面与交互 | Presentation | 新演出：层叠标记、翻牌 `REVEAL_MS` 340、拒马、选排/选列高亮、暴怒、击碎（`ENDING_WIN_MS` 2000）、点将区；只动 transform/opacity，连线仍一个 SVG | ADR-0003 §3 | ✅ |

## Known Gaps

| Requirement | What is missing | Suggested change |
|---|---|---|
| ❌ TR-battle-pressure-008 | Liu Bei interfaces and `heal`/`foodRefill` events in no ADR | ADR-0003 C6, ADR-0002 C1 |
| ❌ TR-general-skills-006 | `gift` event in no ADR | ADR-0003 C6 |
| ❌ TR-ui-interaction-011 | `navigator.vibrate` in no ADR / platform reference | ADR-0003 C8, VERSION.md row, probe key `vibrate` |
| TR-board-link-012 | `colContents` not in ADR-0003 query list | ADR-0003 C1 |
| TR-board-link-013 | `convertBlocks`/`shuffleTopRows`/`placeBlocks` unnamed in ADRs | ADR-0002 C4 |
| TR-round-flow-012 | Huang Zhong column pick + push notifications | ADR-0003 C7, ADR-0002 C2 |
| TR-round-flow-014 | `RoundResult.bossPhase` unnamed | ADR-0002 C5 |
| TR-clear-effects-005 | `comboPushback` provisional; registry dispatch lacks `comboReward` | ADR-0003 C4, registry C1 |
| TR-battle-pressure-007 | `chain`, `push.dropped` missing | ADR-0003 C2, C3 |
| TR-battle-pressure-009 | `hasShield()` unnamed | ADR-0003 C1, ADR-0002 C1 |
| TR-general-skills-004 | Huang Zhong branch | ADR-0003 C7, ADR-0002 C1 |
| TR-general-skills-005 | `skillResult` Zhuge only, provisional | ADR-0003 C5 |
| TR-progress-save-008 | dedupe by `chapterId + attempt` | ADR-0004 C1, ADR-0002 C3 |
| TR-chapter-design-006 | only `cols` named in ADR-0001 | One line in ADR-0001 §2 listing the new chapter fields, or accept as GDD-owned validation |
| TR-board-link-008, -009, TR-round-flow-010, TR-chapter-design-004 | carried from 2026-10-27 | see 2026-10-27 suggestions |

## Superseded Requirements

2026-10-27: none (first registration). 2026-10-30: the slice v4–v6 and loadout merge changed the GDDs after the ADRs were written; rows below. See `docs/architecture/change-impact-2026-10-30-slice-merge.md`. Counts recomputed by the 2026-10-30 review.

| Date | GDD | Requirement | Changed To | ADRs Affected | Resolution |
|---|---|---|---|---|---|
| 2026-10-30 | clear-effects.md | TR-clear-effects-001: combo window on game clock (3000 ms) | Combo = consecutive matches without a miss, no time (rule 6); TR-clear-effects-001 retired | ADR-0002 | Updated |
| 2026-10-30 | clear-effects.md | TR-clear-effects-003: combo reward interrupts boss charge (cap 50 per cycle), `interrupt` event | Boss pushed back 1 step from combo 3 (cap 2 steps per attack cycle), net no gain; `interrupt` retired, `comboPushback` appended | ADR-0003 | Updated |
| 2026-10-30 | battle-pressure.md | Boss charges by game time (`tick(dtGame)`) | Boss advances by steps in `onMatch`/`onMiss` (1 / 2); `tick` only checks phase change and attack; two HP phases, specials, `phase` token 1400 ms | ADR-0002, ADR-0003 | Updated |
| 2026-10-30 | board-link.md | TR-board-link-001: fixed 6 columns (`BOARD_COLS = 6`) | `cols` from chapter data (5 or 6, default 6; release default 5); two layers `STACK_DEPTH = 1`; barricades | ADR-0001, ADR-0003 | Updated |
| 2026-10-30 | general-skills.md | MVP exception: all four generals on the field | Field generals come from loadout, at most 3 (`SLOT_MAX`) | ADR-0001, ADR-0002, ADR-0003, ADR-0004 | Updated |
| 2026-10-30 | general-skills.md | Zhao Yun: next same-kind pair always matches (all modes) | Boss mode: shield blocks the next attack; press/food keep the old rule (open question) | ADR-0003 | Updated |
| 2026-10-30 | general-skills.md | Guan Yu clears the bottom row | Player picks a row (round-flow rule 5a), no token while picking | ADR-0002, ADR-0003 | Updated |
| 2026-10-30 | round-flow.md | `ENDING_WIN_MS` = 1100 | 2000 (shatter ending, win card at 1500) | ADR-0002, ADR-0003 | Updated |
| 2026-10-30 | clear-effects.md | TR-clear-effects-001 | deprecated (combo untimed; TR-clear-effects-004) | ADR-0002 | Registry updated |
| 2026-10-30 | clear-effects.md | TR-clear-effects-003 | superseded-by TR-clear-effects-005 | ADR-0003 | Registry updated |
| 2026-10-30 | progress-save.md | TR-progress-save-006 (second settle: dev error / ignore) | superseded-by TR-progress-save-008 (dedupe by chapterId + attempt, same SettleOutcome) | ADR-0002, ADR-0004 | Pending ADR-0004 C1 |

## Not part of this index

- Stories and tests: none exist yet (`production/epics/` is empty), so the extended RTM columns (Story, Test File) are not built. Run `/architecture-review rtm` in Production.
- Non-MVP systems (教学引导, 难度与无障碍选项, 音效, 图鉴) have no GDD, so they have no requirements here.
