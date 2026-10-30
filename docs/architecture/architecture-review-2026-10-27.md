## Architecture Review Report
Date: 2026-10-27
Mode: full
Workflow: standard
Engine: none configured (`engine.name` unset on purpose, see ADR-0001). Platform reference used instead: `docs/engine-reference/web-h5/VERSION.md` (WebView kernel/version NOT DETERMINED; platform probe not run)
GDDs Reviewed: 8 (board-link, round-flow, clear-effects, battle-pressure, general-skills, chapter-design, progress-save, ui-interaction; all 8 carry `## Summary`)
ADRs Reviewed: 4 (ADR-0001 to ADR-0004, all `Proposed`; all four carry Status, Decision, GDD Requirements Addressed, Engine Compatibility, ADR Dependencies, Performance Implications)
Reviewer: independent pass (did not write the architecture). Review config: `automation: guided`, `review_mode: lean`; the user asked for `full`, so this report counts for every item of the Technical Setup -> Pre-Production gate that names this skill.

Reviewed-Content-Hash: docs/architecture/adr-0001-no-engine-native-h5.md 515893b44957312f4c2edae40e9f36c4e820dcc0
Reviewed-Content-Hash: docs/architecture/adr-0002-main-loop-round-clock.md b15c43155a0fee149f4157aa477b56e0805bd4c0
Reviewed-Content-Hash: docs/architecture/adr-0003-rules-view-channel.md a2e4ff415f0711b98ca76d302e17f2effef1cfc7
Reviewed-Content-Hash: docs/architecture/adr-0004-local-save.md a9cb917215672ecc87bb69060037b1849889a8f8
Reviewed-Content-Hash: design/gdd/battle-pressure.md d4954a0cd4682e19e0abef67efba8e494a8d0f26
Reviewed-Content-Hash: design/gdd/board-link.md ddfd01864cea1b2a0bf9e7a0fffb4a2c60770eb1
Reviewed-Content-Hash: design/gdd/chapter-design.md 77f6123e78f15f6e85b50bcd6a9e9c1b21ecdcef
Reviewed-Content-Hash: design/gdd/clear-effects.md dd94524ed78ef0ae39844cfbb68ebccbfd5307e9
Reviewed-Content-Hash: design/gdd/game-concept.md f7e9d1cc7c8e71a7c84ec4e521bf4c96317795df
Reviewed-Content-Hash: design/gdd/gdd-cross-review-2026-10-27.md 7ed437a19752a4edc4ec9045e749c09c74be8bd5
Reviewed-Content-Hash: design/gdd/general-skills.md df2aa554147131271ffabaca93125f18ce0b48c7
Reviewed-Content-Hash: design/gdd/progress-save.md bd9ac86a84eab0a03f8f7686ca89f7a727494d38
Reviewed-Content-Hash: design/gdd/round-flow.md a3eab8d3a45a4529002afb502b6aab7c4b49e475
Reviewed-Content-Hash: design/gdd/systems-index.md 8e1c932605895d589465a0b0687c7b11b8b1d288
Reviewed-Content-Hash: design/gdd/ui-interaction.md 6d9c15b05063efb5e658e30da0cefdee291e1866
Reviewed-Content-Hash: docs/architecture/tr-registry.yaml ba738b7b302f3fb224e69ab2cca827471d5790ec
Reviewed-Content-Hash: docs/architecture/architecture.md 68a8e10b0ee60f89bad4ebb4f2a11822ea2c8f50
Reviewed-Content-Hash: docs/engine-reference/web-h5/VERSION.md eb1e9957ca229e8032a6e89739f0dc0ba309046d
Reviewed-Content-Hash: project.yaml 7ca12d89834c7b88eacf3fad2f6fdc90fa58b253
Reviewed-Content-Hash: .claude/docs/technical-preferences.md 405658044f5eea733789e232808d963416897112
Reviewed-Content-Hash: .claude/skills/architecture-review/SKILL.md 1a9d28aadbcbd26b5fc6b8ed1c64d73ae82b7b73
Reviewed-Content-Hash: .claude/skills/architecture-review/references/1-load.md 9a65759ebdbb2cb1f9744775bfed18cb25e76347
Reviewed-Content-Hash: .claude/skills/architecture-review/references/2-extract-requirements.md d08ea0b0e9ab9760b0d8bfe0cd9115f0bc40f8e2
Reviewed-Content-Hash: .claude/skills/architecture-review/references/3-traceability.md bb7b6b65c5e5e5b8869fa692413aa831615dede7
Reviewed-Content-Hash: .claude/skills/architecture-review/references/4-conflicts.md 0d30f8173b23248a32523a365b606dd1ce9642ab
Reviewed-Content-Hash: .claude/skills/architecture-review/references/5-engine.md 318ecbc1361d430badaf5dd8ce4cfc6ab0dff0ca
Reviewed-Content-Hash: .claude/skills/architecture-review/references/6-document-coverage.md dcce78482ec2ce60048989b6f9d1f797dd0a9a0e
Reviewed-Content-Hash: .claude/skills/architecture-review/references/7-report.md a007fd66bdac87812dc272e4b14cd231174e979d
Reviewed-Content-Hash: .claude/skills/architecture-review/references/8-write.md bf6d8946fc7b9e19eda7f65503a5c8f593a0d2b1
Reviewed-Content-Hash: .claude/skills/architecture-review/references/9-handoff.md fd5f681f4c3517c6a2e388c6d78075d82dded22e
Reviewed-Content-Hash: docs/registry/architecture.yaml b53b0b28ca31b5a296e5dded5d1c645de46d8f84
Reviewed-Content-Hash: design/art/art-bible.md d65acad5f16e94183d8f461556fb6d9768b7d68c
Reviewed-Content-Hash: design/registry/entities.yaml 3c7efe8a0d0f494d272f743b397e175e29469a35

(`docs/consistency-failures.md` does not exist: not stamped, and no "known conflict-prone areas" note could be drawn from it. The `web-h5` VERSION.md (stands in for the engine reference) and the last three hashes (`docs/registry/architecture.yaml`, `design/art/art-bible.md`, `design/registry/entities.yaml`) are files this run read in addition to the skill's standard input list; add them to the next run's check.)

---

### Run notes (what ran, what did not)

| Step | Result |
|---|---|
| Freshness check (Phase 1a) | No earlier `architecture-review-*.md` exists: `RECEIPT: NONE`. Full review ran. |
| Denominators | `design/gdd/*.md` = 11 files; 8 are in scope (the other three, `game-concept`, `systems-index`, `gdd-cross-review-2026-10-27`, are context only; `systems-index` was read for Phase 6). `docs/architecture/adr-*.md` = 4. |
| TR registry before the run | `tr-registry.yaml` held 0 entries. The 38 provisional IDs in `architecture.md` were registered unchanged (no renames, so no ADR citation needs updating). 12 IDs were added. Registry now 50, `registry.sh validate`: duplicate 0, tr_unknown 0, path_missing 0, status 0, layout 0. |
| ADR dependency graph | `adr-dep-graph.sh` run (see Phase 4). |
| Phase 3b (stories, tests) | Not run: it applies to `rtm`, or `full` with stories present, and `production/epics/` does not exist yet. The Story and Test columns of the RTM are therefore not built. |
| Phase 5 engine specialist consultation | NOT ASSESSED: no engine configured, so the skill skips it. |
| Phase 5b systems-index update prompt | No revision flags, so no prompt and no `systems-index.md` edit. |
| `docs/consistency-failures.md` append | Not done: file absent (the skill only appends to an existing file). |
| `production/session-state/active.md` append | Not done: outside the three writes the user authorised. The block is at the end of this report. |

---

### Traceability Summary
Total requirements: 50 (38 baseline + 12 this review added)
✅ Covered (Accepted ADR): 0
🟡 Covered, ADR still Proposed: 39
⚠️ Partial: 11
❌ Gaps: 0
❓ Not assessed: 0

Foundation layer (GDD layer = board-link): 9 requirements, 0 ❌, 3 ⚠️, 6 🟡.
Core layer (round-flow, clear-effects): 13 requirements, 0 ❌, 3 ⚠️, 10 🟡.
Feature: 18 (0 ❌, 4 ⚠️, 14 🟡). Presentation: 10 (0 ❌, 1 ⚠️, 9 🟡).
Full 50-row matrix: `docs/architecture/requirements-traceability.md`.

Why nothing is ✅: every ADR is `Proposed`. The 39 🟡 rows cap the verdict at CONCERNS and are not a pass state (route: `/architecture-decision accept ADR-NNNN`).

Requirements the baseline missed (added as new IDs, all registered):

| ID | Why it is a separate requirement |
|---|---|
| TR-board-link-007 | The GDD hands "pure, Node-testable rules" to the ADR (board-link.md:173). ADR-0001:205 cited TR-board-link-001/-003 for it, which are unrelated rows. |
| TR-board-link-008 | The board's mutation/query surface (rules 11, 14) is the contract pressure, skills and effects code against. |
| TR-board-link-009 | Deal <= 200 ms (board-link.md:251) and the bounded reshuffle have no owner in any ADR. |
| TR-round-flow-010 | 150 ms mask fade before play (round-flow.md:31, AC :295). Not a token, so someone must time it. |
| TR-battle-pressure-005 | Pressure is called by effects, skills and round-flow through one interface. |
| TR-chapter-design-004 | Loadable-chapters list, next-chapter/preview, all-rejected error page (chapter-design.md:86, :176). |
| TR-chapter-design-005 | Headless tuning simulator (chapter-design.md:247). |
| TR-progress-save-006 | Second `settle()` ignored (progress-save.md:184). |
| TR-ui-interaction-007 | Runtime budgets (100 ms, P95 20 ms, 30 fps, 2 s). |
| TR-ui-interaction-008 | Package <= 2 MB and no emoji; ADR-0001:211 maps rules 31/34 to -004 whose text has no size budget. |
| TR-ui-interaction-009 | Dev-build diagnostics (per-frame R1 assertion, DOM count, scale warning). |
| TR-ui-interaction-010 | Tier / 1000 ms dwell rule. |

### Coverage Gaps (no ADR exists)
None. No requirement is without an ADR, including Foundation and Core. This is the only FAIL trigger the skill ties to coverage, and it did not fire.

The 11 ⚠️ Partial rows are the real coverage work. Suggested closures are in the traceability index "Known Gaps" table; the ones that matter most:

- TR-round-flow-009 and -010 (Core): overlay-button guard clock and the 150 ms open->play fade have no owner. See Conflict 3.
- TR-battle-pressure-002: ADR-0003's event payloads drop GDD fields. See Mismatch M-1.
- TR-clear-effects-003 and TR-battle-pressure-005: the `effects -> pressure.comboReward()` and `skills -> pressure.*` direct calls, and pressure's `acquire('hostAttack')` dependency, appear in no ADR (ADR-0003:147 lists `createPressure(config, { board, emit, ... })` with no `acquire`).
- TR-board-link-009: worst-case cost of `ensurePlayable()` (up to RESHUFFLE_TRIES permutations, each a full pair scan) is not analysed against the 2 ms rules-step budget (`docs/registry/architecture.yaml:230`). ADR-0002:270 says connectivity is "only done on click", which is not true of the settle-point check.

### Cross-ADR Conflicts

No data-ownership, performance-budget or dependency-cycle conflict. Registry check: four owned states (`game_time`, `token_set`, `board_cells`, `progress_record`) each have exactly one owner; the registered budget sums to 2.0 ms against 16.67 ms. Three findings in the Integration and Pattern classes:

## Conflict 1: ADR-0002 vs ADR-0003
Type: Integration (module wiring)
ADR-0002 claims: `createRound({ chapter, seed, constants, board, effects, skills, pressure, progress })` (line 172): the round receives finished rule modules. Its diagram (lines 158-160) instead shows the round creating the board.
ADR-0003 claims: `createPressure(config, { board, emit, ... })`, `createEffects(config, { board, emit, acquire, ... })`, `createSkills(config, { board, pressure, emit, acquire, ... })` (lines 147-149). `emit` writes to the round's `outbox` and `acquire` is the round's token API.
Impact: whichever side is built first lacks a dependency. As written the first Core story cannot be implemented without inventing a wiring (setter injection, a context object, or factories inside the round). `gameTime` access for effects has the same problem (not listed in either signature).
Resolution options:
  1. `createRound({ chapter, seed, constants, progress, factories })`: the round builds the modules itself and hands each a `ctx = { emit, acquire, release, gameTime }`.
  2. A small `createRoundContext()` (outbox + token set + clock) is built first and passed both to the modules and to `createRound`.
Pick one, state it in ADR-0002 Key Interfaces, and align the ADR-0003 lines.

## Conflict 2: ADR-0003 vs `docs/registry/architecture.yaml` (and ADR-0002 line 111)
Type: Pattern
Registry (`forbidden_patterns.animation_driven_rules`, lines 364-369, source ADR-0003) claims: "the view must never advance rules on transitionend or a view timer; only tokens and gameTime do."
ADR-0003 claims: line 122, the view accumulates `dtReal` for the ending animation and calls `round.endingDone()` (end -> settle); ADR-0002 line 111 says the same. Line 163 also says the view affects rules "only through the intent queue and lifecycle entries", but `endingDone()` is neither.
Impact: the registry forbids what the accepted flow does. Harm is small (the clock is stopped in `end`, nothing depends on the delay), but a forbidden-pattern entry that the owning ADR violates will be ignored by everyone.
Resolution options:
  1. Keep the GDD flow (round-flow.md:105 assigns `endingDone()` to the UI) and reword the registry pattern and ADR-0003:163 to name `endingDone()` as the one view-timed transition. Do the same for the open->play fade if the view times it.
  2. Move the timing into `round.frame(dtReal)` with constants for the two ending lengths and drop the UI call (changes round-flow.md:105).

## Conflict 3: ADR-0002 vs ADR-0003 (contract gap, not a contradiction)
Type: Integration
ADR-0002 line 104 and ADR-0003 line 109 both assign `CARD_GUARD_MS` to the rule layer ("button shown less than CARD_GUARD_MS ago -> drop"). ADR-0003 line 112 lists the view-owned timers and omits it. The rule layer has no value for "when the button appeared": win-card buttons appear after the stamp lands (round-flow.md:106, :192), which is view timing.
Impact: the guard cannot be implemented from the ADRs; it is also the control against mis-tapping "next chapter" on the result card. Same hole for the 150 ms open->play fade (round-flow.md:31).
Resolution options:
  1. Rule layer owns it: `round` keeps `overlayAgeMs`, accumulated from `frame(dtReal)` and reset whenever `round.overlay()` changes; `button` intents are accepted once it is `>= CARD_GUARD_MS`. The win card's age starts when `endingDone()` moves `end` -> `settle`. Add a `starting` sub-state of `open` for the 150 ms fade.
  2. View owns it: add `CARD_GUARD_MS` and the fade to ADR-0003 line 112 and have the view only enqueue valid `button` intents; add an intent for "mask cleared".

### ADR Dependency Order
Script output (`bash .claude/scripts/adr-dep-graph.sh`): ADRS 4; EDGES adr-0002->adr-0001, adr-0003->adr-0001, adr-0003->adr-0002, adr-0004->adr-0001; no `NO_DEPS_SECTION`, no `UNFILLED_DEPS`, no `CYCLE:`, no `BLOCKED_BY_CYCLE`. `ORDER: adr-0001, adr-0002, adr-0004, adr-0003`.

Recommended implementation order:
  Foundation (no dependencies):
    1. ADR-0001: no engine, native H5, single-file release
  Depends on Foundation:
    2. ADR-0002: main loop, round clock, determinism (requires ADR-0001)
    3. ADR-0004: local save (requires ADR-0001)
  Then:
    4. ADR-0003: rules/view channel, DOM + SVG (requires ADR-0001, ADR-0002)

Unresolved dependencies: ADR-0001 is `Proposed`, so ADR-0002, ADR-0003 and ADR-0004 cannot be safely implemented until it is Accepted; ADR-0003 additionally waits on `Proposed` ADR-0002.
Undeclared dependencies (the graph is only as good as the declarations): ADR-0002 uses `progress.settle(RoundResult) -> SettleOutcome` (lines 111, 172) and ADR-0003 reads the `progress` queries (line 76, `createView` at line 155), but neither lists ADR-0004. Adding both edges still gives no cycle and changes the order to 0001, 0004, 0002, 0003.

### GDD Revision Flags
None. No GDD assumption is contradicted by an accepted ADR or by sourced platform behaviour. Two qualifications: (a) no platform fact has been established (probe not run), so a contradiction cannot be ruled out, only not found; (b) the ADR-vs-GDD mismatches below are corrections to the ADR, because the GDDs are approved.

### Engine Compatibility Issues

Engine checks that are NOT APPLICABLE or NOT ASSESSED (stated plainly, none marked passed):

| Check | Status | Why |
|---|---|---|
| Engine validation (`engine.name`, pinned version) | **NOT ASSESSED** | No engine configured, deliberate (project.yaml, ADR-0001). |
| Engine specialist consultation | **NOT ASSESSED** | Skill skips it when no engine is configured. |
| Deprecated API check | **NOT ASSESSED / NOT SOURCEABLE** | `docs/engine-reference/web-h5/` holds only `VERSION.md`: there is no `deprecated-apis.md`, so there is no sourced list to grep against. The substitute below is the banned list, which is not a deprecation list. |
| `breaking-changes.md`, engine module docs | **NOT APPLICABLE** | No engine releases to track; no ADR names a module doc. |
| Post-cutoff API consistency | **NOT APPLICABLE** | All four ADRs declare `Post-Cutoff APIs Used: None`; there is no module reference to verify that against or contradict it. The four are consistent with each other. |

Checks that did apply to the H5 platform reference:

- Version stamp consistency: PASS. All four ADRs stamp the same platform ("no engine, native H5, ES2017, Xiaohongshu mini-tool WebView, version unknown"). Note this is a baseline, not a version: `VERSION.md` says kernel and version are NOT DETERMINED.
- Missing Engine Compatibility sections: 4 / 4 present.
- Banned list (`VERSION.md` "禁用" and "慎用"): no ADR contradicts it. No third-party code, network API, CSS filter / backdrop-filter / mix-blend-mode, runtime SVG filter, animated left/top/width/height/font-size, emoji icon, `eval` / `new Function` / dynamic `import()`, or rules-layer access to `document`, `window`, `localStorage`, `Date.now()`, `Math.random()`. The one `Math.random()` (salt fallback, ADR-0002 §5) is in `main.mjs`, outside the rules layer, which the ban allows. `matchMedia('(prefers-reduced-motion)')` falls back to the default version when unreadable (ADR-0003 §3), as the caution list requires. IndexedDB / `navigator.storage` / `document.fonts` are not used.
  Enforcement gap: of the banned items only filter / backdrop-filter / blend-mode / `<filter` / `eval(` / `new Function` / `import(` / network APIs have a build check (ADR-0001:112-116). Animation of layout properties, `will-change` count, emoji and animated `clip-path` / `mask-image` rely on code review.

HIGH-risk platform unknowns (`VERSION.md` rows) and where each is addressed:

| Unknown (`VERSION.md`) | Addressed in | Status |
|---|---|---|
| `file://` vs http(s), origin changing per release | ADR-0004 (Verification Required, Risks); `architecture.md` OQ-1 | Addressed |
| multi-file / `fetch` / `<script type=module>` | ADR-0001 (single file, no `fetch`, not relied on); OQ-1 | Addressed |
| `localStorage` usable / cleared / quota | ADR-0004 (storage port, memory-only fallback); OQ-1 | Addressed |
| `visibilitychange` / `pagehide` / back key / orientation | ADR-0002 §4 + implicit-background fallback (lines 36, 248); OQ-1 | Addressed. Residual: a host that keeps rAF alive at low rate while hidden (named in ADR-0002:248). ADR-0002:33 stamps the whole ADR `MEDIUM` although its own text rates this item `HIGH`. |
| host font scaling / forced dark | ADR-0003:125 mitigations (`text-size-adjust`, `color-scheme`) | **Partially addressed**: not in ADR-0003's Verification Required (line 36) and not in the OQ list (`architecture.md:202` OQ-1 names storage, lifecycle, multi-file only). `architecture.md:25` rates it MEDIUM although `VERSION.md` lists it under HIGH. |
| safe area / usable height | ADR-0003 `computeLayout({ safeArea })`; OQ-3 | Addressed (host title-bar height still unknown; flows into fit_scale) |
| frame rate | ADR-0003 Verification Required; budgets in `architecture.md` | Addressed |

Also unprobed assumptions the ADRs rely on that are in no unknowns table: Pointer Events (`isPrimary`, `pointercancel`) and unprefixed `href` on `<use>` (ADR-0003 §3; art bible §8 converts `xlink:href` to `href`). `VERSION.md` rates Pointer Events LOW; neither is a probe key (`tools/platform-probe/README.md`). Suggest adding both as probe keys; not asserted as a defect.

### Architecture Document Coverage (`docs/architecture/architecture.md`, Phase 6 ran)

- Systems in `systems-index.md` vs layer map: the 8 MVP systems all appear, in the layers `systems-index.md` gives them. The 4 later-tier systems (教学引导, 难度与无障碍选项, 音效, 图鉴) are absent; acceptable, they have no GDD. The `tutorial` token is in round-flow's table but no ADR yet.
- Orphaned architecture: `src/core/`, `src/app/`, `src/platform/` have no GDD system; `architecture.md:97` says so deliberately. Not an orphan finding.
- Data flow vs GDD communication: the frame diagram (lines 121-133) omits the direct rule-to-rule calls the GDDs require: `effects -> pressure.comboReward()` (clear-effects.md:54), `skills -> pressure.scareNextPush / addFood / resetCharge` and `canScare / charge` reads (general-skills.md:98), `pressure -> board.pushRowFromTop / addPairs`, and pressure acquiring the `hostAttack` token. See TR-clear-effects-003, TR-battle-pressure-005.
- API boundaries: they adopt GDD names by reference (line 141). Adequate for round-flow callbacks, thin for the board mutation interface (TR-board-link-008).
- Layer rule vs layer map: line 77 says "dependencies only go down; lower layers never reference upper layers". The map (lines 79-95) puts `src/app/main-loop.mjs`, `screens.mjs` and `src/platform/lifecycle.mjs` in FOUNDATION, but they call `round.*` (Core) and `view.render` (Presentation). Core `round-flow` also calls Feature modules (`pressure`, `skills`, `progress`), and `clear-effects` (Core) calls `pressure.comboReward` (Feature). This is consistent only if "reference" means module import, with the Feature modules injected into the round, and the app/platform wiring is a composition root above everything. The document does not say so. As written, `/create-control-manifest` and `/create-epics` would read the layer map as the dependency rule.
- Self-assessment claims that this review does not support: line 157 ("all 38 requirements covered ... Foundation has no gaps", while 11 are partial and TR-chapter-design-003 appears in no ADR's Requirements table); lines 152-155 ("Conflicts: None" for all four ADRs; see Conflicts 1-3); line 177 vs line 181 ("exceeding budgets only warns" vs "package > 2,000,000 bytes fails the build"; the 2 MB cap is a hard platform limit and should be said to be the exception).

### Mismatches between ADRs and GDDs / config (naming and rules)

| # | Where | Mismatch | Change |
|---|---|---|---|
| M-1 | ADR-0003:88, :90, :91 vs battle-pressure.md:34 (AC :268) | GDD events: `push {row, empty}`, `foodSpent {amount, cause}`, `hostAttack {line}`. ADR-0003 lists `push: row`, `foodSpent: amount`, `hostAttack: heartsLost, added`. The AC "push.empty = true" cannot be checked from the ADR contract, and the rotating enemy line has no field (ADR-0003:98 says text is never in events, so an index is needed). | Add `empty`, `cause` and `line` (index into `enemyLines`) to those rows; keep `heartsLost, added` if the view needs them. |
| M-2 | ADR-0002:107 (step 5) vs round-flow.md:80 | The trigger list ("click result, token due, push or attack in tick, fallback clear") omits a plain tick with no tokens, which the GDD makes a settle point. The closing sentence implies it, but the "破城" check (bottom row occupied at `nextPush`, no push happens) only works if `outcome()` is queried after such a tick. | Add "or any `tick` that ran with an empty token set" to the trigger list. |
| M-3 | ADR-0002:33 | Header says `Knowledge Risk: MEDIUM` while its own text and `architecture.md:22` rate lifecycle events HIGH. | Set HIGH. |
| M-4 | ADR-0001:115 | "check 4: rules files contain the forbidden globals of item 3" points at the network-API check; the intended reference is module rule 3 (line 104). | Say "module rule 3 (line 104)". |
| M-5 | ADR-0001:205 | Maps "pure, Node-testable rules" to TR-board-link-001/-003 (grid, connectivity). Correct row is the new TR-board-link-007. ADR-0001:211 maps package size / emoji to TR-ui-interaction-004; correct row is the new -008. | Update both citations. |
| M-6 | `project.yaml:61` (`naming.signals: lowercase`) vs ADR-0003:80-96 | Event types are camelCase (`hostAttack`, `tokenStart`, `skillArmedSpent`, `cardHint`, `targetGone`, `lastWave`, `foodSpent`). The config's own comment lists `hostAttack` as an example of "lowercase". `project.yaml:63` cites screen ids `card-open`, `card-win`; ADR-0002:184 overlay ids are `open`, `resume`, `pause`, `landscape`, `win`, `lose`. | `signals: camelCase`; fix the scenes comment. |
| M-7 | ADR-0002:158-160 / :172 | `createBoard(chapter, seed)` has no way to inject a stream, but board-link.md:245 requires a test with an injected `shuffle` stream that never succeeds. | `createBoard(chapter, seed, { streams })`. |
| M-8 | ADR-0002:32, ADR-0003:32 vs `architecture.md:79-95` | ADR headers say `Layer: Foundation` for the round clock (a Core system) and for the rules/view channel (Presentation domain). | Decide what the ADR `Layer` field means (where the decision sits vs the GDD's layer) and say it once. |
| M-9 | `docs/registry/architecture.yaml:79-88` | `board_cells` names ADR-0003 as the authoritative ADR, but ADR-0003 only defines read-only queries; no ADR states board-link's exclusive write ownership (only `architecture.md:103`). The registry holds no entry for pressure's `charge` / `hearts` / `food` (read by skills and the HUD) or for the combo counters. | Point `board_cells` at the ADR that owns the rule, or add that sentence to ADR-0002; register pressure state when its ADR exists. |
| M-10 | `docs/registry/architecture.yaml:223-238` | Only `rules-step: 2.0 ms` is allocated. Nothing allocates the view/render step or the tap-to-feedback chain (100 ms). Not a violation (2.0 < 16.67), but the 16.67 ms frame has 14.67 ms with no owner. | ADR-0003 should register a view budget. |

### Recommended fixes

| # | File:line | Change |
|---|---|---|
| R1 | ADR-0002:172 and ADR-0003:147-149 | Settle Conflict 1; add `gameTime` to the injected context. |
| R2 | ADR-0003:88, :90, :91 | M-1. |
| R3 | ADR-0002:104, :111; ADR-0003:109, :112, :122, :163; `docs/registry/architecture.yaml:364-369` | Settle Conflicts 2 and 3 together: one paragraph naming who times the overlay-button guard, the 150 ms fade and the ending, and make the registry pattern say what is allowed. |
| R4 | ADR-0002:107 | M-2. |
| R5 | ADR-0002:80 | Main loop schedules the next `requestAnimationFrame` last. An exception in `round.frame` or `view.render` ends the loop and freezes the page with no error screen. Schedule it first, or `try/finally`, and route the exception to the `error` screen (ADR-0002:92). Not a GDD requirement; a resilience gap. |
| R6 | ADR-0001:116 | The ES2017 baseline (line 74) is enforced for `?.` and `??` only, and only as a warning. Object spread, `catch {` without a binding, `Object.fromEntries`, `.flat()` / `.flatMap()`, `globalThis` and `BigInt` are ES2018 or later and pass. `catch {` is likely in ADR-0004's "try/catch around every port call". Add them to the denylist (regex-detectable except object spread, which stays a review item). |
| R7 | ADR-0001:112-116, ADR-0003:165-169 | Either add build checks for animated layout properties, emoji and `will-change` count, or state they are review-only. |
| R8 | ADR-0002:42, ADR-0003:42 | Add ADR-0004 to Depends On. |
| R9 | ADR-0003:36 | Add host font scaling, forced dark and safe area to Verification Required. Add the same to `architecture.md` OQ-1 (line 202). |
| R10 | ADR-0002:270 | Add the settle-point `ensurePlayable()` cost (worst case RESHUFFLE_TRIES permutations, each a full pair scan) to the CPU line; back it with the Node stress test in board-link.md:238. |
| R11 | `architecture.md:77-95`, :152-157, :177/:181, :202 | Mark `src/app` and `src/platform` as a composition root (or add a layer), state that cross-layer calls are injected, remove "Conflicts: None" and the full-coverage claim until Conflicts 1-3 and the 11 partials are closed, add the budget exception, extend OQ-1. |
| R12 | `project.yaml:61-63` | M-6. |
| R13 | ADR-0001:106-117 vs `design/art/art-bible.md:975` | The art bible budgets code at 160 KB "compressed"; the build measures raw bytes, has no minify step, and the coding standard requires doc comments on public APIs. Decide whether comment stripping is needed or the 160 KB line is advisory (the 2,000,000-byte total has ample headroom: the art bible's own table totals about 1,182 KB at its caps). |
| R14 | ADR-0001:205, :211; ADR-0003 table (lines 219-232) | Update citations to the new IDs. Add a `chapter-design.md` row to ADR-0003 (templates, line 98 is its only mention): TR-chapter-design-003. |

### Verdict: CONCERNS

Why not PASS: all four ADRs are `Proposed` (39 🟡 rows, 0 ✅); 11 requirements are Partial; three integration/pattern findings (Conflicts 1-3) sit in ADR-0002 and ADR-0003.
Why not FAIL: no Foundation or Core requirement is without an ADR (0 ❌); no ADR dependency cycle; Conflict 1 is the closest to blocking (the wiring cannot be implemented as written) but is settled by one paragraph with no design change.
NOT ASSESSED line items inside this verdict (they do not change CONCERNS, since NOT ASSESSED ranks below it, but they keep the verdict from becoming PASS even after the ADRs are accepted):
- Engine validation: NOT ASSESSED, no engine configured (`engine.name` unset in `project.yaml`).
- Deprecated-API audit: NOT ASSESSED, NOT SOURCEABLE: `docs/engine-reference/web-h5/` has no deprecated-API list.
- Platform facts: every row of `VERSION.md`'s unknowns table is unverified until the probe runs; ADRs 0001, 0002 and 0004 each carry a Verification Required list for it.

### Blocking Issues (must resolve before the ADRs can reach Accepted)
This is a CONCERNS verdict, so these are not FAIL blockers; they are what stands between the current ADRs and `Accepted`:
1. Conflict 1: module wiring (R1).
2. Conflicts 2 and 3: who times the overlay-button guard, the open->play fade and the ending; registry pattern (R3).
3. M-1: ADR-0003 event payloads (R2).
4. Acceptance itself: the user, or `technical-director` on the user's explicit confirmation, moves each ADR to `Accepted` (`/architecture-decision accept ADR-NNNN`). Four downstream skills (`create-control-manifest`, `create-epics`, `create-stories`, `gate-check`) require `Accepted`.

### Required ADRs
No new ADR is needed to close a coverage gap (0 ❌). Edits to existing ADRs, most foundational first: ADR-0002 (R1, R3, R4, R5, R8, R10, M-3, M-7), ADR-0003 (R1, R2, R3, R8, R9, M-8), ADR-0001 (R6, R7, R13, M-4, M-5), ADR-0004 (only a settle-once guideline for TR-progress-save-006). Future ADRs already planned in `architecture.md:167-169`: brush font selection (needs the user's consent to download), a multi-file release split if the probe allows it, and an ADR for the post-MVP progress code if storage proves unreliable (ADR-0004 Alternative 4).

---

### Technical Setup -> Pre-Production gate: what this report establishes
(`.claude/skills/gate-check/references/gate-pre-production.md`, lines 28-32; the gate reads the report's `Mode:` line)

| Gate item | Mode checked | Result from this report |
|---|---|---|
| `/architecture-review` has been run | `full` | Done: this report, Mode: full. Verdict CONCERNS. |
| Traceability matrix has zero Foundation-layer gaps | `full` | **0 ❌ among the 9 Foundation requirements** (3 ⚠️ Partial: -001, -008, -009). Zero gaps holds; the ADRs are not Accepted. |
| Engine audit shows no deprecated API usage | `full` | **NOT ASSESSED**: no engine, no deprecated-API list. The banned-list check found no violation, but that is a different list. Do not report this item as passed. |
| All HIGH-risk domains addressed in the architecture document or flagged as open questions | quality check | 6 of 7 `VERSION.md` rows addressed; host font scaling / forced dark is only mitigated, not flagged (R9). |
| All ADRs have Engine Compatibility and GDD Requirements Addressed sections | quality check | 4 / 4. The "engine version stamped" part is a platform baseline, not a version. |
| Architecture traceability index exists | file | Written: `docs/architecture/requirements-traceability.md`. |

### Immediate actions (Phase 9)
1. Settle Conflicts 1-3 and M-1 in ADR-0002 and ADR-0003 (R1-R4). There is no missing ADR to write first.
2. Move ADR-0001 to ADR-0004 to `Accepted` (user, or `technical-director` on the user's explicit confirmation), then re-run `/architecture-review` so the 🟡 rows can become ✅.
3. Run the platform probe (`tools/platform-probe/`) and update `docs/engine-reference/web-h5/VERSION.md`; it is the only way to turn the NOT ASSESSED platform items into findings.

### Pre-gate checklist (Phase 9)
- ✅ Test root `tests/unit/` and `tests/integration/` exist (Godot layout, as ADR-0001 chose). `node --test "tests/**/*.test.mjs"` on Node v24.19.0: 6 tests, 4 pass, 0 fail, 2 skipped. The two skips are the rules-layer purity scans, which skip because `src/rules` and `src/core` do not exist yet; a skip is not a pass and the scans have not yet run on real code.
- ✅ `.github/workflows/tests.yml` exists (untracked; `tests/README.md:72` says it was never pushed, so CI has not run).
- ❌ `design/accessibility-requirements.md` does not exist.
- ❌ `design/ux/interaction-patterns.md` does not exist (`design/ux/` itself does not exist).
Tension to settle: this skill's Phase 9 says to treat ❌ items as required and not offer `/gate-check`; `gate-pre-production.md:90` says that at `standard` both documents are recommended, not required. The accessibility target is already set (`project.yaml:65-66`, `target: standard`). The user decides which reading applies.

### Open items that need the user's decision
1. Accept the four ADRs (after R1-R4 are applied), or ask for changes.
2. Overlay-button guard and open->play fade: rule layer or view? (Conflict 3; recommendation: rule layer, option 1.)
3. `endingDone()` stays a view-timed call and the registry pattern is reworded (Conflict 2 option 1), or the timing moves into round-flow.
4. What `Layer` means on an ADR (M-8) and whether `src/app` / `src/platform` are a composition root above Core (R11).
5. `project.yaml` `naming.signals` value (M-6).
6. Whether the two missing design documents block `/gate-check` at `standard`.
7. Whether the build strips comments, or the 160 KB code line is advisory (R13).

### Session-state block (not written; outside the authorised writes)
    ## Session Extract — /architecture-review 2026-10-27
    - Verdict: CONCERNS
    - Requirements: 50 total — 0 covered (Accepted), 39 covered (Proposed), 11 partial, 0 gaps
    - New TR-IDs registered: 50 (38 provisional kept, 12 added)
    - GDD revision flags: None
    - Top ADR gaps: ADR-0002/0003 wiring (Conflict 1); overlay guard and fade timing (Conflict 3); ADR-0003 event payloads (M-1)
    - Report: docs/architecture/architecture-review-2026-10-27.md

## Re-check 2026-10-27 (v2)

Scope: I re-read the edited ADR-0001, ADR-0002 and ADR-0003, `architecture.md` v2, `docs/registry/architecture.yaml` and `project.yaml`. ADR-0004 and the GDDs are unchanged. `registry.sh validate` is clean; `adr-dep-graph.sh` gives the same edges, no cycle, and order 0001, 0002, 0004, 0003. This was a targeted re-check, not a full re-run, so **no new receipt stamps were added**. The next `/architecture-review` will see the edited files as CHANGED and re-run, which is right: `requirements-traceability.md` still shows the v1 statuses, and I was authorised to edit only this file.

**Updated verdict: CONCERNS.** All ADRs are still `Proposed`, 5 requirements are still Partial, and the edits introduced the issues listed under "New inconsistencies". No FAIL trigger: 0 gaps, no cycle. The NOT ASSESSED items are unchanged: engine validation, the deprecated-API audit, and the platform facts.
Counts now: 50 requirements, 0 ✅, 45 🟡, 5 ⚠️ (TR-board-link-001, TR-round-flow-009, TR-chapter-design-004, TR-progress-save-006, TR-ui-interaction-009), 0 ❌. Foundation: 8 🟡, 1 ⚠️, 0 ❌.

### Status of the v1 items

| Item | Status | Where |
|---|---|---|
| Blocking 1, Conflict 1 (wiring) | Resolved, with two new defects (N2, N6) | ADR-0002:123-132, :193-195; ADR-0003:73, :146-149 |
| Blocking 2, Conflicts 2 and 3 (timers) | Resolved, with two new defects (N1, N4) | ADR-0002:103-107; ADR-0003:109, :122, :163; registry :373-376 |
| Blocking 3, M-1 (event payloads) | Resolved | ADR-0003:88, :90, :91, :225 |
| Blocking 4 (acceptance) | Not resolved: waiting for the user | all four ADRs, Status line 5 |
| R1 | Resolved (`gameTime` sits in `ctx`; see N8 on its type) | ADR-0002:127 |
| R2 | Resolved | ADR-0003:88-91 |
| R3 | Resolved, apart from N1 | ADR-0002:103-107; registry :375 |
| R4 / M-2 | Resolved | ADR-0002:117 |
| R5 | Resolved | ADR-0002:77-84 |
| R6 | Partly: much better, but ES2018+ holes remain. Not caught: class fields and `#private`, `.finally(`, `\|\|=` / `&&=`, numeric separators, `Promise.allSettled`, `Object.hasOwn`, `.findLast(`, `trimStart` / `trimEnd`, the regex `s` flag | ADR-0001:116 |
| R7 | Resolved, with false-positive risk (N5) | ADR-0001:117-120 |
| R8 | Declined for ADR-0002. **I agree**, on one condition: ADR-0002 relies on `settle()` being synchronous and never throwing (progress-save rules 5, 17). With the new try/catch, an exception escaping `settle()` would now send the player to the error page instead of degrading. Say that in the Ordering Note. The same reasoning covers ADR-0003 reading `progress` queries. | ADR-0002:45 |
| R9 | Resolved. `architecture.md:25` still rates this row MEDIUM while `VERSION.md` treats every unknown as HIGH (cosmetic). | ADR-0003:36; architecture.md:207 |
| R10 | Resolved | ADR-0002:295-296; registry :234 |
| R11 | Partly. Composition root, 2 MB exception, OQ-1 and the traceability line are done. The ADR Audit table still says "Conflicts: None / Valid ✅" next to a note saying three were found. The data-flow figure still omits `comboReward` and the skill-to-pressure calls. | architecture.md:99, :181, :207, :161 done; :154-157, :123-135 not |
| R12 / M-6 | Resolved | project.yaml:61-63 |
| R13 (comment stripping vs the 160 KB code line) | Not addressed: still the user's decision | ADR-0001:106-121 |
| R14 / M-5 | Resolved | ADR-0001:209, :215-216; ADR-0003:226 |
| M-3 | Resolved | ADR-0002:33 |
| M-4 | Resolved | ADR-0001:115 |
| M-7 | Resolved, but see N3 | ADR-0002:126, :132 |
| M-8 (meaning of the `Layer` field) | Not addressed | ADR-0002:32, ADR-0003:32 |
| M-9 | Resolved | ADR-0003:164 |
| M-10 | Resolved: 2.0 + 4.0 ms of 16.67 ms | ADR-0003:237; registry :239-247; architecture.md:188 |

### New inconsistencies introduced by the edits

| # | Sev. | Where | Problem | Change |
|---|---|---|---|---|
| N1 | High | ADR-0002:103, :105 vs :115 | `overlayAgeMs` uses "the same clamping as token timing". Token timing (`dtTok`) is also **0 while a `background` or `pause` token is held**. Read literally, the age never grows on the pause, resume and landscape→pause cards. Their buttons would stay rejected forever and the round could not be resumed. | Say that only the `dtReal` sanitising applies (negative → 0, over `BG_GAP_MS` → 0), not the background/pause zeroing. Add a test: the pause card's "接着讲" is accepted 500 ms after it appears. |
| N2 | Medium | ADR-0003:155 (`createView(root, { round, board, effects, pressure, skills, ... })`) and :76 queries vs ADR-0002:123, :193 | The round now builds its modules internally and exposes no accessor for them. The view (made outside the round, rebound every round) has no way to reach `board.cells()`, `pressure.hud()`, `skills.cards()` and so on. | Add read-only accessors to the round (e.g. `round.board()`, `round.pressure()`, ... or one `round.queries()`), and have `createView` / `view.bind(round)` take them per round. |
| N3 | Low | ADR-0002:125-126 vs :174; board-link.md:31; round-flow.md:138 | ADR-0002 now has the round derive the four streams and pass `{ streams }` to the board. Its own line 174 and board-link rule 3 still say the board derives them from `seed`. | `createBoard(chapter, { seed, streams })`: the board derives the streams from `seed`, and `streams` is only a test override. Fix line 174 to match. |
| N4 | Medium | ADR-0002:101, :105 vs round-flow.md:192, :293 | For the **lose** card the ADR shows the card at `end` without buttons and the buttons at `settle` (+300 ms, `ENDING_LOSE_MS`). The guard then runs from `settle`. The GDD says the lose card's buttons appear **with** the card, and its AC accepts a tap 600 ms after the card appears. Measured from the card, the ADR accepts at about 800 ms. | Either `overlay()` returns `null` during a lose `end` (only the 300 ms mask fades in; card and buttons appear at `settle`), or the lose card's buttons count from `end`. State which. |
| N5 | Low | ADR-0001:117-118 | Check 6 matches the words `left`, `top` and so on anywhere in transitions or keyframes, so values like `transform-origin: top left` fail the build. Check 7 uses `Extended_Pictographic`, which includes © ® ™: a copyright line or the font's licence text would fail it. | Match property names only (`left:` etc. inside keyframes, names in `transition-property` lists). Exclude U+00A9, U+00AE and U+2122, or scan UI text and data only. |
| N6 | Medium | ADR-0002:193 (`systems = DEFAULT_SYSTEMS`) vs architecture.md:77, :99 | A default inside `round-flow.mjs` means round-flow (Core) statically imports battle-pressure and general-skills (Feature). That is the upward reference that `architecture.md:99` says `src/rules/` never makes. | No default in round-flow: the composition root (`src/app/`) passes `systems`. |
| N7 | Low | ADR-0002:114 vs ADR-0003:108, round-flow.md rule 9 | ADR-0002 says the pause stamp is "only subject to `CARD_GUARD_MS`". Now that `overlayAgeMs` resets on every overlay change, this would block pause for 500 ms after play starts. ADR-0003 and the GDD apply no guard to the pause stamp. (The wording is older; the new timer makes it matter.) | ADR-0002:114: "the pause stamp ignores both the board lock and `CARD_GUARD_MS`; overlay buttons are subject only to `CARD_GUARD_MS`". |
| N8 | Low | ADR-0002:127, :195 | `ctx.gameTime` is listed without a type. A value would be frozen at assembly time. | `gameTime: () => ms`. |
| N9 | Low | ADR-0002:106-107 vs ADR-0001:148 | New constants `OPEN_FADE_MS`, `ENDING_WIN_MS`, `ENDING_LOSE_MS` are not in the round-flow Tuning Knobs or `design/registry/entities.yaml`. ADR-0001 asks for GDD names. | Add them to the entity registry when the GDD is next touched, or name them as ADR-defined. |

Older inconsistencies I missed in v1 (not caused by the edits):
- `architecture.md:106` gives `attempt` to round-flow, while ADR-0002:100 keeps it in `screens.mjs`.
- `architecture.md:198` (principle 2: "the view never decides when a show ends") does not mention the `endingDone()` exception now written into both ADRs.
- `ADR-0002:197` lists `acquire` without the `detail` parameter that ADR-0003:150 and the registry `token_set` entry have.
- ADR-0002:83 also routes runtime exceptions to the error page, which `ui-interaction.md:174` only enters when every chapter fails to load. This is a harmless extension; note it in the GDD later.

### Open items
1. Fix N1 before accepting ADR-0002: it can lock a player out of resuming.
2. Fix N2, N4 and N6, then the low items N3, N5, N7, N8.
3. User decisions still open: accept the four ADRs; the meaning of the `Layer` field (M-8); comment stripping vs the 160 KB code line (R13); whether `design/accessibility-requirements.md` and `design/ux/interaction-patterns.md` block `/gate-check` at `standard`.
4. After the fixes and acceptance, run `/architecture-review` again. That refreshes `requirements-traceability.md` (still at the v1 statuses), takes new receipts, and turns the 🟡 rows ✅.

## Re-check 2 (v3)

Scope: the v3 edits only. I re-read ADR-0002 (all), ADR-0001 §4 and its Requirements table, and the changed parts of ADR-0003, ADR-0004, `architecture.md` and `design/registry/entities.yaml`. `registry.sh validate` is clean. No new receipt stamps were taken (same reason as v2).

All of N1-N9 and the remaining v1 items are resolved. **N1 is fixed**: the overlay timers now keep counting while background/pause tokens are held (ADR-0002:118), and a test requirement covers it (:245). The four previously Partial requirements now have explicit ADR text:
- TR-board-link-001 (ADR-0001:212)
- TR-chapter-design-004 (ADR-0002:103, :306)
- TR-progress-save-006 (ADR-0004:132, :194)
- TR-ui-interaction-009 (ADR-0003:170, :230)

**Verdict: CONCERNS**, because of the ADR statuses and the two Medium items below. Counts: 50 requirements, 0 ✅, 49 🟡, 1 ⚠️ (TR-round-flow-010, see V3-1), 0 ❌.
Even with everything fixed and accepted, the best this skill can return is **NOT ASSESSED**, not PASS. No engine is configured and there is no deprecated-API list, and the skill keeps such a verdict from PASS (Phase 7).

### Medium

| # | Where | Problem | Change |
|---|---|---|---|
| V3-1 | ADR-0002:106-108 (`overlay()` table) and :121 vs round-flow.md:31, ui-interaction R1 / AC :295 | `overlay()` stays `'open'` (card with buttons) for all of `open`, including the new `starting` sub-state. The view learns that "开讲" was accepted only from the `state` event at `starting -> play`, 150 ms later. If it fades the mask then, the mask covers an unlocked board, which breaks R1 and trips the TR-ui-interaction-009 dev assertion. The view can't use its own tap instead, because the intent may have been dropped by the guard. | Add a row: `open` / `starting` -> `null` (the view plays the 150 ms fade on that change). Or emit `state {from: 'open', to: 'starting'}`. |
| V3-2 | ADR-0001:121 (release strips comments) with `tests/helpers/purity.mjs` | The shared tokenizer handles `//`, `/* */` and quotes but **not regex literals**. A regex such as `/^https?:\/\//` or `/[/*]/` is mis-read as a comment start, so the stripper truncates the line or deletes up to the next `*/`. That only happens in the release build. The `vm` smoke run (ADR-0001:204) covers the rules layer only, not view code. | Compile the stripped bundle with `node:vm` `new vm.Script(code)` in the build, failing the build on a syntax error, and run the smoke test on the whole bundle. Or teach the tokenizer regex literals. |

### Low (one line each)
- ADR-0001:116: the "digit `_` digit" rule should require the digit to start a number, or identifiers like `cell_1_2` fail the build.
- ADR-0002:150 / ADR-0003:156: `round.systems()` hands the view the mutating modules; "queries only" holds by convention, not by construction.
- ADR-0002:32 / ADR-0003:32: `Layer: Foundation` is now justified in text; M-8 is accepted as an explanation, not a change.
- `requirements-traceability.md` still shows the v1 statuses until the next full run.

### Remaining open items
1. Fix V3-1 and V3-2.
2. User decision: accept ADR-0001 to ADR-0004.
3. User decision: whether `design/accessibility-requirements.md` and `design/ux/interaction-patterns.md` block `/gate-check` at `standard`.
4. Run the platform probe (all `VERSION.md` unknowns are still unverified).
5. Re-run `/architecture-review` after acceptance, to refresh the index and receipts.
