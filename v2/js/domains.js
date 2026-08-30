/* VeriLiv V2 — TECHNIQUE DOMAINS  (W-006)
 * ---------------------------------------------------------------------------
 * A technique control is one per DOMAIN, not one per parameter: `lic`, `r2star`
 * and `t2star` are three readings of one acquisition and share a control, while
 * `t1` and `ct1` do NOT — cT1 is a proprietary product whose cut-offs live in
 * `ct1-proprietary`, so a user who picked MOLLI for native T1 would otherwise
 * silently lose cT1 (measured, spec § 1.4).
 *
 * `adc` has no control at all: `dwi-adc-monoexp` is its entire vocabulary, so
 * the engine infers it.
 *
 * ⛔ PRESENTATION LAYER. `displayExamples()` strips manufacturer names for
 *    display only. The data file is never edited — CLAUDE.md § 9 forbids vendor
 *    filtering INSIDE the data layer; SCHEMA § 0 / § 3.6 make presentation a
 *    presentation-layer decision.
 * ---------------------------------------------------------------------------
 */

const V2_DOMAINS_VERSION = '1.5';   /* W-063b: GROUP_PARAMETERS / TIER1_GROUPS /
                                        TIER2_GROUPS / purposeGroupOf — the entry-screen
                                        purpose-group axis. 1.4 -> 1.5: the helper was
                                        `groupOf`, which SILENTLY overwrote thresholds.js's
                                        own top-level `groupOf(techniqueId)` in the browser's
                                        one global <script> scope (Node's require() hid it) —
                                        renamed, and a same-scope collision guard added.
                                        (W-090's CONTROLLED_UNITS
                                        line kept below for history) */

/* Same `_D` loading pattern as thresholds.js:83 and scope.js — in the browser the
   data file has already run and left its consts as globals; under Node nothing is
   global, so require() it. The name is `_DD`, not `_D` or `_SD`: all three files
   load as plain <script>s into ONE global scope, and a duplicate top-level const
   is a SyntaxError that no test catches. */
const _DD = (typeof module !== 'undefined' && module.exports)
  ? (function () {
      const path = require('path');
      const d = require(path.join(__dirname, '..', 'data', 'techniques.data.js'));
      return {TECHNIQUES: d.TECHNIQUES, TECHNIQUE_GROUPS: d.TECHNIQUE_GROUPS};
    })()
  : {TECHNIQUES: TECHNIQUES, TECHNIQUE_GROUPS: TECHNIQUE_GROUPS};

/* Parameter -> CARD SECTION. `TECHNIQUE_GROUPS[g].parameter` uses 'iron' and
   't1' as section names already; 'ct1' is this module's own split (see the
   header). THIS NEVER CHANGES WITH W-090 — lic/r2star/t2star still print
   under one "Iron" heading (render.js DOMAIN_TITLES); only which TECHNIQUE
   CONTROL each uses changed, and that is CONTROLLED_UNITS below, a different
   axis from this one. */
const DOMAIN_OF = {
  pdff: 'pdff',
  lic: 'iron', r2star: 'iron', t2star: 'iron',
  mre: 'mre',
  t1: 't1',
  ct1: 'ct1',
  adc: 'adc'
};

/* W-063b. Parameter -> ENTRY-SCREEN PURPOSE GROUP. A distinct axis from
   DOMAIN_OF (card-section heading) and from CONTROLLED_UNITS (technique
   control): this one answers "which entry checkbox reveals this card". The
   iron trio agrees with DOMAIN_OF today by coincidence, not by rule — kept
   separate for the reason W-090 kept CONTROLLED_UNITS separate. The union of
   the six arrays is exactly report.js REPORT_PARAMETERS, each parameter once. */
const GROUP_PARAMETERS = {
  fat:      ['pdff'],
  iron:     ['lic', 'r2star', 't2star'],
  fibrosis: ['mre'],
  t1:       ['t1'],
  ct1:      ['ct1'],
  adc:      ['adc']
};

/* Tier 1 = the staging purposes chosen at the outset. Tier 2 = readings that
   do not stage a Tier-1 finding, offered separately (render.js tier2Block).
   Tier-1 order is the entry-block and card-section order it implies; Tier-2
   order matches REPORT_PARAMETERS. */
const TIER1_GROUPS = ['fat', 'iron', 'fibrosis'];
const TIER2_GROUPS = ['t1', 'ct1', 'adc'];

/* NOT `groupOf` — `v2/js/thresholds.js` already declares a top-level
   `function groupOf(techniqueId)`, and every V2 JS file loads as a plain
   <script> into ONE global scope (see this file's header). A second top-level
   `function groupOf` there does not throw the way a duplicate `const` would;
   it silently overwrites, and whichever loads last wins — so `groupOf` here
   broke thresholds.js's calibration/staging resolver in the browser while
   Node's per-module require() kept the two apart and every suite green. */
function purposeGroupOf(parameter) {
  for (const g of Object.keys(GROUP_PARAMETERS)) {
    if (GROUP_PARAMETERS[g].indexOf(parameter) !== -1) return g;
  }
  return null;
}

/* W-090. Was CONTROLLED_DOMAINS = ['pdff', 'iron', 'mre', 't1', 'ct1'] — one
   entry per DOMAIN_OF value. A site can run R2* on one console, T2* on
   another, and derive LIC from whichever it trusts; a single shared 'iron'
   control could not represent that. lic/r2star/t2star now each control their
   OWN technique, so this list names the technique-SELECTION axis, which is no
   longer the same set as DOMAIN_OF's values — 'iron' is not in this list at
   all. Order matches v2/js/report.js REPORT_PARAMETERS. */
const CONTROLLED_UNITS = ['pdff', 'r2star', 't2star', 'lic', 'mre', 't1', 'ct1'];

/* The domain's own vocabulary, as the engine sees it. `ct1` is carved out of the
   't1' parameter vocabulary: it offers only the proprietary group, because that
   is the only group any ct1 cut-off carries. */
const DOMAIN_VOCABULARY = {
  pdff: ['pdff-quantitative', 'pdff-uncorrected-fsf'],
  iron: ['iron-r2star', 'iron-r2-spin-echo', 'iron-sir'],
  mre:  ['mre-60hz-stiffness', 'mre-40hz-stiffness', 'mre-shear-wave-speed'],
  t1:   ['t1-ir-bssfp', 't1-saturation-recovery'],
  ct1:  ['ct1-proprietary'],
  adc:  ['dwi-adc-monoexp']
};

/* Sourced, not invented — one AVAILABILITY record per unit:
     pdff, r2star, lic   AVL-0001 / AVL-0007   IDEAL-IQ, IDEAL-IQ R2*
     mre                 AVL-0002              MR Touch (Resoundant)

   `t1` and `ct1` BOTH have NO GE default, deliberately, and for related but
   distinct reasons.

   `ct1`'s only technique is `ct1-lms-molli`, whose vendorExamples names
   `Perspectum LiverMultiScan` — a third-party service, not something any
   scanner vendor ships. Supplying it as a GE default would assert the user
   ran a product GE does not sell — an invented routing decision
   (CLAUDE.md § 1.3).

   `t1` HAD a GE default through W-041: AVL-0003 recorded "StarMap is GE's
   proprietary T1/T2 mapping package", citing REF-020 (McKay 2018). W-042
   measured that citation and found it does not support the claim — the
   string "StarMap" occurs zero times in REF-020's full text, which is a
   Siemens/LiverMultiScan cT1 study about MOLLI. GE's own SIGNA StarMap
   product document (EXT-010) settles what the product actually measures:
   its embedded figures show a decay plot captioned "T2* Curve" and a liver
   T2* colour map — StarMap is GE's T2* mapping application, not a T1
   sequence at all, and its vendorExamples moved to `iron-r2star-gre` /
   `iron-t2star-gre` in techniques.data.js. GE ships two REAL native-T1
   methods, MOLLI and SMART1Map, which read differently on the same tissue
   (SCHEMA 4.1 — different technique groups are not interchangeable), so
   supplying either as a silent default would be exactly the invented
   routing decision already refused for cT1. Both `t1` and `ct1` open
   unselected on the GE path; `ct1` is also a `cleared`-tier row, so it does
   not render at all at the default `native` scope.

   W-090 SPLIT the old single 'iron' default across three keys. `r2star` and
   `lic` keep the exact technique id the shared default used to supply — no
   behaviour change for a user who never touches the new independent
   controls. `t2star` gets ITS OWN quantity-correct id (`iron-t2star-gre`)
   instead of inheriting r2star's — this is a small, deliberate behaviour
   change (see the design spec § 5.2 open question 1): a T2* CARD defaulting
   to a T2*-labelled technique is more correct than one defaulting to an
   R2*-labelled one, even though W-087's acquisitionLine sibling-swap already
   printed the right word either way. Nothing here names a GE PRODUCT — that
   is GE_IRON_PRODUCTS below, a presentation-only addition on top of this. */
const GE_DEFAULTS = {
  pdff:   'pdff-cse-mri',
  r2star: 'iron-r2star-gre',
  t2star: 'iron-t2star-gre',
  lic:    'iron-r2star-gre',
  mre:    'mre-2d-gre-60hz'
};

/* W-090. Presentation-only: which GE PRODUCT the acquisition card may name,
   per parameter, when the user says so explicitly. This is NOT a clinical
   record and carries no hash lock — it changes what BRAND prints, never
   which cut-off ladder or calibration slope resolves (those still key on
   `iron-r2star-gre`/`iron-t2star-gre`, untouched).

   Sourced exactly as the technique catalogue already is:
     r2star: IDEAL-IQ from AVL-0001 (v2/data/availability.data.js) /
             SCP-0002 (v2/data/scope.data.js); StarMap from the developer's
             2026-08-26 statement recorded in
             docs/superpowers/specs/2026-08-26-starmap-product-identity-design.md
             § 2, resting on TECHNIQUE_GROUPS['iron-r2star'].rationale
             ("R2* = 1000/T2*, same measurement") — no new clinical fact.
     t2star: StarMap only, from GE's own SIGNA StarMap product document
             (EXT-010, v2/data/external-refs.data.js) via the same W-042
             record. IDEAL-IQ is deliberately ABSENT here: AVL-0001 lists
             `parameters: ['pdff', 'r2star']` and nothing sources IDEAL-IQ
             producing a T2* output (CLAUDE.md § 1.3 — never claim what the
             source does not say).

   No Siemens/Philips/Canon entry anywhere here — developer constraint,
   2026-08-26: the GE panel offers GE products only. */
const GE_IRON_PRODUCTS = {
  r2star: [{id: 'idealiq', label: 'GE IDEAL-IQ'}, {id: 'starmap', label: 'GE StarMap'}],
  t2star: [{id: 'starmap', label: 'GE StarMap'}]
};

/* Presentation only. Firm names go; product names stay, because a product name is
   what the user recognises on their own console. */
const MANUFACTURERS = ['GE', 'Siemens', 'Philips', 'Canon', 'Perspectum',
                       'Resonance Health', 'Resoundant', 'Charite'];

/* Entries that name no product at all — they would add noise, not recognition. */
const GENERIC_PREFIXES = ['any ', 'research ', 'in-house ', 'legacy '];

/* W-079. A THIRD list, and the only one whose members were chosen one by one rather
   than by a rule. These seven belong to consoles this report is not produced on, so
   they buy no recognition and read as a claim about equivalence nobody made. The
   ones NOT here stay on purpose — IDEAL-IQ, IDEAL-IQ R2*, LAVA-Flex, StarMap,
   MR-Touch, FerriScan, LiverMultiScan and the Gandon / Rennes protocol are what an
   operator reads on the console they actually used.
   ⛔ Presentation only. `techniques.data.js` keeps every name; filtering inside the
      data layer is forbidden (SCHEMA § 0, § 3.6), and the menu LABELS keep theirs
      for a safety reason — picking StarMap when MOLLI was acquired is a staging
      error, and product recognition is what prevents it. */
const WITHDRAWN_PRODUCTS = ['HISTO', 'LiverLab', 'mDIXON Quant', 'q-Dixon',
                            'VIBE-Dixon', 'MyoMaps', 'Sonata'];

/* Two shapes, measured across all 24 techniques: five of the seven ARE the whole
   entry and take it with them, while `MyoMaps MOLLI` and `Sonata multi-echo GRE`
   sit in front of a generic descriptor — there the name goes and the descriptor
   stays. Same match the MANUFACTURERS strip above uses: exact, or the name
   followed by a space. */
function withoutWithdrawn(name) {
  for (const p of WITHDRAWN_PRODUCTS) {
    if (name === p) return '';
    if (name.indexOf(p + ' ') === 0) name = name.slice(p.length + 1);
  }
  return name.trim();
}

/* W-090. `unit` is a CONTROLLED_UNITS entry now, not always a DOMAIN_OF value:
   'r2star'/'t2star'/'lic' have no DOMAIN_VOCABULARY entry of their own, so
   fall back through DOMAIN_OF to the domain's vocabulary they always shared
   ('iron'). pdff/mre/t1/ct1 are unaffected — DOMAIN_VOCABULARY already has a
   same-named entry for each, so the fallback never triggers for them. */
function groupsOfDomain(unit) {
  return (DOMAIN_VOCABULARY[unit] || DOMAIN_VOCABULARY[DOMAIN_OF[unit]] || []).slice();
}

function optionsForDomain(domain) {
  const out = [];
  for (const group of groupsOfDomain(domain)) {
    const options = Object.keys(_DD.TECHNIQUES)
      .filter(id => _DD.TECHNIQUES[id].group === group)
      .map(id => ({id: id, label: _DD.TECHNIQUES[id].label}));
    out.push({group: group, label: _DD.TECHNIQUE_GROUPS[group].label, options: options});
  }
  return out;
}

function displayExamples(techniqueId) {
  const entry = _DD.TECHNIQUES[techniqueId];
  const raw = (entry && entry.vendorExamples) ? entry.vendorExamples : [];
  const out = [];
  for (const original of raw) {
    const lower = original.toLowerCase();
    if (GENERIC_PREFIXES.some(p => lower.indexOf(p) === 0)) continue;
    let name = original;
    for (const m of MANUFACTURERS) {
      if (name.indexOf(m + ' ') === 0) name = name.slice(m.length + 1);
      name = name.split(' (' + m + ')').join('');
    }
    name = name.trim();
    /* `q-Dixon / LiverLab` is ONE entry joining two products with a slash, and
       dropping both leaves a bare separator — which reads as a name that failed to
       print rather than one that was withdrawn. So the entry is split, each part
       filtered, and only what survives is rejoined. `Gandon / Rennes protocol`
       passes through untouched, which is the case that proves the split is not a
       blanket rule about slashes. */
    name = name.split(' / ').map(withoutWithdrawn)
               .filter(part => part !== '').join(' / ');
    if (!name || MANUFACTURERS.indexOf(name) !== -1) continue;
    if (out.indexOf(name) === -1) out.push(name);
  }
  return out;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {DOMAIN_OF, CONTROLLED_UNITS, DOMAIN_VOCABULARY, GE_DEFAULTS,
                    GE_IRON_PRODUCTS,
                    GROUP_PARAMETERS, TIER1_GROUPS, TIER2_GROUPS, purposeGroupOf,
                    WITHDRAWN_PRODUCTS, groupsOfDomain, optionsForDomain,
                    displayExamples, withoutWithdrawn,
                    V2_DOMAINS_VERSION};
}
