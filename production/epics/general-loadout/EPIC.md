# Epic: 选将与解锁 (general-loadout)

- **Layer**: Feature
- **GDD**: `design/gdd/general-loadout.md`
- **Module**: `src/rules/general-loadout.mjs`
- **Governing ADRs**: ADR-0001 (pure rules layer), ADR-0002 (assembly: picker on round-flow's open card), ADR-0003 (intents in, data out), ADR-0004 (saved `loadout` field, written only in `settle()`)
- **TR**: TR-general-loadout-001, TR-general-loadout-002
- **Stories**: skipped at the user's request on 2026-10-30; implemented directly against the GDD's Acceptance Criteria.

## Implemented ACs

Tests: `tests/unit/general-loadout/general-loadout.test.mjs`, `tests/integration/general-loadout/round-picker.test.mjs`.

- [x] AC1 empty save, ch01 lead only → `AC1: empty save, ch01 shows only the 关羽 lead slot, no picker`
- [x] AC2 replay ch01, slots 1 → `AC2: ... no picker`
- [x] AC3 first win of ch01 unlocks 张飞 → `AC3: ...`
- [x] AC4 second win changes nothing → `AC4: ...`
- [x] AC5 ch02 does not expand → `AC5: ...`
- [x] AC6 ch03 offers only 张飞 → `AC6: ...`
- [x] AC7 swap, lose, reopen → `AC7: ...` (the stars/wins-unchanged part belongs to progress-save)
- [x] AC8 ch03 win unlocks 赵云 → `AC8: ...`
- [x] AC9 ch09 grey 张飞 card, pick ignored → `AC9: ...` (the "此回无鼓" text is the view's, from `{general, kind}`)
- [x] AC10 ch08 no picker, no grey cards → `AC10: ...`
- [x] AC11 lead second / lead twice in the saved loadout → two `AC11: ...` tests
- [x] AC12 再来一回 keeps the empty slot; catalog re-entry refills → `AC12: ...`
- [x] AC13 empty RoundResult.loadout keeps the old one → `AC13: ...` (`loadoutToSave`; progress-save must call it)
- [x] AC14 lead charge not in deck refused → `AC14: ...` (`checkChapters` returns `{chapter, field}`; the loader prints it)
- [x] AC15 unknown id in the saved loadout → `AC15: ...` (the star display belongs to progress-save/UI)
- [x] AC16 order of the generals handed over at 开讲 → integration `AC16: ...` (card width/height is UI, not covered here)
- [x] AC17 storage unavailable, session unlocks → `AC17: ...`
- [x] AC18 reload, only 关羽 → `AC18: ...` (catalog lock belongs to progress-save)

## Waiting on

- `src/data/chapters.mjs`: `slots`, `lead`, `recommend`, `unlock`, `deck`, `starters`, and a generals table `{id: {charge}}`.
- `src/rules/progress-save.mjs`: a `winsOf(chapterId)` read, the per-chapter `loadout` read, and `loadoutToSave` in `settle()`.
- The app layer: build `createLoadout` per entry (pass `retrySlots: round.slots()` on 再来一回) and hand it to `createRound({ picker })`; the loader runs `checkChapters`.
- UI: the picker strip, grey cards, `card_width`.
