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

const V2_SELECTION_VERSION = '2.1';   /* W-090: products field, GE IDEAL-IQ/StarMap choice */

const _SEL = (typeof module !== 'undefined' && module.exports)
  ? (function () {
      const path = require('path');
      const d = require(path.join(__dirname, 'domains.js'));
      return {CONTROLLED_UNITS: d.CONTROLLED_UNITS, GE_DEFAULTS: d.GE_DEFAULTS,
              GE_IRON_PRODUCTS: d.GE_IRON_PRODUCTS};
    })()
  : {CONTROLLED_UNITS: CONTROLLED_UNITS, GE_DEFAULTS: GE_DEFAULTS,
     GE_IRON_PRODUCTS: GE_IRON_PRODUCTS};

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
  for (const unit of _SEL.CONTROLLED_UNITS) {
    out[unit] = (path === 'ge') ? (_SEL.GE_DEFAULTS[unit] || null) : null;
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
    products: {r2star: null, t2star: null},
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
    products: Object.assign({}, state.products),
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
    /* A product choice is GE-console-specific; leaving it set across a path
       switch to "Other" would silently claim a GE product on a report that
       says no manufacturer at all (mirrors the technique reset above). */
    next.products = {r2star: null, t2star: null};
  }
  if (p.techniques) Object.assign(next.techniques, p.techniques);
  if (p.products) {
    /* Only a product this PARAMETER actually offers is accepted — an
       'idealiq' patch for t2star (nothing sources it) is dropped rather than
       stored, the same way an unknown technique id fails a hard gate rather
       than being silently accepted (resolveTechniqueGroup, thresholds.js).
       A product choice is GE-console-specific (see the path-change reset
       above), so a real product value is only ever stored when the RESOLVED
       path for this same call is 'ge' — checked against `next.path`, not
       `state.path`, so a patch that sets both `path: 'ge'` and a product in
       one call still works. Off the GE path a product id is dropped exactly
       like an unrecognised one: silently, never stored, never thrown. */
    for (const param of Object.keys(p.products)) {
      const value = p.products[param];
      const offered = (_SEL.GE_IRON_PRODUCTS[param] || []).map(o => o.id);
      const allowed = value === null || value === undefined ||
        (next.path === 'ge' && offered.indexOf(value) !== -1);
      if (allowed) {
        next.products[param] = value === undefined ? next.products[param] : value;
      }
    }
  }
  if (p.values) Object.assign(next.values, p.values);

  return next;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {PATHS, FIELD_STRENGTHS, AGE_GROUPS, SCOPE_CHOICES, INDICATIONS,
                    createSelection, applySelection, defaultTechniques,
                    V2_SELECTION_VERSION};
}
