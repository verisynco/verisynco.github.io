/* VeriLiv V2 — SELECTION STATE  (W-006)
 * ---------------------------------------------------------------------------
 * A pure reducer over the choices made before and during data entry. It touches
 * no DOM and no storage, so the browser and the Node tests cannot drift apart.
 *
 * The one rule with teeth: CHANGING THE ACQUISITION PATH CLEARS EVERY TECHNIQUE
 * AND KEEPS EVERY TYPED VALUE. A GE default was sourced from GE's own products
 * and cannot be carried onto an unspecified system; a typed number is the user's
 * own data and discarding it silently would be worse than re-asking for the
 * method.
 * ---------------------------------------------------------------------------
 */

const V2_SELECTION_VERSION = '2.0';

const _SEL = (typeof module !== 'undefined' && module.exports)
  ? (function () {
      const path = require('path');
      const d = require(path.join(__dirname, 'domains.js'));
      return {CONTROLLED_DOMAINS: d.CONTROLLED_DOMAINS, GE_DEFAULTS: d.GE_DEFAULTS};
    })()
  : {CONTROLLED_DOMAINS: CONTROLLED_DOMAINS, GE_DEFAULTS: GE_DEFAULTS};

/* The acquisition question. `vendor` is the token the scope resolver reads;
   `calibrationMode` is what the R2*->LIC calibration is resolved against.
   Neither names a manufacturer on the non-GE side — measured: Siemens, Philips
   and Canon resolve identically (spec § 1.2).

   W-029 narrowed the second field and renamed it to say so. It used to be
   `vendorMode`, the engine's cut-off provenance filter; cut-off ladders now pool
   across vendor classes and this answer no longer touches them. It still selects
   a calibration SLOPE, because a slope is a property of the sequence and the
   field strength — which is why the question stays on the entry screen. */
const PATHS = {
  ge:    {vendor: 'GE',    calibrationMode: 'ge-exclusive',
          label: 'GE HealthCare | MRI'},
  other: {vendor: 'Other', calibrationMode: 'other-vendors-only',
          label: 'Other / Non-Specific'}
};

/* Closed lists. The engine THROWS on anything outside these arrays (W-027), so
   nothing outside them is offered — an entry control that drifted from this
   vocabulary would crash the report rather than empty it, which is why
   v2/tests/logic.test.js H9 asserts the two lists ARE the engine's own. */
const FIELD_STRENGTHS = ['1.5T', '3.0T'];
const AGE_GROUPS = ['adult', 'peds'];
const SCOPE_CHOICES = ['native', 'cleared', 'research'];

/* WHY THE STUDY WAS DONE — etiology only. Age is already an axis (`cohort`) and
   the engine pools on it; putting it here as well would hold one fact in two
   places. The bar an entry had to clear to be named rather than fall into
   `non-specific`: every parameter it prioritises is a clinical product, at least
   three independent contributing references, and at least one guideline or
   consensus anchor. `autoimmune-cholestatic` fails all three — zero records of
   any kind — and stays inside `non-specific` (W-015 § 2). */
const INDICATIONS = ['iron-overload', 'steatotic-liver-disease',
                     'chronic-liver-disease', 'non-specific'];

function defaultTechniques(path) {
  const out = {};
  for (const domain of _SEL.CONTROLLED_DOMAINS) {
    out[domain] = (path === 'ge') ? (_SEL.GE_DEFAULTS[domain] || null) : null;
  }
  return out;
}

function createSelection() {
  return {
    path: null,
    fieldStrength: FIELD_STRENGTHS[0],
    cohort: AGE_GROUPS[0],
    scope: SCOPE_CHOICES[0],
    /* The default is a statement, not a placeholder: nobody has said why this
       study was done, so no literature is put in front on that ground. */
    indication: INDICATIONS[3],
    studyDate: null,
    accession: null,
    age: null,
    techniques: defaultTechniques(null),
    values: {}
  };
}

/* An absent key and an explicitly-undefined one both mean "leave this alone".
   Without the undefined check, `{scope: undefined}` — which is what a caller
   produces by reading a property that is not there — silently overwrites a valid
   selection with nothing. `null` is NOT treated that way: `path: null` is a real
   modelled state (it is what `createSelection()` starts with) and must go through. */
function pick(p, key, fallback) {
  return (key in p && p[key] !== undefined) ? p[key] : fallback;
}

/* Returns a NEW state; never mutates the one it was given. */
function applySelection(state, patch) {
  const p = patch || {};
  const next = {
    path: pick(p, 'path', state.path),
    fieldStrength: pick(p, 'fieldStrength', state.fieldStrength),
    cohort: pick(p, 'cohort', state.cohort),
    scope: pick(p, 'scope', state.scope),
    indication: pick(p, 'indication', state.indication),
    studyDate: pick(p, 'studyDate', state.studyDate),
    accession: pick(p, 'accession', state.accession),
    age: pick(p, 'age', state.age),
    techniques: Object.assign({}, state.techniques),
    values: Object.assign({}, state.values)
  };

  /* W-027, applied where the value ENTERS the model: the indication never reaches
     thresholds.js, so this is the only place it can be caught. An unrecognised
     value is a caller error — falling back to `non-specific` would head the report
     with an indication nobody selected. Placed AFTER pick(), so an absent or
     explicitly-undefined key is left alone rather than thrown at. */
  if (INDICATIONS.indexOf(next.indication) === -1) {
    throw new Error('unrecognised indication: ' + String(next.indication));
  }

  /* Path change first: it resets the technique profile, and an explicit technique
     patch in the SAME call is then applied on top of the reset. Compared against
     the RESOLVED next.path, so an ignored `{path: undefined}` cannot trigger it.
     THE INDICATION IS NOT RESET — it is the reader's statement about why the study
     was done and survives every other change on the screen (W-015 § 4). */
  if (next.path !== state.path) {
    next.techniques = defaultTechniques(next.path);
  }
  if (p.techniques) Object.assign(next.techniques, p.techniques);
  if (p.values) Object.assign(next.values, p.values);

  return next;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {PATHS, FIELD_STRENGTHS, AGE_GROUPS, SCOPE_CHOICES, INDICATIONS,
                    createSelection, applySelection, defaultTechniques,
                    V2_SELECTION_VERSION};
}
