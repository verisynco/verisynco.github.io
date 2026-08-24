/* VeriLiv V2 — CLINICAL THRESHOLD ENGINE  (W-005)
 * ===========================================================================
 * PURE COMPUTATION. No DOM, no rendering, no formatting, no colour, no label.
 * Everything here is a function of the data layer plus the caller's selection.
 * Rendering is W-007's job and must not leak backwards into this file.
 *
 * Loads as a plain <script> (ES modules fail under file://, and opening
 * v2/index.html by double-clicking has to keep working) AND via Node
 * require(), exactly like v1/js/thresholds.js and the data files.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS RETURNS, AND WHY IT IS NOT WHAT THE BRIEF FIRST ASKED FOR
 * ---------------------------------------------------------------------------
 * The brief specified one point value per boundary plus a study mean and a
 * min-max range. Measuring the actual pool changed the shape twice, both times
 * because of what the data turned out to be:
 *
 * 1. PROVENANCE VARIES BY RUNG, NOT BY LADDER. The adult PDFF ladder at 1.5T
 *    is 5.2 (ge-explicit) / 17 (multi-vendor-incl-ge) / 22.1 (ge-explicit).
 *    Split it into a "GE bar" and a "multi-vendor bar" and NEITHER is complete
 *    — 2/3 and 1/3. There is one published ladder of mixed provenance, and the
 *    honest representation badges each rung rather than pretending there are
 *    two ladders. SCHEMA 8.2 finding 2 spotted the same thing in V1.
 *
 * 2. GUIDELINE AND VENDOR EVIDENCE ARE COMPLEMENTARY, NOT PARALLEL. Across the
 *    71 (parameter x field x ageGroup) scales in this pool, exactly ONE —
 *    mre / 1.5T / adult — can draw a complete guideline ladder AND a complete
 *    vendor ladder side by side. Everywhere else one of the two is empty:
 *    the adult iron ladders are guideline-only with no GE evidence at all,
 *    the paediatric ladders are ge-explicit-only with no guideline at all.
 *
 * So buildScales() does not return a fixed pair of bars. It attempts two
 * PROVENANCE POLICIES, reports which produced a complete ladder, and lets the
 * report draw one bar per complete scale. The data decides how many bars there
 * are; the engine never fabricates a second one for symmetry.
 *
 *      guideline        vendorClass === 'guideline'
 *      primary-studies  ge-explicit + non-ge + multi-vendor-incl-ge, badged
 *                       per rung by classifyRung
 *
 * 3. W-029 REMOVED THE VENDOR AXIS FROM THIS FILE'S CUT-OFF PATH. It used to
 *    split the primaries by the vendor class the caller selected. Measured
 *    across all 32 callable scales, that split decided 6 of them and changed
 *    no answer that already existed — every scale that staged, staged on
 *    identical values either way. It now survives in resolveCalibration alone,
 *    where an R2*->LIC slope really is a property of the sequence.
 *
 * ---------------------------------------------------------------------------
 * WHAT DECIDES THE STAGE
 * ---------------------------------------------------------------------------
 * The brief's hard constraint stands: staging is decided by the guideline
 * value wherever one exists. Vendor evidence is shown alongside as a second
 * opinion and never moves the stage. Where no guideline ladder exists at all
 * — PDFF, ADC, T1, and every paediatric ladder — staging falls to the
 * completest vendor scale and SAYS SO through the rung and its flags.
 *
 * A blended number was considered and rejected on scientific grounds. Guideline
 * thresholds are SYNTHESISED from the same primary studies, so averaging the
 * two double-counts the evidence; and any weighting coefficient would itself be
 * an unsourced clinical number. Worse, blending destroys information: at MRE
 * F>=2 the guideline says 3.5 kPa and the GE-explicit evidence says 3.0, so a
 * patient at 3.2 is "significant fibrosis by GE evidence, not by guideline".
 * That disagreement is clinically actionable. A weighted 3.25 erases it.
 *
 * ---------------------------------------------------------------------------
 * WHAT AN AVERAGE HERE IS, AND IS NOT
 * ---------------------------------------------------------------------------
 * It is an unweighted arithmetic mean of published cut-offs. It is NOT a
 * meta-analysis and must never be printed as a pooled estimate. The studies
 * differ in reference standard (METAVIR vs NASH-CRN), in population, and in
 * the sensitivity/specificity operating point chosen on their own ROC curve —
 * and averaging operating points drawn from different ROC curves has no defined
 * statistical meaning. Every summary therefore carries `meanLabel`, which the
 * report prints verbatim: "unweighted mean of N sources".
 *
 * The spread is min-max, never SD. Contributing source counts here are 1-4 and
 * an SD at n=2 is a number with the shape of a statistic and none of the
 * content.
 * ===========================================================================
 */

const V2_THRESHOLDS_VERSION = '1.1';

/* -------------------------------------------------------------- Data loading
   In the browser the data files have already run and left their consts as
   globals. Under Node nothing is global, so require() them. Same bytes both
   ways — that is the entire point of the plain-<script> file format. */

const _D = (typeof module !== 'undefined' && module.exports)
  ? (function () {
      const path = require('path');
      const dir = path.join(__dirname, '..', 'data');
      const load = f => require(path.join(dir, f));
      const t = load('techniques.data.js');
      const r = load('references.data.js');
      const c = load('cutoffs.data.js');
      const k = load('calibrations.data.js');
      return {
        TECHNIQUES: t.TECHNIQUES, TECHNIQUE_GROUPS: t.TECHNIQUE_GROUPS,
        REFERENCES: r.REFERENCES, CUTOFFS: c.CUTOFFS,
        CALIBRATIONS: k.CALIBRATIONS,
        CUTOFFS_VERSION: c.CUTOFFS_VERSION, CUTOFFS_HASH: c.CUTOFFS_HASH,
        CALIBRATIONS_VERSION: k.CALIBRATIONS_VERSION, CALIBRATIONS_HASH: k.CALIBRATIONS_HASH
      };
    })()
  : {
      TECHNIQUES: TECHNIQUES, TECHNIQUE_GROUPS: TECHNIQUE_GROUPS,
      REFERENCES: REFERENCES, CUTOFFS: CUTOFFS,
      CALIBRATIONS: CALIBRATIONS,
      CUTOFFS_VERSION: CUTOFFS_VERSION, CUTOFFS_HASH: CUTOFFS_HASH,
      CALIBRATIONS_VERSION: CALIBRATIONS_VERSION, CALIBRATIONS_HASH: CALIBRATIONS_HASH
    };

const _REF_BY_ID = new Map(_D.REFERENCES.map(r => [r.id, r]));

/* ------------------------------------------------------------------ Ladders
   Which boundaries make up a staging ladder for each parameter, in worsening
   order. This is STRUCTURE, not presentation: the order is what makes
   monotonicity checkable and staging computable. Labels, severity classes,
   colours and axis ranges stay out, per SCHEMA 8.5 — they are VeriLiv
   editorial judgements and would smuggle opinion into a provenance engine.

   v2/tests/schema.test.js keeps its own copy for the monotonicity rule. The
   duplication is deliberate double-entry: if one drifts, the tests disagree. */

const LADDERS = {
  pdff:   ['S0|S1', 'S1|S2', 'S2|S3'],
  mre:    ['F>=1', 'F>=2', 'F>=3', 'F4'],
  adc:    ['F>=2', 'F>=3'],
  lic:    ['normal|borderline', 'borderline|mild', 'mild|moderate', 'moderate|severe'],
  r2star: ['normal|borderline', 'borderline|mild', 'mild|moderate', 'moderate|severe'],
  t2star: ['normal|borderline', 'borderline|mild', 'mild|moderate', 'moderate|severe'],
  t1:     ['low|normal', 'normal|elevated'],
  ct1:    ['normal|elevated', 'elevated|high-risk']
};

/* -------------------------------------------------- Field-strength independence
   Some cut-offs are transcribed at one field strength but are a claim about
   the measurement, not about the field. The migration recorded them as the
   sheet published them, which is correct for a transcription and wrong for a
   query: asking for MRE at 3.0T would find nothing, because LI-RADS/SAR's
   etiology-independent ladder sits in the 1.5T column.

   Rather than editing the transcription, the physical claim is recorded HERE,
   sourced, and every result it rescues carries a flag so it is never silent. */

const FIELD_INDEPENDENT_GROUPS = {
  'mre-60hz-stiffness': {
    refId: 'REF-039',
    why: 'LI-RADS/SAR 2024 (88% member endorsement) treats 60 Hz shear stiffness as ' +
         'field-strength independent and harmonised across 2D-GRE, 2D-SE-EPI and 3D.'
  }
};

/* ------------------------------------------------------------ Small helpers */

/* THE QUERY VOCABULARIES, WHICH ARE NOT THE RECORD VOCABULARIES.
   A cut-off RECORD may be stamped '1.5T', '3.0T', '1.5T+3.0T' or 'any'
   (SCHEMA 5.3) — the last two are claims about the measurement, and
   fieldMatches() is what resolves them. A QUERY names the scanner the patient
   was actually on, and no scanner is set to "any", so only two spellings can be
   asked for. */
const QUERY_FIELD_STRENGTHS = ['1.5T', '3.0T'];
const QUERY_AGE_GROUPS = ['adult', 'peds'];

/* W-027 — AN UNRECOGNISED AXIS VALUE THROWS. IT DOES NOT RETURN A GAP.

   Measured: buildScales({… fieldStrength:'3T' …}) returned `drawable: []` and
   `staging: null` — byte for byte what the engine returns when the literature
   really is silent. That made a caller's typo indistinguishable from the
   STRONGEST negative claim this engine can make, and during W-006's design pass
   it manufactured a wrong finding that survived into a draft spec.

   The decision follows resolveTechniqueGroup rather than SCHEMA 10.3: a gap
   object describes an absence IN THE LITERATURE, and a misspelled axis value is
   not literature — it is a bug in the call, and the caller is the only one who
   can fix it. Routing it into the gap channel would put a typo exactly where the
   report prints clinical evidence.

   Every message names the axis, the value received AND the accepted vocabulary,
   because a refusal the caller cannot act on is barely better than silence. */
function requireEnum(axis, value, allowed) {
  if (allowed.indexOf(value) !== -1) return value;
  const got = typeof value === 'string' ? `"${value}"` : String(value);
  throw new TypeError(
    `${axis} must be one of ${allowed.map(v => `"${v}"`).join(' | ')} — got ${got}. ` +
    `An unrecognised ${axis} is a caller error, not an absence of evidence.`);
}

/* Cohort ids are `adult-*` / `pediatric-*` (SCHEMA 5); the two age groups and
   the two V1-era labels are the same question asked more loosely, so they are
   accepted as aliases. Anything else throws — before W-027 this returned 'adult'
   for every string it did not recognise, so 'banana' and 'Pediatric-NAFLD' both
   silently became adults, and the caller was never told. */
function ageGroupOf(cohort) {
  const c = String(cohort);
  if (c === 'adult' || c === 'Adult' || c.startsWith('adult-')) return 'adult';
  if (c === 'peds' || c === 'Pediatric' || c.startsWith('pediatric-')) return 'peds';
  throw new TypeError(
    `unknown cohort ${typeof cohort === 'string' ? `"${cohort}"` : String(cohort)} — ` +
    `expected ${QUERY_AGE_GROUPS.map(v => `"${v}"`).join(' | ')}, or a cohort id ` +
    `beginning "adult-" or "pediatric-". An unrecognised cohort is a caller ` +
    `error, not an absence of evidence.`);
}

/* SCHEMA 5.3: "any" and "1.5T+3.0T" both answer a query at either field, for
   different reasons the record's own note explains. */
function fieldMatches(rec, field) {
  return rec.fieldStrength === field
      || rec.fieldStrength === 'any'
      || rec.fieldStrength === '1.5T+3.0T';
}

function groupOf(techniqueId) {
  const t = _D.TECHNIQUES[techniqueId];
  if (!t) throw new TypeError(`unknown technique "${techniqueId}"`);
  return t.group;
}

function isPoolable(groupId) {
  const g = _D.TECHNIQUE_GROUPS[groupId];
  return !!(g && g.poolable === true);
}

function round(n, dp) {
  const f = Math.pow(10, dp === undefined ? 4 : dp);
  return Math.round(n * f) / f;
}

/* ------------------------------------------------------------ Technique gate
   THE RULE THAT MAKES CROSS-TECHNIQUE POOLING IMPOSSIBLE BY CONSTRUCTION.

   A parameter whose pool spans more than one technique group cannot be queried
   without saying which group you mean. This is not a convenience check that a
   caller may skip — it throws, because the alternative is a staging error. A
   MOLLI threshold applied to a StarMap value is not a rounding difference:
   MOLLI systematically under-reads T1 (SCHEMA 4.1).

   Where the pool has exactly one group the answer is unambiguous and the
   technique argument is optional, resolved with a `technique-inferred` flag. */

/* CUTOFF parameter -> the `parameter` key TECHNIQUE_GROUPS uses. Three cut-off
   parameters (lic, r2star, t2star) share one technique domain because they are
   three ways of reporting the same acquisition; t1 and ct1 share one because
   cT1 is a post-processing of a native T1 map. */
const TECHNIQUE_DOMAIN = {
  pdff: 'pdff', lic: 'iron', r2star: 'iron', t2star: 'iron',
  mre: 'mre', adc: 'adc', t1: 't1', ct1: 't1'
};

function resolveTechniqueGroup(parameter, technique) {
  const domain = TECHNIQUE_DOMAIN[parameter];
  if (!domain) throw new TypeError(`no technique domain for parameter "${parameter}"`);

  /* The gate is decided by the VOCABULARY, not by what happens to be in the
     pool. If only MOLLI T1 cut-offs have been transcribed, inferring MOLLI for
     a caller who scanned StarMap would be exactly the staging error SCHEMA 4.1
     forbids — the absence of StarMap cut-offs is a gap to report, not a licence
     to answer with somebody else's sequence. */
  const vocabulary = Object.keys(_D.TECHNIQUE_GROUPS)
    .filter(g => _D.TECHNIQUE_GROUPS[g].parameter === domain);
  const inPool = [...new Set(
    _D.CUTOFFS.filter(c => c.parameter === parameter).map(c => c.techniqueGroup)
  )].filter(Boolean);

  if (technique) {
    const g = groupOf(technique);
    if (!vocabulary.includes(g)) {
      throw new TypeError(
        `technique "${technique}" is in group "${g}", which does not measure ` +
        `"${parameter}" (domain "${domain}": ${vocabulary.join(', ')})`);
    }
    return {group: g, inferred: false, vocabulary, groupsInPool: inPool};
  }

  if (vocabulary.length === 1) {
    return {group: vocabulary[0], inferred: true, vocabulary, groupsInPool: inPool};
  }

  const techniques = Object.keys(_D.TECHNIQUES)
    .filter(t => vocabulary.includes(_D.TECHNIQUES[t].group));
  throw new TypeError(
    `"${parameter}" is measured by ${vocabulary.length} incompatible technique groups ` +
    `(${vocabulary.join(', ')}) — the caller must select one. Pooling or ` +
    `substituting across groups is a staging error, not a rounding error ` +
    `(SCHEMA 4.1). Available techniques: ${techniques.join(', ')}.`
  );
}

/* ---------------------------------------------------------------- Provenance
   The three policies. Guideline is not folded into either vendor policy: it is
   a different epistemic object (a synthesis of the primaries, not another
   primary) and mixing it in would double-count. */

const VENDOR_MODES = {
  'ge-exclusive':       {primary: 'ge-explicit', label: 'GE Exclusive'},
  'other-vendors-only': {primary: 'non-ge',      label: 'Other Vendors Only'}
};

const POLICIES = ['guideline', 'primary-studies'];

/* W-029 — ONE POOL, TWO EPISTEMIC OBJECTS. The pool is no longer split by the
   vendor class the caller selected. Measured before the change: the split
   decides 6 of 32 callable scales and changes no answer that already exists —
   every scale that stages today stages on identical boundary values, the same
   worstRung and the same sourceCount once the filter is gone. What it did cost
   was a UI dimension, an engine dimension, and a competitive promise the five
   non-ge cut-offs (from two references) cannot keep.

   Guideline stays separate, and that separation is NOT a vendor decision: a
   guideline synthesises the same primaries, so pooling the two would
   double-count the evidence (SCHEMA 10.5).

   What used to be `cross-vendor-fallback` is now simply the primary pool. Its
   old "never drawable" rule is gone with the reason for it: it was excluded
   because it crossed the vendor class THE CALLER HAD SELECTED, and no caller
   selects one any more. The pool's contents never changed — only the question. */
function policyClasses(policy) {
  if (policy === 'guideline')       return ['guideline'];
  if (policy === 'primary-studies') return ['ge-explicit', 'non-ge', 'multi-vendor-incl-ge'];
  throw new TypeError(`unknown policy "${policy}" — expected one of ${POLICIES.join(' | ')}`);
}

/* ------------------------------------------------------------- Rung ladder
   Which rung of the evidence ladder a resolved boundary stands on. Returned on
   every boundary so the report can print the provenance honestly. A silent
   fallback is a defect — the brief's words, and they are right. */

const RUNGS = {
  1: 'guideline value',
  2: 'unweighted mean of >=2 eligible studies',
  3: 'single eligible study',
  4: 'multi-vendor sources only — contributing vendors not separable',
  /* W-029 — rung 5 is reachable from resolveCalibration ONLY, and it is still
     true there: a calibration slope IS selected by vendor class, because the
     slope is a property of the sequence (CLAUDE.md 1.3, the rejected 3T
     synthesis). No cut-off boundary can carry it any more, and
     v2/tests/logic.test.js J12 sweeps every scale to prove it. */
  5: 'no evidence in the selected vendor class — value comes from the other class'
};

function classifyRung(pool, policy) {
  if (policy === 'guideline') return {rung: 1, flags: []};

  const flags = [];
  const classes = new Set(pool.map(c => c.vendorClass));

  /* Rung 4 — every contributing source is a multi-vendor series, so no single
     manufacturer's contribution can be separated out. Still worth saying, and
     it survives the axis removal unchanged: it is a statement about what the
     study measured, not about who the caller is. */
  if (classes.size === 1 && classes.has('multi-vendor-incl-ge')) {
    return {rung: 4, flags: ['ge-included-not-separable']};
  }
  if (classes.has('multi-vendor-incl-ge')) flags.push('ge-included-not-separable');
  if (pool.length === 1) return {rung: 3, flags: flags.concat('single-source')};
  return {rung: 2, flags};
}

/* --------------------------------------------------------- Boundary resolver
   Everything the pooling rule of SCHEMA 4.2 requires, with ONE deliberate
   relaxation recorded in SCHEMA 10: rule 3 compares ageGroup rather than
   cohort. Enforced as written, rule 3 makes rung 2 unreachable on all 71
   scales in this pool — the four MRE F>=2 values at 1.5T are four etiologies,
   so nothing may ever be pooled with anything. The relaxation pools within a
   age group and NAMES the contributing cohorts on the result, so the widening
   is visible in print rather than hidden in an average.

   Rules kept exactly as written: parameter, boundary, techniqueGroup +
   poolable, fieldStrength, unit, and the techniqueAmbiguous opt-in. */

function resolveBoundary(opts) {
  const {parameter, boundary, fieldStrength, ageGroup, group, policy,
         allowAmbiguousTechnique} = opts;

  /* W-027 — resolveBoundary is exported, so it is an entry point in its own
     right, and it is where the field-strength filter physically lives: an
     unrecognised spelling used to drop every record and return an `absent`
     object indistinguishable from a real gap. `policy` is guarded by
     policyClasses(). W-029 removed the `mode` axis and its guard with it. */
  requireEnum('fieldStrength', fieldStrength, QUERY_FIELD_STRENGTHS);
  requireEnum('ageGroup', ageGroup, QUERY_AGE_GROUPS);

  const classes = policyClasses(policy);
  const flags = [];

  const absent = (reason, excluded) => ({
    boundary, value: null, absent: true, absentReason: reason,
    n: 0, min: null, max: null, unit: null, direction: null,
    rung: null, rungLabel: null, flags: flags.slice(), meanLabel: null,
    cohorts: [], sources: [],
    /* What was there but did not qualify. A gap the caller can act on beats a
       gap the caller cannot explain. */
    excluded: (excluded || []).map(describeSource),
    refused: null
  });

  let pool = _D.CUTOFFS.filter(c =>
    c.parameter === parameter &&
    c.boundary === boundary &&
    ageGroupOf(c.cohort) === ageGroup &&
    c.techniqueGroup === group &&
    classes.includes(c.vendorClass)
  );

  if (!pool.length) {
    /* Distinguish "this provenance class has nothing here" from "nothing exists
       here at all" — the report says very different things about the two. */
    const anyClass = _D.CUTOFFS.filter(c =>
      c.parameter === parameter && c.boundary === boundary &&
      ageGroupOf(c.cohort) === ageGroup && c.techniqueGroup === group);
    return absent(
      anyClass.length
        ? `no ${classes.join(' / ')} record for this boundary; ` +
          `${anyClass.length} record(s) exist in other provenance classes`
        : 'no record for this boundary in any provenance class',
      anyClass);
  }

  /* Field strength, with the sourced field-independence escape hatch. */
  const fi = FIELD_INDEPENDENT_GROUPS[group];
  const direct = pool.filter(c => fieldMatches(c, fieldStrength));
  if (direct.length) {
    pool = direct;
  } else if (fi) {
    flags.push('field-independent-by-group');
  } else {
    return absent(
      `records exist but none at ${fieldStrength}, and technique group ` +
      `"${group}" is not declared field-independent`, pool);
  }

  if (!allowAmbiguousTechnique) {
    const dropped = pool.filter(c => c.techniqueAmbiguous === true);
    if (dropped.length) flags.push('ambiguous-technique-records-excluded');
    pool = pool.filter(c => c.techniqueAmbiguous !== true);
    if (!pool.length) {
      /* THE CASE THAT MUST NEVER BE SILENT. All four native-T1 cut-offs carry
         techniqueAmbiguous (REF-018: the workbook records MOLLI, the published
         method is usually cited as shMOLLI), so rule 7 empties this boundary by
         default. The caller has to be told that a value EXISTS and why it was
         withheld, and that allowAmbiguousTechnique opts in. */
      return absent(
        `${dropped.length} record(s) exist but carry techniqueAmbiguous; SCHEMA 4.2 ` +
        `rule 7 excludes them unless the caller passes allowAmbiguousTechnique`,
        dropped);
    }
  }

  /* Rule 6 — unit equality. No implicit conversion, ever. A pool that spans
     units is a data defect, not something to reconcile arithmetically. */
  const units = [...new Set(pool.map(c => c.unit))];
  if (units.length > 1) {
    return {
      boundary, value: null, n: pool.length, min: null, max: null,
      rung: null, rungLabel: null,
      flags: flags.concat('unit-conflict'),
      refused: `pool spans units ${units.join(', ')} — no implicit conversion`,
      sources: pool.map(describeSource), cohorts: cohortsOf(pool),
      unit: null, meanLabel: null
    };
  }

  const {rung, flags: rungFlags} = classifyRung(pool, policy);
  const values = pool.map(c => c.value);
  const all = flags.concat(rungFlags);

  /* Rule 4 — pooling requires a poolable technique group. Two eligible values
     in a non-poolable group are NOT averaged; both are returned and the caller
     is told why there is no single number. ADC and IVIM live here by design:
     SCHEMA 4.1 marks them non-poolable as a conservative default so the engine
     is forced back to exact matching instead of quietly averaging b-value-
     dependent numbers. */
  if (pool.length > 1 && !isPoolable(group)) {
    return {
      boundary, value: null, n: pool.length,
      min: Math.min(...values), max: Math.max(...values),
      rung, rungLabel: RUNGS[rung],
      flags: all.concat('technique-group-not-poolable'),
      refused: `technique group "${group}" is not poolable — ` +
               (_D.TECHNIQUE_GROUPS[group] || {}).rationale,
      sources: pool.map(describeSource), cohorts: cohortsOf(pool),
      unit: units[0], meanLabel: null
    };
  }

  const mean = values.reduce((a, b) => a + b, 0) / values.length;

  return {
    boundary,
    value: round(mean),
    n: values.length,
    min: values.length > 1 ? Math.min(...values) : null,
    max: values.length > 1 ? Math.max(...values) : null,
    unit: units[0],
    direction: pool[0].direction,
    rung,
    rungLabel: RUNGS[rung],
    flags: all,
    /* Printed verbatim by the report. Never "pooled estimate". */
    meanLabel: values.length > 1
      ? `unweighted mean of ${values.length} sources`
      : 'single published value',
    evidenceGrades: [...new Set(pool.map(c => c.evidenceGrade))].sort(),
    vendorClasses: [...new Set(pool.map(c => c.vendorClass))].sort(),
    techniques: [...new Set(pool.map(c => c.technique))].sort(),
    cohorts: cohortsOf(pool),
    sources: pool.map(describeSource),
    refused: null
  };
}

function cohortsOf(pool) {
  return [...new Set(pool.map(c => c.cohort))].sort();
}

function describeSource(c) {
  return {
    cutoffId: c.id,
    value: c.value,
    valueRaw: c.valueRaw,
    cohort: c.cohort,
    vendorClass: c.vendorClass,
    technique: c.technique,
    evidenceGrade: c.evidenceGrade,
    /* SCHEMA 5.6 / rule R-14: a boundary-row figure must never be printed next
       to a single value as though it were that value's own performance. The
       scope travels with the numbers so the report cannot lose it. */
    performanceScope: c.performanceScope,
    sensitivity: c.sensitivity,
    specificity: c.specificity,
    auc: c.auc,
    /* W-038 — a scope-of-use caveat is provenance, so it rides with the record
       exactly as performanceScope does. The engine never READS it: what it says
       is about how a reader may use the number, which is a presentation fact and
       never a pooling one. Null rather than undefined, so a caller can tell the
       absence of a caveat from a field this function forgot to copy. */
    useCaveat: c.useCaveat || null,
    refs: c.sourceRefIds.map(id => {
      const r = _REF_BY_ID.get(id);
      return r ? {id, refNum: r.refNum, citation: r.citation, pmid: r.pmid,
                  vendorClass: r.vendorClass} : {id, unresolved: true};
    }),
    sheet: c.source
  };
}

/* ------------------------------------------------------------------- Scales */

function buildScale(opts) {
  const ladder = LADDERS[opts.parameter];
  if (!ladder) throw new TypeError(`no ladder defined for parameter "${opts.parameter}"`);

  const boundaries = ladder.map(b => resolveBoundary({...opts, boundary: b}));
  const usable = boundaries.filter(r => r.value !== null);
  const unusable = boundaries.filter(r => r.value === null);

  return {
    policy: opts.policy,
    vendorClasses: policyClasses(opts.policy),
    /* A ladder is drawable only when EVERY rung resolved to a number. A
       three-quarters ladder cannot stage anything: the missing rung is exactly
       where a patient's value might have fallen. */
    complete: unusable.length === 0,
    missingBoundaries: unusable.map(r => r.boundary),
    /* Why each rung is missing, one line per rung, so the report can say
       "no guideline value published for F>=1" instead of showing a broken bar. */
    missingReasons: unusable.map(r => ({
      boundary: r.boundary,
      reason: r.absentReason || r.refused,
      recoverableWith: (r.flags || []).includes('ambiguous-technique-records-excluded')
        ? 'allowAmbiguousTechnique' : null,
      excluded: (r.excluded || []).map(e => e.cutoffId)
    })),
    boundaries,
    /* Highest rung used anywhere on the ladder — a ladder is only as
       well-sourced as its weakest step. */
    worstRung: usable.length ? Math.max(...usable.map(r => r.rung || 0)) : null,
    flags: [...new Set(boundaries.flatMap(r => r.flags || []))],
    cohorts: [...new Set(usable.flatMap(r => r.cohorts))].sort(),
    sourceCount: usable.reduce((a, r) => a + (r.n || 0), 0)
  };
}

/* --------------------------------------------------------------- buildScales
   THE MAIN ENTRY POINT.

     parameter      'pdff' | 'mre' | 'lic' | 'r2star' | 't2star' | 't1' |
                    'ct1' | 'adc'
     fieldStrength  '1.5T' | '3.0T'
     ageGroup       'adult' | 'peds'
     vendorMode     'ge-exclusive' | 'other-vendors-only'
     technique      optional technique id; REQUIRED where the parameter spans
                    more than one technique group */

function buildScales(sel) {
  const {parameter, fieldStrength, ageGroup, technique,
         allowAmbiguousTechnique = false} = sel || {};

  /* W-029 — a caller written against the pre-W-029 engine passed a vendorMode
     and got a FILTERED pool back. Accepting the key and ignoring it would hand
     that caller a different clinical answer under an unchanged call, silently.
     This is W-027's rule applied to an axis that was removed rather than
     misspelled: refuse, and say where the axis went. */
  if (sel && 'vendorMode' in sel) {
    throw new TypeError(
      `vendorMode is no longer an axis of buildScales — cut-off ladders pool ` +
      `across vendor classes (SCHEMA 3.2). It remains an argument of ` +
      `resolveCalibration, where the slope is a property of the sequence.`);
  }

  /* W-027 — one rule for every axis: an unrecognised value throws, naming what
     it got and what it accepts. `fieldStrength` was the hole; `ageGroup` was
     already guarded and is restated through requireEnum so both read alike.
     `parameter` and `technique` are guarded immediately below, by
     resolveTechniqueGroup and groupOf. */
  requireEnum('fieldStrength', fieldStrength, QUERY_FIELD_STRENGTHS);
  requireEnum('ageGroup', ageGroup, QUERY_AGE_GROUPS);

  const tg = resolveTechniqueGroup(parameter, technique);
  const base = {parameter, fieldStrength, ageGroup, group: tg.group,
                allowAmbiguousTechnique};

  const scales = {};
  for (const policy of POLICIES) {
    scales[policy] = buildScale({...base, policy});
  }

  /* --- Which scale decides the stage -------------------------------------
     Guideline first, unconditionally, wherever a COMPLETE guideline ladder
     exists — the brief's hard constraint, and the scientifically defensible
     choice: guidelines are synthesised from wider series and are stated for
     the modality rather than for a scanner (SCHEMA 3.3).

     Where no complete guideline ladder exists — PDFF, ADC, T1 and every
     paediatric ladder — the stage falls to the completest vendor scale.
     vendor-primary is tried before vendor-mixed so the purest available
     provenance wins; PDFF is why the fallback is needed at all, since its
     GE-explicit ladder is 2/3 and only the mixed ladder closes it. */
  let staging = null, stagingReason = '';
  if (scales.guideline.complete) {
    staging = 'guideline';
    stagingReason = 'complete guideline ladder available; the published primary ' +
                    'studies are shown alongside as a second opinion and do not ' +
                    'move the stage';
  } else if (scales['primary-studies'].complete) {
    staging = 'primary-studies';
    stagingReason = 'no complete guideline ladder for this parameter; staged on the ' +
                    'pooled ladder of published primary studies, badged rung by rung';
  } else {
    stagingReason = 'no complete ladder from either provenance policy — this parameter ' +
                    'cannot be staged from the available evidence';
  }

  const gaps = [];
  for (const [policy, s] of Object.entries(scales)) {
    if (!s.complete) {
      gaps.push({policy, vendorClasses: s.vendorClasses,
                 missing: s.missingBoundaries, reasons: s.missingReasons});
    }
  }

  return {
    parameter, fieldStrength, ageGroup,
    technique: technique || null,
    techniqueGroup: tg.group,
    techniqueInferred: tg.inferred,
    techniquePoolable: isPoolable(tg.group),
    scales,
    /* What a report may actually draw: one bar per complete ladder. Both
       policies qualify now. The old `lastResort` field is gone with the axis
       that produced it — a pool that crossed the caller's selected vendor class
       was evidence to disclose rather than a scale to plot, and no caller
       selects a vendor class any more (W-029). */
    drawable: POLICIES.filter(p => scales[p].complete),
    staging,
    stagingScale: staging ? scales[staging] : null,
    stagingReason,
    gaps,
    provenanceStamp: {
      thresholds: V2_THRESHOLDS_VERSION,
      cutoffs: _D.CUTOFFS_VERSION, cutoffsHash: _D.CUTOFFS_HASH,
      calibrations: _D.CALIBRATIONS_VERSION, calibrationsHash: _D.CALIBRATIONS_HASH
    }
  };
}

/* ------------------------------------------------------------------- Staging
   Pure arithmetic over a resolved scale. Returns which band a measured value
   falls in. Band NAMES are presentation and stay in W-007; what comes back is
   the index and the boundaries that bracket it. */

function stage(value, scale) {
  if (value === null || value === undefined || isNaN(value)) return null;
  if (!scale || !scale.boundaries) return null;
  /* Staging on an incomplete ladder is refused, not approximated: the missing
     rung is exactly where the value might have fallen. */
  if (!scale.complete) {
    return {refused: 'ladder incomplete — cannot stage',
            missing: scale.missingBoundaries, policy: scale.policy};
  }
  const usable = scale.boundaries.filter(b => b.value !== null);
  if (!usable.length) return null;

  const dir = usable[0].direction;
  let idx = 0;
  for (const b of usable) {
    const crossed = dir === 'above-is-worse' ? value >= b.value : value <= b.value;
    if (crossed) idx++; else break;
  }
  return {
    index: idx,
    below: idx > 0 ? usable[idx - 1] : null,
    above: idx < usable.length ? usable[idx] : null,
    direction: dir,
    policy: scale.policy,
    worstRung: scale.worstRung
  };
}

/* ------------------------------------------------------- Calibration resolver
   R2* and T2* to LIC. These slopes are genuinely sequence- and method-dependent,
   and V1 keeps them in js/app.js OUTSIDE its own hash lock — the defect
   v2/data/calibrations.data.js closes.

   The preference order mirrors the boundary resolver: the caller's own vendor
   class first, then multi-vendor, then whatever exists with an explicit flag.
   Nothing is ever synthesised. In particular the 3.0T Other path returns the
   GE-derived Serai/Reeder slope on rung 5 rather than scaling the 1.5T
   multi-vendor slope by the 1.86 field ratio, because that ratio is an
   observation about two published numbers, not a conversion rule. */

function resolveCalibration(sel) {
  const {fieldStrength, vendorMode, inputQuantity, technique} = sel || {};
  /* W-027 — an unrecognised field strength used to come back as
     `refused: "no iron-r2star calibration over r2star published at 3T"`, which
     reads as a statement about the published literature when it is a statement
     about the call. Naming the bad value in a refusal string is not the same as
     refusing the call. */
  requireEnum('fieldStrength', fieldStrength, QUERY_FIELD_STRENGTHS);
  requireEnum('vendorMode', vendorMode, Object.keys(VENDOR_MODES));
  /* inputQuantity IS THE LOAD-BEARING ARGUMENT, not an optional refinement.
     techniqueGroup alone is not enough to pick a calibration: CAL-0001 and
     CAL-0003 are both `iron-r2star` — R2* = 1000/T2*, so they are the same
     MEASUREMENT — but one is a slope over R2* in Hz and the other a power law
     over T2* in ms. Selecting by group and then feeding R2* = 276 Hz into the
     T2* power law yields LIC 0.107 instead of 7.01: a two-orders-of-magnitude
     error that looks like a number. Requiring the caller to name what they
     measured makes that substitution impossible by construction. */
  if (inputQuantity !== 'r2star' && inputQuantity !== 't2star') {
    throw new TypeError(
      `inputQuantity must be 'r2star' or 't2star' — the quantity actually ` +
      `measured. A T2* power law and an R2* slope share a technique group but ` +
      `take different inputs in different units; guessing between them is a ` +
      `two-orders-of-magnitude error, not a rounding error.`);
  }
  const group = technique ? groupOf(technique) : 'iron-r2star';
  const primary = VENDOR_MODES[vendorMode].primary;

  let pool = _D.CALIBRATIONS.filter(c =>
    c.parameter === 'lic' &&
    c.techniqueGroup === group &&
    c.inputQuantity === inputQuantity &&
    fieldMatches(c, fieldStrength) &&
    (c.kind === 'linear-slope' || c.kind === 'power-law'));

  if (technique) pool = pool.filter(c => c.technique === technique);

  if (!pool.length) {
    return {calibration: null, kind: null, expression: null, coefficients: null,
            rung: null, rungLabel: null, flags: ['no-calibration-published'],
            alternatives: [],
            refused: `no ${group} calibration over ${inputQuantity} published at ` +
                     `${fieldStrength}` + (technique ? ` for technique ${technique}` : '')};
  }

  const pick = (fn) => pool.find(fn);
  let chosen = null, rung = null, flags = [];

  const own = pick(c => c.vendorClass === primary
                     || (c.derivation && c.derivation.vendorClass === primary));
  const multi = pick(c => c.vendorClass === 'multi-vendor-incl-ge');
  const geDerived = pick(c => c.vendorClass === 'ge-explicit'
                     || (c.derivation && c.derivation.vendorClass === 'ge-explicit'));

  if (own) {
    chosen = own;
    rung = own.vendorClass === 'guideline' ? 1 : 2;
    if (own.derivation && own.derivation.vendorClass === 'ge-explicit'
        && vendorMode === 'ge-exclusive') {
      flags.push('guideline-derived-from-ge');
    }
  } else if (multi) {
    chosen = multi; rung = 4; flags.push('ge-included-not-separable');
  } else if (geDerived) {
    chosen = geDerived; rung = 5; flags.push('no-vendor-neutral-evidence');
    if (geDerived.derivation) flags.push('guideline-derived-from-ge');
  } else {
    /* Nothing in the selected class, nothing multi-vendor, nothing GE-derived —
       so the only published calibration belongs to the OTHER class. In
       ge-exclusive mode this is the Garbowski T2* power law: a real, sourced,
       usable calibration that simply is not GE evidence. Say that, rather than
       calling it unclassified. */
    chosen = pool[0];
    rung = 5;
    flags.push(vendorMode === 'ge-exclusive' ? 'no-ge-evidence' : 'no-vendor-neutral-evidence');
    flags.push(`value-from-${chosen.vendorClass}`);
  }

  const alternatives = pool.filter(c => c !== chosen).map(c => ({
    id: c.id, expression: c.expression, vendorClass: c.vendorClass,
    kind: c.kind, refs: c.sourceRefIds
  }));

  return {
    calibration: chosen,
    kind: chosen.kind,
    expression: chosen.expression,
    coefficients: chosen.coefficients,
    rung, rungLabel: RUNGS[rung], flags,
    /* Present so the report can say "a second calibration exists and differs
       by X%" instead of implying the chosen one is the only one. */
    alternatives,
    refused: null
  };
}

/* Which quantity a technique actually produces, READ OUT OF THE CALIBRATION
   RECORDS rather than hard-coded here: CAL-0001/2/4 are slopes over R2* for
   iron-r2star-gre, CAL-0003 is a power law over T2* for iron-t2star-gre. A
   technique with no published calibration returns null and the caller reports a
   gap — it must not guess, because feeding R2* into a T2* power law is the
   two-orders-of-magnitude error resolveCalibration already refuses to make. */
function calibrationInputQuantity(technique) {
  const found = new Set(_D.CALIBRATIONS
    .filter(c => c.technique === technique && c.inputQuantity)
    .map(c => c.inputQuantity));
  if (found.size > 1) {
    throw new TypeError(`technique "${technique}" has calibrations over more than one ` +
                        `input quantity: ${[...found].sort().join(', ')}`);
  }
  return found.size === 1 ? [...found][0] : null;
}

/* W-031 — why the literature is thin where a calibration is missing.
   `calibrationInputQuantity()` returning null says only that this repository
   carries no calibration for the sequence. That is true and unhelpful: the
   reader cannot tell an oversight from a considered absence. REF-038 (Reeder
   2023, the ESGAR/SAR consensus, PMID 36809220) ranks the three iron methods
   explicitly, so the absence can be explained in the panel's own words.

   ⛔ QUOTED, NOT SUMMARISED, and quoted from the full text at PMC10068892 —
      the consensus recommendation lists, not the abstract. Every sentence
      below appears verbatim there, minus the "(level of evidence)" tags and
      the vote counts, which are carried separately in `endorsement`. The
      three methods differ in ways a paraphrase flattens: R2 lacks 3 T
      validation while SIR has it at moderate evidence, and SIR lacks the
      regulatory approval R2 has. Getting that backwards would misdescribe a
      guideline, which § 1.3 treats as the same class of error as inventing a
      number.

   This is PROSE ABOUT A GAP, never a substitute for one. It supplies no slope,
   no coefficient and no boundary; the refusal it accompanies still refuses.

   Keyed by technique GROUP, not by technique id: the panel ranks METHODS
   (R2*, R2, SIR), and every sequence in a group inherits its method's ranking.
   Keying by id would silently drop a sibling sequence added later. */
const IRON_METHOD_RANKING = {
  'iron-r2star': {
    rank: 'first-line',
    quote: 'On the basis of lower cost, shorter acquisition time, test performance ' +
           'metrics, and validation data, R2*-based relaxometry is recommended as the ' +
           'first-line method for liver iron quantification.',
    validation: 'Well validated at both 1.5 T and 3 T, with widespread regulatory ' +
                'approval for R2* quantification.',
    endorsement: '18 panelists agreed, 0 disagreed'
  },
  'iron-r2-spin-echo': {
    rank: 'standard of care where R2* is unavailable',
    quote: 'On the basis of cost and acquisition time, R2-based relaxometry should be ' +
           'considered as standard of care if R2*-based relaxometry is not available.',
    validation: 'Well validated at 1.5 T but NOT at 3 T. Has widespread regulatory ' +
                'approval for LIC quantification.',
    endorsement: '18 panelists agreed, 0 disagreed'
  },
  'iron-sir': {
    rank: 'second-line',
    quote: 'SIR should be considered as a second-line alternative to R2*- or R2-based ' +
           'relaxometry methods.',
    validation: 'Well validated at 1.5 T and, at moderate evidence, at 3 T, but it does ' +
                'NOT have regulatory approval for this purpose, and the original method ' +
                'is not well suited above approximately 19.5 mg/g LIC.',
    endorsement: '18 panelists agreed, 0 disagreed'
  }
};

/* The reason a technique has no calibration here, where a guideline gives one.
   Returns null for a technique the consensus does not rank — an unranked
   sequence gets the bare refusal rather than a reason invented for it. */
function methodRankingReason(technique) {
  const t = _D.TECHNIQUES[technique];
  const r = t && IRON_METHOD_RANKING[t.group];
  if (!r) return null;
  return {
    refId: 'REF-038',
    source: 'ESGAR/SAR consensus (Reeder 2023, PMID 36809220), consensus ' +
            'recommendations, full text PMC10068892',
    rank: r.rank,
    quote: r.quote,
    validation: r.validation,
    endorsement: r.endorsement
  };
}

/* Evaluate a resolved calibration. Dispatched on `kind` so a power law can
   never be evaluated as a slope. */
function applyCalibration(resolved, inputValue) {
  if (!resolved || !resolved.calibration) return null;
  if (inputValue === null || inputValue === undefined || isNaN(inputValue)) return null;
  const c = resolved.calibration;
  if (c.kind === 'linear-slope') return round(c.coefficients.slope * inputValue, 3);
  if (c.kind === 'power-law')    return round(c.coefficients.a * Math.pow(inputValue, c.coefficients.b), 3);
  return null;
}

/* --------------------------------------------------------------- buildModels
   The signature the brief named, kept as a thin compatibility wrapper so a
   caller can ask for a whole report's worth of scales in one call. It adds no
   logic of its own — every number comes from buildScales. */

/* The V1-era spellings this wrapper answers to. They are ALIASES for the two
   canonical mode ids, not a coercion: before W-027 the vendorPath line ended in
   a bare `else`, so buildModels('3T', 'banana', 'Sony') came back reporting
   ageGroup 'adult' and vendorMode 'other-vendors-only' — two clinical axes the
   caller never chose, on a call where all three arguments were wrong. */
const VENDOR_PATH_ALIASES = {GE: 'ge-exclusive', Other: 'other-vendors-only'};

function buildModels(fieldStrength, cohort, vendorPath, techniqueSelection) {
  /* Validated HERE, before the per-parameter loop. The try/catch below turns a
     throw into a per-parameter error string — a deliberate design, because a
     technique gate IS a result — so a guard placed inside it would be swallowed
     eight times over and the wrapper would still return a usable-looking model. */
  requireEnum('fieldStrength', fieldStrength, QUERY_FIELD_STRENGTHS);
  const ageGroup = ageGroupOf(cohort);
  const calibrationMode = VENDOR_MODES[vendorPath]
    ? vendorPath : VENDOR_PATH_ALIASES[vendorPath];
  if (!calibrationMode) {
    requireEnum('vendorPath', vendorPath,
                Object.keys(VENDOR_MODES).concat(Object.keys(VENDOR_PATH_ALIASES)));
  }
  const tech = techniqueSelection || {};

  /* W-029 — vendorPath is KEPT and still validated, but it now names only the
     CALIBRATION axis. Dropping the parameter would silently shift
     techniqueSelection into its position, which is the class of defect W-027
     closed. That it no longer changes a cut-off is not a claim of this comment:
     v2/tests/logic.test.js J14 asserts GE and Other return deep-equal models. */
  const out = {fieldStrength, ageGroup, calibrationMode, parameters: {}, errors: {}};
  for (const parameter of Object.keys(LADDERS)) {
    try {
      out.parameters[parameter] = buildScales({
        parameter, fieldStrength, ageGroup,
        technique: tech[parameter] || null
      });
    } catch (e) {
      /* A thrown technique gate is a RESULT, not a crash: it means the caller
         must choose a sequence before this parameter can be answered. */
      out.errors[parameter] = e.message;
    }
  }
  return out;
}

/* ---------------------------------------------------------------- Exports */

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    V2_THRESHOLDS_VERSION,
    buildScales, buildModels, stage,
    resolveCalibration, applyCalibration, calibrationInputQuantity,
    methodRankingReason, IRON_METHOD_RANKING,
    resolveBoundary, buildScale, resolveTechniqueGroup,
    LADDERS, RUNGS, POLICIES, VENDOR_MODES, FIELD_INDEPENDENT_GROUPS,
    /* Exported so the entry layer's closed lists can be tested against the
       engine's own vocabularies instead of merely resembling them (W-027). */
    QUERY_FIELD_STRENGTHS, QUERY_AGE_GROUPS, VENDOR_PATH_ALIASES, requireEnum,
    ageGroupOf, fieldMatches, isPoolable, policyClasses, classifyRung
  };
}
