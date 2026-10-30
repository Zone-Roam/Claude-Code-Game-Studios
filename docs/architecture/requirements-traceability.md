# Architecture Traceability Index
Last Updated: 2026-10-27
Engine: none configured (`engine.name` unset on purpose; ADR-0001). Platform reference: `docs/engine-reference/web-h5/VERSION.md` (WebView version NOT DETERMINED; probe not run)
Source review: `docs/architecture/architecture-review-2026-10-27.md` (Mode: full, Workflow: standard)

> Every ADR is `Proposed`, so no row can be ✅ Covered. 🟡 means an ADR addresses the
> requirement but has not been accepted; it is not a pass state. The route out is
> `/architecture-decision accept ADR-NNNN` (user, or `technical-director` on the user's
> explicit confirmation). Re-run `/architecture-review` after the ADRs change.

## Coverage Summary
- Total requirements: 50 (38 provisional IDs from `architecture.md` registered unchanged + 12 added by this review)
- ✅ Covered (Accepted ADR): 0 (0%)
- 🟡 Covered, ADR still Proposed: 39 (78%)
- ⚠️ Partial: 11 (22%)
- ❌ Gaps: 0
- ❓ Not assessed: 0

By GDD layer:

| Layer | Systems | Requirements | ✅ | 🟡 | ⚠️ | ❌ |
|---|---|---|---|---|---|---|
| Foundation | board-link | 9 | 0 | 6 | 3 | **0** |
| Core | round-flow, clear-effects | 13 | 0 | 10 | 3 | **0** |
| Feature | battle-pressure, general-skills, chapter-design, progress-save | 18 | 0 | 14 | 4 | 0 |
| Presentation | ui-interaction | 10 | 0 | 9 | 1 | 0 |
| **Total** | 8 | **50** | **0** | **39** | **11** | **0** |

Foundation-layer gaps (❌): **0**. Foundation-layer partials: 3 (TR-board-link-001, -008, -009). Core-layer gaps: 0.

## Full Matrix

Layer = the GDD's own layer (`systems-index.md`). Section numbers (§n) are the ADR's `## Decision` subsections.

| Requirement ID | GDD | System | Layer | Requirement (gist) | ADR coverage | Status |
|---|---|---|---|---|---|---|
| TR-board-link-001 | board-link.md | 盘面与连通 | Foundation | 6×(6–8) grid + empty outer ring; 12 fixed kind ids | ADR-0001 cites it but addresses only module purity; no ADR defines the grid or kind table (module-internal, fully specified by the GDD) | ⚠️ Partial |
| TR-board-link-002 | board-link.md | 盘面与连通 | Foundation | four independent seeded streams deal/shuffle/wave/add | ADR-0002 §5 (`hash32`, `createStream`) | 🟡 |
| TR-board-link-003 | board-link.md | 盘面与连通 | Foundation | connectivity ≤ 2 turns, tie-break order, 2–4 point polyline | ADR-0003 §1 (`match.path`), ADR-0001 (cited) | 🟡 |
| TR-board-link-004 | board-link.md | 盘面与连通 | Foundation | interfaces return data only, never call other systems | ADR-0003 §1 (`emit`), ADR-0002 §3 | 🟡 |
| TR-board-link-005 | board-link.md | 盘面与连通 | Foundation | invariant I1: dev throws, release refuses and logs | ADR-0001 §4 (`devAssert`; refusal logic kept in release) | 🟡 |
| TR-board-link-006 | board-link.md | 盘面与连通 | Foundation | `ensurePlayable()` at settle point, shuffle then deterministic swap fallback | ADR-0002 §3 step 5 | 🟡 |
| TR-board-link-007 | board-link.md | 盘面与连通 | Foundation | pure data-in/data-out rules, no page/time/random/storage, testable with `node:test` | ADR-0001 §3, §4 check 4, §5; `tests/integration/architecture/rules-layer-purity.test.mjs` | 🟡 |
| TR-board-link-008 | board-link.md | 盘面与连通 | Foundation | mutation interfaces return data, `{ok:false}` when I1 would break; read-only query list | `architecture.md` API Boundaries only; ADR-0002 line 194 adopts GDD names for round-flow callbacks, not for the board's mutation interface | ⚠️ Partial |
| TR-board-link-009 | board-link.md | 盘面与连通 | Foundation | deal + first playable check ≤ 200 ms on 48 cells; reshuffle bounded by RESHUFFLE_TRIES | `architecture.md` budget row only; ADR-0003 perf row is the view-side build; ADR-0002 perf row ignores `ensurePlayable()` cost | ⚠️ Partial |
| TR-round-flow-001 | round-flow.md | 对局流程与时钟 | Core | single `gameTime`, clamped, implicit background | ADR-0002 §1, §3 steps 1 and 4 | 🟡 |
| TR-round-flow-002 | round-flow.md | 对局流程与时钟 | Core | token set, 7 reasons, foreground timing, `TOKEN_MAX_MS` | ADR-0002 §3 step 3 + token structure | 🟡 |
| TR-round-flow-003 | round-flow.md | 对局流程与时钟 | Core | board lock ⇔ not play or tokens held; taps dropped, not queued | ADR-0002 §3 step 2; ADR-0003 §2 | 🟡 |
| TR-round-flow-004 | round-flow.md | 对局流程与时钟 | Core | five-step frame, in-place settle after each tap | ADR-0002 §3 (step 5 trigger list is incomplete, see report R1) | 🟡 |
| TR-round-flow-005 | round-flow.md | 对局流程与时钟 | Core | fixed notify order effects → skills → pressure → UI | ADR-0002 §3 step 2; ADR-0003 §1; registry `match_miss_dispatch` | 🟡 |
| TR-round-flow-006 | round-flow.md | 对局流程与时钟 | Core | `outcome()` only at settle point, win first; `settle(RoundResult)` on entering end | ADR-0002 §3 step 5 + "进入 end"; ADR-0004 (synchronous return) | 🟡 |
| TR-round-flow-007 | round-flow.md | 对局流程与时钟 | Core | background/pause/landscape as tokens; "回书目" clears tokens silently | ADR-0002 §4 | 🟡 |
| TR-round-flow-008 | round-flow.md | 对局流程与时钟 | Core | `seed = hash32(chapterId, attempt, salt)`; `seed=N` only in dev/test builds | ADR-0002 §2 (`attempt`), §5; ADR-0001 §4 (`build-flags`) | 🟡 |
| TR-round-flow-009 | round-flow.md | 对局流程与时钟 | Core | overlay-card buttons ignore taps for `CARD_GUARD_MS` | ADR-0002 §3 step 2, ADR-0003 §2 table assign it to the rule layer, but no ADR says who records "button shown at" | ⚠️ Partial |
| TR-round-flow-010 | round-flow.md | 对局流程与时钟 | Core | after "开讲", 150 ms mask fade before play; taps in that window dropped, `gameTime` stays 0 | ADR-0002 §2 has the `open` state; the 150 ms timing owner is not stated | ⚠️ Partial |
| TR-clear-effects-001 | clear-effects.md | 清除效果与连斩 | Core | combo window on game clock (3000 ms), threshold 3 | ADR-0002 §3 step 4 (`gameTime` sole source) | 🟡 |
| TR-clear-effects-002 | clear-effects.md | 清除效果与连斩 | Core | `effect` token 380 ms, `clearKind` at token end | ADR-0002 §3 step 3 (`onEnd`) | 🟡 |
| TR-clear-effects-003 | clear-effects.md | 清除效果与连斩 | Core | combo reward cashed through pressure; interrupt cap 50 per attack cycle | ADR-0003 §1 (`interrupt` event only); the `effects → pressure.comboReward()` call is in no ADR | ⚠️ Partial |
| TR-battle-pressure-001 | battle-pressure.md | 战场压力 | Feature | advances only by `tick(dtGame)`; wave table pre-generated from `wave` stream | ADR-0002 §3 step 4, §5 | 🟡 |
| TR-battle-pressure-002 | battle-pressure.md | 战场压力 | Feature | `push/scared/lastWave/foodSpent/hostAttack` go straight to the UI | ADR-0003 §1 table, but payloads differ from the GDD (`push.empty`, `foodSpent.cause`, `hostAttack.line` missing) | ⚠️ Partial |
| TR-battle-pressure-003 | battle-pressure.md | 战场压力 | Feature | `hud()` for the UI, `metrics()` into the result object | ADR-0003 §1 (queries); ADR-0002 §3 | 🟡 |
| TR-battle-pressure-004 | battle-pressure.md | 战场压力 | Feature | never announces win/loss, only answers `outcome()` | ADR-0002 §3 step 5; `architecture.md` | 🟡 |
| TR-battle-pressure-005 | battle-pressure.md | 战场压力 | Feature | shared three-mode interface incl. `comboReward`, `scareNextPush`, `canScare`, `addFood`, `resetCharge`, `charge`; pressure acquires `hostAttack` | ADR-0002 line 194 names only the round-flow callbacks; ADR-0003 line 147 `createPressure(config, { board, emit, ... })` omits `acquire` | ⚠️ Partial |
| TR-general-skills-001 | general-skills.md | 武将技能 | Feature | charge by matching kind; `skill` token 950 ms, effect lands at token end | ADR-0002 §3 step 3 (`onEnd`) | 🟡 |
| TR-general-skills-002 | general-skills.md | 武将技能 | Feature | per-card state and hint text readable by the UI | ADR-0003 §1 (`skills.cards()`, `cardHint`) | 🟡 |
| TR-chapter-design-001 | chapter-design.md | 回目编排与难度 | Feature | chapters/enemies/texts as data; per-chapter load validation | ADR-0001 §2 (`src/data/chapters.mjs`, `chapter-loader.mjs`) | 🟡 |
| TR-chapter-design-002 | chapter-design.md | 回目编排与难度 | Feature | `slow`/`seed` only in dev/test, `ch` only in dev, none in release | ADR-0001 §4 (`readUrlFlags`, three build-flags) | 🟡 |
| TR-chapter-design-003 | chapter-design.md | 回目编排与难度 | Feature | text templates filled with effective parameters (after `slow`) | ADR-0003 §1 line 98 (texts looked up, loader template function); body text only, no ADR Requirements-table row cites it | 🟡 |
| TR-chapter-design-004 | chapter-design.md | 回目编排与难度 | Feature | ordered "loadable chapters" list; next/preview follow it; all rejected → error page | ADR-0002 §2 defines the `error` screen only; the loadable-list contract is in no ADR | ⚠️ Partial |
| TR-chapter-design-005 | chapter-design.md | 回目编排与难度 | Feature | headless simulation script for tuning (seeded, bot player, win rate/median time) | ADR-0001 §5, ADR-0002 Consequences (rules run headless in Node); implicit | 🟡 |
| TR-progress-save-001 | progress-save.md | 进度、三星与存档 | Feature | key `pslk.save`, v1 record, version first then per-entry validation | ADR-0004 §1, §3 | 🟡 |
| TR-progress-save-002 | progress-save.md | 进度、三星与存档 | Feature | write only on `settle()`; re-read and merge by max | ADR-0004 §3 + guidelines | 🟡 |
| TR-progress-save-003 | progress-save.md | 进度、三星与存档 | Feature | boot read + `pslk.probe`; three states, four notices | ADR-0004 §3 (`boot`, `storageState`, `nextNotice`) | 🟡 |
| TR-progress-save-004 | progress-save.md | 进度、三星与存档 | Feature | stepwise migration; newer version read-only; corrupt save to `pslk.save.bad` | ADR-0004 §1, §3 | 🟡 |
| TR-progress-save-005 | progress-save.md | 进度、三星与存档 | Feature | no network, no collection, no upload | ADR-0001 §4 check 3; ADR-0004 | 🟡 |
| TR-progress-save-006 | progress-save.md | 进度、三星与存档 | Feature | one settle per round; second `settle()` errors in dev, ignored otherwise | No ADR states it; only implied by "new round object per round" (ADR-0002 §2) | ⚠️ Partial |
| TR-ui-interaction-001 | ui-interaction.md | 界面与交互 | Presentation | catalog/round/error screens + 6 overlay cards; cover only while board locked (R1) | ADR-0002 §2; ADR-0003 §1 (`round.overlay()`) | 🟡 |
| TR-ui-interaction-002 | ui-interaction.md | 界面与交互 | Presentation | `fit_scale` three tiers then global scale; stage ≤ 480; relayout next frame | ADR-0003 §3 (`computeLayout`) | 🟡 |
| TR-ui-interaction-003 | ui-interaction.md | 界面与交互 | Presentation | `isPrimary` only; select on press; card tap on release with four guards | ADR-0003 §2 | 🟡 |
| TR-ui-interaction-004 | ui-interaction.md | 界面与交互 | Presentation | transform/opacity only, no filter/blend, DOM ≤ 500, ≤ 3 nodes per tile, one SVG link layer | ADR-0003 §3 + guidelines; ADR-0001 §4 check 2 (filter, blend only) | 🟡 |
| TR-ui-interaction-005 | ui-interaction.md | 界面与交互 | Presentation | two type roles, `text-size-adjust: 100%`, `color-scheme: light`, reduced motion | ADR-0003 §3 page settings (host font scaling / forced dark not in its Verification Required) | 🟡 |
| TR-ui-interaction-006 | ui-interaction.md | 界面与交互 | Presentation | visibility/orientation/back key become direct calls; shout queue priority | ADR-0002 §4; ADR-0003 §1 | 🟡 |
| TR-ui-interaction-007 | ui-interaction.md | 界面与交互 | Presentation | tap-to-feedback ≤ 100 ms; P95 ≤ 20 ms; climax ≥ 30 fps; cold start ≤ 2 s | ADR-0003 Verification Required + Validation; `architecture.md` Performance Budgets | 🟡 |
| TR-ui-interaction-008 | ui-interaction.md | 界面与交互 | Presentation | package ≤ 2,000,000 bytes; no emoji; inline SVG icons | ADR-0001 §4 check 1 (size) and ADR-0003 §3 (sprite); emoji ban has no build check | 🟡 |
| TR-ui-interaction-009 | ui-interaction.md | 界面与交互 | Presentation | dev-build diagnostics: per-frame R1 assertion, DOM count, scale warning, `will-change` count, frame meter | ADR-0003 mentions a once-per-round DOM assertion and an outbox warning only; frame meter deferred in `architecture.md` | ⚠️ Partial |
| TR-ui-interaction-010 | ui-interaction.md | 界面与交互 | Presentation | tier: instant up, down only after 1000 ms foreground dwell | ADR-0003 §2 lists the 1000 ms dwell among view-owned timers | 🟡 |

## Known Gaps

❌ No requirement is without an ADR. The 11 ⚠️ rows and what closes each:

| Requirement | What is missing | Suggested change |
|---|---|---|
| TR-board-link-001 | ADR-0001 line 205 cites it for an unrelated reason | Re-point the citation to TR-board-link-004/-007; note the grid is module-internal |
| TR-board-link-008 | Mutation/query surface only in `architecture.md` | One sentence in ADR-0002 §Key Interfaces: modules expose the GDD names (board-link rules 11, 14) |
| TR-board-link-009 | No ADR owns the deal / `ensurePlayable()` cost | Add a rules-side line to ADR-0002 Performance Implications; Node stress test per board-link AC |
| TR-round-flow-009 | `buttonShownAt` has no owner | ADR-0002: round keeps `overlayAgeMs`, reset when `overlay()` changes; buttons accepted at `>= CARD_GUARD_MS` |
| TR-round-flow-010 | 150 ms mask fade has no timer owner | ADR-0002 §2: `open` has a `starting` sub-state timed by `frame(dtReal)`; or a view-driven `maskCleared` intent |
| TR-clear-effects-003 | `effects → pressure.comboReward()` is a direct rule-to-rule call in no ADR | Add it to registry contract `match_miss_dispatch` and ADR-0002 §3 step 2 |
| TR-battle-pressure-002 | ADR-0003 event payloads drop GDD fields | Add `empty` to `push`, `cause` to `foodSpent`, `line` (index) to `hostAttack` |
| TR-battle-pressure-005 | Pressure's cross-module interface and `acquire` dependency not stated | ADR-0003 line 147: add `acquire` to `createPressure` deps; list the interface in ADR-0002 |
| TR-chapter-design-004 | Loadable-list contract and the all-rejected path | One line in ADR-0001 §2 describing `loadChapters(...)` return shape and the `error` route |
| TR-progress-save-006 | Idempotent `settle()` unstated | ADR-0004 guideline: second `settle()` for the same round object is ignored |
| TR-ui-interaction-009 | Dev diagnostics not enumerated | ADR-0003 guideline listing the dev-build checks, or accept as code-review items and say so |

## Superseded Requirements

2026-10-27: none (first registration). 2026-10-30: the slice v4–v6 and loadout merge changed the GDDs after the ADRs were written; rows below. See `docs/architecture/change-impact-2026-10-30-slice-merge.md`. The coverage counts above are not recomputed yet: re-run `/architecture-review` after level design.

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

## Not part of this index

- Stories and tests: none exist yet (`production/epics/` is empty), so the extended RTM columns (Story, Test File) are not built. Run `/architecture-review rtm` in Production.
- Non-MVP systems (教学引导, 难度与无障碍选项, 音效, 图鉴) have no GDD, so they have no requirements here.
