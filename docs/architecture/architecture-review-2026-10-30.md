## Architecture Review Report
Date: 2026-10-30
Mode: full
Workflow: standard (architecture doc + critical ADRs scope; TRs still extracted from every GDD)
Automation: guided
Engine: none configured on purpose (ADR-0001, native H5). Platform reference: `docs/engine-reference/web-h5/VERSION.md` (WebView version NOT DETERMINED; probe not run)
GDDs Reviewed: 9 (board-link, round-flow, clear-effects, battle-pressure, general-skills, general-loadout [new], chapter-design, progress-save, ui-interaction; all `In Review` 2026-10-30)
ADRs Reviewed: 4 (ADR-0001..0004, all `Accepted` 2026-10-27, revised in place 2026-10-30)

[Receipt: take the `review-receipts.sh hash` lines at write time (Phase 8), after the TR registry edit. This draft was produced read-only; no receipt was taken.]

> DRAFT. Produced by technical-director in a read-only run. Nothing in the repo was edited.
> Sibling drafts in the same folder carry the proposed registry, index, ADR, platform-reference and probe changes.

---

### Run notes

- Inputs: `tr-registry.yaml` (50 entries), `requirements-traceability.md` (2026-10-27 + 2026-10-30 Superseded rows), `change-impact-2026-10-30-slice-merge.md`, `docs/registry/architecture.yaml` (interfaces), ADR-0001..0004 (Status, Decision §1-§3 of ADR-0002/0003, GDD Requirements Addressed, Revision History), GDD rule ranges by heading/grep.
- GDDs were read by targeted ranges (rule titles, interface tables, RoundResult, rule 5a, ui-interaction rule 20-22). Old partial rows from 2026-10-27 that this run did not re-open are marked "carried, not re-verified".
- All GDDs are `In Review`. TR text below follows today's revision; a second design-review pass may still reword. IDs stay stable either way (reword = `revised:` date).
- Phase 3b (RTM): skipped, `production/epics/` has no stories.
- Phase 5: **NOT APPLICABLE** (user's earlier decision: no engine, ADR-0001). Recorded as such, not as PASS. See Engine section.

---

### Traceability Summary

Registry after this run: 77 IDs (50 existing + 27 new). Not active: 3 (TR-clear-effects-001 deprecated; TR-clear-effects-003 superseded by -005; TR-progress-save-006 superseded by -008). Active: **74**.

| | Count |
|---|---|
| ✅ Covered (Accepted ADR) | 56 |
| 🟡 Covered (Proposed) | 0 (all ADRs Accepted) |
| ⚠️ Partial | 15 (11 new + 4 carried) |
| ❌ Gap | 3 (all new, Feature/Presentation layer) |
| ❓ Not assessed | 0 |

Foundation (board-link) ❌: 0, ⚠️: 4 (-008, -009 carried; -012, -013 new). Core (round-flow, clear-effects) ❌: 0, ⚠️: 4 (round-flow-010 carried; round-flow-012, -014, clear-effects-005).

### New TR IDs (27) and ADR mapping

| TR-ID | GDD | Requirement | ADR | Status |
|---|---|---|---|---|
| TR-board-link-010 | board-link 规则 1、5、10 | 盘宽取回目 `cols`（5/6，缺省 6）；每格两层 `STACK_DEPTH = 1`，上层消掉底牌翻上（`revealed`）；I1 按全部牌（含底层）计 | ADR-0001（常量表）、ADR-0003（`match/clear.revealed`、`depthAt`、`buriedCount`） | ✅ |
| TR-board-link-011 | board-link 规则 9 | 拒马：挡线、点不动、相邻消一对就碎；`match.broken`、`clear.blocks`；查询 `blocks()` | ADR-0003 §1 | ✅ |
| TR-board-link-012 | board-link 规则 15、17 | 查询 `colContents(c)`（黄忠；与 `rowContents(r)` 同形：上层兵、底牌、拒马格三张表；旧名 `colCells` 不用） | ADR-0003 §1 查询清单只列 `rowContents` | ⚠️ |
| TR-board-link-013 | board-link 规则 13 | 修改接口 `convertBlocks(cells, kind)`（只改上层；按兵种前后计数查 I1；空格/拒马/越界整次 `{ok:false}`；清选中）及 `shuffleTopRows`、`placeBlocks`（只放空格） | ADR-0002 Key Interfaces 只说“沿用 GDD 名字”；无 ADR 列出 | ⚠️ |
| TR-round-flow-011 | round-flow 规则 4、6.4 | `phase` 令牌：敌将换二阶段 `PHASE_SHOW_MS` 1400 ms，停钟锁盘，由战场压力在 `tick` 里申请（令牌种类变为 8） | ADR-0002 GDD 表（规则 4 行） | ✅ |
| TR-round-flow-012 | round-flow 规则 5a | 选排/选列输入路由：不占令牌、不算步；选排中点盘 = 选行，点牌或盘外（`{type:'offBoard'}`）= 取消；关羽、黄忠互斥；下压取消选排、不取消选列（重画高亮） | ADR-0003 §2（关羽 + `offBoard`）；黄忠选列、下压两条通知无 ADR | ⚠️ |
| TR-round-flow-013 | round-flow 规则 8 | `RoundResult.loadout`：实际出阵武将 id，槽位顺序，1-3 个；开讲时定下并转给武将技能 | ADR-0002 §3 装配第 5 步、Revision History；ADR-0004 §3 | ✅ |
| TR-round-flow-014 | round-flow 规则 8 | `RoundResult.bossPhase: null｜1｜2`（结束时 `hud().phase`；只做记录和失败提示，不评星） | 无 ADR 提到 | ⚠️ |
| TR-round-flow-015 | round-flow 规则 8、12 | `RoundResult.attempt`：本会话本回目第几次开局，从 1 起，“回书目”也加 1；进度按 `chapterId + attempt` 去重 | ADR-0002 §2（`attempt` 归 `screens.mjs`）、§5、Revision History | ✅ |
| TR-round-flow-016 | round-flow 规则 6.5、6.7 ③b | 令牌到点使集合变空且有 `dispatch` 时就地结算（先 `outcome()`，再 `ensurePlayable()`），分出胜负则本帧不调 `tick` | ADR-0002 §3 第 3b 步 | ✅ |
| TR-clear-effects-004 | clear-effects 规则 6 | 连斩 = 不连错的连续消除，不读时钟（取代 TR-clear-effects-001） | ADR-0002（连斩不读时钟） | ✅ |
| TR-clear-effects-005 | clear-effects 规则 8、公式 boss_pushback | 连斩 ≥ 3 起敌将退步 `cut = min(COMBO_PUSHBACK, CAP − pushedSinceAttack, steps)`，每出手周期最多 2；`cut > 0` 时发事件 `comboPushback {cut}`（取代 TR-clear-effects-003） | ADR-0003 §1 事件表（名字标“暂定”）；registry `match_miss_dispatch` 未列 `effects → pressure.comboReward()` | ⚠️ |
| TR-battle-pressure-006 | battle-pressure 规则 20-22、24-25 | 敌将按步数：`onMatch` +1、`onMiss` +2；出手留到 `tick`；两段血、暴怒换阶段发 `bossPhase {phase, name}`、申请 `phase` 令牌；先看血再出手 | ADR-0002 §3 第 4 步、ADR-0003 §1 | ✅ |
| TR-battle-pressure-007 | battle-pressure 规则 3b、5、23a-23d | 二阶段特技（横扫、冲阵、虎啸、铁索连环 `chain`）、护盾、破特技、预告；只往空格放东西；`hostAttack {kind, special, cells…}`；`push {row, empty, dropped}`；`seal/unseal` | ADR-0003 §1：`special` 只列 sweep/charge/roar，`push` 缺 `dropped` | ⚠️ |
| TR-battle-pressure-008 | battle-pressure 规则 3、18a、23e | 刘备接口：`healHeart(n)`、`canHeal()`（敌将）、`refillFood(n)`、`canRefill()`（粮草），压境返回 0；事件 `heal {heart}`、`foodRefill {amount}` | 无（ADR-0002 装配、ADR-0003 事件表都没有） | ❌ |
| TR-battle-pressure-009 | battle-pressure 规则 3、23b | 查询 `hasShield()` ≡ `hud().shield`（压境、粮草恒假），武将技能据此判断赵云能不能放 | ADR-0003 有 `hud().shield`；ADR-0002 装配第 5 步只列 `raiseShield` | ⚠️ |
| TR-general-skills-003 | general-skills；general-loadout | 出阵武将由选将给出，最多 3 位（`SLOT_MAX`），武将牌顺序 = 槽位顺序 | ADR-0002 装配第 5 步、ADR-0003 `skills.cards()` | ✅ |
| TR-general-skills-004 | general-skills 规则 11、14b | 关羽点选一排斩、黄忠点选一列射穿：令牌开始时算目标（含底牌、拒马），到点一次 `clearCells` | ADR-0003 §2 只有关羽 | ⚠️ |
| TR-general-skills-005 | general-skills 规则 14、14a | 结果横幅事件：诸葛亮（清{兵}{对数}对，可加“破{特技}”）、刘备（补一颗心 / 众将用命 / 补 N 份粮）；关羽、黄忠不出 | ADR-0003 `skillResult`（暂定名，只写诸葛亮） | ⚠️ |
| TR-general-skills-006 | general-skills 规则 14a | 刘备众将蓄力：内部 `giveCharge(fromId, n)`，事件 `gift {generals}`；虎啸选目标读改后的 `charge / need` | 无 | ❌ |
| TR-general-loadout-001 | general-loadout 规则 1-12 | 槽位 `slots`、主将 `lead` 锁定、`recommend`、`unlock`/`starters`、`showPicker`、`available`（无蓄力兵不算）；点将走水牌覆盖卡按钮 | ADR-0003 §2 `button` 意图、ADR-0002（水牌点将） | ✅ |
| TR-general-loadout-002 | general-loadout 规则 13；progress-save 规则 12 | 记住阵容：每回结算写 `loadout`，赢输都写，放弃不写；空数组不写；已解锁武将不存，由各回 `wins` 推出 | ADR-0004 §3 `loadout` 条目 | ✅ |
| TR-progress-save-007 | progress-save 规则 10-13 | 每回可选字段 `loadout`：`v` 仍 1、不迁移；形状错只丢这一项；合并不取较大值 | ADR-0004 §3 | ✅ |
| TR-progress-save-008 | progress-save Edge Cases、AC | `settle()` 按 `chapterId + attempt` 去重：重复调用返回同一个 `SettleOutcome`，`plays` 不加、不写（取代 TR-progress-save-006） | ADR-0002 写“第二次开发版报错、正式版忽略”；ADR-0004 未提 `attempt` | ⚠️ |
| TR-chapter-design-006 | chapter-design 规则 6-7 | 回目新字段 `cols`、`slots`、`lead`、`recommend`、`unlock`、`starters`、`boss.steps`、`boss.phase2` 进加载校验（拒绝 / 只警告） | ADR-0001 只点名 `cols` | ⚠️ |
| TR-ui-interaction-011 | ui-interaction 规则 21d | 震动：只 `navigator.vibrate(ms)`（暴怒 60、击碎 80），先 `typeof === 'function'` 再 `try/catch`，iOS 不替代；少动、暂停/横屏卡、后台不震；探测页加 `vibrate` 键 | 无（VERSION.md 未知项也没有） | ❌ |
| TR-ui-interaction-012 | ui-interaction 规则 20、21a-21c | 新演出：层叠标记、翻牌 `REVEAL_MS` 340、拒马、选排/选列高亮、暴怒、击碎（`ENDING_WIN_MS` 2000）、点将区；只动 transform/opacity，连线仍一个 SVG | ADR-0003 §3 | ✅ |

The ten interfaces the user named:

| Name | TR | ADR | Status |
|---|---|---|---|
| `comboPushback` | TR-clear-effects-005 | ADR-0003 §1 (provisional name) | ⚠️ amend: drop “暂定”, GDD cites the name |
| `skillResult` | TR-general-skills-005 | ADR-0003 §1 (Zhuge only) | ⚠️ amend: add Liu Bei, fields per general |
| `offBoard` | TR-round-flow-012 | ADR-0003 §2 | ⚠️ (Huang Zhong branch missing) |
| `phase` token | TR-round-flow-011 | ADR-0002 | ✅ |
| `RoundResult.loadout` | TR-round-flow-013 | ADR-0002, ADR-0004 | ✅ |
| `RoundResult.bossPhase` | TR-round-flow-014 | none | ⚠️ |
| `RoundResult.attempt` | TR-round-flow-015 (+ -008 dedupe) | ADR-0002 | ✅ |
| `healHeart` | TR-battle-pressure-008 | none | ❌ |
| `convertBlocks` | TR-board-link-013 | none by name | ⚠️ |
| `colContents` | TR-board-link-012 | none by name | ⚠️ |
| `hasShield()` | TR-battle-pressure-009 | ADR-0003 (`hud().shield` only) | ⚠️ |
| `gift` | TR-general-skills-006 | none | ❌ |

### Retired / revised existing IDs

- TR-clear-effects-001 → `deprecated` (combo no longer timed; replaced in intent by -004).
- TR-clear-effects-003 → `"superseded-by: TR-clear-effects-005"`.
- TR-progress-save-006 → `"superseded-by: TR-progress-save-008"`.
- Revised text (same ID): TR-board-link-001 (`cols` 5/6), TR-round-flow-002 (8 reasons incl. `phase`), TR-round-flow-004 (five steps + ③b), TR-battle-pressure-004 (press only; boss moved to -006), TR-battle-pressure-005 (adds Liu Bei / `hasShield`), TR-general-skills-001 (Guan Yu / Huang Zhong pick before the token).

### Coverage Gaps (no ADR exists)

- ❌ TR-battle-pressure-008: battle-pressure → Liu Bei `healHeart`/`canHeal`/`refillFood`/`canRefill`, events `heal`, `foodRefill`. Fix: ADR-0003 in-place amendment (events) + ADR-0002 assembly line (skills → pressure calls). Domain: cross-system communication. Platform risk: LOW.
- ❌ TR-general-skills-006: general-skills → `gift {generals}`. Fix: ADR-0003 amendment (event). LOW.
- ❌ TR-ui-interaction-011: ui-interaction → `navigator.vibrate`. Fix: ADR-0003 §3 one guideline line + VERSION.md 知识风险 row + probe key `vibrate`. Platform risk: MEDIUM (unknown in XHS WebView; absent on iOS by design).

No new ADR is required: all three fit existing decisions (event channel, platform reference). In-place amendments, as with the 2026-10-30 change-impact.

### Cross-ADR Conflicts

1. **ADR-0002 vs progress-save GDD (and ADR-0004 silent)** — ADR-0002 §3 “进入 end” says a second `settle()` is a dev error / ignored in release; progress-save now dedupes by `chapterId + attempt` and returns the same `SettleOutcome`. Not a decision conflict, a contract drift. Fix in ADR-0004 §3 (owner) and point ADR-0002 at it.
2. **ADR-0003 vs `docs/registry/architecture.yaml`** — `view_to_rules_intents` signature lists `'cell'|'card'|'pauseStamp'|'button'`; ADR-0003 has `offBoard`. `rules_to_view_events` lists no event names (fine). `match_miss_dispatch` still lacks `effects → pressure.comboReward()` (carried from 2026-10-27).
3. **ADR-0003 vs battle-pressure GDD** — `hostAttack.special` enumerates `sweep|charge|roar` (GDD adds `chain`); `push` lacks `dropped`. ADR-0003 says “以 battle-pressure 规则 5 为准”, so severity LOW, but the table is the contract and should match.
4. **ADR-0002 §3 assembly vs general-skills/battle-pressure** — step 5 lists skills→pressure calls for Zhang Fei, Zhao Yun, Zhuge Liang only; GDDs add Liu Bei (4 calls) and `hasShield`, and round-flow must notify skills on `push` (Guan Yu cancel, Huang Zhong redraw: two separate notifications). Gap-shaped, not contradictory.

No 🔴 blocking conflict. Nothing for `docs/consistency-failures.md`.

### ADR Dependency Order

ADR-0001 → ADR-0002 → ADR-0003 → ADR-0004 (unchanged; no cycle, no unresolved dependency).

### GDD Revision Flags

- clear-effects / ui-interaction / general-skills / round-flow give no names for the combo pushback event, the result-banner event, or the off-board intent. ADR-0003 names are provisional. Recommend the GDDs cite `comboPushback`, `skillResult`, `offBoard` (user decision U1).
- ui-interaction rule 21d asks for a probe key the probe does not have yet (drafted here).

### Engine Compatibility Issues

**Engine validation: NOT APPLICABLE** — no engine by design (ADR-0001); the user decided earlier that Phase 5 engine checks do not apply. Not recorded as PASS. The platform substitute is `docs/engine-reference/web-h5/VERSION.md`; its knowledge risk stays HIGH until the probe runs. New platform unknown found this run: `navigator.vibrate` (drafted as a VERSION.md row and probe key). ES2017 baseline: the new interfaces need nothing past ES2017.

### Architecture Document Coverage (Phase 6 ran)

`architecture.md` System Layer Map / Module Ownership do not list general-loadout (new system; Feature layer, `src/rules/` pure + view picker). Recommend one row each; its Technical Requirements Baseline should point to the registry rather than restate (it was registered 2026-10-27). Not drafted here (outside the requested write set); flag for `/create-architecture` update or a manual edit.

---

### Verdict: CONCERNS

- 3 ❌ gaps (Feature/Presentation layer; none Foundation/Core).
- 15 ⚠️ partials (4 Foundation, 4 Core).
- 4 contract drifts between ADRs, registry and GDDs; none blocking.
- Engine phase NOT APPLICABLE by user decision (would independently keep the verdict from PASS).
- GDDs are `In Review`: coverage is against today's text.

### Blocking Issues

None (not FAIL).

### Required ADRs

No new ADR. In-place amendments (decision unchanged, Status stays Accepted):
1. ADR-0003 — events `heal`, `foodRefill`, `gift`; `skillResult` for Liu Bei; drop “暂定” on `comboPushback`/`skillResult`; `hostAttack.special` + `chain`; `push.dropped`; queries `colContents`, `hasShield`; select-column routing; vibrate guideline.
2. ADR-0002 — assembly step 5 adds Liu Bei / `hasShield`; push notifications to skills; `RoundResult.bossPhase`; settle dedupe points to ADR-0004.
3. ADR-0004 — `settle()` dedupe by `chapterId + attempt`.
4. `docs/registry/architecture.yaml` — intents signature + dispatch contract.

### Open items that need the user's decision

- U1: Adopt the ADR names `comboPushback`, `skillResult`, `offBoard` as canonical and have the GDDs cite them (recommended), or let the GDD authors rename (then ADR-0003 is edited to match).
  **DECIDED 2026-10-30 (user chose the recommended option): `comboPushback`, `skillResult`, `offBoard` are the official names; GDDs cite them.**
- U2: `skillResult` as one event with `general` + per-general fields (recommended), or separate `liuResult`.
  **DECIDED 2026-10-30 (user chose the recommended option): one `skillResult` event carrying `general` (Liu Bei included).**
- U3: Approve the ADR in-place amendments (TD-CHANGE-IMPACT lean skip, as on 2026-10-30) or require a formal change-impact.
  **DECIDED 2026-10-30 (user approved): ADR in-place amendments, with a dated note in each ADR.**
- U4: Re-run this review after the GDD re-review closes `In Review`.
  **Follow-up (open).**
- U5: The push notification to skills (Guan Yu cancel / Huang Zhong redraw) has no GDD name; ADR-0002 draft proposes `skills.onPush()` (direct call). Confirm or rename.
  **DECIDED 2026-10-30 (user chose the recommended option): `skills.onPush()` is the official name.**
- U6: `architecture.md` lacks general-loadout in the Layer Map / Module Ownership; update via `/create-architecture` or by hand (not drafted).
  **Done 2026-10-30: `architecture.md` now lists general-loadout (layer map, module ownership, data flow); no longer a follow-up.**
