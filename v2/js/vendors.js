/* VeriLiv V2 — VENDOR PROFILES  (W-007)
 * ---------------------------------------------------------------------------
 * The two report paths differ in what this file SUPPLIES, never in which code
 * path renders them. If a renderer ever needs `if (path === 'ge')`, the profile
 * is missing a field and the field is what gets added.
 *
 * ⛔ NO CLINICAL VALUE LIVES HERE. Every threshold, mean and stage comes from
 *    js/thresholds.js and data/. This file holds ordering, a badge and prose.
 *
 * ⛔ NO PRODUCT NAME LIVES HERE EITHER. The brief for this task specified a
 *    per-vendor `sequenceNames` map; it was deliberately not written. A product
 *    is named in exactly one place that records where the fact came from — the
 *    scope matrix's `product` field with its `factProvenance` — and
 *    report.js:acquisitionLine() reads it there. A second map here would be a
 *    copy that can disagree with the record, which is how W-029 came to print a
 *    GE product that does not exist. See the design spec § 1.1.
 *
 * Loaded as a plain <script> (ES modules fail under file://) and require()-able
 * by the Node suites, exactly like every other file in this folder.
 * ---------------------------------------------------------------------------
 */

const V2_VENDORS_VERSION = '2.0';

/* This file ranks; it never invents. The cohort family and the cut-off pool are
   both read from where they are already recorded — report.js and the data layer —
   so the second sort key cannot drift away from the one the card uses. */
const _V = (typeof module !== 'undefined' && module.exports)
  ? (function () {
      const path = require('path');
      return {
        INDICATION_COHORTS: require(path.join(__dirname, 'report.js')).INDICATION_COHORTS,
        CUTOFFS: require(path.join(__dirname, '..', 'data', 'cutoffs.data.js')).CUTOFFS
      };
    })()
  : {INDICATION_COHORTS: INDICATION_COHORTS, CUTOFFS: CUTOFFS};

/* SCHEMA § 3.2's four classes, in the order they are declared there. This list
   exists so a profile's `referenceOrder` can be checked for completeness against
   something written down, rather than against a literal repeated in two files. */
const VENDOR_CLASSES = ['ge-explicit', 'multi-vendor-incl-ge', 'non-ge', 'guideline'];

/* ─────────────────────────────────────────────────── WHAT THE PROFILE DECIDES
   `referenceOrder`  which class of evidence is cited FIRST on page 3
   `badge`           the one line naming the acquisition path on every sheet
   `caveats`         the limitation paragraphs this path must carry
   `derivation`      how the printed numbers were formed, in enough detail to
                     reconstruct the method from the printed page alone

   THE LINE THIS FILE HOLDS: the GE path is favoured through evidence provenance
   and certainty — GE-validated sources cited first, the sequence unambiguous, the
   cut-off attribution exact. It is never favoured by degrading the other path.
   The other path shows the same parameters, the same rigour and its own honest
   uncertainty. No parameter is hidden, no staging is weakened, and no promotional
   sentence is written on either path. This is a clinical document. */

const VENDOR_PROFILES = {
  ge: {
    id: 'ge',
    badge: 'GE clinical products',
    /* The path's CONSEQUENCE, claiming nothing about accuracy. It lives here and
       not in render.js because a `path === 'ge'` test in the renderer is exactly
       the branch K6 forbids: a branch there means the profile is missing a field,
       so the field is what gets added. */
    pathNote: 'On this path the clinical products determine the measurement ' +
              'technique, so no technique question is asked per parameter.',
    /* GE-validated evidence first: on this path the sequence that produced each
       number is known, so a cut-off derived on the same product is the closest
       match a reader can be given. The remaining classes still print. */
    referenceOrder: ['ge-explicit', 'multi-vendor-incl-ge', 'guideline', 'non-ge'],
    caveats: [
      'The acquisition on this path is a named clinical product, so each cut-off below ' +
      'is quoted for the measurement technique that produced the value. That removes one ' +
      'source of uncertainty; it removes none of the others.',
      'Thresholds remain field-strength and cohort dependent. A value acquired at a field ' +
      'strength or in an age group other than the one selected above is not staged by the ' +
      'ladders printed here.',
      'This report applies no quality control to what was typed into it. It cannot detect a ' +
      'failed acquisition, a mis-placed ROI, motion corruption or an invalid confidence map.'
    ],
    derivation: []
  },

  other: {
    id: 'other',
    badge: 'Other or unspecified system',
    pathNote: 'The measurement technique is not implied by the system, so it is ' +
              'asked per parameter and the cut-offs are quoted for what you select.',
    /* Guideline evidence first: no product is named on this path, so a society
       cut-off — written to apply across scanners — is the closest match, and a
       GE-explicit derivation is the furthest. It is still printed. */
    referenceOrder: ['guideline', 'non-ge', 'multi-vendor-incl-ge', 'ge-explicit'],
    caveats: [
      'The scanner and sequence that produced these values were not identified, so no ' +
      'cut-off below can be attributed to the exact technique that measured them. The ' +
      'thresholds are guideline values and vendor-neutral literature, and they may not ' +
      'transfer to a given scanner or sequence without local validation.',
      'Quantitative liver MRI values are not interchangeable across measurement techniques. ' +
      'A two-point Dixon fat fraction, a different MRE driver frequency, or a different ' +
      'reconstruction is not the same measurement the published cut-offs were derived from, ' +
      'even where the reported unit is identical.',
      'Where the only published evidence for a boundary was derived on a single vendor’s ' +
      'platform, the report prints that value and names the transfer it is asking the reader ' +
      'to accept, rather than substituting a number of its own.',
      'Thresholds remain field-strength and cohort dependent. A value acquired at a field ' +
      'strength or in an age group other than the one selected above is not staged by the ' +
      'ladders printed here.',
      'This report applies no quality control to what was typed into it. It cannot detect a ' +
      'failed acquisition, a mis-placed ROI, motion corruption or an invalid confidence map.'
    ],
    derivation: []
  }
};

/* ────────────────────────────────────────────────────── HOW A NUMBER WAS FORMED
   Printed on BOTH paths, because it is true on both and a conditional would be one
   more branch for no gain. It is what lets a reader reconstruct the method from
   the printed page rather than taking the report's word for it. Every sentence
   restates a rule the engine actually enforces and the suites actually lock —
   CLAUDE.md § 1.4, SCHEMA § 10.5. */
const DERIVATION_METHOD = [
  'Where a boundary is published by more than one primary study, the value shown is the ' +
  'unweighted arithmetic mean of those published cut-offs, and the label naming how many ' +
  'sources contributed is printed with it. It is not a meta-analysis and not a pooled ' +
  'estimate: the contributing studies are not weighted by sample size, precision or quality.',

  'No guideline value ever enters a mean. Guidelines synthesise the same primary studies, so ' +
  'averaging a guideline together with them would count the same evidence twice.',

  'Spread is reported as the lowest and highest contributing published value, never as a ' +
  'standard deviation. The number of contributing sources is small enough that a standard ' +
  'deviation would have the shape of a statistic and none of the content. A boundary resting ' +
  'on a single source carries no range at all.',

  'Values are never pooled across measurement-technique groups. Where the technique behind a ' +
  'published cut-off is ambiguous, or where the selected sequence belongs to a different ' +
  'group, the report prints a described gap instead of answering with another sequence’s ' +
  'number.',

  'Where the guideline ladder and the pooled primary studies place the same value in ' +
  'different bands, both are printed and neither is preferred. A blended value would need a ' +
  'weighting nobody published, and would erase a disagreement the reader is entitled to see.'
];

VENDOR_PROFILES.ge.derivation = DERIVATION_METHOD.slice();
VENDOR_PROFILES.other.derivation = DERIVATION_METHOD.slice();

/* ───────────────────────────────────────────────────────── ORDERING, NOT FILTERING
   The single neutral pool comes in and the same pool goes out — reordered and
   nothing else. The length check is not defensive programming: dropping a class
   here would make "the pool is never filtered by vendor" true at the data layer
   and quietly false on the printed page, which is the exact failure SCHEMA § 0
   and § 3.6 are written against. */
/* ──────────────────────────────────────────── THE INDICATION, AS A SECOND KEY
   Which references an indication's cohort family actually cites, COUNTED from the
   cut-off pool rather than asserted here: a REFERENCE record carries no cohort
   field, and writing one into this file would be the copy-that-can-disagree
   defect the header already refuses for product names.

   The key applies INSIDE a vendor class and never across one, so the guarantee
   above is untouched — a class the profile ranks is printed whether or not any of
   its records matched the indication. */
function refsForIndication(indication) {
  const family = _V.INDICATION_COHORTS[indication || 'non-specific'] || [];
  const ids = {};
  if (!family.length) return ids;
  for (const c of _V.CUTOFFS) {
    if (family.indexOf(c.cohort) === -1) continue;
    for (const id of (c.sourceRefIds || [])) ids[id] = true;
  }
  return ids;
}

function orderReferences(pool, profile, indication) {
  const order = profile.referenceOrder || [];
  const missing = VENDOR_CLASSES.filter(c => order.indexOf(c) === -1);
  if (missing.length) {
    throw new Error(
      `referenceOrder for profile "${profile.id}" does not rank ${missing.join(', ')}. ` +
      'Ordering may never drop a vendor class: every class is printed, the profile ' +
      'only decides which is cited first.');
  }
  const rank = r => {
    const i = order.indexOf(r.vendorClass);
    /* A record whose class is outside the vocabulary sorts last rather than
       vanishing. The schema suite is what keeps that case empty; this keeps it
       harmless if it ever is not. */
    return i === -1 ? order.length : i;
  };
  const matched = refsForIndication(indication);
  /* Index-carrying sort: Array.prototype.sort is not required to be stable in
     every engine this file must run in, and an unstable reference list would
     print differently between two renders of the same report. */
  return pool
    .map((r, i) => ({r: r, i: i}))
    .sort((a, b) => (rank(a.r) - rank(b.r)) ||
                    ((matched[a.r.id] ? 0 : 1) - (matched[b.r.id] ? 0 : 1)) ||
                    (a.i - b.i))
    .map(x => x.r);
}

/* The profile for a selection path. `PATHS` in js/selection.js owns the path
   vocabulary; this maps that vocabulary onto a profile and refuses an unknown
   key rather than defaulting to one of the two — a report silently rendered as
   the wrong path is worse than one that does not render. */
function profileForPath(pathKey) {
  const p = VENDOR_PROFILES[pathKey];
  if (!p) throw new Error(`no vendor profile for path "${pathKey}"`);
  return p;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {VENDOR_PROFILES, VENDOR_CLASSES, DERIVATION_METHOD,
                    orderReferences, refsForIndication, profileForPath,
                    V2_VENDORS_VERSION};
}
