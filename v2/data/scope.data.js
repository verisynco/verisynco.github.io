/* VeriLiv V2 — REPORT SCOPE MATRIX  (W-013)
 * ---------------------------------------------------------------------------
 * HAND-AUTHORED. This file is deliberately NOT produced by tools/xlsx-to-data.mjs.
 *
 * The workbook contains no vendor × parameter availability matrix — the converter
 * says so itself at tools/xlsx-to-data.mjs:1762 — so the rows here are curated
 * from two sources and each one names which: an AVAILABILITY record transcribed
 * from Technical_Limitations rows 131-137 (`factProvenance: 'workbook'`), or a
 * statement V1's own shipped page makes (`factProvenance: 'v1-report'`). There is
 * no third kind and there is deliberately no value meaning "assumed".
 *
 * ⚠ WHAT THE TIERS ASSERT: product availability, NOT regulatory clearance. The
 *   workbook names products and licence requirements; it states no 510(k), no CE
 *   mark, no regulatory status, and neither does any reference record. So
 *   `native` means "the selected vendor ships a named product that computes this
 *   number", `cleared` means "a named third-party product computes it", and no
 *   user-facing string says "cleared". Clearance status is an open question in
 *   LITERATURE.md, addressed to W-018. See the design spec § 2.3.
 *
 * ⛔ VENDOR NEUTRALITY: scope is a PRESENTATION-layer decision, exactly as vendor
 *    preference is (SCHEMA § 0, § 3.6). Nothing here and nothing in js/scope.js
 *    drops, filters or downweights a record because of the selected tier.
 *
 * Loaded as a plain <script> (ES modules fail under file://) and require()-able by
 * the Node test suites, exactly like every other file in this folder.
 * ---------------------------------------------------------------------------
 */

const SCOPE_REV = 'w013-v1';
const SCOPE_VERSION = '1.1';

/* Paste the value HASH-SCOPE prints when a change to SCOPE_MATRIX is intended,
   and bump SCOPE_VERSION in the same edit (CLAUDE.md § 4). */
const SCOPE_HASH = 'e5c0456d71c014b21ff88fbbf9c0b508c1709cbe3629caf3bb8d23ad6192bbb3';

/* The two declared axes. They exist so R-35 has something to be complete against:
   without them, "every cell is accounted for" is a claim about a set nobody wrote
   down, and a forgotten parameter would pass silently. */
const SCOPE_VENDORS = ['GE', 'Siemens', 'Philips', 'Canon'];
const SCOPE_PARAMS = ['pdff', 'r2star', 'lic', 'mre', 't1', 'ivim', 'mefib', 'ct1'];

/* Vendors for which this repository records NO availability at all. Every
   (vendor, param) pair under these names resolves to a described gap, never to a
   fabricated "not available".

   `'Other'` is the token the entry flow passes when the user says the acquisition
   came from an other or unspecified system (W-006). It is deliberately NOT added
   to SCOPE_VENDORS: that axis exists so R-35 can prove the matrix is complete
   against it, and `'Other'` has no matrix rows by design. Listing it here only
   changes which described gap the user reads — the declared one rather than the
   generic fallback — and moves no hash, because SCOPE_HASH covers SCOPE_MATRIX
   rows only. */
const SCOPE_UNKNOWN_VENDORS = ['Siemens', 'Philips', 'Canon', 'Other'];

const SCOPE_MATRIX = [
  {
    id: 'SCP-0001',
    vendor: 'GE',
    param: 'pdff',
    acquisition: 'product',
    quantification: 'native',
    product: 'IDEAL-IQ',
    dependsOn: [],
    factProvenance: 'workbook',
    availabilityIds: ['AVL-0001', 'AVL-0007'],
    sourceRefIds: [],
    flags: [],
    note: 'IDEAL-IQ acquires and computes confounder-corrected PDFF. AVL-0001 records that it needs 6 echoes minimum; AVL-0007 records that its dynamic range differs at 1.5T and 3T.'
  },
  {
    id: 'SCP-0002',
    vendor: 'GE',
    param: 'r2star',
    acquisition: 'product',
    quantification: 'native',
    product: 'IDEAL-IQ',
    dependsOn: [],
    factProvenance: 'workbook',
    availabilityIds: ['AVL-0001'],
    sourceRefIds: [],
    flags: [],
    note: 'The same IDEAL-IQ acquisition produces R2*. AVL-0001 records that older 3-echo protocols do NOT produce fat-corrected R2*.'
  },
  {
    id: 'SCP-0003',
    vendor: 'GE',
    param: 'lic',
    acquisition: 'derived',
    quantification: null,
    product: 'AW server / ReadyView',
    dependsOn: ['r2star'],
    factProvenance: 'workbook',
    availabilityIds: ['AVL-0006'],
    sourceRefIds: [],
    flags: [],
    note: 'LIC is not acquired: this report derives it from R2* through a calibration slope. AVL-0006 records that the LIC map is NOT auto-generated on AW server / ReadyView and must be derived manually or offline.'
  },
  {
    id: 'SCP-0004',
    vendor: 'GE',
    param: 'mre',
    acquisition: 'product',
    quantification: 'native',
    product: 'MR Touch (Resoundant)',
    dependsOn: [],
    factProvenance: 'workbook',
    availabilityIds: ['AVL-0002'],
    sourceRefIds: [],
    flags: [],
    note: 'AVL-0002 records that MR Touch needs a separate licence AND the Resoundant passive driver: a software-only "MRE" toggle without the driver is not MRE.'
  },
  {
    id: 'SCP-0005',
    vendor: 'GE',
    param: 't1',
    acquisition: 'product',
    quantification: 'native',
    product: 'StarMap',
    dependsOn: [],
    factProvenance: 'workbook',
    availabilityIds: ['AVL-0003', 'AVL-0004'],
    sourceRefIds: [],
    flags: ['availability-is-not-cutoff-availability'],
    note: 'StarMap is GE\'s own T1/T2 mapping package, so the number can be produced. That is a different fact from having a cut-off for it: SCHEMA § 4.1 and § 10.6 hold that StarMap is not MOLLI and that resolveTechniqueGroup throws rather than answer with a neighbouring sequence\'s boundary. AVL-0004 records that MAGiC is NOT a validated liver T1 mapping tool.'
  },
  {
    id: 'SCP-0006',
    vendor: 'GE',
    param: 'ivim',
    acquisition: 'possible',
    quantification: 'research',
    product: null,
    dependsOn: [],
    factProvenance: 'v1-report',
    availabilityIds: [],
    sourceRefIds: [],
    flags: ['no-workbook-source'],
    note: 'This is the gap the two axes exist for: the sequence is acquirable on GE with SS-EPI DWI / FOCUS, and no named product computes D, D* or f. V1 ships the parameters in its section 05; the workbook publishes no IVIM availability row, and W-004 already flagged that the IVIM reference ranges have no workbook source either.'
  },
  {
    id: 'SCP-0007',
    vendor: '*',
    param: 'mefib',
    acquisition: 'derived',
    quantification: null,
    product: null,
    dependsOn: ['mre'],
    factProvenance: 'v1-report',
    availabilityIds: [],
    sourceRefIds: [],
    flags: [],
    note: 'MEFIB is not acquired at all. V1 computes it from MRE plus FIB-4 (v1/js/app.js:185), and FIB-4 in turn from age, AST, ALT and platelets. Its tier is therefore whatever MRE resolves to on the selected vendor, which is why no tier is written here.'
  },
  {
    id: 'SCP-0008',
    vendor: '*',
    param: 'ct1',
    acquisition: 'possible',
    quantification: 'cleared',
    product: 'LiverMultiScan (Perspectum)',
    dependsOn: [],
    factProvenance: 'v1-report',
    availabilityIds: ['AVL-0003', 'AVL-0006'],
    sourceRefIds: [],
    flags: ['clearance-status-not-verified'],
    note: 'Third-party post-processing of a separately acquired T1, not a native scanner product — which is why the row is vendor-independent. V1\'s page-2 section B states it as "— (3rd-party) … not computed in this report". AVL-0003 records that StarMap is NOT equivalent to Perspectum cT1, and AVL-0006 that the cT1 map is not auto-generated on AW server / ReadyView. Its regulatory status is asserted nowhere in this repository.'
  }
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {SCOPE_MATRIX, SCOPE_VENDORS, SCOPE_PARAMS, SCOPE_UNKNOWN_VENDORS,
                    SCOPE_REV, SCOPE_VERSION, SCOPE_HASH};
}
