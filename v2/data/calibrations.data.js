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
 *     at 3.0T  only ONE calibration is published anywhere in the workbook
 *              (CAL-0004, Hernando 2022), and its derivation is recorded as
 *              ge-explicit. The Other path at 3.0T therefore genuinely has
 *              no vendor-neutral alternative and MUST return this calibration
 *              with the rung-5 flag. Inventing a 3T non-GE slope — for instance
 *              by scaling 0.0266 by a field ratio — would be fabricating a
 *              clinical number. Do not. W-069 note: that prohibition got
 *              STRONGER, not weaker. The record used to ship 0.0472, which is
 *              0.0254 x 1.858 — the very scaling forbidden here, in the wrong
 *              direction, sitting inside the record that forbids it. Its own
 *              cited paper publishes -0.03 + 0.01349 x R2*.
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
 *   attaches to a calibration, and what that attachment means. Six ship
 *   `[]` / `'workbook'`: the workbook's citation stands and nothing contradicts
 *   it. That is what `workbook` asserts and all it asserts — it does NOT claim
 *   the cited paper's full text was read.
 *
 *   W-069 filled the third class for the first time on this record type.
 *   CAL-0001 is `workbook-rejected-unresolved`: W-018 read both of its cited
 *   sources in full and NEITHER contains 0.0254, and no publication holding it
 *   was found. Its value did not move — an unsupported citation is not a wrong
 *   number, and an independent paper's 95% CI contains this one. R-49 enforces
 *   the class here as R-38 enforces it on cut-offs, and the split is 6 / 0 / 1.
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
const CALIBRATIONS_VERSION = '1.4';   /* W-069: CAL-0004 rewritten from REF-015 Table 3 (affine, 0.0472 -> 0.01349); CAL-0001 citation rejected, value unchanged */

/* SHA-256 over the canonical serialisation of every record. See
   v2/tests/logic.test.js. Covers vendorClass, technique and evidenceGrade for
   the same reason CUTOFFS_HASH does: a re-classification changes what a report
   may SAY about a number exactly as a value change does. */
const CALIBRATIONS_HASH = '23e90adfa2628250d5cade57b6943e6e5af5c859682b8e04629e8355f469db79';

/* `kind` vocabulary — what shape the formula has, and therefore how
   v2/js/thresholds.js may evaluate it.

     linear-slope    out = slope * in                     (coefficients.slope)
     linear-affine   out = intercept + slope * in         (.intercept, .slope)
     power-law       out = a * in^b                       (coefficients.a, .b)
     compound-rule   a conjunction of thresholds; not evaluable as arithmetic
     formula         a named clinical formula over lab values
     not-published   the workbook uses the quantity but publishes no formula.
                     A DELIBERATE record: the gap is documented, not hidden.

   `linear-affine` is NOT `linear-slope` with an extra field and the two must never
   be collapsed (W-069). A proportional record ASSERTS that its source published no
   intercept; an affine record carries the one its source did publish. Collapsing
   them would make a dropped intercept invisible, and a dropped intercept is a
   defect this repository has now found twice: CAL-0001 still drops Wood's, and
   CAL-0004 dropped Hernando's until W-069 read Table 3. `kind` is what keeps the
   difference visible to a reader and to the evaluator, exactly as it keeps a power
   law from being evaluated as a slope.

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
    citationProvenance: 'workbook-rejected-unresolved',
    workbookCitationRejected: true,
    dataQualityFlags: ['citation-unresolved'],
    dataQualityNote: 'W-069. NEITHER cited source contains this coefficient. REF-001 (Wood ' +
          '2005) publishes "a slope of 37.4 Hz per mg/g dry weight, and a y-intercept of ' +
          '23.7 Hz"; the strings 0.0254, 0.025 and 25.4 occur zero times in it, and the ' +
          'search is self-verifying because the same sweep finds its own R2 line ' +
          '("6.54 Hz per mg/g dry weight ... y-intercept of 47.4 Hz") once. REF-038 was read ' +
          'in full at W-056 and does not endorse it either. Searched for a replacement: ' +
          'inverting Wood gives 1/37.4 = 0.0267, which is a DIFFERENT number and an invalid ' +
          'inversion besides (a least-squares line of y on x is not the inverse of x on y ' +
          'unless the correlation is perfect, CLAUDE.md 1.3). No publication holding ' +
          '0.0254 was found, so the citation stays unresolved. THE VALUE IS NOT MOVED, and ' +
          'the reason is measured rather than deferential: REF-015 Table 3 publishes an ' +
          'independent 1.5-T slope of 0.02603 with a 95% CI of 0.02468 to 0.02738, and ' +
          '0.0254 falls INSIDE it (LITERATURE.md 9.24.2). "The cited paper does not ' +
          'contain this number" is not the claim "this number is wrong" - SCHEMA 5.7.1.',
    vendorClass: 'guideline',
    vendorClassAmbiguous: false,
    derivation: {
      refId: 'REF-001',
      vendorClass: 'ge-explicit',
      note: 'Wood 2005 derived the slope on a GE Signa 1.5T (n=102, transfusion-dependent ' +
            'thalassaemia/SCD). W-056 read ESGAR/SAR 2023 (REF-038) in full and it does NOT ' +
            'endorse this coefficient: 0.0254 occurs zero times, no LIC = ... equation appears ' +
            'in its text, and Wood occurs nine times with all nine inside the reference list. ' +
            'What that guideline endorses is the METHOD - confounder-corrected R2* as ' +
            'first-line, consensus statement 3 - and the calibrations it points at are ' +
            'Hernando et al, summarised in its Table S2, which this project does not hold ' +
            '(LITERATURE.md 9.18.3). REF-038 stays in sourceRefIds because the workbook cites ' +
            'it and a citation is recorded, not deleted. SCHEMA 5.5 still reduces vendorClass ' +
            'to `guideline` - but the underlying measurement is GE-explicit and a report must ' +
            'be able to say so.'
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
    kind: 'linear-affine',
    parameter: 'lic',
    name: 'Hernando 2022 confounder-corrected R2*->LIC calibration (3.0T)',
    expression: 'LIC = -0.03 + 0.01349 x R2*',
    coefficients: {intercept: -0.03, slope: 0.01349},
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
      note: 'W-069 rewrote this record from REF-015 Table 3. W-056: ESGAR/SAR 2023 (REF-038) ' +
            'does NOT carry a coefficient of its own and refers its calibrations to Table S2 ' +
            'and to Hernando et al (LITERATURE.md 9.18.3), which IS REF-015 - so the two ' +
            'cited sources agree and the reduction to `guideline` still hides where the ' +
            'measurement was made, which `derivation` preserves. ⛔ QUEUED, NOT FIXED HERE: ' +
            'this vendorClass reads ge-explicit and REF-015 is MULTI-VENDOR in its own words ' +
            '("clinical MRI systems from three vendors (GE Healthcare, Philips Healthcare, ' +
            'and Siemens Healthineers)", LITERATURE.md 9.20.4). Correcting it moves the ' +
            'no-vendor-neutral-evidence flag the Other path prints, so it is a decision with ' +
            'its own blast radius and outside W-069 approval to move twelve VALUES.'
    },
    evidenceGrade: 'A',
    population: 'Multicentre iron overload, n=207, three vendors, 1.5T and 3.0T (Hernando 2022)',
    provenance: 'transcribed',
    note: 'THE RUNG-5 RECORD, AND W-018 FOUND IT WRONG BY A FACTOR OF 3.50. It shipped ' +
          'LIC = 0.0472 x R2* until 2026-08-25. Its own cited paper publishes, in Table 3 ' +
          'and verbatim, "LIC (in milligrams per gram) = intercept + slope x R2* (1/second)" ' +
          'with intercept -0.03 (95% CI -0.51, 0.45) and slope 1.349 x 10^-2 (95% CI ' +
          '1.282 x 10^-2, 1.417 x 10^-2), R2 = 0.87. The shipped 0.0472 was 0.0254 x 1.858, ' +
          'a MULTIPLICATION where the field relation calls for a division: R2* is a decay ' +
          'rate and roughly DOUBLES at 3.0T for the same iron (INT-0024, and REF-008 states ' +
          'R2*(3T) = 2 x R2*(1.5T) - R_d-d), so the coefficient converting R2* to LIC must be ' +
          'about HALF the 1.5T one. The shipped number was on the wrong side of CAL-0001. ' +
          'LITERATURE.md 9.20.3, 9.20.3a and 9.24 carry the reading and the arithmetic. ' +
          'The intercept is TRANSCRIBED, not judged: its 95% CI contains zero, which is a ' +
          'property of the published fit and not a licence to delete a published coefficient ' +
          '(the dropped-intercept defect CAL-0001 still carries is exactly what that would ' +
          'repeat). Deriving a 3T non-GE slope by scaling CAL-0002 by the 1.86 field ratio ' +
          'remains forbidden and is now doubly wrong: it scales in the wrong direction.',
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
    dataQualityNote: 'The workbook applies FIB-4 but publishes neither the formula nor its '
          + 'originating paper, and no REFERENCES record is the FIB-4 derivation study. The '
          + 'expression here was transcribed from v1/js/app.js computeFib4(), i.e. from CODE. '
          + 'W-069 added this field: R-49 found the flag standing alone, and a flag with no '
          + 'note records that something is wrong while destroying what it was (R-15). The '
          + 'reason had been in `note` all along; it is now where a rule can read it.',
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
          'both false = rule-out; mixed = indeterminate, consider biopsy or MAST. ' +
          'W-065: this note carried a rule-out NPV of 93%, and W-018 read both ' +
          'cited papers in full - 92.8 occurs zero times in Jung 2021 and zero ' +
          'times in EASL 2024, which publishes no predictive value at all. Jung ' +
          'measures NPV 83.2% in the derivation cohort and 59.4% in validation; ' +
          'the two are stated as two, never averaged (LITERATURE.md 9.17.5). The ' +
          'rule-in PPV 97.1% is in the paper six times and is unchanged.',
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
    dataQualityNote: 'The workbook publishes MAST two operating thresholds (CUT-0069 / '
          + 'CUT-0070) and never its coefficients, so `expression` is null by decision and '
          + 'stays null until they are transcribed from REF-025. W-069 added this field for '
          + 'the reason given on CAL-0005: R-49 found the flag with no note beside it.',
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
