/* VeriLiv V2 — DIAGNOSTIC CONSIDERATIONS (W-098)
 * ---------------------------------------------------------------------------
 * HAND-AUTHORED, and deliberately so. This file is the machine-readable layer
 * that lets the printed impression end with a closing "Summary" whose every
 * sentence is either a value this report computed or a published sentence
 * quoted verbatim — never a synthesis written by the tool.
 *
 * WHY THIS FILE EXISTS.  The impression states each finding and, since W-072,
 * the caution that belongs to it. It never states what the findings ADD UP TO.
 * The forbidden fix is a tool-authored synthesis ("these findings are
 * consistent with X"); hedging it ("X may be considered") is a rhetorical
 * device, not provenance. The legitimate fix is that diagnostic considerations
 * are THEMSELVES published — a guideline writes "should be considered" — and
 * this repository had no record type that could hold one. `CUTOFFS` answer
 * WHERE is the boundary; `TRIGGERS` answer WHEN is a reading unreliable;
 * `INTERACTIONS` answer WHAT technical pitfall applies; nothing answered WHAT
 * DOES THIS PATTERN RAISE. That is this record type.
 *
 * ⛔ THE HARD RULES (design spec §§ 1, 3, 5, 6, 8; CLAUDE.md § 1):
 *   - `statement` is the source's sentence VERBATIM. Never a summary written at
 *     this layer, never trimmed, never paraphrased.
 *   - `sourceStrength` is the source's OWN strength label, verbatim, or null
 *     where the source states none. A grade assigned at this layer NEVER goes
 *     here — that would be an unsourced clinical judgement about evidence.
 *   - Where the sources this report rests on disagree, the block SAYS SO and
 *     does not resolve it (SCHEMA § 10.5). A "council voice" that manufactures
 *     agreement is the same failure with better prose.
 *   - No record id of any kind reaches the printed block (logic.test.js
 *     L9 / L10). `readerLabel` is how a source is named on the page.
 *   - A consideration that does not fire is silent in the prose but NOT silent
 *     in the report: where a pattern matched but a required input was missing or
 *     withheld, the coverage clause says so (SCHEMA § 10.3).
 *
 * `pattern` grammar — declarative data, never code, so a test can evaluate it
 * and it enters the hash:
 *   {
 *     cohort: 'adult' | 'peds',                 // optional; omit for either.
 *                                               // Mirrors selection.js AGE_GROUPS.
 *     indication: ['iron-overload', ...],       // one or more SPECIFIC
 *                                               // indications. 'non-specific'
 *                                               // is barred (schema R-CNS-3)
 *                                               // and fires nothing anyway.
 *     requires: [                               // every entry must hold
 *       {parameter: 'pdff', bands: ['S1','S2','S3']}
 *                                               // `bands` are verdict-band
 *                                               // labels the engine already
 *                                               // returns for that parameter —
 *                                               // NOT a severity class and NOT
 *                                               // a new name. A band the engine
 *                                               // cannot produce fails the
 *                                               // schema test.
 *     ]
 *   }
 *
 * GATING — three doors, all must open (spec § 6), enforced in
 * `report.js buildConsiderations`:
 *   1. cohort matches (if `pattern.cohort` is set) AND the selected indication
 *      is one of `pattern.indication`. A non-specific study matches nothing.
 *   2. every `requires` parameter is measured AND interpretable — a reading the
 *      reliability layer has withheld cannot feed a consideration, mirroring
 *      `buildComposite()`'s MEFIB abstention.
 *   3. every `requires` parameter's printed verdict band is one of `bands`.
 *
 * FIELD-SHAPE DEVIATIONS FROM SPEC § 5, recorded in LITERATURE.md § 11.4:
 *   - `indication` is a LIST, not a single value: "the incidental finding of
 *     steatosis" is not specific to one indication.
 *   - `requires[].bands` is a LIST, not a single `band`: incidental steatosis is
 *     armed by any steatosis grade.
 *
 * Loaded as a plain <script> and require()-able by the Node tests, like every
 * other file in this folder.
 * ---------------------------------------------------------------------------
 */

const CONSIDERATIONS_VERSION = '1.0';   /* W-098: record type created; CNS-0001/0002 from EASL–EASD–EASO 2024 (REF-040) full text */
const CONSIDERATIONS_HASH = '95bcf4eb8fd8891833dfdc70bbd286b46bdd182fd5c51a1bbfe9f880450f642d';

/* Both records are the two Recommendations under one guideline sub-heading
   ("Definition, prevalence and natural course" → the incidental-steatosis PICO
   question), so they share one pattern: an adult study, requested for any
   specific reason, with PDFF staged in a steatosis band. Read from REF-040 full
   text on 2026-08-29; the reading is written down in LITERATURE.md § 11. */
const _EASL_STEATOSIS_PATTERN = {
  cohort: 'adult',
  indication: ['iron-overload', 'steatotic-liver-disease', 'chronic-liver-disease'],
  requires: [{parameter: 'pdff', bands: ['S1', 'S2', 'S3']}]
};

const CONSIDERATIONS = [
  {
    id: 'CNS-0001',
    pattern: _EASL_STEATOSIS_PATTERN,
    statement:
      'The incidental finding of steatosis should prompt assessment of the ' +
      'potential aetiology of SLD, alongside tests for the presence of advanced ' +
      'fibrosis, as this could determine the risk of liver-related and/or ' +
      'cardiovascular outcomes and appropriate care (LoE 3, strong ' +
      'recommendation, strong consensus).',
    quoteSource: 'guideline-recommendation',
    sourceRefIds: ['REF-040'],
    sourceStrength: 'LoE 3, strong recommendation, strong consensus',
    readerLabel: 'EASL–EASD–EASO 2024',
    transcribedIn: 'LITERATURE.md § 11'
  },
  {
    id: 'CNS-0002',
    pattern: _EASL_STEATOSIS_PATTERN,
    statement:
      'MASLD, ALD and MetALD are the most common causes of SLD, but other ' +
      'causes such as drug-induced liver disease and monogenic SLD should be ' +
      'considered, depending on the context (LoE 3, strong recommendation, ' +
      'strong consensus).',
    quoteSource: 'guideline-recommendation',
    sourceRefIds: ['REF-040'],
    sourceStrength: 'LoE 3, strong recommendation, strong consensus',
    readerLabel: 'EASL–EASD–EASO 2024',
    transcribedIn: 'LITERATURE.md § 11'
  }
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {CONSIDERATIONS, CONSIDERATIONS_VERSION, CONSIDERATIONS_HASH};
}
