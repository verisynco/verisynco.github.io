/* VeriLiv V2 — CALIBRATION RECORDS  (the fourth record type, SCHEMA § 9 Q5)
 * ---------------------------------------------------------------------------
 * TRANSCRIBED BY HAND from the workbook rows already migrated into
 * protocols.data.js and interactions.data.js, plus the two formula constants
 * V1 hard-codes in v1/js/app.js. Every number below is traceable to a sheet
 * cell or is explicitly marked as having no source.
 *
 * PROVENANCE
 *   workbook : reference/Liver_MRI_Interactive_Reference_v1.xlsx
 *   rev      : xlsx-v1   (must match CUTOFFS_REV — schema.test.js rule REV)
 *
 * WHY THIS FILE EXISTS
 *   A cut-off is a BOUNDARY: "F>=2 starts at 3.5 kPa". A calibration is a
 *   FORMULA PARAMETER: "LIC = 0.0254 x R2*". They are different objects, but
 *   they have identical provenance needs — a source, a technique, a vendor
 *   class and an evidence grade — and identical failure modes. V1 keeps its
 *   slopes in js/app.js OUTSIDE its own hash lock, and V1's CHANGELOG says so.
 *   That is the defect this file closes: these numbers are now locked by
 *   CALIBRATIONS_HASH exactly as cut-offs are locked by CUTOFFS_HASH.
 *
 * THE FINDING THAT MATTERS FOR THE OTHER PATH
 *   W-005's brief anticipated that the workbook would support no distinct
 *   non-GE R2*->LIC slope, and instructed: return the GE slope with a rung-5
 *   flag rather than inventing one. That anticipation is HALF right, and the
 *   half that is wrong is worth stating plainly:
 *
 *     at 1.5T  a second LINEAR R2* slope does exist — 0.0266 (CAL-0002,
 *              Meloni/St Pierre 2019, multi-vendor-incl-ge, FerriScan-
 *              equivalent), 4.7% higher than Wood's 0.0254. So the Other
 *              path at 1.5T does NOT have to fall back to the GE slope.
 *     at 3.0T  only ONE slope is published anywhere in the workbook — 0.0472
 *              (CAL-0004, Serai/Reeder 2022), and its derivation is
 *              ge-explicit. The Other path at 3.0T therefore genuinely has
 *              no vendor-neutral alternative and MUST return this slope with
 *              the rung-5 flag. Inventing a 3T non-GE slope — for instance by
 *              scaling 0.0266 by the 1.86 field ratio — would be fabricating
 *              a clinical number. Do not.
 *
 *   A third iron calibration exists and is genuinely non-GE (CAL-0003,
 *   Garbowski 2014) but it is a POWER LAW on T2*, not a linear R2* slope.
 *   It is not a drop-in substitute and the engine must never treat it as one:
 *   `kind` is what stops that, not a comment.
 *
 * THE CITATION CHANNEL                                                    W-031
 *   Every record carries `externalRefIds` and `citationProvenance`, the pair
 *   REFERENCE-RANGE has had since W-020 (SCHEMA § 5.7.1) and CUT-OFF gained in
 *   the same task. It is how a paper the workbook does NOT contain (§ 3.7)
 *   attaches to a calibration, and what that attachment means. All seven ship
 *   `[]` / `'workbook'`: the workbook's citation stands and nothing contradicts
 *   it. That is what `workbook` asserts and all it asserts — it does NOT claim
 *   the cited paper's full text was read.
 *
 *   ⛔ A CITATION CHANNEL, NEVER A VALUE CHANNEL. Nothing here lets a paper
 *      supply, adjust or corroborate a coefficient. Changing one is still the
 *      three-step procedure in CLAUDE.md § 4, hash and citation included.
 *
 * ⛔ NO FUNCTIONS IN THIS FILE. Records are pure data so they can be hashed and
 *    serialised. Evaluation lives in v2/js/thresholds.js, dispatched on `kind`.
 *
 * Loaded as a plain <script> (ES modules fail under file://) and require()-able
 * by the Node test suite, exactly like the other data files.
 * ---------------------------------------------------------------------------
 */

const CALIBRATIONS_REV = 'xlsx-v1';
const CALIBRATIONS_VERSION = '1.1';   /* W-031: the citation channel; no coefficient moved */

/* SHA-256 over the canonical serialisation of every record. See
   v2/tests/logic.test.js. Covers vendorClass, technique and evidenceGrade for
   the same reason CUTOFFS_HASH does: a re-classification changes what a report
   may SAY about a number exactly as a value change does. */
const CALIBRATIONS_HASH = '7ea577c5adf6d4a97c829a7eb70524406bc3179ef67354f18700fff9a73a25c7';

/* `kind` vocabulary — what shape the formula has, and therefore how
   v2/js/thresholds.js may evaluate it.

     linear-slope    out = slope * in                     (coefficients.slope)
     power-law       out = a * in^b                       (coefficients.a, .b)
     compound-rule   a conjunction of thresholds; not evaluable as arithmetic
     formula         a named clinical formula over lab values
     not-published   the workbook uses the quantity but publishes no formula.
                     A DELIBERATE record: the gap is documented, not hidden.

   `provenance` reuses the CUTOFF vocabulary (SCHEMA § 5.1) plus `not-published`.

   `derivation` is specific to this record type. Where a guideline ENDORSES a
   number it did not itself derive, § 5.5 reduces vendorClass to `guideline`
   and the fact that the underlying calibration is GE-derived would vanish.
   `derivation` preserves it, so the engine can flag "guideline value, but
   derived from GE-explicit evidence" rather than presenting it as
   vendor-neutral. Null where the source derived the number itself. */

const CALIBRATIONS = [

  /* ================================================= Iron: R2* and T2* -> LIC */

  {
    id: 'CAL-0001',
    kind: 'linear-slope',
    parameter: 'lic',
    name: 'Wood 2005 R2*->LIC calibration (1.5T)',
    expression: 'LIC = 0.0254 x R2*',
    coefficients: {slope: 0.0254},
    inputQuantity: 'r2star',
    inputUnit: 'Hz',
    outputUnit: 'mg Fe/g dw',
    fieldStrength: '1.5T',
    technique: 'iron-r2star-gre',
    techniqueGroup: 'iron-r2star',
    sourceRefIds: ['REF-001', 'REF-038'],
    externalRefIds: [],
    citationProvenance: 'workbook',
    vendorClass: 'guideline',
    vendorClassAmbiguous: false,
    derivation: {
      refId: 'REF-001',
      vendorClass: 'ge-explicit',
      note: 'Wood 2005 derived the slope on a GE Signa 1.5T (n=102, transfusion-dependent ' +
            'thalassaemia/SCD). ESGAR/SAR 2023 (REF-038) endorses it without re-deriving it, ' +
            'so SCHEMA 5.5 reduces vendorClass to `guideline` — but the underlying ' +
            'measurement is GE-explicit and a report must be able to say so.'
    },
    evidenceGrade: 'A',
    population: 'Transfusion-dependent thalassaemia/SCD, n=102 (Wood 2005)',
    provenance: 'transcribed',
    note: 'The de facto 1.5T standard. V1 hard-codes this number in js/app.js line 120 as ' +
          '`const slope = M.is3T ? 0.0472 : 0.0254`, outside its own THRESHOLDS_HASH — the ' +
          'exact defect this file closes. Note the slope is field-strength specific, which ' +
          'is why SCHEMA 4.1 requires equal fieldStrength when pooling within iron-r2star.',
    source: {sheet: 'GE_Protocols_1p5T', row: 4}
  },

  {
    id: 'CAL-0002',
    kind: 'linear-slope',
    parameter: 'lic',
    name: 'Meloni / St Pierre 2019 R2*->LIC calibration, FerriScan-equivalent (1.5T)',
    expression: 'LIC = 0.0266 x R2*',
    coefficients: {slope: 0.0266},
    inputQuantity: 'r2star',
    inputUnit: 'Hz',
    outputUnit: 'mg Fe/g dw',
    fieldStrength: '1.5T',
    technique: 'iron-r2star-gre',
    techniqueGroup: 'iron-r2star',
    sourceRefIds: ['REF-007'],
    externalRefIds: [],
    citationProvenance: 'workbook',
    vendorClass: 'multi-vendor-incl-ge',
    vendorClassAmbiguous: false,
    derivation: null,
    evidenceGrade: 'B',
    population: 'Iron overload, n=95, validated against FerriScan (Meloni 2019)',
    provenance: 'transcribed',
    note: 'THE RECORD THAT ANSWERS W-005 AT 1.5T. A second published linear slope for the ' +
          'same technique group at the same field strength, from a multi-vendor cohort ' +
          'including GE. 0.0266 vs Wood 0.0254 is a 4.7% difference: at R2* = 276 Hz (the ' +
          'mild|moderate edge) that is LIC 7.34 vs 7.01 mg Fe/g dw — the same side of the ' +
          'boundary, but the two are not interchangeable at the number level. Calibrated ' +
          'against FerriScan R2, so it is a bridge between the two iron technique groups ' +
          'rather than a member of both; techniqueGroup stays iron-r2star because the ' +
          'MEASUREMENT is R2*.',
    source: {sheet: 'GE_Protocols_1p5T', row: 9}
  },

  {
    id: 'CAL-0003',
    kind: 'power-law',
    parameter: 'lic',
    name: 'Garbowski 2014 T2*->LIC calibration (1.5T)',
    expression: 'LIC = 31.94 x T2*^-1.014',
    coefficients: {a: 31.94, b: -1.014},
    inputQuantity: 't2star',
    inputUnit: 'ms',
    outputUnit: 'mg Fe/g dw',
    fieldStrength: '1.5T',
    technique: 'iron-t2star-gre',
    techniqueGroup: 'iron-r2star',
    sourceRefIds: ['REF-006'],
    externalRefIds: [],
    citationProvenance: 'workbook',
    vendorClass: 'non-ge',
    vendorClassAmbiguous: false,
    derivation: null,
    evidenceGrade: 'B',
    population: 'Transfusional haemosiderosis, n=54, Siemens Sonata 1.5T (Garbowski 2014)',
    provenance: 'transcribed',
    note: 'The only genuinely non-ge iron calibration in the workbook, and it is NOT a ' +
          'substitute for a non-GE linear R2* slope: it is a power law taking T2* in ms, ' +
          'not a slope taking R2* in Hz. Since R2* = 1000/T2* the two are the same ' +
          'MEASUREMENT (hence the shared techniqueGroup), but they are not the same ' +
          'FUNCTION and an engine that swapped one for the other would be silently wrong. ' +
          '`kind` is what makes that impossible by construction. The reference carries the ' +
          '"(adaptable to GE)" parenthetical, which SCHEMA 3.4 is explicit is an editorial ' +
          'judgement about transferability and never changes vendorClass.',
    source: {sheet: 'GE_Protocols_1p5T', row: 8}
  },

  {
    id: 'CAL-0004',
    kind: 'linear-slope',
    parameter: 'lic',
    name: 'Serai / Reeder 2022 R2*->LIC calibration (3.0T)',
    expression: 'LIC = 0.0472 x R2*',
    coefficients: {slope: 0.0472},
    inputQuantity: 'r2star',
    inputUnit: 'Hz',
    outputUnit: 'mg Fe/g dw',
    fieldStrength: '3.0T',
    technique: 'iron-r2star-gre',
    techniqueGroup: 'iron-r2star',
    sourceRefIds: ['REF-015', 'REF-038'],
    externalRefIds: [],
    citationProvenance: 'workbook',
    vendorClass: 'guideline',
    vendorClassAmbiguous: false,
    derivation: {
      refId: 'REF-015',
      vendorClass: 'ge-explicit',
      note: 'Serai/Reeder 2022 multicentre validation, n=207, on GE Signa 3T + Signa Premier ' +
            '(with a 1.5T Signa arm). ESGAR/SAR 2023 (REF-038) carries it. As with CAL-0001 ' +
            'the reduction to `guideline` hides a GE-explicit derivation, which `derivation` ' +
            'preserves.'
    },
    evidenceGrade: 'A',
    population: 'Multicentre iron overload, n=207 (Serai/Reeder 2022)',
    provenance: 'transcribed',
    note: 'THE RUNG-5 RECORD. This is the ONLY 3.0T R2*->LIC slope published anywhere in the ' +
          'workbook, and its derivation is ge-explicit. An Other-path report at 3.0T has no ' +
          'vendor-neutral alternative and must return this slope carrying the ' +
          '"no vendor-neutral evidence" flag. Deriving a 3T non-GE slope by scaling ' +
          'CAL-0002 by the 1.86 field ratio (INT-0024) would be inventing a clinical number ' +
          'and is forbidden. The ratio 0.0472 / 0.0254 = 1.858 is the field effect INT-0024 ' +
          'describes; it is an observation about these two records, not a conversion rule.',
    source: {sheet: 'GE_Protocols_3T', row: 11}
  },

  /* =========================================== Composite scores: MEFIB, MAST */

  {
    id: 'CAL-0005',
    kind: 'formula',
    parameter: 'fib4',
    name: 'FIB-4 index',
    expression: 'FIB-4 = (age x AST) / (platelets x sqrt(ALT))',
    coefficients: null,
    inputQuantity: 'labs',
    inputUnit: 'years, U/L, 10^9/L, U/L',
    outputUnit: 'ratio',
    fieldStrength: 'any',
    technique: 'not-applicable',
    techniqueGroup: null,
    sourceRefIds: [],
    externalRefIds: [],
    citationProvenance: 'workbook',
    vendorClass: 'guideline',
    vendorClassAmbiguous: false,
    derivation: null,
    evidenceGrade: 'C',
    population: 'Not stated — the workbook uses FIB-4 but does not publish or cite the formula',
    provenance: 'editorial-unsourced',
    dataQualityFlags: ['formula-origin-not-in-workbook'],
    note: 'DECLARED GAP, NOT A GAP FILLED. The workbook applies FIB-4 (the MEFIB rule needs ' +
          'it) but nowhere publishes the formula or cites its originating paper, and no ' +
          'reference in REFERENCES is the FIB-4 derivation study. The expression recorded ' +
          'here is the one V1 hard-codes in computeFib4() at v1/js/app.js:89-95, transcribed ' +
          'from CODE rather than from the workbook — which is why provenance is ' +
          'editorial-unsourced and evidenceGrade is C despite FIB-4 being uncontroversial. ' +
          'Resolving this means adding the source paper to the reference list; it is the ' +
          'same class of defect as the t2 bands in SCHEMA 8.2 finding 4. vendorClass is ' +
          '`guideline` in the sense of SCHEMA 3.3 — a lab index has no scanner provenance ' +
          'at all — not because a guideline published it.',
    source: {sheet: null, cell: null}
  },

  {
    id: 'CAL-0006',
    kind: 'compound-rule',
    parameter: 'mefib',
    name: 'MEFIB rule',
    expression: 'MEFIB positive  <=>  MRE >= 3.3 kPa AND FIB-4 >= 1.6',
    coefficients: {mreKPa: 3.3, fib4: 1.6},
    inputQuantity: 'mre+fib4',
    inputUnit: 'kPa, ratio',
    outputUnit: 'positive | indeterminate | negative',
    fieldStrength: '1.5T+3.0T',
    technique: 'not-applicable',
    techniqueGroup: null,
    sourceRefIds: ['REF-024', 'REF-040'],
    externalRefIds: [],
    citationProvenance: 'workbook',
    vendorClass: 'guideline',
    vendorClassAmbiguous: false,
    derivation: {
      refId: 'REF-024',
      vendorClass: 'multi-vendor-incl-ge',
      note: 'Jung 2021 (Gut) derived the rule; EASL/EASD/EASO 2024 (REF-040) carries it.'
    },
    evidenceGrade: 'A',
    population: 'NAFLD, multi-vendor incl. GE, 1.5T and 3.0T (Jung 2021)',
    provenance: 'transcribed',
    note: 'THE HALF OF MEFIB THAT CUTOFFS CANNOT HOLD. CUT-0067 / CUT-0068 carry the MRE ' +
          'component (3.3 kPa) because it is expressible as a boundary; their own notes say ' +
          'the FIB-4 >= 1.6 component "has no home in this schema". This record is that ' +
          'home, and it carries BOTH constants so the rule can be evaluated from one place ' +
          'instead of being reassembled from a cut-off plus a hard-coded literal — which is ' +
          'what V1 does at js/app.js:154. Both conditions true = rule-in >=F2 (PPV 97%); ' +
          'both false = rule-out (NPV 93%); mixed = indeterminate, consider biopsy or MAST.',
    source: {sheet: 'MRE', cell: 'D18+E18'}
  },

  {
    id: 'CAL-0007',
    kind: 'not-published',
    parameter: 'mast',
    name: 'MAST score formula',
    expression: null,
    coefficients: null,
    inputQuantity: 'pdff+mre+ast',
    inputUnit: '%, kPa, U/L',
    outputUnit: 'ratio',
    fieldStrength: '1.5T+3.0T',
    technique: 'not-applicable',
    techniqueGroup: null,
    sourceRefIds: ['REF-025', 'REF-040'],
    externalRefIds: [],
    citationProvenance: 'workbook',
    vendorClass: 'guideline',
    vendorClassAmbiguous: false,
    derivation: {
      refId: 'REF-025',
      vendorClass: 'non-ge',
      note: 'Noureddin 2022 (J Hepatol) derived MAST; EASL/EASD/EASO 2024 carries it.'
    },
    evidenceGrade: 'A',
    population: 'NAFLD (Noureddin 2022)',
    provenance: 'not-published',
    dataQualityFlags: ['formula-not-in-workbook'],
    note: 'DELIBERATE EMPTY RECORD. MAST is a logistic score over MRI-PDFF, MRE and AST, and ' +
          'the workbook publishes ONLY its two operating thresholds (0.242 rule-in, 0.165 ' +
          'rule-out — CUT-0069 / CUT-0070), never the coefficients. So the score cannot be ' +
          'COMPUTED from this data layer; it can only be INTERPRETED once a value is entered ' +
          'by hand. This record exists so that fact is discoverable in the data rather than ' +
          'being an unexplained absence, and so a later task knows exactly what to go and ' +
          'fetch from Noureddin 2022. expression is null and MUST stay null until the ' +
          'coefficients are transcribed from the primary text.',
    source: {sheet: 'MRE', cell: 'D19+E19'}
  }
];

/* Convenience index — id -> record. Not hashed; derived, not source data. */
const CALIBRATIONS_BY_ID = {};
for (const c of CALIBRATIONS) CALIBRATIONS_BY_ID[c.id] = c;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CALIBRATIONS, CALIBRATIONS_BY_ID,
    CALIBRATIONS_REV, CALIBRATIONS_VERSION, CALIBRATIONS_HASH
  };
}
