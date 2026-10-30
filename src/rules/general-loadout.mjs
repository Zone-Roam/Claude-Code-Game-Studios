// General-loadout rules (design/gdd/general-loadout.md): skill slots with a
// locked lead, the recommended lineup, unlocks derived from per-chapter wins,
// `available` / `showPicker` / grey cards, slot filling (rule 9), the slot
// picker round-flow drives on the open card (rules 10-12), the saved-loadout
// rule (13) and the chapter-load checks (Edge Cases).
// Pure data: chapters, the generals table and progress are injected.

/** Most skill slots a chapter may have (GDD Tuning Knobs: 3, the table edge holds no more). */
export const SLOT_MAX = 3;
/** Fewest skill slots a chapter may have (GDD rule 1). */
export const SLOT_MIN = 1;

/**
 * A general's charge unit kind (the "蓄力兵") from the injected generals table.
 * @param {Object<string, {charge: string}>} generals id -> {charge}
 * @param {string} id general id
 * @returns {(string|null)} unit kind, or null for an unknown general
 */
export function chargeOf(generals, id) {
  const g = generals && Object.prototype.hasOwnProperty.call(generals, id) ? generals[id] : null;
  return g && typeof g.charge === 'string' ? g.charge : null;
}

/**
 * Whether a general's charge kind is in the chapter deck (rule 11).
 * @param {{deck: Object<string, number>}} chapter chapter data
 * @param {Object<string, {charge: string}>} generals generals table
 * @param {string} id general id
 * @returns {boolean}
 */
export function fitsDeck(chapter, generals, id) {
  const kind = chargeOf(generals, id);
  return kind !== null && !!chapter.deck && chapter.deck[kind] > 0;
}

function pushUnique(list, id) {
  if (typeof id === 'string' && list.indexOf(id) === -1) list.push(id);
}

/**
 * The unlocked generals (rule 7, Formulas): `starters` + the `unlock` of every
 * chapter with wins >= 1, in starters order then chapter order. Never stored.
 * A general unlocked by two chapters counts once.
 * @param {{starters: Array<string>, chapters: Array<{id: string, unlock?: string}>,
 *   winsOf: function(string): number}} input `winsOf(chapterId)` reads progress
 * @returns {Array<string>}
 * @example unlockedGenerals({ starters: ['guan_yu'], chapters, winsOf: (id) => (id === 'ch01' ? 1 : 0) });
 */
export function unlockedGenerals(input) {
  const out = [];
  for (const id of input.starters || []) pushUnique(out, id);
  for (const ch of input.chapters || []) {
    if (ch.unlock && (input.winsOf(ch.id) || 0) >= 1) pushUnique(out, ch.unlock);
  }
  return out;
}

// unlocked ∪ {lead} ∪ recommend, ordered lead, recommend, then unlocked.
function candidates(chapter, unlocked) {
  const out = [];
  pushUnique(out, chapter.lead);
  for (const id of chapter.recommend || []) pushUnique(out, id);
  for (const id of unlocked || []) pushUnique(out, id);
  return out;
}

/**
 * Generals usable this chapter (Formulas `available`): unlocked, lead and
 * recommend, keeping only those whose charge kind is in the deck. Order: lead,
 * recommend, then unlocked order.
 * @param {Object} chapter `{slots, lead, recommend, deck}`
 * @param {Array<string>} unlocked from unlockedGenerals
 * @param {Object<string, {charge: string}>} generals generals table
 * @returns {Array<string>}
 */
export function availableGenerals(chapter, unlocked, generals) {
  return candidates(chapter, unlocked).filter((id) => fitsDeck(chapter, generals, id));
}

/**
 * Rule 12: the picker opens only with 2+ slots and more available generals than slots.
 * @param {{slots: number}} chapter chapter data
 * @param {Array<string>} available from availableGenerals
 * @returns {boolean}
 */
export function showPicker(chapter, available) {
  return chapter.slots >= 2 && available.length > chapter.slots;
}

/**
 * Formulas `grayCards`: (unlocked ∪ recommend) − available when the picker
 * shows, else []. Each entry names the missing charge kind for the
 * "此回无{兵}" label (the view formats the text).
 * @param {Object} chapter chapter data
 * @param {Array<string>} unlocked unlocked generals
 * @param {Object<string, {charge: string}>} generals generals table
 * @returns {Array<{general: string, kind: (string|null)}>}
 */
export function grayCards(chapter, unlocked, generals) {
  const available = availableGenerals(chapter, unlocked, generals);
  if (!showPicker(chapter, available)) return [];
  const pool = [];
  for (const id of unlocked || []) pushUnique(pool, id);
  for (const id of chapter.recommend || []) pushUnique(pool, id);
  return pool.filter((id) => available.indexOf(id) === -1).map((id) => ({ general: id, kind: chargeOf(generals, id) }));
}

/**
 * Whether a saved loadout may be used (Edge Cases): an array of known general
 * ids, no repeats, length 1..slots. Otherwise only the loadout is dropped.
 * @param {*} saved the chapter record's `loadout`
 * @param {number} slots the chapter's slot count
 * @param {Object<string, {charge: string}>} generals generals table
 * @returns {boolean}
 */
export function savedLoadoutValid(saved, slots, generals) {
  if (!Array.isArray(saved) || saved.length < 1 || saved.length > slots) return false;
  for (let i = 0; i < saved.length; i += 1) {
    if (typeof saved[i] !== 'string' || chargeOf(generals, saved[i]) === null) return false;
    if (saved.indexOf(saved[i]) !== i) return false;
  }
  return true;
}

/**
 * Rule 9 fill for every entry except 再来一回: lead in slot 1, then the saved
 * loadout's non-lead generals still available, then recommend's available
 * generals not yet seated, then null (empty). De-duplicated throughout.
 * @param {Object} chapter `{slots, lead, recommend, deck}`
 * @param {{unlocked: Array<string>, generals: Object, saved?: *}} input `saved` = the chapter record's loadout
 * @returns {Array<(string|null)>} exactly `chapter.slots` entries
 */
export function fillSlots(chapter, input) {
  const available = availableGenerals(chapter, input.unlocked, input.generals);
  const saved = savedLoadoutValid(input.saved, chapter.slots, input.generals) ? input.saved : [];
  const out = [chapter.lead];
  const add = (id) => {
    if (out.length < chapter.slots && available.indexOf(id) !== -1 && out.indexOf(id) === -1) out.push(id);
  };
  for (const id of saved) add(id);
  for (const id of chapter.recommend || []) add(id);
  while (out.length < chapter.slots) out.push(null);
  return out;
}

/**
 * Rule 13: the loadout to write at settle. Returns the round's loadout when it
 * has 1+ generals, else `previous` unchanged (an empty result never overwrites).
 * Abandoned rounds never settle, so they never reach this.
 * @param {(Array<string>|undefined)} previous the record's current loadout
 * @param {(Array<string>|undefined)} resultLoadout RoundResult.loadout
 * @returns {(Array<string>|undefined)}
 */
export function loadoutToSave(previous, resultLoadout) {
  if (Array.isArray(resultLoadout) && resultLoadout.length > 0) {
    return resultLoadout.filter((id) => typeof id === 'string');
  }
  return previous;
}

/**
 * Chapter-load checks (Edge Cases). `errors` refuse the chapter; `warnings`
 * only report. Each entry is `{chapter, field, reason}`; the loader prints them.
 * @param {Array<Object>} chapters chapter data in order
 * @param {{starters: Array<string>, generals: Object}} input starters and generals table
 * @returns {{errors: Array<Object>, warnings: Array<Object>}}
 */
export function checkChapters(chapters, input) {
  const errors = [];
  const warnings = [];
  const unlockSeen = {};
  const starters = input.starters || [];
  for (const ch of chapters) {
    const err = (field, reason) => errors.push({ chapter: ch.id, field, reason });
    const warn = (field, reason) => warnings.push({ chapter: ch.id, field, reason });
    if (!Number.isInteger(ch.slots) || ch.slots < SLOT_MIN || ch.slots > SLOT_MAX) err('slots', 'range');
    if (chargeOf(input.generals, ch.lead) === null) err('lead', 'unknown');
    else if (!fitsDeck(ch, input.generals, ch.lead)) err('lead', 'chargeNotInDeck');
    const rec = ch.recommend;
    if (!Array.isArray(rec) || rec.length !== ch.slots || rec[0] !== ch.lead) err('recommend', 'shape');
    else {
      rec.forEach((id, i) => {
        if (chargeOf(input.generals, id) === null) err('recommend', 'unknown');
        else if (rec.indexOf(id) !== i) err('recommend', 'duplicate');
        else if (!fitsDeck(ch, input.generals, id)) warn('recommend', 'chargeNotInDeck');
      });
    }
    if (ch.unlock !== undefined && ch.unlock !== null) {
      if (chargeOf(input.generals, ch.unlock) === null) err('unlock', 'unknown');
      else if (starters.indexOf(ch.unlock) !== -1) warn('unlock', 'isStarter');
      else if (unlockSeen[ch.unlock]) warn('unlock', 'duplicate');
      unlockSeen[ch.unlock] = true;
    }
  }
  return { errors, warnings };
}

/**
 * The slot picker on the open card (rules 9-12, 14), the object round-flow
 * takes as its `picker` option. Intents (0-based slot index): `{button:'slot', slot}`
 * opens/closes the choice under a non-lead slot (only when showPicker);
 * `{button:'pick', general}` seats a pickable general in the open slot;
 * `{button:'clear', slot}` empties a non-lead slot (only when showPicker).
 * Anything else, a grey card, the lead slot or a seated general is ignored.
 * @param {{chapter: Object, generals: Object, unlocked: Array<string>,
 *   saved?: Array<string>, retrySlots?: Array<(string|null)>}} input
 *   `retrySlots`: 再来一回 passes the in-memory slots and they are kept exactly,
 *   empties included; any other entry omits it and rule 9 fills from `saved`.
 * @returns {Object} picker: press, slots, collapse, expanded, choices, grayCards, showPicker, available, lead
 * @example const picker = createLoadout({ chapter, generals, unlocked, saved: record.loadout });
 *   createRound({ ..., picker });
 */
export function createLoadout(input) {
  const chapter = input.chapter;
  const generals = input.generals;
  const unlocked = (input.unlocked || []).slice();
  const available = availableGenerals(chapter, unlocked, generals);
  const open = showPicker(chapter, available);
  const grays = grayCards(chapter, unlocked, generals);
  const retry = input.retrySlots;
  let slots;
  if (Array.isArray(retry) && retry.length === chapter.slots && retry[0] === chapter.lead) {
    slots = retry.map((id) => (typeof id === 'string' ? id : null));
  } else {
    slots = fillSlots(chapter, { unlocked, generals, saved: input.saved });
  }
  let expanded = null;

  const editable = (i) => open && Number.isInteger(i) && i > 0 && i < slots.length;
  const choices = () => available.filter((id) => id !== chapter.lead && slots.indexOf(id) === -1);

  return {
    /**
     * Applies one open-card picker intent (round-flow passes slot / pick / clear here).
     * @param {{button: string, slot?: number, general?: string}} intent
     */
    press(intent) {
      if (!intent) return;
      if (intent.button === 'slot') {
        if (!editable(intent.slot)) return;
        expanded = expanded === intent.slot ? null : intent.slot;
      } else if (intent.button === 'pick') {
        if (expanded === null || choices().indexOf(intent.general) === -1) return;
        slots[expanded] = intent.general;
        expanded = null;
      } else if (intent.button === 'clear') {
        if (!editable(intent.slot)) return;
        slots[intent.slot] = null;
        if (expanded === intent.slot) expanded = null;
      }
    },
    /** @returns {Array<(string|null)>} the slots in order, null = empty */
    slots: () => slots.slice(),
    /** Closes the choice (round-flow calls this at 开讲). */
    collapse() {
      expanded = null;
    },
    /** @returns {(number|null)} the slot whose choice is open */
    expanded: () => expanded,
    /** @returns {Array<string>} pickable generals not already seated (rule 10) */
    choices: () => (open ? choices() : []),
    /** @returns {Array<{general: string, kind: (string|null)}>} grey cards, only when the picker shows (rule 11) */
    grayCards: () => grays.slice(),
    /** @returns {boolean} rule 12 */
    showPicker: () => open,
    /** @returns {Array<string>} Formulas `available` */
    available: () => available.slice(),
    /** @returns {string} the locked lead (rule 2) */
    lead: () => chapter.lead,
  };
}
