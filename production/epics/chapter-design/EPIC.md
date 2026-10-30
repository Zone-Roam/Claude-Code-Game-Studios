# Epic: 回目编排与难度 (chapter-design)

- **Layer**: Feature
- **GDD**: `design/gdd/chapter-design.md` (rules 1-9, 13, 14; Edge Cases; Acceptance Criteria)
- **Modules**: `src/data/chapters.mjs` (release chapters 1-10, enemies, texts, starters),
  `src/rules/chapter-loader.mjs` (`loadChapters(data, flags)`, `resolveNeed`)
- **Governing ADRs**: ADR-0001 (data in `src/data/`, flags from `readUrlFlags`), ADR-0003
  (rules never format player text), ADR-0002 (pure rules layer)
- **TR**: TR-chapter-design-001, -004, -006 (loader); -002, -003 partly (see Waiting on)
- **Tests**: `tests/unit/chapter-design/chapter-loader.test.mjs`, fixtures `tests/helpers/chapter-design-fakes.mjs`

Stories were skipped at the user's request on 2026-10-30: implemented directly against the GDD ACs.

## Implemented ACs

- [x] AC1 10 chapters, 0 rejections / 0 warnings → `AC1 release 10 chapters ...`, `AC1 rule 13 numbers ...`
- [x] AC2 odd deck kind → `AC2 a deck kind with 3 blocks ...`
- [x] AC3 deck 28/30/44/60/62 → `AC3 boss rows 6 cols 5 ...`
- [x] AC4 cols 7 / default 6 → `AC4 cols 7 refused ...`
- [x] AC5 press deck 24 → `AC5 press cols 5 ...`
- [x] AC6 recommend first not lead / too short → `AC6 ...`
- [x] AC7 lead kind missing / recommend kind missing → `AC7 ...`
- [x] AC8 default need 3/4/3 → `AC8 no need written ...`
- [x] AC9 press rows 7 → `AC9 ...`
- [x] AC10 interval 3000 refuse / 5000 warn → `AC10 ...`
- [x] AC11 unknown enemy → `AC11 ...`
- [x] AC12 duplicate id → `AC12 ...`
- [x] AC13 recommend pairs < need warns → `AC13 ...`
- [x] AC14 bad stars in release → `AC14 ...`
- [x] AC15 ch02 refused, next is ch03 → `AC15 ...`
- [~] AC16 all refused → `AC16 ...` (loader side; error page shown by `src/app/screens.mjs` when the list is empty)
- [~] AC17 slow=1 values 15600 / 9100 / 9 and 8 → `AC17 ...` (display "15.6" is UI)
- [~] AC19 water-board data → `AC19 ...` (rendering is UI)
- [~] AC20 preview data → `AC20 ...` (settle card is UI)
- [~] AC21 城破 template → `AC21 ...` (substitution and the 4-threshold variant are UI)
- [x] AC22 chapter fail hints → `AC22 ...`
- [x] AC23 unknown failHint key → `AC23 ...`
- [~] AC24 specials per chapter → `AC24 ...` (rotation at runtime is battle-pressure)
- [x] AC25 bad specials / specialNames → `AC25 ...`
- [~] AC26 special display names data → `AC26 ...` (forecast text is UI)
- [x] AC27 ch06 waveList / jm rules → `AC27 ...`
- [x] AC30 6-column wave parity / width → `AC30 ...`

## Waiting on

- Playable build / UI: AC16 error page, AC17 "15.6"/"9.1"/"9 步" text, AC19 water board,
  AC20 settle card, AC21 threshold substitution, AC26 "下招：布鹿角" banner.
- `src/app/build-flags.mjs` (`readUrlFlags`): AC18 `seed=abc` ignored.
- battle-pressure / board-link runtime: AC24 rotation order, AC28 roadblock moving down in ch06.
- AC29 `prototypes/chapter-balance-sim/` tool check (prototype, not shipped code).
