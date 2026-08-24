/* VeriLiv V2 — REPORT SCOPE RESOLVER  (W-013)
 * ---------------------------------------------------------------------------
 * Pure: takes a vendor and a parameter, returns a rendering decision. Touches no
 * DOM, so the browser and the Node tests cannot drift apart (CLAUDE.md § 6).
 *
 * It decides WHAT IS RENDERED and WHERE. It never decides what is staged: no
 * value here reaches a cut-off, a mean or an impression. A non-imaging input —
 * ferritin, age, AST, ALT, platelets — has no tier at all and is never passed
 * through this module.
 *
 * ⛔ The pool is not filtered. Resolution reads SCOPE_MATRIX; it never shrinks it.
 * ---------------------------------------------------------------------------
 */

const V2_SCOPE_VERSION = '1.1';

/* -------------------------------------------------------------- Data loading
   In the browser the data file has already run and left its consts as globals.
   Under Node nothing is global, so require() it. Same bytes both ways — this is
   the `_D` pattern from v2/js/thresholds.js:83, deliberately copied rather than
   reinvented.

   ⚠ The name is `_SD`, NOT `_D`. Both files are loaded as plain <script>s into
   ONE global scope, so a second top-level `const _D` is a SyntaxError that no
   test catches — R-24 checks the data files only, and Node's module scope hides
   the collision entirely. It would surface as a blank page under file:// and
   nowhere else. */

const _SD = (typeof module !== 'undefined' && module.exports)
  ? (function () {
      const path = require('path');
      const d = require(path.join(__dirname, '..', 'data', 'scope.data.js'));
      return {SCOPE_MATRIX: d.SCOPE_MATRIX, SCOPE_UNKNOWN_VENDORS: d.SCOPE_UNKNOWN_VENDORS};
    })()
  : {SCOPE_MATRIX: SCOPE_MATRIX, SCOPE_UNKNOWN_VENDORS: SCOPE_UNKNOWN_VENDORS};

/* Cumulative, narrowest first. The index IS the ladder. */
const SCOPE_TIERS = ['native', 'cleared', 'research'];

/* Total over the quantification vocabulary. `unknown` mounts inline exactly like
   `native`: the repository does not know whether this scanner produces the number,
   and hiding the parameter would answer that question with a claim it cannot make.

   W-007 moved `cleared` off sheet 1. The report is three sheets now — what the
   selected scanner's own products measure, what a third-party or research product
   measures, and the receipts — so a third-party number is printed under its own
   heading rather than beside the vendor's. This changes WHERE a parameter prints
   and never WHETHER it prints: nothing is filtered, dropped or downweighted, and
   scope remains a presentation-layer decision (SCHEMA § 0, § 3.6). */
const SCOPE_MOUNT_POINTS = {
  native: 'page1-inline',
  cleared: 'page2-thirdparty',
  unknown: 'page1-inline',
  research: 'page2-research',
  none: null
};

function mountPointFor(quantification) {
  return Object.prototype.hasOwnProperty.call(SCOPE_MOUNT_POINTS, quantification)
    ? SCOPE_MOUNT_POINTS[quantification]
    : null;
}

function scopeRow(vendor, param) {
  let wildcard = null;
  for (const s of _SD.SCOPE_MATRIX) {
    if (s.param !== param) continue;
    if (s.vendor === vendor) return s;           /* a specific vendor beats the wildcard */
    if (s.vendor === '*') wildcard = s;
  }
  return wildcard;
}

function scopeGap(vendor, param, reason, note) {
  return {
    vendor: vendor,
    matchedVendor: null,          /* no row answered, so no row owns the fact */
    param: param,
    acquisition: 'unknown',
    quantification: 'unknown',
    product: null,
    mountPoint: mountPointFor('unknown'),
    factProvenance: 'unknown',
    note: note,
    flags: [],
    absent: true,
    absentReason: reason
  };
}

/* Returns a resolved object, never null and never undefined. An unresolvable pair
   comes back as a described gap (SCHEMA § 10.3), because an empty result is read
   as "normal" and a gap object is read as "we do not know". */
function resolveScope(vendor, param, _seen) {
  const seen = _seen || new Set();
  const row = scopeRow(vendor, param);

  if (!row) {
    const declared = _SD.SCOPE_UNKNOWN_VENDORS.indexOf(vendor) !== -1;
    return scopeGap(vendor, param, 'vendor-availability-unrecorded',
      declared
        ? `This repository records no availability information for ${vendor}. `
          + `Whether ${param} can be produced on this scanner is unknown, not absent.`
        : `No scope record covers ${vendor} × ${param}.`);
  }

  let quantification = row.quantification;

  if (quantification === null) {
    const dep = row.dependsOn[0];
    if (seen.has(param)) {
      return scopeGap(vendor, param, 'dependency-cycle',
        `The scope record for ${param} depends on itself through ${dep}.`);
    }
    seen.add(param);
    const inherited = resolveScope(vendor, dep, seen);
    if (inherited.absent) {
      return {
        vendor: vendor,
        param: param,
        acquisition: row.acquisition,
        quantification: 'unknown',
        product: row.product,
        mountPoint: mountPointFor('unknown'),
        factProvenance: row.factProvenance,
        note: `${row.note} Its tier follows ${dep}, which is itself unrecorded here: `
            + inherited.note,
        flags: row.flags.slice(),
        absent: true,
        absentReason: 'derived-from-unrecorded'
      };
    }
    quantification = inherited.quantification;
  }

  return {
    vendor: vendor,
    /* WHICH ROW ANSWERED, which is not the same question as who asked. A '*' row
       states a fact about the modality; a 'GE' row states one about GE. W-029
       found the difference the hard way: `product` on the wildcard cT1 row is
       Perspectum's, and a report that read `vendor` here as the row's owner
       printed "GE LiverMultiScan (Perspectum)" — a GE product that does not
       exist. A caller that attributes a product to a manufacturer must read
       this field, not `vendor`. */
    matchedVendor: row.vendor,
    param: param,
    acquisition: row.acquisition,
    quantification: quantification,
    product: row.product,
    mountPoint: mountPointFor(quantification),
    factProvenance: row.factProvenance,
    note: row.note,
    flags: row.flags.slice(),
    absent: false,
    absentReason: null
  };
}

/* `unknown` renders at every tier; `none` renders at none of them; everything else
   renders when its tier is at or below the selected scope. */
function isRenderedAtScope(resolved, scope) {
  if (resolved.quantification === 'none') return false;
  if (resolved.quantification === 'unknown') return true;
  const own = SCOPE_TIERS.indexOf(resolved.quantification);
  const selected = SCOPE_TIERS.indexOf(scope);
  if (own === -1 || selected === -1) return false;
  return own <= selected;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {SCOPE_TIERS, resolveScope, isRenderedAtScope, mountPointFor,
                    V2_SCOPE_VERSION};
}
