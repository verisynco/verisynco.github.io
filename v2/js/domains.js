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

const V2_DOMAINS_VERSION = '1.0';

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

/* Parameter -> domain. `TECHNIQUE_GROUPS[g].parameter` uses 'iron' and 't1' as
   domain names already; 'ct1' is this module's own split (see the header). */
const DOMAIN_OF = {
  pdff: 'pdff',
  lic: 'iron', r2star: 'iron', t2star: 'iron',
  mre: 'mre',
  t1: 't1',
  ct1: 'ct1',
  adc: 'adc'
};

const CONTROLLED_DOMAINS = ['pdff', 'iron', 'mre', 't1', 'ct1'];

/* The domain's own vocabulary, as the engine sees it. `ct1` is carved out of the
   't1' parameter vocabulary: it offers only the proprietary group, because that
   is the only group any ct1 cut-off carries. */
const DOMAIN_VOCABULARY = {
  pdff: ['pdff-quantitative', 'pdff-uncorrected-fsf'],
  iron: ['iron-r2star', 'iron-r2-spin-echo', 'iron-sir'],
  mre:  ['mre-60hz-stiffness', 'mre-40hz-stiffness', 'mre-shear-wave-speed'],
  t1:   ['t1-ir-bssfp', 't1-saturation-recovery', 't1-spgr-vfa'],
  ct1:  ['ct1-proprietary'],
  adc:  ['dwi-adc-monoexp']
};

/* Sourced, not invented — one AVAILABILITY record per domain:
     pdff, iron   AVL-0001 / AVL-0007   IDEAL-IQ, IDEAL-IQ R2*
     mre          AVL-0002              MR Touch (Resoundant)
     t1           AVL-0003              StarMap

   `ct1` HAS NO GE DEFAULT, deliberately. Its only technique is `ct1-lms-molli`,
   whose vendorExamples names `Perspectum LiverMultiScan` — a third-party service,
   not something any scanner vendor ships. AVL-0003 says so itself: "StarMap is
   GE's proprietary T1/T2 mapping package — not equivalent to Perspectum
   LiverMultiScan cT1." Supplying it as a GE default would assert the user ran a
   product GE does not sell — an invented routing decision (CLAUDE.md § 1.3).
   cT1 opens unselected on BOTH paths. It is also a `cleared`-tier row, so it does
   not render at all at the default `native` scope. */
const GE_DEFAULTS = {
  pdff: 'pdff-cse-mri',
  iron: 'iron-r2star-gre',
  mre:  'mre-2d-gre-60hz',
  t1:   't1-starmap'
};

/* Presentation only. Firm names go; product names stay, because a product name is
   what the user recognises on their own console. */
const MANUFACTURERS = ['GE', 'Siemens', 'Philips', 'Canon', 'Perspectum',
                       'Resonance Health', 'Resoundant', 'Charite'];

/* Entries that name no product at all — they would add noise, not recognition. */
const GENERIC_PREFIXES = ['any ', 'research ', 'in-house ', 'legacy '];

function groupsOfDomain(domain) {
  return (DOMAIN_VOCABULARY[domain] || []).slice();
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
    if (!name || MANUFACTURERS.indexOf(name) !== -1) continue;
    if (out.indexOf(name) === -1) out.push(name);
  }
  return out;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {DOMAIN_OF, CONTROLLED_DOMAINS, DOMAIN_VOCABULARY, GE_DEFAULTS,
                    groupsOfDomain, optionsForDomain, displayExamples,
                    V2_DOMAINS_VERSION};
}
