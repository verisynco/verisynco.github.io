/* VeriLiv V2 — REPORT MODEL  (W-006)
 * ---------------------------------------------------------------------------
 * One row per quantification parameter, combining three pure sources: the
 * threshold engine (what can be drawn and what stages), the scope resolver (what
 * is rendered and where), and the selection state (what the user chose).
 *
 * ⛔ THIS MODULE MAKES NO DECISIONS THE ENGINE ALREADY MADE. It copies
 *    `drawable`, `staging`, `lastResort` and `gaps` across; it never re-derives
 *    them and never branches on a policy name. `if (policy === 'guideline')` here
 *    would be the same defect W-013 forbade as `if (tier === 'research')`.
 *
 * ⛔ A thrown technique gate is a RESULT, not a crash: it means the caller must
 *    choose a sequence before this parameter can be answered, and the report
 *    prints that sentence.
 * ---------------------------------------------------------------------------
 */

const V2_REPORT_VERSION = '3.11';  /* W-081: `buildIvim()` — a standalone research-layer builder for IVIM D, D-star and f, NOT in REPORT_PARAMETERS; reads the transcribed RNG-006..011 ranges (REFERENCE_RANGES added to the `_R` bridge, first engine reader) and stages nothing (CLAUDE.md § 1.3). D is display-only (R-30 forbids a central±sd band); D-star and f carry a bare within/outside-interval membership. `buildImpression().clinical` gains `ivimCrossRead` — one factual sentence, ADC-abnormal-gated, no synthesis; `text`/`facts`/`keyFindings` untouched (logic.test.js P7/P9). New consts IVIM_PARAMS/LABELS/UNITS/TREND_NOTE + helper ivimCaveatOf(). No `v2/data/` file opened, no hash moved. W-122: new `PARAMETER_STEPS` catalog — the arrow-key step for each parameter's entry box, derived from the finest decimal place of that parameter's CUTOFFS values (render.js valueAreaHtml is the only reader; render.test.js N55 locks the derivation). No clinical value, band, threshold or hash moved. W-098: new `buildConsiderations()` + `CONSIDERATIONS` data type; `buildImpression().clinical` gains `summary` (published composite verdicts, fired diagnostic considerations quoted verbatim with the source's own strength label, coverage + evidence-floor verb). `buildImpression` now takes `composite`; app.js buildModel computes it first. `text` / `facts` unchanged (logic.test.js P7/P9). No hash moved — RESOLVED_HASH covers buildScales boundaries only, not the impression. W-112: `buildImpression().clinical` gains `history`, `keyFindings`, `otherFindings`, `normalSummary` — a priority split (the four `severityClass` ranks) the renderer composes into two labelled groups with the history sentence last. `text` and `facts` are unchanged (logic.test.js P7/P9 hold), no clinical value / band / hash moved. [W-063b: the `rendered` performed-gate is keyed by purpose GROUP (domains.js groupOf), not by parameter. W-063: rendered rule gains a performed/value gate, the notAssessed sentence changed, and a BMI derivation rule was added. W-072 also claimed 3.5 for the impression rewrite (opens with entered history, states each banded finding's own fired-modifier meaning) — two branches claiming one number; resolved at the merge to 3.6.] */

const _R = (typeof module !== 'undefined' && module.exports)
  ? (function () {
      const path = require('path');
      const t = require(path.join(__dirname, 'thresholds.js'));
      const s = require(path.join(__dirname, 'scope.js'));
      const d = require(path.join(__dirname, 'domains.js'));
      const sel = require(path.join(__dirname, 'selection.js'));
      const tech = require(path.join(__dirname, '..', 'data', 'techniques.data.js'));
      const z = require(path.join(__dirname, 'zones.js'));
      return {buildZones: z.buildZones, zoneForIndex: z.zoneForIndex,
              buildScales: t.buildScales, stage: t.stage,
              resolveCalibration: t.resolveCalibration, applyCalibration: t.applyCalibration,
              calibrationInputQuantity: t.calibrationInputQuantity,
              methodRankingReason: t.methodRankingReason,
              resolveScope: s.resolveScope, isRenderedAtScope: s.isRenderedAtScope,
              DOMAIN_OF: d.DOMAIN_OF, CONTROLLED_UNITS: d.CONTROLLED_UNITS,
              purposeGroupOf: d.purposeGroupOf,
              GE_IRON_PRODUCTS: d.GE_IRON_PRODUCTS,
              PATHS: sel.PATHS, TECHNIQUES: tech.TECHNIQUES,
              CUTOFFS: require(path.join(__dirname, '..', 'data', 'cutoffs.data.js')).CUTOFFS,
              REFERENCE_RANGES: require(path.join(__dirname, '..', 'data', 'ranges.data.js')).REFERENCE_RANGES,
              REFERENCES: require(path.join(__dirname, '..', 'data', 'references.data.js')).REFERENCES,
              CALIBRATIONS: require(path.join(__dirname, '..', 'data', 'calibrations.data.js')).CALIBRATIONS,
              INTERACTIONS: require(path.join(__dirname, '..', 'data', 'interactions.data.js')).INTERACTIONS,
              TRIGGERS: require(path.join(__dirname, '..', 'data', 'triggers.data.js')).TRIGGERS,
              CONSIDERATIONS: require(path.join(__dirname, '..', 'data', 'considerations.data.js')).CONSIDERATIONS,
              applyReliability: require(path.join(__dirname, 'reliability.js')).applyReliability};
    })()
  : {buildZones: buildZones, zoneForIndex: zoneForIndex,
     buildScales: buildScales, stage: stage,
     resolveCalibration: resolveCalibration, applyCalibration: applyCalibration,
     calibrationInputQuantity: calibrationInputQuantity,
     methodRankingReason: methodRankingReason,
     resolveScope: resolveScope, isRenderedAtScope: isRenderedAtScope,
     DOMAIN_OF: DOMAIN_OF, CONTROLLED_UNITS: CONTROLLED_UNITS,
     purposeGroupOf: purposeGroupOf,
     GE_IRON_PRODUCTS: GE_IRON_PRODUCTS,
     PATHS: PATHS, TECHNIQUES: TECHNIQUES,
     CUTOFFS: CUTOFFS, REFERENCE_RANGES: REFERENCE_RANGES, REFERENCES: REFERENCES,
     CALIBRATIONS: CALIBRATIONS,
     INTERACTIONS: INTERACTIONS, TRIGGERS: TRIGGERS, CONSIDERATIONS: CONSIDERATIONS,
     applyReliability: applyReliability};

/* Presentation strings for the eight parameters. They live HERE rather than in
   app.js because they are content, not DOM: the coverage strip and the cards are
   pure objects, and a renderer that had to supply its own names could disagree
   with the model about what a row is called. */
const PARAMETER_LABELS = {
  pdff: 'PDFF — steatosis', mre: 'MRE stiffness — fibrosis',
  lic: 'LIC — iron concentration', r2star: 'R2* — iron',
  t2star: 'T2* — iron', t1: 'Native T1', ct1: 'cT1 (iron-corrected)',
  adc: 'ADC — diffusion'
};
const PARAMETER_UNITS = {
  pdff: '%', mre: 'kPa', lic: 'mg Fe/g dw', r2star: 'Hz',
  t2star: 'ms', t1: 'ms', ct1: 'ms', adc: '×10⁻³ mm²/s'
};

/* ─────────────────────────────────────────────────────────── IVIM (W-081)
   IVIM D, D* and f are carried by buildIvim() below — a STANDALONE builder,
   NOT REPORT_PARAMETERS. They have no LADDERS entry (see the REPORT_PARAMETERS
   comment) and entry.test.js A3 locks the GROUP_PARAMETERS partition, so they
   follow the buildComposite()/buildConsiderations() pattern: a pure function
   assembled into the model by app.js buildModel. Nothing here stages: there is
   no published liver-IVIM cut-off and none is manufactured (CLAUDE.md § 1.3). */
const IVIM_PARAMS = ['ivim-d', 'ivim-dstar', 'ivim-f'];
const IVIM_LABELS = {
  'ivim-d': 'IVIM — true diffusion (D)',
  'ivim-dstar': 'IVIM — pseudo-diffusion (D*)',
  'ivim-f': 'IVIM — perfusion fraction (f)'
};
const IVIM_UNITS = {
  'ivim-d': '×10⁻³ mm²/s', 'ivim-dstar': '×10⁻³ mm²/s', 'ivim-f': '%'
};
/* The one sentence this feature writes rather than transcribes. Diffusion!B16
   (the "↓ f in F≥2" row) was deliberately left un-transcribed as a gap
   (W-023 § 8): it states a direction and no number. This says exactly that and
   no more. Source: Diffusion!B16, REF-028 (Luciani). */
const IVIM_TREND_NOTE = 'A downward trend in the perfusion fraction has been ' +
  'reported in significant fibrosis (Luciani); no diagnostic threshold exists.';

/* Every RNG-006..011 note ends with:  The sheet's own caveat on this parameter: "…". */
function ivimCaveatOf(note) {
  const m = /The sheet's own caveat on this parameter: "([^"]+)"/.exec(note || '');
  return m ? m[1] : null;
}

function ivimRange(parameter, fieldStrength) {
  const list = _R.REFERENCE_RANGES || [];
  for (const r of list) {
    if (r.parameter === parameter && r.fieldStrength === fieldStrength) return r;
  }
  return null;
}

function ivimNumber(selection, parameter) {
  const v = (selection && selection.values || {})[parameter];
  if (typeof v === 'number' && isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && isFinite(Number(v))) return Number(v);
  return null;
}

/* Pure. Reads the patient's typed IVIM values and the transcribed reference
   ranges; produces the model the page-2 research section and the page-1
   cross-read consume. Never stages, never derives a number, never materialises
   central±sd as a band (R-30). Returned d/dstar/f are null unless that
   parameter has a typed value. */
function buildIvim(selection) {
  const fs = (selection && selection.fieldStrength) || null;
  const path = selection && _R.PATHS[selection.path];
  const scope = path ? _R.resolveScope(path.vendor, 'ivim') : null;

  const dVal = ivimNumber(selection, 'ivim-d');
  const dsVal = ivimNumber(selection, 'ivim-dstar');
  const fVal = ivimNumber(selection, 'ivim-f');

  let d = null;
  if (dVal !== null) {
    const rng = ivimRange('ivim-d', fs);
    d = {
      parameter: 'ivim-d', label: IVIM_LABELS['ivim-d'], value: dVal,
      unit: IVIM_UNITS['ivim-d'],
      reference: rng ? rng.valueRaw : null,
      grade: rng ? rng.evidenceGrade : null,
      caveat: rng ? ivimCaveatOf(rng.note) : null,
      band: null
    };
  }

  const interval = (param, val) => {
    if (val === null) return null;
    const rng = ivimRange(param, fs);
    const iv = rng ? [rng.low, rng.high] : null;
    return {
      parameter: param, label: IVIM_LABELS[param], value: val,
      unit: IVIM_UNITS[param],
      interval: iv, grade: rng ? rng.evidenceGrade : null,
      caveat: rng ? ivimCaveatOf(rng.note) : null,
      membership: iv ? (val >= iv[0] && val <= iv[1] ? 'within' : 'outside') : null
    };
  };

  const dstar = interval('ivim-dstar', dsVal);
  const f = interval('ivim-f', fVal);
  if (f) f.trendNote = IVIM_TREND_NOTE;

  const hasAny = !!(d || dstar || f);
  const perf = (selection && selection.performed) || {};
  return {
    hasAny: hasAny,
    /* Whether IVIM reaches the page. IVIM is not a report row, so it is not on
       the scope-tier ladder (there is no UI path to `research` scope anyway);
       it renders when its "Additional measurements" checkbox is on OR a value
       was typed — the W-063 "a measured value always wins" rule. `scope` is
       only kept for SCP-0006's provenance note. */
    rendered: !!(scope && (perf.ivim === true || hasAny)),
    fieldStrength: fs,
    scopeNote: scope ? scope.note : null,
    d: d, dstar: dstar, f: f
  };
}

/* The eight quantification parameters the engine carries ladders for, in the order
   the report prints them. `ivim`, `mast` and `mefib` are not here: they are W-007's
   and W-015's, and neither has a LADDERS entry.

   THE ONE ORDER (W-061). This list is read by three surfaces at once: `entryRoute`
   walks it for Tab (W-046), `orderCards` lists the cards from it, and the
   methodology sheet prints its rows from it. Until 2026-08-25 it was the ENTRY
   order and the page printed a different one, so the keyboard and the paper
   disagreed by construction.

   The order itself is the one the page has always printed: fat, then the two iron
   measurements, then the reading derived from them (W-033), then stiffness,
   relaxometry and diffusion. `CARD_DOMAIN_ORDER` and `groupCardsByDomain` are
   unchanged, and now preserve this order rather than rearranging it. */
const REPORT_PARAMETERS = ['pdff', 'r2star', 't2star', 'lic', 'mre', 't1', 'ct1', 'adc'];

/* W-122. The arrow-key `step` for each parameter's entry box. It is NOT
   hand-picked: it is the finest decimal place that parameter's own published
   cut-off values are printed with, so the up/down arrows can land on every
   threshold the report stages against. Derived from CUTOFFS at load — a cut-off
   that later gains a decimal place tightens the step on its own, and
   render.test.js N55 recomputes this table from the same data to lock it. A
   parameter whose cut-offs are all integers (r2star, t1, ct1) steps by 1. The
   laboratory grid and the clinical-context fields have no cut-off to derive
   from and keep step="any" (render.js valueAreaHtml is the only reader). */
const PARAMETER_STEPS = (function () {
  const out = {};
  for (const param of REPORT_PARAMETERS) {
    let maxDec = 0;
    for (const c of _R.CUTOFFS) {
      if (c.parameter !== param) continue;
      const s = String(c.value);
      const dot = s.indexOf('.');
      const dec = dot === -1 ? 0 : s.length - dot - 1;
      if (dec > maxDec) maxDec = dec;
    }
    out[param] = maxDec === 0 ? '1' : (1 / Math.pow(10, maxDec)).toFixed(maxDec);
  }
  return out;
})();

/* buildScales throws for several different reasons and only two of them are the
   caller being asked to settle a technique. The rest — an unrecognised
   fieldStrength, ageGroup or technique id, or a vendorMode key that no longer
   belongs to this call (W-029) — are programming defects, and telling a
   clinician to "choose a sequence" because of one would describe the wrong
   problem entirely. Matched on the message because the engine throws plain
   TypeErrors and this module does not modify it; if the engine ever tags its
   errors, prefer the tag.

     gate   "mre" is measured by 3 incompatible technique groups (...) — the
            caller must select one
     gate   technique "pdff-mrs" is in group "...", which does not measure "mre"
     defect fieldStrength must be one of "1.5T" | "3.0T" — got "3T". An
            unrecognised fieldStrength is a caller error, not an absence ...
     defect ageGroup must be one of "adult" | "peds" — got "newborn". ...
     defect vendorMode is no longer an axis of buildScales ...
     defect unknown technique "mre-9d-99hz"                                     */
function isTechniqueGate(e) {
  const m = String((e && e.message) || '');
  return m.indexOf('the caller must select one') !== -1 ||
         m.indexOf('does not measure') !== -1;
}

/* W-090. `TECHNIQUE_CONTROL_KEY` maps a PARAMETER to the selection key that
   controls its technique. Before this task every parameter's key was its
   DOMAIN_OF value (three parameters shared 'iron'); now lic/r2star/t2star map
   to THEMSELVES — three independent keys — and everything else is unchanged
   (still resolved through its domain, exactly as before). Building this once
   from DOMAIN_OF, rather than writing five domain entries plus three
   parameter entries by hand, keeps pdff/mre/t1/ct1/adc correct automatically
   if a domain is ever renamed. */
const TECHNIQUE_CONTROL_KEY = Object.assign({}, _R.DOMAIN_OF,
  {lic: 'lic', r2star: 'r2star', t2star: 't2star'});

function techniqueFor(selection, parameter) {
  const key = TECHNIQUE_CONTROL_KEY[parameter];
  if (_R.CONTROLLED_UNITS.indexOf(key) === -1) return null;  /* adc infers */
  return selection.techniques[key] || null;
}

/* W-063. `row.value` is not computed yet at the point `rendered` is decided
   (both are set in the same object literal, and a literal cannot read its
   own not-yet-assigned property) — so this reads `selection.values`
   directly, the same expression `row.value` itself uses two lines below. */
function hasTypedValue(selection, parameter) {
  const v = selection.values[parameter];
  return v !== null && v !== undefined;
}
/* W-063b. The toggle is per PURPOSE GROUP now (domains.js GROUP_PARAMETERS):
   turning on "iron" renders lic + r2star + t2star together. purposeGroupOf maps
   this row's parameter to its group; an unknown parameter (=== null) is never
   toggled on by a group. The data-protection clause below is unchanged and
   still per-parameter — a typed value keeps its own card regardless of the
   group state (spec § 3). */
function isGroupToggledOn(selection, parameter) {
  if (!selection.performed) return false;
  const g = _R.purposeGroupOf(parameter);
  return g !== null && selection.performed[g] === true;
}

function buildRow(selection, vendor, calibrationMode, parameter) {
  const domain = _R.DOMAIN_OF[parameter];
  const technique = techniqueFor(selection, parameter);
  const scope = _R.resolveScope(vendor, parameter);

  const row = {
    parameter: parameter,
    domain: domain,
    /* W-090. The key that controls THIS row's own technique — 'r2star',
       't2star', 'lic' for the iron trio, `domain` for everything else. The
       renderer (Task 4) uses this instead of `domain` to draw one method
       control per row rather than one per domain. */
    controlKey: TECHNIQUE_CONTROL_KEY[parameter],
    technique: technique,
    /* W-090. Only r2star/t2star ever carry a product choice; every other
       parameter (including lic) reads null here, unconditionally. */
    product: (selection.products && selection.products[parameter]) || null,
    scope: scope,
    /* W-063. Two independent gates, ANDed: scope says whether this platform
       can produce the parameter at all (untouched); performed/value says
       whether the reader has put it in play. A measured value ALWAYS wins
       the second gate on its own, so turning the toggle back off after
       typing a number never hides it (spec § 4 — the data-protection rule;
       § 4.1 records that the FULL "untouched report looks like today's"
       guarantee this replaced is deliberately not kept). */
    rendered: _R.isRenderedAtScope(scope, selection.scope) &&
      (isGroupToggledOn(selection, parameter) || hasTypedValue(selection, parameter)),
    mountPoint: scope.mountPoint,
    drawable: [],
    scales: null,
    staging: null,
    stagingScale: null,
    stagingReason: null,
    missingReasons: [],
    /* The single reader sentence for the block beneath the card (W-051). Null on
       a gated row, which returns before it is computed and whose card carries the
       gate sentence instead. */
    gapReason: null,
    /* Present on lic. `calibration` is what a LIC value is derived THROUGH, and
       it is the one place the device question still changes a number (W-029);
       `valueDerived` is set only when THIS report computed the value rather than
       being handed one. */
    calibration: null,
    valueDerived: null,
    gaps: [],
    gate: null,
    value: (parameter in selection.values) ? selection.values[parameter] : null,
    staged: null,
    stamp: null
  };

  let built;
  try {
    built = _R.buildScales({
      parameter: parameter,
      fieldStrength: selection.fieldStrength,
      ageGroup: selection.cohort,
      technique: technique
    });
  } catch (e) {
    /* A technique gate is a RESULT: the caller must choose a sequence before this
       parameter can be answered, and the report prints that sentence. Anything
       else is a defect in this code, and it re-throws rather than being dressed
       up as a gap the reader would act on. */
    if (!isTechniqueGate(e)) throw e;
    row.gate = e.message;
    return row;
  }

  row.drawable = built.drawable.slice();
  row.scales = built.scales;
  row.staging = built.staging;
  row.stagingScale = built.stagingScale;
  row.stagingReason = built.stagingReason;
  row.gaps = built.gaps;
  row.stamp = built.provenanceStamp;

  /* A derived parameter is computed THROUGH a calibration, and that calibration
     is still vendor- and field-aware: LIC at 1.5T is 0.0254 x R2* on the GE path
     and 0.0266 on the other, and at 3.0T the non-GE path falls back to the
     GE-derived slope and flags it. The row carries the resolution so the card can
     name it and the strip can meter on the weaker of ladder and slope. */
  if (parameter === 'lic') {
    const iq = technique ? _R.calibrationInputQuantity(technique) : null;
    row.calibration = iq
      ? _R.resolveCalibration({parameter: 'lic', fieldStrength: selection.fieldStrength,
                               vendorMode: calibrationMode, technique: technique,
                               inputQuantity: iq})
      /* No published calibration takes what this sequence measures. Not a guess
         and not silence: a described gap, in the engine's own refusal shape.

         W-031 gave the gap its REASON. `refused` says the repository carries no
         calibration; `refusedReason` says why the literature is thin there, in
         the consensus panel's own words, so the reader gets an explanation
         rather than an absence. The refusal's shape is unchanged, deliberately:
         nothing downstream may start treating a reason as a value. */
      : {calibration: null, kind: null, expression: null, coefficients: null,
         rung: null, rungLabel: null, flags: ['no-calibration-published'],
         alternatives: [],
         refused: technique
           ? `no published calibration takes what ${technique} measures`
           : 'no sequence selected, so no calibration can be resolved',
         refusedReason: technique ? _R.methodRankingReason(technique) : null,
         refusedReasonRefIds: technique && _R.methodRankingReason(technique)
           ? ['REF-038'] : []};

    /* A TYPED VALUE IS NEVER OVERWRITTEN. Sites that report LIC from their own
       console have measured it as far as this report is concerned, and replacing
       the operator's number with a recomputed one would be the report arguing
       with the data it was given. Only an ABSENT LIC is derived — from whatever
       the selected sequence actually measures, which is why the input quantity
       comes from the calibration record rather than from an assumption. */
    if ((row.value === null || row.value === undefined) &&
        row.calibration.expression && iq) {
      const input = selection.values[iq];
      if (typeof input === 'number') {
        row.value = _R.applyCalibration(row.calibration, input);
        row.valueDerived = {from: iq, input: input,
                            expression: row.calibration.expression};
      }
    }
  }

  /* Every reason a policy could not be completed, flattened for the renderer so a
     row can say WHY it is empty — "records exist but their technique is ambiguous"
     is a different statement from "no records exist". */
  const reasons = [];
  for (const policy of Object.keys(built.scales)) {
    for (const r of (built.scales[policy].missingReasons || [])) {
      /* Translated HERE, once, because the renderer prints this list on the
         clinical card and the engine's strings are written for the test suite
         (see readerReason). Before W-050 the card carried both halves of the
         same statement — a plain sentence and, under it, the same fact in code
         names. `raw` is kept so page 2 and any diagnostic can still reach the
         engine's own words. */
      const entry = {policy: policy, boundary: r.boundary, raw: r.reason,
                     /* W-051. The engine names the FAMILY; this layer owns the
                        wording. Matching on the prose would make every reason
                        string load-bearing in two files at once. */
                     code: r.code || null,
                     excluded: r.excluded || [],
                     /* The one part of the sentence that is not in the entry:
                        the field strength is a property of the QUESTION asked,
                        not of the record that failed to answer it. */
                     fieldStrength: selection.fieldStrength,
                     recoverableWith: r.recoverableWith || null};
      entry.reason = readerReason(entry);
      reasons.push(entry);
    }
  }
  row.missingReasons = reasons;

  /* W-051. ONE reader sentence, ranked by the rule in `rankedReasons`, for the
     case the card's own gap sentence does NOT cover: a row that staged against
     one policy while the other ladder could not be closed. Before this the block
     beneath such a card said nothing at all, and the block beneath a card that
     DID carry a gap sentence re-listed the same reasons in the engine's words —
     one fact printed twice, in two vocabularies, on the same card. */
  const topReason = rankedReasons(row)[0];
  row.gapReason = topReason ? topReason.reason : null;

  if (row.value !== null && row.value !== undefined && row.stagingScale) {
    row.staged = _R.stage(row.value, row.stagingScale);
  }

  return row;
}

function buildReport(selection) {
  const p = _R.PATHS[selection.path];
  if (!p) {
    /* No acquisition chosen yet — the report does not exist, and saying so is not
       the same as saying it is empty. */
    return {rows: [], stamp: null, selection: selection, ready: false};
  }

  const rows = REPORT_PARAMETERS.map(
    parameter => buildRow(selection, p.vendor, p.calibrationMode, parameter));

  /* The stamp is the same for every row; take it from the first row that produced
     one, so a report where every parameter gated still stamps its versions. */
  let stamp = null;
  for (const r of rows) { if (r.stamp) { stamp = r.stamp; break; } }

  return {rows: rows, stamp: stamp, selection: selection, ready: true};
}

/* ═══════════════════════════════════════════════════════════ THE COMPOSITION
   W-029. Three producers, each writing at exactly ONE altitude, so no fact is
   printed twice and no reader has to reconcile two versions of it:

     strip    what can be answered.  No values, no verdicts.
     card     the answer.            Value, ruler, verdict, one provenance line.
     page 2   the receipts.          Sources, the disagreement, the gap.

   All three are pure. The renderer (W-007) turns these objects into HTML and
   makes no decision of its own — including the decision of what a row is called.
   ═══════════════════════════════════════════════════════════════════════════ */

/* The meter is COMPUTED from the engine's rung, never chosen. Rungs 1-2 are a
   guideline value or a mean of >=2 studies; 3-4 a single study or multi-vendor
   sources only; 5 is reachable on a derived row alone, through its calibration. */
const METERS = {1: '[###]', 2: '[###]', 3: '[##.]', 4: '[##.]', 5: '[#..]'};

function coverageStatus(row) {
  if (row.value === null || row.value === undefined) return 'not acquired';
  if (row.gate) return 'technique not selected';
  if (row.staging === null) return 'no ladder';
  /* 'derived' describes THE NUMBER, not the vendor's product line: it is set
     when this report computed the value through a calibration. A LIC the
     operator typed is a measurement like any other and reads 'staged'. */
  if (row.valueDerived) return 'derived';
  return 'staged';
}

/* A DERIVED PARAMETER IS ONLY AS WELL-SOURCED AS ITS CALIBRATION. LIC at 3.0T on
   a non-GE system stages against a rung-1 guideline ladder using a rung-5 slope;
   metering that at full strength would hide where 0.0472 came from. */
function coverageRung(row) {
  const ladder = row.stagingScale ? row.stagingScale.worstRung : null;
  if (ladder === null || ladder === undefined) return null;
  const cal = row.calibration ? row.calibration.rung : null;
  return (cal === null || cal === undefined) ? ladder : Math.max(ladder, cal);
}

/* One short phrase saying WHERE the answer would come from — never the answer
   itself, and never an engine identifier. */
function coverageReason(row, status) {
  if (status === 'not acquired') return 'not measured in this study';
  if (status === 'technique not selected') return 'sequence not chosen yet';
  if (status === 'no ladder') {
    return row.technique ? 'nothing published for this sequence'
                         : 'nothing published for this measurement';
  }
  if (status === 'derived') {
    const from = row.valueDerived.from === 't2star' ? 'T2*' : 'R2*';
    return `from ${from} via calibration`;
  }
  if (row.staging === 'guideline') return 'guideline ladder';
  const n = row.stagingScale ? row.stagingScale.sourceCount : 0;
  return n === 1 ? 'published studies, 1 source' : `published studies, ${n} sources`;
}

function buildCoverage(report) {
  const rows = report.rows.map(function (row) {
    const status = coverageStatus(row);
    /* A parameter nobody measured has no evidence strength to report. The ladder
       behind it may be excellent, and metering it would answer a question this
       study did not ask — the row is about THIS patient, not about the
       literature in general. */
    const measured = status !== 'not acquired';
    const rung = measured ? coverageRung(row) : null;
    return {
      parameter: row.parameter,
      label: PARAMETER_LABELS[row.parameter],
      status: status,
      rung: rung,
      meter: !measured ? '—' : (rung === null ? '[...]' : METERS[rung]),
      reason: coverageReason(row, status)
    };
  });

  const measured = rows.filter(r => r.status !== 'not acquired');
  const withLadder = measured.filter(r => r.rung !== null);
  return {
    rows: rows,
    measuredCount: measured.length,
    ladderCount: withLadder.length,
    /* Counted, never written. A hard-coded count is a claim that stops being
       true the first time a parameter is added to the report. */
    summary: `${withLadder.length} of ${measured.length} measured parameters ` +
             `carry a published ladder.`
  };
}

/* ─────────────────────────────────────────────────────── THE ACQUISITION LINE
   The only vendor-aware line on a card, and the rule it follows falls out of the
   data rather than being asserted over it: a product is NAMED when the resolved
   scope row's vendor is GE, and DESCRIBED otherwise.

   The name comes from that row's `product` field — the one place in this
   repository where a product is recorded with its provenance (factProvenance).
   Never from vendorExamples, never from a map written here. cT1 is the case that
   proves the rule works: its scope row is vendor '*' carrying a Perspectum
   product, so a cT1 card prints the method and no brand, on every path.

   Source and citation lines are NOT covered by this rule and keep their brands
   everywhere — a brand inside a citation is provenance, not advertising. */
/* W-033. The derivation, flattened for the card: the expression the record
   publishes, the input that was actually put through it with its own unit, the
   result with its unit, and the record's id. Null unless THIS report computed
   the value — a typed LIC has no derivation to name, and saying it had one
   would be the report claiming an authorship it does not have. */
function derivationOf(row) {
  if (!row.valueDerived || !row.calibration || !row.calibration.calibration) return null;
  const rec = row.calibration.calibration;
  return {expression: row.valueDerived.expression,
          from: row.valueDerived.from === 't2star' ? 'T2*' : 'R2*',
          input: row.valueDerived.input,
          inputUnit: rec.inputUnit,
          value: row.value,
          outputUnit: rec.outputUnit,
          /* The NAME the record publishes, never its id. `CAL-0001` is this
             repository's own filing vocabulary; a clinician reading page 1 has
             no use for it, and L9 in logic.test.js forbids it reaching a card
             at all. The id stays on the methodology sheet, where the receipts
             live. W-033's brief asked for the id here; the older rule wins, and
             the name is the better pointer in any case. */
          calibrationName: rec.name};
}

/* W-087. `lic`, `r2star` and `t2star` share ONE technique control per domain
   (domains.js) — a deliberate design — so whichever id the user picks is
   stamped onto all three rows. `iron-r2star-gre` and `iron-t2star-gre` are two
   catalog entries for that SAME acquisition
   (techniques.data.js TECHNIQUE_GROUPS['iron-r2star'].rationale: "R2* =
   1000/T2*, so R2*-reported and T2*-reported studies are the same
   measurement"), so printing whichever one was selected onto BOTH the R2*
   card and the T2* card names the wrong quantity on one of them. Swap to the
   sibling record that actually names the card's own parameter; nothing is
   invented — both labels were already in the catalog. Every other technique
   group is untouched. */
const IRON_QUANTITY_SIBLING = {r2star: 'iron-r2star-gre', t2star: 'iron-t2star-gre'};

function acquisitionLine(row) {
  let techId = row.technique;
  const sibling = IRON_QUANTITY_SIBLING[row.parameter];
  if (sibling && techId && _R.TECHNIQUES[techId] &&
      _R.TECHNIQUES[techId].group === _R.TECHNIQUES[sibling].group) {
    techId = sibling;
  }
  const t = techId ? _R.TECHNIQUES[techId] : null;
  if (!t) return 'Acquisition method not selected';

  /* W-090. An explicit product choice (GE path, r2star/t2star only) wins over
     the vendor+parameter scope lookup below, because it names the SPECIFIC
     console the user says was used rather than a fixed per-parameter default.
     Checked against GE_IRON_PRODUCTS, never trusted blind — the same table
     selection.js validated the patch against, so an id that reaches this
     point is always one this parameter legitimately offers. */
  const offered = _R.GE_IRON_PRODUCTS[row.parameter] || [];
  const chosen = offered.find(o => o.id === row.product);
  if (chosen) return `${chosen.label} — ${t.methodLabel}`;

  /* `matchedVendor`, never `vendor`: the first says which matrix row owns the
     product, the second only says who asked. Reading `vendor` here printed
     "GE LiverMultiScan (Perspectum)" — a GE product that does not exist. */
  const named = row.scope && row.scope.matchedVendor === 'GE' && row.scope.product;
  return named ? `GE ${row.scope.product} — ${t.methodLabel}` : t.methodLabel;
}

/* ──────────────────────────────────────────────────── ENGINE WORDS → REPORT WORDS
   Every flag the engine can attach, in the words a report may print. An unmapped
   flag THROWS rather than reaching a page: this is the mechanism that keeps the
   engine's programmer-facing vocabulary off a clinician's report, which is one of
   the two defects W-006 handed over. A new flag has to be given a sentence
   deliberately. */
const FLAG_SENTENCES = {
  'ge-included-not-separable':
    'the contributing series pooled more than one manufacturer, so no single ' +
    'manufacturer\'s contribution can be separated out',
  'single-source': 'one published study stands behind at least one boundary',
  'ambiguous-technique-records-excluded':
    'further published values exist but name their sequence ambiguously, and were ' +
    'held back rather than assumed',
  'field-independent-by-group':
    'the boundary is published for the measurement rather than for a field strength',
  'technique-group-not-poolable':
    'the published values were not averaged, because this measurement group is ' +
    'not poolable',
  'unit-conflict':
    'the published values disagree on units and were not reconciled',
  'guideline-derived-from-ge':
    'the underlying measurement was made on GE equipment and adopted by the ' +
    'guideline without re-derivation',
  'no-vendor-neutral-evidence':
    'no vendor-neutral calibration is published at this field strength; the ' +
    'GE-derived slope was used and is named here rather than adjusted',
  'no-ge-evidence':
    'no GE-specific calibration is published here; the published one is named ' +
    'rather than adjusted',
  'no-calibration-published': 'no calibration is published for this sequence'
};

function flagSentence(flag) {
  if (flag.indexOf('value-from-') === 0) {
    return 'the calibration comes from outside the class this scanner selects';
  }
  const s = FLAG_SENTENCES[flag];
  if (!s) {
    throw new TypeError(`flag "${flag}" has no report sentence — add one to ` +
                        `FLAG_SENTENCES before it can reach a printed page`);
  }
  return s;
}

/* ───────────────────────────────────────────────────────────────── THE RULER
   W-028 replaced the equal-width placeholder with V1's own zone model. Band
   edges, widths, names, severities and axis bounds are all assembled by
   js/zones.js, which is where the port from V1 lives and where the rule "no
   severity is invented for a parameter V1 never staged" is enforced. This
   module's job is what it always was: to say, in a sentence, what the reader is
   looking at.

   ⛔ NOTHING IS RE-DERIVED HERE. buildZones() is handed the engine's resolved
      scale and its answer is carried through untouched. */

/* One sentence for a ruler whose presentation is not fully sourced, so the
   absence is printed rather than implied by an uncoloured bar a reader might
   take for a rendering accident (CLAUDE.md § 1.2, SCHEMA § 10.3). */
function bandNote(zoneModel) {
  if (!zoneModel) return null;
  const parts = [];
  if (zoneModel.severitySource === 'unresolved') {
    parts.push('The band names below are the published ladder’s own; this ' +
               'repository records no severity grading for this measurement, so the ' +
               'bands are drawn uncoloured and no band is called worse than another');
  }
  /* W-044. Colour is now carried here by a ladder that names its own rungs, and
     the reader is told which of the two it is looking at. The sentence is short
     on purpose: it says where the ORDER came from, and claims nothing about a
     grading study, because there is none to claim. */
  if (zoneModel.severitySource === 'ladder-derived') {
    parts.push('the bands are shaded in the order the published ladder names ' +
               'them, not by a severity grading of their own');
  }
  if (zoneModel.axisSource === 'derived-from-ladder') {
    parts.push('the two ends of the scale are drawing bounds derived from the ' +
               'ladder itself, not published limits');
  }
  if (zoneModel.axisSource === 'v1-ported-widened') {
    parts.push('the scale was widened past its usual drawing bounds to keep every ' +
               'published boundary inside the frame');
  }
  return parts.length ? parts.join('; ') + '.' : null;
}

/* ─────────────────────────────────── THE INDICATION, AS A COHORT FAMILY
   Etiology only, because age is already an axis. Measured from cutoffs.data.js
   on 2026-08-23: the cohort vocabulary is nine values, and three of them —
   `adult-any-etiology`, `adult-general`, `pediatric-general` — are DELIBERATELY
   in no family. Those three say the record does not name an etiology; counting
   one as a match would claim a match the record never made. They keep
   contributing to the pooled ladder and are simply never named as matched. */
const INDICATION_COHORTS = {
  'iron-overload':           ['adult-iron-overload', 'pediatric-iron-overload'],
  'steatotic-liver-disease': ['adult-nafld', 'pediatric-nafld'],
  'chronic-liver-disease':   ['adult-hcv', 'adult-multi-etiology'],
  'non-specific':            []
};

/* Reader-facing indication words for the history clause (W-072). Deliberately
   NOT the render.js `INDICATION_LABELS` map (render.js:259) -- that map is
   Title Case for a form <select>; this one is lower-case so it reads inside a
   sentence ("requested for iron overload"), and report.js has no dependency
   on render.js today. Two labels for one vocabulary, kept apart on purpose:
   a shared map would make report.js's plain-language output depend on a
   render-layer casing decision it has no reason to know about. */
const INDICATION_READER_LABEL = {
  'iron-overload': 'iron overload',
  'steatotic-liver-disease': 'steatotic liver disease',
  'chronic-liver-disease': 'chronic liver disease',
  'non-specific': 'no specific indication'
};

/* W-038 — the scope-of-use caveats attached to the records this row actually
   DRAWS. Keyed by cutoffId, so one record contributing to two policies is
   printed once: the reader learns nothing from the same publication's own limit
   stated twice. Walks `row.drawable` for the same reason sourcesOf does — a
   ladder that is not drawn qualifies nothing on the page. */
function useCaveatsOf(row) {
  const seen = new Set();
  const out = [];
  for (const policy of row.drawable) {
    for (const b of row.scales[policy].boundaries) {
      for (const src of (b.sources || [])) {
        if (!src.useCaveat || seen.has(src.cutoffId)) continue;
        seen.add(src.cutoffId);
        out.push({
          cutoffId: src.cutoffId,
          boundary: b.boundary,
          statement: src.useCaveat.statement,
          refIds: (src.useCaveat.refIds || []).slice(),
          kind: src.useCaveat.kind,
          quoteSource: src.useCaveat.quoteSource
        });
      }
    }
  }
  return out;
}

function refYear(refId) {
  const r = _R.REFERENCES.filter(x => x.id === refId)[0];
  return r && typeof r.year === 'number' ? r.year : 0;
}
/* The scanner the publication was written on, where the record names one.
   `vendorRaw` is the reference's own string; nothing is inferred from it. */
function refScanner(refId) {
  const r = _R.REFERENCES.filter(x => x.id === refId)[0];
  return (r && r.vendorRaw) || null;
}

/* MATCHING IS A PREFERENCE ORDER, NEVER A FILTER (W-015 § 6). Among the cut-off
   records ALREADY in the pool, a source is eligible when its cohort belongs to
   the selected indication's family. Ineligible records are dropped from nothing;
   they are only not the ones drawn.

   The publication drawn is the eligible one covering the MOST boundaries — an
   incomplete ladder is worse to draw than a complete one — with ties broken by
   the profile's own referenceOrder over vendorClass, then evidenceGrade, then
   year, most recent first. If a tie survives every key, NOTHING is drawn and
   every match is named: an arbitrary pick between two equally-ranked
   publications would be an editorial choice with nothing behind it. */
function matchedScale(row, indication, profile) {
  const family = INDICATION_COHORTS[indication] || [];
  if (!family.length) return null;
  const pooled = row.scales && row.scales['primary-studies'];
  if (!pooled || !pooled.boundaries || !pooled.boundaries.length) return null;

  const byRef = {};
  for (const b of pooled.boundaries) {
    for (const src of (b.sources || [])) {
      if (family.indexOf(src.cohort) === -1) continue;
      for (const ref of (src.refs || [])) {
        const e = byRef[ref.id] || (byRef[ref.id] = {
          refId: ref.id, citation: ref.citation || ref.id,
          vendorClass: src.vendorClass, grade: src.evidenceGrade || 'C',
          values: {}, count: 0
        });
        if (!(b.boundary in e.values)) { e.values[b.boundary] = src; e.count += 1; }
      }
    }
  }

  const cands = Object.keys(byRef).map(k => byRef[k]);
  if (!cands.length) return null;

  const rank = c => {
    const i = profile.referenceOrder.indexOf(c.vendorClass);
    return i === -1 ? profile.referenceOrder.length : i;
  };
  const GRADES = {A: 0, B: 1, C: 2};
  const gradeOf = g => (GRADES[g] === undefined ? 3 : GRADES[g]);
  const sorted = cands.slice().sort((a, b) =>
    (b.count - a.count) || (rank(a) - rank(b)) ||
    (gradeOf(a.grade) - gradeOf(b.grade)) ||
    (refYear(b.refId) - refYear(a.refId)));

  const names = sorted.map(c => c.refId + ' — ' + c.citation);
  const tied = sorted.length > 1 &&
    sorted[0].count === sorted[1].count && rank(sorted[0]) === rank(sorted[1]) &&
    sorted[0].grade === sorted[1].grade && refYear(sorted[0].refId) === refYear(sorted[1].refId);
  if (tied) return {scale: null, refs: names, missingRungs: [], winner: null};

  const w = sorted[0];
  const boundaries = [], missing = [];
  for (const b of pooled.boundaries) {
    const src = w.values[b.boundary];
    if (!src) { missing.push(b.boundary); continue; }
    boundaries.push({
      boundary: b.boundary, value: src.value, unit: b.unit,
      direction: b.direction, n: 1, min: null, max: null,
      meanLabel: 'single published cut-off', sources: [src]
    });
  }
  if (!boundaries.length) return {scale: null, refs: names, missingRungs: missing, winner: null};

  return {
    /* `complete: true` says this object is internally finished, not that the
       ladder has every rung — the rungs it lacks travel in `missingRungs` and
       print as a named gap. */
    scale: {boundaries: boundaries, complete: true, flags: [], missingReasons: []},
    refs: names, missingRungs: missing, winner: w
  };
}

/* Every ladder the engine says is drawable, in ROLE order (W-030 § 3.2): the
   consensus ladder first and full size, the indication-matched publication
   beneath it as a slim strip. Order is fixed by role rather than by match, and
   that is the safer of the two — THE TOP BAR IS ALWAYS THE ONE THE VERDICT CAME
   FROM. Where two ladders are drawable they are BOTH returned, because hiding one
   would erase a disagreement (SCHEMA § 10.5). Nothing here branches on a policy
   name — `staging` is read from the engine and the policy is only ever mapped to
   words. */
function rulerFromScale(scale, parameter, row, hasValue, label, staging, role) {
  const zoneModel = _R.buildZones(scale, parameter);
  if (!zoneModel) return null;
  const staged = hasValue ? _R.stage(row.value, scale) : null;
  const zone = staged && staged.index !== undefined
    ? _R.zoneForIndex(zoneModel, staged.index) : null;
  return {
    scaleLabel: label, staging: staging, role: role,
    axis: zoneModel.axis, unit: zoneModel.unit, dir: zoneModel.dir,
    zones: zoneModel.zones, edges: zoneModel.edges,
    value: hasValue ? row.value : null,
    /* The verdict chip, as words. `band` is the ladder's own name for where this
       patient sits; `sev` is null wherever V1 had no severity to port, and a null
       there is what stops the renderer from colouring it. */
    verdict: zone ? {band: zone.label, tag: zone.tag, sev: zone.sev} : null,
    nameSource: zoneModel.nameSource, severitySource: zoneModel.severitySource,
    axisSource: zoneModel.axisSource, note: bandNote(zoneModel),
    matchLabel: null, matchedRefs: [], missingRungs: [], scanner: null
  };
}

/* Two ladders are the same ladder when every boundary sits at the same value.
   Compared on the ENGINE's boundary list rather than on drawn pixels, so a
   difference too small to see on an A4 bar still counts as a difference. */
function sameLadder(a, b) {
  if (!a || !b || !a.edges || !b.edges || a.edges.length !== b.edges.length) return false;
  for (let i = 0; i < a.edges.length; i++) {
    if (a.edges[i].value !== b.edges[i].value) return false;
    if (a.edges[i].boundary !== b.edges[i].boundary) return false;
  }
  return true;
}

function rulersFor(row, indication, profile) {
  const hasValue = row.value !== null && row.value !== undefined;
  const out = [];
  for (const policy of (row.drawable || [])) {
    const r = rulerFromScale(row.scales[policy], row.parameter, row, hasValue,
                             SCALE_WORDS[policy], row.staging === policy,
                             row.staging === policy ? 'consensus' : 'matched');
    if (r) out.push(r);
  }
  const consensus = out.filter(r => r.role === 'consensus');
  const second = out.filter(r => r.role !== 'consensus');

  const m = matchedScale(row, indication, profile);
  if (m && m.refs.length) {
    if (m.scale) {
      const strip = rulerFromScale(m.scale, row.parameter, row, hasValue,
                                   'publication matched to the indication',
                                   false, 'matched');
      /* A MATCHED STRIP IS DRAWN ONLY WHERE IT DIFFERS FROM THE BAR ALREADY
         DRAWN. Measured 2026-08-23: adult PDFF at 1.5T pools three MASLD records
         whose ladder is S0|S1 5.2, S1|S2 17, S2|S3 22.1 — and the matched
         publication reproduces it exactly, because every one of those boundaries
         rests on a single adult-nafld source. Drawing it twice would put the same
         three numbers on the page as if a second publication had independently
         confirmed them, which manufactures agreement out of one record. Where the
         ladders coincide the publication is still NAMED on the bar (W-015 § 6
         requires every eligible match to be named); it is simply not redrawn. */
      const same = strip && sameLadder(strip, consensus.concat(second)[0]);
      if (strip && !same) {
        strip.matchLabel = m.winner.refId + ' — ' + m.winner.citation;
        strip.matchedRefs = m.refs;
        strip.missingRungs = m.missingRungs;
        strip.scanner = refScanner(m.winner.refId);
        return consensus.concat([strip]);
      }
      if (strip && same) {
        const bar = consensus.concat(second)[0];
        bar.matchLabel = m.winner.refId + ' — ' + m.winner.citation;
        bar.matchedRefs = m.refs;
        bar.missingRungs = m.missingRungs;
        bar.scanner = refScanner(m.winner.refId);
        bar.matchIsSameLadder = true;
        return consensus.concat(second);
      }
    }
    /* A tie no key could break, or a match that produced no drawable ladder: the
       pooled bar stays and every eligible publication is named beside it. */
    for (const r of second) { r.matchedRefs = m.refs; r.missingRungs = m.missingRungs; }
  }
  return consensus.concat(second);
}

/* ──────────────────────────────────────────────────────────────── THE VERDICT
   Stated through the PUBLISHED boundary names and their values, never through a
   severity word this repository cannot source. "3.8 kPa is at or above F>=2
   (3.5) and below F>=3 (4)" is a fact about the ladder; "moderate fibrosis" would
   be an editorial judgement W-028 has yet to port from V1. */
function verdictText(value, scale, unit) {
  const staged = _R.stage(value, scale);
  const below = staged.below, above = staged.above;
  const at = (b) => `${b.boundary} (${b.value}${unit ? ' ' + unit : ''})`;
  if (!below) return `${value}${unit ? ' ' + unit : ''} is below ${at(above)}`;
  if (!above) return `${value}${unit ? ' ' + unit : ''} is at or above ${at(below)}`;
  return `${value}${unit ? ' ' + unit : ''} is at or above ${at(below)} and below ${at(above)}`;
}

const SCALE_WORDS = {guideline: 'guideline ladder',
                     'primary-studies': 'published primary studies'};

/* One sentence on how well-sourced the answer is. Composed from the engine's
   fields, never a raw copy of them. */
function provenanceSentence(row) {
  const s = row.stagingScale;
  if (!s) return null;
  const parts = [];
  parts.push(row.staging === 'guideline'
    ? 'Staged against the published guideline ladder'
    : `Staged against the pooled ladder of published primary studies ` +
      `(${s.sourceCount} contributing ${s.sourceCount === 1 ? 'value' : 'values'})`);
  if (s.cohorts && s.cohorts.length) {
    parts.push(`the contributing studies were done in ${s.cohorts.join(' and ')} ` +
               `populations`);
  }
  for (const f of (s.flags || [])) parts.push(flagSentence(f));
  if (row.valueDerived) {
    parts.push(`the value itself was computed from the measured ` +
               `${row.valueDerived.from === 't2star' ? 'T2*' : 'R2*'} ` +
               `(${row.valueDerived.expression})`);
    for (const f of ((row.calibration && row.calibration.flags) || [])) {
      parts.push(flagSentence(f));
    }
  }
  return parts.join('; ') + '.';
}

/* THE ENGINE'S REASON STRINGS ARE WRITTEN FOR THE TEST SUITE, NOT FOR A
   RADIOLOGIST. They name a schema rule and an opt-in argument by their code
   names, which is right where they are produced — a developer reading a failing
   check needs exactly that — and wrong on a clinical page. It is L9's rule
   arriving on a different field: an internal filing term is not something a
   clinician can act on.

   W-051 completed it. EVERY family the engine can emit is translated here, the
   technique gate included, and the table is keyed on the engine's `reasonCode`
   rather than on its prose — a translation that matched on wording would make
   each reason string load-bearing in two files at once.

   ⛔ THE FALLBACK STAYS, and is the reason this is a table rather than a switch
      with a throw at the end. A family nobody has translated yet returns the
      ENGINE'S OWN STRING: unreadable is a defect, missing is a clinical one, and
      the worst outcome for a gap is silence (SCHEMA § 10.3). `v2/tests/logic.js`
      section S asserts the fallback with a code that does not exist.

   The vocabulary is the repository's own wherever it already publishes one:
   `SCALE_WORDS` names the two policies in the same words the verdict chip uses,
   so a reader meets one name per thing (W-051 design D). */
const READER_REASONS = {
  /* W-050's sentence, unchanged: it is the one this table started from. */
  'ambiguous-technique-excluded': () =>
    'published values for this boundary exist, but their own records do not ' +
    'settle which sequence measured them, so they were held back rather than ' +
    'assumed — the methodology sheet names them',

  /* "no guideline record for this boundary; 2 record(s) exist in other
     provenance classes". The count is said because it is actionable — it tells
     a reader there is something to go and look at — and the complement is left
     unnamed rather than deduced, since naming it would be this layer asserting
     which two classes the engine happened to compare. */
  'no-record-in-policy': entry =>
    `no value for this step of the scale is published in the ` +
    `${SCALE_WORDS[entry.policy] || 'evidence this report holds'}` +
    (entry.excluded && entry.excluded.length
      ? `; ${entry.excluded.length} published value` +
        `${entry.excluded.length === 1 ? '' : 's'} for it exist` +
        `${entry.excluded.length === 1 ? 's' : ''} elsewhere in the literature ` +
        `this report holds`
      : ''),

  'no-record-anywhere': () =>
    'no value for this step of the scale is published in any literature this ' +
    'report holds',

  /* The engine names the technique group and says it is "not declared
     field-independent". Both halves are code; the fact underneath them is that
     nothing published says the numbers carry across field strengths. */
  'no-record-at-field': entry =>
    'values for this step of the scale are published, but none of them was ' +
    `measured at ${entry.fieldStrength || 'this field strength'}, and nothing ` +
    'published says this sequence carries its values from one field strength ' +
    'to another',

  /* Neither of the two below is reachable from the shipped records — no pool
     spans units and no non-poolable group reaches a ladder. They are written
     anyway because the alternative is a page that starts printing code names
     the first time the data set changes, and the day that happens is not the
     day to notice the sentence was never written. */
  'unit-conflict': () =>
    'the values published for this step of the scale are not all in one unit, ' +
    'and this report does not convert between them',

  'group-not-poolable': () =>
    'more than one value is published for this step of the scale, and this ' +
    'sequence is not one whose published values may be averaged, so no single ' +
    'boundary is stated',

  /* The technique gate. Unlike the others this is a whole sentence rather than
     a clause, because it is not a step of a ladder that failed — the question
     itself has not been answered yet, and the reader can answer it. */
  'technique-gate': () =>
    'This measurement is made by more than one sequence, and they are not ' +
    'interchangeable. Name the sequence used and the report can answer.'
};

function readerReason(entry) {
  /* `recoverableWith` wins over the code it was raised with: W-050's rule is
     that a reason offering a way back in is the one worth printing, and the
     sentence for it says what the way back in IS. */
  const code = entry.recoverableWith === 'allowAmbiguousTechnique'
    ? 'ambiguous-technique-excluded' : entry.code;
  const write = READER_REASONS[code];
  /* `raw` on a report-layer entry, `reason` on an engine one — both shapes reach
     here, and neither may come back empty. */
  return write ? write(entry) : (entry.raw || entry.reason);
}

/* A parameter that cannot be staged says why, and never leaves an empty band a
   reader would take for "normal" (SCHEMA 10.3). */
function gapSentence(row) {
  if (row.gate) return readerReason({code: 'technique-gate', raw: row.gate});
  /* W-050. ONE reason prints, and until now it was whichever the policy loop
     produced first — always the guideline class. For native T1 that printed
     "no guideline record for this boundary" while the reason a reader could act
     on sat behind it: published values EXIST and were held back because their
     records name their sequence ambiguously. The order was incidental; the rule
     below is not:

       2  the reason offers a way back in    (`recoverableWith` is set)
       1  records EXIST and were excluded    (`excluded[]` is non-empty)
       0  nothing exists in any class

     Highest rank prints. The sort is STABLE, so reasons the ranking does not
     distinguish keep the order the engine produced them in — nothing is
     reordered on a distinction that was never made. */
  const ranked = rankedReasons(row);
  if (!ranked.length) return null;
  /* The trailing clause counts REASONS, so it says reasons: it used to call them
     boundaries and write "1 further boundaries" for a count of one. Reasons are
     deduplicated above, and a boundary count would not survive that. */
  const rest = ranked.length - 1;
  return `No ladder could be closed for this measurement: ${ranked[0].reason}.` +
         (rest > 0 ? ` ${rest} further reason${rest === 1 ? ' is' : 's are'} ` +
                     `recorded for the remaining boundaries.` : '');
}

/* W-051 pulled the ranking out of `gapSentence` so that the ONE sentence the
   card prints and the ONE sentence the block beneath it prints are ranked by the
   same rule rather than by two copies of it. It reads `row.missingReasons`,
   which is where the translation already happened, so nothing is translated
   twice either. */
function rankedReasons(row) {
  const reasons = [];
  for (const r of (row.missingReasons || [])) {
    /* Deduplicated on the ENGINE's reason, not the printed one: two boundaries
       refused for the same cause say it once. Comparing the printed text
       against the raw incoming text would never match and would print the same
       sentence twice. */
    if (reasons.some(x => x.raw === r.raw)) continue;
    reasons.push({
      raw: r.raw,
      reason: r.reason,
      /* W-071. The code travels with the prose here for the same reason it
         travels with it in `missingReasons`: a consumer that had to recognise
         the promoted refusal by its wording would make every reason string
         load-bearing in a second file, which is exactly what W-051 removed.
         Dropping it here was why the card could state its refusal only as a
         sentence. */
      code: r.code || null,
      rank: r.recoverableWith ? 2 : ((r.excluded && r.excluded.length) ? 1 : 0)
    });
  }
  return reasons.map((r, i) => [r, i])
    .sort((a, b) => (b[0].rank - a[0].rank) || (a[1] - b[1]))
    .map(pair => pair[0]);
}

/* W-071. The same two branches `gapSentence` takes, answering in the engine's
   vocabulary instead of the reader's. It is deliberately a sibling of that
   function rather than a second return value from it: the sentence is consumed
   by the page and the code by machinery, and one caller wanting both is not a
   reason to make every caller carry both. */
function gapCodeOf(row) {
  if (row.gate) return 'technique-gate';
  const ranked = rankedReasons(row);
  return ranked.length ? (ranked[0].code || null) : null;
}

function buildCards(report, profile) {
  /* The profile is required, not defaulted: the matched publication is ranked by
     its referenceOrder, and an old caller that omitted it would silently produce
     a report in which no publication ever matched. */
  if (!profile || !profile.referenceOrder) {
    throw new Error('buildCards requires the vendor profile: the matched ' +
                    'publication is ranked by the profile referenceOrder');
  }
  const indication = (report.selection && report.selection.indication) || 'non-specific';
  return report.rows.map(function (row) {
    const unit = PARAMETER_UNITS[row.parameter];
    const hasValue = row.value !== null && row.value !== undefined;
    const verdicts = [];

    /* Where two ladders close and DISAGREE, both verdicts print and neither is
       preferred (SCHEMA 10.5). MRE at 1.5T adult is the one scale in this pool
       where that happens: 3.8 kPa is significant fibrosis by the guideline and
       advanced by the pooled studies, and a reader is entitled to both. */
    if (hasValue) {
      for (const policy of row.drawable) {
        verdicts.push({
          scale: SCALE_WORDS[policy],
          text: verdictText(row.value, row.scales[policy], unit),
          index: _R.stage(row.value, row.scales[policy]).index
        });
      }
    }
    const indices = verdicts.map(v => v.index);
    const disagree = indices.length > 1 && indices.some(i => i !== indices[0]);

    const rulers = rulersFor(row, indication, profile);
    const stagingRuler = rulers.filter(r => r.staging)[0] || null;

    return {
      parameter: row.parameter,
      label: PARAMETER_LABELS[row.parameter],
      value: hasValue ? row.value : null,
      unit: unit,
      derived: !!row.valueDerived,
      /* W-033. Where the number came FROM, said on the card rather than only on
         page 2. `derivation` carries the parts of the sentence and never the
         sentence itself, so the renderer formats and this file decides; every
         part is read out of the resolved CALIBRATION record, so a coefficient
         cannot be restated — or mistyped — anywhere downstream.

         `valueProvenance` is the two-state flag the value area reads. It is
         null for every parameter but LIC, because LIC is the only reading this
         report computes: elsewhere the question does not arise, and a field
         that answered it would invite a distinction the data cannot support. */
      derivation: derivationOf(row),
      valueProvenance: row.parameter !== 'lic' || !hasValue ? null
        : (row.valueDerived ? 'derived' : 'measured'),
      acquisitionLine: acquisitionLine(row),
      /* The chip names the ladder it came from. With bar order fixed by role
         rather than by match, an unlabelled chip would be read off whichever bar
         is on top; naming it is what keeps that reading correct (W-030 § 3.3). */
      verdictScale: stagingRuler ? stagingRuler.scaleLabel : null,
      /* One bar is a fact about the data, not an exception to the layout — and
         there are two different facts behind it, so the sentence says which one
         applies rather than covering both with a vague line. */
      singleLadderReason: rulers.length !== 1 ? null
        : (rulers[0].matchIsSameLadder
            ? 'The publication matched to this indication is the ladder already ' +
              'drawn above, so it is named rather than drawn a second time. A ' +
              'repeated bar would show one record as though two had agreed.'
            : 'Only one published ladder covers this measurement, so only one ' +
              'scale is drawn. The absence of a second is a property of the ' +
              'literature, not of this report.'),
      /* Every drawable ladder, and separately the one that stages. A renderer
         reads `rulers` to draw and `ruler` to know which drawing is the answer;
         neither needs to know a policy's name to do it. */
      rulers: rulers,
      ruler: stagingRuler,
      /* The chip beside the number: the band the patient is in, named. Null
         where nothing stages — and a null chip prints "—", never "normal". */
      verdict: stagingRuler ? stagingRuler.verdict : null,
      verdicts: verdicts,
      /* Named, not resolved. Two scales shown together preserve a disagreement
         that a blended number would erase (SCHEMA 10.5). */
      disagreement: disagree
        ? 'The guideline ladder and the published primary studies place this ' +
          'value in different bands. Both are shown; neither is preferred.'
        : null,
      provenance: hasValue ? provenanceSentence(row) : null,
      gap: row.staging === null || row.gate ? gapSentence(row) : null,
      /* W-071. The code of the reason `gapSentence` promoted, beside the
         sentence it promoted. The renderer must not re-run the ranking to find
         out which refusal won: that is a decision, and the renderer carries
         none (`v2/tests/render.test.js` section K). Null wherever the card
         stages. */
      gapCode: row.staging === null || row.gate ? gapCodeOf(row) : null,
      /* W-063. True only for a row on the page SOLELY because it was
         toggled on: no value, AND nothing else already explains the
         absence (no technique gate, no unstageable ladder — both already
         print their own message through `gap` above, and this must never
         print alongside one, per W-051's one-sentence-per-card rule). */
      noData: !hasValue && row.staging !== null && !row.gate,
      /* W-038 — the limit a drawn record's own publication states on it. NOT an
         abstention: the chip, the rulers and the staging above are untouched,
         and the reader is told how far the number its source says it carries. */
      useCaveats: row.scales ? useCaveatsOf(row) : []
    };
  });
}

/* ═════════════════════════════════════════════════════ PAGE 2 — THE RECEIPTS
   Everything the card could not carry without becoming a citation list: which
   published records stand behind each boundary, what the two ladders actually
   say where they differ, what was held back and why, and what is simply not
   published.

   ⛔ NO VERDICT APPEARS HERE. The receipts describe the LITERATURE; the card
      describes the patient. A stage index on page 2 would be the same fact
      printed twice, and the second printing is the one a reader would have to
      reconcile with the first. */

function sourcesOf(row) {
  const seen = new Set();
  const out = [];
  for (const policy of row.drawable) {
    for (const b of row.scales[policy].boundaries) {
      for (const src of (b.sources || [])) {
        if (seen.has(src.cutoffId)) continue;
        seen.add(src.cutoffId);
        for (const ref of (src.refs || [])) {
          out.push({
            boundary: b.boundary,
            value: src.value,
            unit: b.unit,
            cohort: src.cohort,
            /* A brand inside a citation is PROVENANCE, not advertising, and it
               prints on every path — CAL-0001's GE Signa derivation appears on a
               Siemens site too, and the mirror obligation holds for a cut-off
               that comes from a Siemens cohort. */
            citation: ref.citation || null,
            pmid: ref.pmid || null,
            vendorClass: src.vendorClass,
            evidenceGrade: src.evidenceGrade
          });
        }
      }
    }
  }
  return out;
}

/* The disagreement in full — as a statement about the two LADDERS, with both
   sets of numbers, so a reader can see the size of it. Never resolved, never
   averaged: any weighting would itself be an unsourced clinical number, and
   blending erases a difference that is clinically actionable (SCHEMA 10.5). */
function disagreementOf(row) {
  if (row.drawable.length < 2) return null;
  const g = row.scales.guideline, p = row.scales['primary-studies'];
  if (!g || !p || !g.complete || !p.complete) return null;
  const lines = [];
  for (let i = 0; i < g.boundaries.length; i++) {
    const gb = g.boundaries[i], pb = p.boundaries[i];
    if (gb.value === pb.value) continue;
    const spread = (pb.min !== null && pb.min !== undefined && pb.min !== pb.max)
      ? ` (${pb.meanLabel}, ${pb.min}–${pb.max})` : ` (${pb.meanLabel})`;
    lines.push(`${gb.boundary}: guideline ${gb.value} ${gb.unit} vs ` +
               `published studies ${pb.value} ${pb.unit}${spread}`);
  }
  if (!lines.length) return null;
  return 'The guideline ladder and the published primary studies do not agree on ' +
         'every boundary. Both are printed and neither is adjusted to fit the ' +
         'other: ' + lines.join('; ') + '.';
}

/* Evidence held back for a reason about the EVIDENCE — never silent. */
function withheldOf(row) {
  const flags = new Set();
  for (const policy of Object.keys(row.scales || {})) {
    for (const f of (row.scales[policy].flags || [])) flags.add(f);
  }
  if (!flags.has('ambiguous-technique-records-excluded')) return null;
  return 'Further published values for this measurement exist but name their ' +
         'sequence ambiguously, and were held back rather than assumed. They can ' +
         'be shown on request; they are not counted in anything printed here.';
}

/* Grouped BY REASON, not by boundary — one line per distinct reason, naming
   every boundary it applies to.

   W-051 measured the cost of the other order. This string is what the
   methodology sheet's gap table prints, and a four-rung ladder whose every rung
   failed for the same cause wrote that cause four times. On the non-specific
   scanner path, where no GE-explicit record matches and most boundaries fail
   identically, the table ran the printed report from 4 pages to 6 — measured,
   same fixture before and after, three counting methods agreeing.

   ⛔ NOTHING IS DROPPED. Every (boundary, reason) pair that went in comes out;
      only the order changed, so the same fact is stated once with its full list
      of boundaries instead of once per boundary. That is the defect W-051 fixed
      on the card, arriving on the sheet the card's words were moved to. */
function gapOf(row) {
  if (row.gate) return row.gate;
  const grouped = [];
  for (const g of (row.gaps || [])) {
    for (const r of (g.reasons || [])) {
      let entry = grouped.filter(x => x.reason === r.reason)[0];
      if (!entry) { entry = {reason: r.reason, boundaries: []}; grouped.push(entry); }
      if (entry.boundaries.indexOf(r.boundary) === -1) entry.boundaries.push(r.boundary);
    }
  }
  return grouped.length
    ? grouped.map(e => `${e.boundaries.join(', ')}: ${e.reason}`).join(' · ')
    : null;
}

/* ────────────────────────────────────────────────── THE ORDER OF THE CARDS
   THE ORDER IS FIXED (W-061, developer decision 2026-08-25). It is not computed
   from the reading, from the indication or from anything the patient's values can
   change; `orderCards` below lists, and the list is `REPORT_PARAMETERS`.

   What stands here instead is the severity RANK, which is still computed and is
   read by `buildImpression` as the definition of "abnormal". Four classes, most
   severe first:

     0  abnormal — a severity resolved to something other than 'ok'
     1  a described gap — it outranks a normal reading, because a reader who
        cannot find a parameter reads its absence as reassurance
     2  severity not sourced — a null sev is an ABSENCE OF EVIDENCE, not a
        finding of normality (CLAUDE.md § 1.2)
     3  normal

   W-044 emptied class 2 of real parameters and it is deliberately kept: it is the
   landing place for a future parameter whose ladder cannot name its own sides, and
   deleting it would make such a reading rank as normal.

   WHAT WAS DELETED HERE, AND WHY IT IS WRITTEN DOWN RATHER THAN SIMPLY GONE.
   `INDICATION_PARAMETERS` listed, per indication, the parameters that came first
   inside a severity class. It was MEASURED DEAD on 2026-08-25: all four
   indications printed one and the same order, because the lists never named the
   iron rows and every heading outside iron holds a single card. Keeping a dead
   criterion beside a fixed order would have left a second, contradictory answer
   to the question this section settles. */

/* The domain vocabulary is domains.js's, read back in the order the report
   prints: fat, iron, fibrosis, relaxometry, third-party, diffusion. */
const CARD_DOMAIN_ORDER = ['pdff', 'iron', 'mre', 't1', 'ct1', 'adc'];

function severityClass(card) {
  /* W-015 Task 6. A card whose reading is WITHHELD is ranked by the fact that it
     is unresolved, never by the severity it refuses to state -- so it sits with
     the described gaps: above every normal reading, below every asserted
     abnormal one. Ranking it by `verdict.sev` would put a withheld F0 at the
     bottom of the page, in the position a reassuring reading occupies, and a
     withheld F3 at the top on the strength of a band this report will not
     print. Both are the same defect. */
  if (card.interpretable === false) return 1;
  if (card.verdict && card.verdict.sev) return card.verdict.sev === 'ok' ? 3 : 0;
  if (card.gap) return 1;
  return 2;
}

/* CARD ORDER IS FIXED (W-061).

   This function used to sort: severity class first, then the indication's own
   parameters, then domain, then the engine's row order. Both criteria were
   measured dead outside the interior of the iron group, and inside it the
   severity criterion was actively wrong — an empty card ranked 2 and a normal
   reading 3, so answering a question sank the card that had just been answered
   below one that had not. A reader who answers a question must not watch the
   question move.

   `severityClass` is deliberately KEPT and is untouched; what it lost is its say
   over position. That is W-030's guarantee moving from position to naming: the
   impression states the finding, its value and its band wherever the card sits.

   `seq` is still carried, because `groupCardsByDomain` and both renderers consume
   the pair shape. NOTHING IS FILTERED — losing a card is the one thing this layer
   may never do (W-030 § 5), and a lister can drop a row as easily as a sort. */
function orderCards(report, cards) {
  const pairs = [];
  for (let i = 0; i < report.rows.length; i++) {
    if (!report.rows[i].rendered) continue;
    pairs.push({row: report.rows[i], card: cards[i], seq: i});
  }
  return pairs;
}

/* WHICH HEADING A CARD IS PRINTED UNDER (W-035).
   This sits on top of `orderCards` and replaces nothing: the severity ranking
   above is what the model asserts, and section O still holds over it. What is
   decided here is the reading order on the page — each card under the domain it
   belongs to, so LIC is read beside the two measurements it shares a method
   control with rather than wherever severity happened to put it.

   The heading order is FIXED (developer decision, 2026-08-24) and severity ranks
   only inside a group. That deliberately gives up W-030's "the abnormal reading
   is always at the top", and the cost is asserted rather than left to be
   discovered: logic.test.js R6 prints an abnormal LIC third, under iron, on
   purpose. What must not depend on position is the finding being seen at all —
   the impression block names it.

   A domain nobody listed in CARD_DOMAIN_ORDER gets its own group at the end. A
   lookup that silently skipped it would be a filter wearing the costume of a
   sort, and losing a card is the one thing this layer may never do (W-030 § 5). */
function groupCardsByDomain(pairs) {
  const groups = [];
  /* A READING REACHED THROUGH A CALIBRATION IS PRINTED AFTER ITS INPUTS (W-033,
     developer decision 2026-08-24). LIC is computed from R2* or T2*, and meeting
     it first means meeting a number whose inputs are still further down the
     page. Inside a group it therefore sorts last, and everything else keeps the
     order `orderCards` gave it.

     The key is `row.calibration` — HOW the reading is obtained — and deliberately
     not `valueProvenance`, which says whether this particular report computed it.
     A card that moved up the page the moment somebody typed an override would
     make the override look like a different reading, and the FerriScan path,
     where LIC is measured and no calibration exists to derive it, would print in
     two different places depending on what was entered. */
  const push = domain => {
    const inDomain = pairs.filter(p => p.row.domain === domain);
    const measured = inDomain.filter(p => p.row.calibration === null);
    const throughCalibration = inDomain.filter(p => p.row.calibration !== null);
    if (inDomain.length) {
      groups.push({domain: domain, pairs: measured.concat(throughCalibration)});
    }
  };
  for (const domain of CARD_DOMAIN_ORDER) push(domain);
  const listed = {};
  for (const domain of CARD_DOMAIN_ORDER) listed[domain] = true;
  const seen = {};
  for (const p of pairs) {
    const d = p.row.domain;
    if (listed[d] || seen[d]) continue;
    seen[d] = true;
    push(d);
  }
  return groups;
}

/* ─────────────────────────────────────────────────── LABORATORY (SUPPORTING)
   V1's block, ported. The two indices are computed HERE rather than in a
   renderer because they are model facts, and their provenance travels with them:
   CAL-0005 is `editorial-unsourced` and flagged `formula-origin-not-in-workbook`
   — the workbook applies FIB-4 but publishes neither the formula nor its
   originating paper. That is printed with the value, not dropped because the
   number is convenient. */
const LAB_INPUTS = [
  {key: 'ast',      label: 'AST',              unit: 'U/L'},
  {key: 'alt',      label: 'ALT',              unit: 'U/L'},
  {key: 'plt',      label: 'Platelets',        unit: '10\u2079/L'},
  {key: 'ferritin', label: 'Ferritin',         unit: 'ng/mL'},
  {key: 'tsat',     label: 'Transferrin sat.', unit: '%',
   /* DELIBERATELY UNUSED by the synthesis, and recorded as such rather than
      left silent (CLAUDE.md 1.2). No rule in Technical_Limitations triggers on
      transferrin saturation. Routing it into the impression on the strength of
      clinical familiarity would be an unsourced inference. It is collected and
      printed because a reader asked for the iron panel; it stages nothing. */
   unusedBySynthesis: 'no interaction rule triggers on transferrin saturation'}
];

/* THE CLINICAL-CONTEXT BLOCK (W-015). Four optional fields that let the
   published confounder rules fire at all. Every one is optional, and a blank
   field NEVER fires a rule \u2014 it makes the rule abstain, and the abstention is
   reported, so a missing input is visible rather than read as a negative
   finding.

   \u26d4 This is a NON-IMAGING input. It carries no `quantification` tier and is
      never routed through resolveScope() \u2014 a field with no tier is outside that
      resolver's domain entirely, the same reason ferritin and FIB-4 survive at
      every scope tier (SCHEMA 11.8).

   altUln exists because INT-0035 triggers on a multiple of the SITE's normal
   range, not on a fixed ALT value. Without it the multiple cannot be computed
   and the rule abstains rather than firing on an assumed laboratory range.

   Height and weight (heightCm, weightKg) are collected solely to derive bmi when
   it is not typed directly (W-063); no rule reads either height or weight
   separately. */
const CONTEXT_INPUTS = [
  {key: 'bmi',      label: 'Body-mass index',   unit: 'kg/m\u00b2', type: 'number'},
  {key: 'ascites',  label: 'Ascites',           unit: null,    type: 'boolean'},
  {key: 'altUln',   label: 'ALT upper limit',   unit: 'U/L',   type: 'number'},
  {key: 'ggt',      label: 'GGT',               unit: 'U/L',   type: 'number'}
];

function buildContext(selection) {
  const v = (selection && selection.values) || {};
  const out = {};
  for (const f of CONTEXT_INPUTS) {
    if (f.type === 'boolean') {
      out[f.key] = (v[f.key] === true || v[f.key] === false) ? v[f.key] : null;
    } else {
      out[f.key] = numberOr(v[f.key]);
    }
  }
  /* W-063. `bmi` from CONTEXT_INPUTS above already carries a TYPED value or
     null. A typed value is never overwritten (the same rule LIC's
     calibration lives by, buildRow above) — only an ABSENT bmi is derived,
     and only when both height and weight are present to derive it from.
     This is BMI's own definition, not a fitted clinical constant, so it
     carries no CAL-#### record and no citation (spec § 7). */
  const heightCm = numberOr(v.heightCm);
  const weightKg = numberOr(v.weightKg);
  out.heightCm = heightCm;
  out.weightKg = weightKg;
  if (out.bmi === null && heightCm !== null && weightKg !== null) {
    out.bmi = Math.round((weightKg / Math.pow(heightCm / 100, 2)) * 10) / 10;
    out.bmiDerived = true;
  } else {
    out.bmiDerived = false;
  }
  return out;
}

function calibrationRecord(id) {
  return _R.CALIBRATIONS.filter(c => c.id === id)[0] || null;
}

function numberOr(v) {
  return (typeof v === 'number' && !isNaN(v)) ? v : null;
}

function buildLabs(selection) {
  const v = (selection && selection.values) || {};
  const inputs = LAB_INPUTS.map(f => ({
    key: f.key, label: f.label, unit: f.unit, value: numberOr(v[f.key])
  }));
  const age = numberOr(selection && selection.age);
  const ast = numberOr(v.ast), alt = numberOr(v.alt), plt = numberOr(v.plt);

  const cal = calibrationRecord('CAL-0005');
  const canFib4 = age !== null && ast !== null && alt !== null && alt > 0 &&
                  plt !== null && plt > 0;
  const fib4 = {
    value: canFib4 ? (age * ast) / (plt * Math.sqrt(alt)) : null,
    expression: cal ? cal.expression : null,
    provenance: cal ? cal.provenance : null,
    flags: cal ? (cal.dataQualityFlags || []).slice() : []
  };

  /* aar (AST/ALT ratio) is printed but, like tsat above, DELIBERATELY UNUSED by
     the synthesis — no interaction rule in Technical_Limitations triggers on it.
     Computed and shown because a reader expects the ratio beside the two values
     it comes from; staging nothing on the strength of that expectation. */
  const aar = {value: (ast !== null && alt !== null && alt > 0)
    ? Math.round((ast / alt) * 100) / 100 : null};

  const missing = [];
  if (age === null) missing.push('age');
  if (ast === null) missing.push('AST');
  if (alt === null) missing.push('ALT');
  if (plt === null) missing.push('platelets');

  return {
    inputs: inputs, fib4: fib4, aar: aar,
    /* Named, not blank: an empty grid reads as "nothing abnormal". */
    pending: missing.length
      ? 'FIB-4 is not computed: ' + missing.join(', ') + ' ' +
        (missing.length === 1 ? 'has' : 'have') + ' not been entered. Nothing is ' +
        'assumed for a missing laboratory value.'
      : null
  };
}

/* ───────────────────────────────────────────────────────── COMPOSITE — MEFIB
   BOTH constants come from CAL-0006, which is the record that exists precisely
   so the rule is evaluated from one place: CUT-0067 / CUT-0068 carry the MRE
   component because it is expressible as a boundary, and their own notes say the
   FIB-4 component "has no home in this schema". V1 reassembles the rule from a
   cut-off plus a hard-coded 1.6; this does not — nothing below writes 3.3 or 1.6.

   The rule is THREE-state, as the record states it: both true rules in, both
   false rules out, and one of each is indeterminate. Collapsing the third state
   would turn "not positive" into "negative", which is the reading it exists to
   prevent. */
function buildComposite(report, labs, reliability) {
  const cal = calibrationRecord('CAL-0006');
  const mreRow = report.rows.filter(r => r.parameter === 'mre')[0] || null;
  const mre = mreRow ? numberOr(mreRow.value) : null;
  const fib4 = labs.fib4.value;
  /* W-065 item 1. The rule-out strength is stated HERE, and no longer on the
     chip. `NPV 93%` stood on that chip until W-018 read both cited papers in
     full: 92.8 occurs zero times in Jung 2021 and zero times in EASL 2024,
     which publishes no predictive value at all (LITERATURE.md 9.17.5). Jung
     measures the rule-out in two cohorts and they disagree by 24 points, so
     averaging them would be an unsourced clinical number (CLAUDE.md 1.4) and
     quoting one would name a cohort the record does not. The chip carries the
     verdict; both measured figures print here with the cohort each belongs to.
     The rule-in PPV is untouched: 97.1% occurs six times in the same paper. */
  const note = 'MAST is not computed here: CAL-0007 records that the workbook ' +
    'publishes MAST\u2019s two thresholds and never its coefficients, so the ' +
    'expression is null and stays null. Use a validated calculator. ' +
    'MEFIB\u2019s published strength (Jung 2021, PMID 33214165): rule-in ' +
    'PPV 97.1%; rule-out NPV 83.2% in the derivation cohort and 59.4% in the ' +
    'validation cohort \u2014 two cohort figures, so no single rule-out ratio ' +
    'is stated beside the verdict.';

  /* W-015 Task 6. MEFIB rules F>=2 IN at 97% PPV, and it rules it in from the
     MRE stiffness. Where a reliability rule has withheld that stiffness, the
     composite has nothing left to rule in from: computing it anyway would
     restate, as a composite verdict, exactly the claim the card above refuses
     to make -- a stage with a footnote, which is what this task exists to
     remove. The rule ABSTAINS, and says why. */
  const mreWithheld = !!(reliability && reliability.byParameter &&
                         reliability.byParameter.mre &&
                         reliability.byParameter.mre.interpretable === false);
  if (cal && mreWithheld) {
    return {
      id: cal.id, name: cal.name, verdict: null, lines: [], note: note,
      pending: 'MEFIB is not computed: the MRE stiffness is not interpretable on ' +
               'this study, and the rule reads that stiffness directly. Nothing is ' +
               'ruled in or out from a measurement this report has withheld.'
    };
  }

  if (!cal || mre === null || fib4 === null) {
    return {
      id: cal ? cal.id : 'CAL-0006', name: cal ? cal.name : 'MEFIB rule',
      verdict: null, lines: [], note: note,
      pending: 'MEFIB needs an MRE stiffness and a computed FIB-4. ' +
               (mre === null ? 'MRE has not been entered. ' : '') +
               (fib4 === null ? 'FIB-4 could not be computed. ' : '') +
               'No composite is stated from a partial input.'
    };
  }

  const c1 = mre >= cal.coefficients.mreKPa;
  const c2 = fib4 >= cal.coefficients.fib4;
  const verdict = (c1 && c2)
    ? {band: 'POSITIVE', tag: 'Rule-in F>=2 (PPV 97%)', sev: 'high'}
    : (!c1 && !c2)
      ? {band: 'NEGATIVE', tag: 'Rule-out F>=2', sev: 'ok'}
      : {band: 'INDETERMINATE', tag: 'Neither rules in nor rules out', sev: 'mid'};

  return {
    id: cal.id, name: cal.name, verdict: verdict, note: note, pending: null,
    /* The two contributing values as labelled facts that say WHERE each came
       from — the MRE card above, and FIB-4 from the laboratory block. */
    lines: [
      {label: 'MRE stiffness', value: mre, unit: 'kPa',
       origin: 'from the MRE card above',
       test: 'MRE >= ' + cal.coefficients.mreKPa + ' kPa', met: c1},
      {label: 'FIB-4', value: Math.round(fib4 * 100) / 100, unit: null,
       origin: 'from the laboratory block',
       test: 'FIB-4 >= ' + cal.coefficients.fib4, met: c2}
    ]
  };
}

/* ───────────────────────────────────────────── CONSIDERATIONS — THE SUMMARY (W-098)
   The impression states each finding. This gathers what the findings ADD UP TO
   into one closing block — and every sentence in it is either a value the engine
   computed or a published sentence quoted verbatim from `CONSIDERATIONS`. It
   NEVER authors a synthesis (design spec §§ 1, 3, 6).

   Three doors, all of which must open for a consideration to fire (spec § 6):
     1. the study's cohort and indication are in the record's `pattern` — a
        `non-specific` indication matches nothing, by construction;
     2. every required parameter is measured AND interpretable — a withheld
        reading cannot feed a consideration, mirroring buildComposite()'s MEFIB
        abstention;
     3. every required parameter's printed verdict band is one the pattern lists.

   A consideration whose pattern applied but whose inputs were missing or
   withheld is SILENT in the prose and NOT silent in the report: it returns a
   `gap` the coverage clause prints (SCHEMA § 10.3). A consideration that just
   did not match a band (the finding is normal, or a different grade) returns
   nothing — silence is the correct answer there.

   Returns STRUCTURED data, never prose: render.js composes the sentences, the
   same split buildImpression already uses for `facts` / `keyFindings`. No
   reference id, trigger id or grade letter is in anything returned here
   (logic.test.js L9 / L10) — a source is named only by its `readerLabel`. */
function buildConsiderations(args) {
  const cards = args.cards || [];
  const rel = args.reliability || {byParameter: {}};
  const sel = args.selection || {};
  const composite = args.composite || null;
  const indication = sel.indication || 'non-specific';
  const cohort = sel.cohort || null;

  const byParam = {};
  for (const c of cards) byParam[c.parameter] = c;

  const fired = [];
  const gaps = [];
  const seenStatements = new Set();
  for (const cns of (_R.CONSIDERATIONS || [])) {
    const p = cns.pattern || {};
    if ((p.indication || []).indexOf(indication) === -1) continue;
    if (p.cohort && p.cohort !== cohort) continue;

    let allMet = true;
    let missingInput = null;   /* a required reading absent or withheld */
    for (const req of (p.requires || [])) {
      const card = byParam[req.parameter];
      const r = rel.byParameter[req.parameter];
      const hasValue = !!card && card.value !== null && card.value !== undefined;
      const interpretable = !(r && r.interpretable === false);
      const band = card && card.verdict && card.verdict.band;
      if (!hasValue || !interpretable) {
        allMet = false;
        missingInput = {parameter: req.parameter, reason: hasValue ? 'withheld' : 'not-measured'};
        break;
      }
      if (!band || (req.bands || []).indexOf(band) === -1) {
        allMet = false;   /* band did not match — not a gap, just no fire */
        break;
      }
    }

    if (allMet) {
      if (seenStatements.has(cns.statement)) continue;   /* W-051: one text, no repeat */
      seenStatements.add(cns.statement);
      fired.push({
        statement: cns.statement,
        sourceStrength: cns.sourceStrength,
        readerLabel: cns.readerLabel,
        refIds: (cns.sourceRefIds || []).slice()
      });
    } else if (missingInput) {
      gaps.push({
        parameter: missingInput.parameter,
        reason: missingInput.reason,
        readerLabel: cns.readerLabel
      });
    }
  }

  /* The published composite verdicts, restated as the block's lead (spec § 7.1).
     The holistic synthesis here is a cited publication's, not the tool's. */
  const composites = [];
  if (composite && composite.verdict && composite.verdict.band) {
    const cal = calibrationRecord(composite.id);
    composites.push({
      label: composite.name,
      band: composite.verdict.band,
      tag: composite.verdict.tag || null,
      refIds: (cal && cal.sourceRefIds ? cal.sourceRefIds.slice() : [])
    });
  }

  /* Coverage: what the summary rests on, as parameter keys — render.js turns
     these into reader words with its existing helpers (readerWord / listWords). */
  const assessed = [], notAssessed = [], withheld = [];
  for (const c of cards) {
    const r = rel.byParameter[c.parameter];
    if (r && r.interpretable === false) { withheld.push(c.parameter); continue; }
    if (c.value === null || c.value === undefined) { notAssessed.push(c.parameter); continue; }
    assessed.push(c.parameter);
  }

  const panelRefIds = [];
  const addRef = id => { if (panelRefIds.indexOf(id) === -1) panelRefIds.push(id); };
  for (const f of fired) f.refIds.forEach(addRef);
  for (const cp of composites) cp.refIds.forEach(addRef);

  const sourceLabels = [];
  for (const f of fired) if (sourceLabels.indexOf(f.readerLabel) === -1) sourceLabels.push(f.readerLabel);

  return {
    /* The block renders whenever there is a real report to close off; its weight
       scales with content — composites and considerations when present, the
       coverage clause always. */
    present: cards.length > 0,
    composites: composites,
    considerations: fired,
    gaps: gaps,
    coverage: {assessed: assessed, notAssessed: notAssessed, withheld: withheld},
    verb: args.verb || 'shows',
    panelRefIds: panelRefIds,
    sourceLabels: sourceLabels
  };
}

/* ────────────────────────────────────────────────────────────────── IMPRESSION
   V1's composer shape against V2's model: a short composed paragraph, then the
   red-flag lines. Assembled from what is already in hand — the staged rows, the
   disagreements, the described gaps.

   ⛔ NO ETIOLOGY, NO DISEASE NAME, NO PROBABILITY, NO TREATMENT. This states what
      the measurements are and what the published ladders make of them. The
      evidence-based synthesis is W-015 § C and keeps its own card and its own
      approval gate (W-030 § 8).

   W-015 splits the single composed paragraph into TWO fields: `clinical` for the
   printed page (plain language, no citation) and `evidence` for an appendix
   printed on request (the same reasoning, with what it rests on). The FACT that
   a parameter is not interpretable belongs to `clinical` even when the appendix
   is never rendered; only the reason, the rung and the reference ids move to
   `evidence` (CLAUDE.md § 1.2 — a gap is an object the report can print, not an
   empty result the reader mistakes for "normal"). */

/* The reliability pass. Runs AFTER buildCards, because the rules that name iron
   or steatosis resolve from verdicts this report has already printed rather than
   from a threshold of their own (design section 4), and BEFORE buildImpression,
   which composes its answer. Pure: it reads the cards, it does not write them. */
function buildReliability(cards, labs, selection) {
  const sel = selection || {};
  const values = {}, abnormal = {};
  for (const c of cards) {
    values[c.parameter] = c.value;
    /* severityClass() at line 873 is the existing definition of "abnormal":
       a verdict whose severity is anything other than `ok`. */
    abnormal[c.parameter] = !!(c.verdict && c.verdict.sev && c.verdict.sev !== 'ok');
  }
  const lab = {};
  for (const f of LAB_INPUTS) lab[f.key] = numberOr((sel.values || {})[f.key]);

  return _R.applyReliability({
    values: values, context: buildContext(sel), labs: lab,
    field: sel.fieldStrength || '1.5T', abnormal: abnormal,
    triggers: _R.TRIGGERS, interactions: _R.INTERACTIONS
  });
}

/* The wording cap. An A floor may state, a B floor may report, a C floor may
   only suggest. A table rather than a composed sentence, so the same floor
   cannot produce two different strengths of claim on two different reports. */
const FLOOR_VERB = {A: 'shows', B: 'indicates', C: 'suggests'};

function evidenceFloor(modifiers, references) {
  const byId = new Map(references.map(r => [r.id, r]));
  let floor = 'A';
  for (const m of modifiers) {
    for (const id of m.refIds) {
      const g = byId.get(id) && byId.get(id).evidenceGrade;
      if (g === 'C') floor = 'C';
      else if (g === 'B' && floor !== 'C') floor = 'B';
    }
  }
  return floor;
}

/* W-015. A reading whose acquisition may have failed is not a reading -- but the
   ruler and the marked value survive, and only the report's own ASSERTION is
   withheld (design section 5). A separate pass from buildCards on purpose:
   buildCards produces the verdicts the reliability pass reads, so a card cannot
   know its own interpretability while it is being built. */
function markInterpretability(cards, reliability) {
  const by = (reliability && reliability.byParameter) || {};
  const fired = (reliability && reliability.fired) || [];
  const byTrigger = new Map(fired.map(m => [m.triggerId, m]));

  for (const card of cards) {
    const r = by[card.parameter];
    card.interpretable = !r || r.interpretable !== false;
    card.notInterpretableReason = card.interpretable ? null : r.clinicalReason;
    /* W-015, developer decision 2026-08-24: the REASON travels with the withheld
       reading, in the parameter's own field, with its short reference -- it is no
       longer appendix-only. What moved is a presentation rule, not the evidence
       rule: the sentence printed here is the workbook's own cited statement,
       quoted, never a summary written at this layer, and the reference ids are
       the ones the methodology table resolves. The generic clinicalReason stays
       as the plain-language line in the impression; this is the specific one. */
    card.notInterpretableReasons = [];
    if (card.interpretable || !r) continue;

    const seen = new Set();
    for (const m of r.modifiers) {
      if (m.effect !== 'fails' && m.effect !== 'uninterpretable') continue;
      /* Keyed by the INTERACTION, not the trigger: two triggers can be two
         machine-readable readings of ONE workbook sentence (BMI > 35 and
         T2* < 12 ms are both INT-0033), and printing that sentence twice tells
         the reader nothing the first printing did not. */
      const key = m.interactionId || m.statement || m.triggerId;
      if (seen.has(key)) continue;
      seen.add(key);
      card.notInterpretableReasons.push({
        statement: m.statement, refIds: (m.refIds || []).slice(),
        effect: m.effect, inheritedFrom: null
      });
    }
    /* An inherited downgrade prints the rule that fired on the SOURCE parameter,
       named as inherited. Without the source's own sentence the reader is told a
       reading was withheld and never told by what -- which is the footnote this
       task removes, one level up. */
    for (const inh of r.inherited) {
      const m = byTrigger.get(inh.triggerId);
      const key = inh.interactionId || (m && m.statement) || inh.triggerId;
      if (seen.has(key)) continue;
      seen.add(key);
      card.notInterpretableReasons.push({
        statement: m ? m.statement : null, refIds: m ? (m.refIds || []).slice() : [],
        effect: m ? m.effect : null, inheritedFrom: inh.from
      });
    }
  }
  return cards;
}

/* A key the engine uses, in the words the reader was given it in. `bmi`,
   `altUln` and `lic` are identifiers, and identifiers do not go on the clinical
   page (fix round 2, finding A) -- but the FACT that one was not provided still
   has to be sayable there, so it is said with the label the entry screen printed
   beside the field. */
function readerWord(key) {
  const ctx = CONTEXT_INPUTS.filter(f => f.key === key)[0];
  if (ctx) return ctx.label;
  if (PARAMETER_LABELS[key]) return PARAMETER_LABELS[key];
  const lab = LAB_INPUTS.filter(f => f.key === key)[0];
  return (lab && lab.label) || key;
}

/* "a, b and c" -- the reader's list, not an array's join. */
function listWords(words) {
  if (words.length < 2) return words.join('');
  return words.slice(0, -1).join(', ') + ' and ' + words[words.length - 1];
}

/* W-072. Only fields the physician actually entered reach this sentence.
   Age is deliberately NOT restated here: no age boundary derives the cohort
   anywhere in v2/data/ or v2/js/ (the `age` cell's own note in render.js's
   IDENTITY_CELLS says the same, checked rather than recalled), and printing
   a raw age beside the cohort would imply the report reasons from it, which
   it does not. `readerWord`/`listWords` are the same helpers the abstention
   sentences already use (lines 1590-1602) -- one vocabulary, not two. */
function buildHistory(selection, context, labs) {
  const identity = (selection.cohort === 'adult' ? 'An adult' : 'A paediatric') +
    ' study at ' + selection.fieldStrength + ', requested for ' +
    (INDICATION_READER_LABEL[selection.indication] || INDICATION_READER_LABEL['non-specific']) + '.';

  const provided = [];
  for (const f of CONTEXT_INPUTS) {
    const v = context[f.key];
    if (v === null || v === undefined) continue;
    provided.push(f.label + ' ' + (f.type === 'boolean' ? (v ? 'present' : 'absent')
                                                          : v + (f.unit ? ' ' + f.unit : '')));
  }
  for (const f of labs.inputs) {
    if (f.value === null) continue;
    provided.push(f.label + ' ' + f.value + (f.unit ? ' ' + f.unit : ''));
  }

  if (!provided.length) {
    return identity + ' No laboratory or clinical-context values were provided.';
  }
  return identity + ' ' + listWords(provided) + (provided.length === 1 ? ' was' : ' were') +
    ' entered; other laboratory and clinical-context fields were not entered.';
}

function buildImpression(model) {
  const rows = model.report.rows;
  const cards = model.cards.filter((c, i) => rows[i].rendered);
  const rel = model.reliability ||
              buildReliability(cards, model.labs, model.selection);

  /* W-072. `useCaveatsOf` needs the ROW (row.scales, row.drawable), which
     `cards` alone does not carry past this point. Same filter, same order,
     as the line above -- renderedRows[i] and cards[i] are always the same
     row. Only the first caveat per row is taken (there is at most one
     useCaveat-bearing cut-off drawn per row today; buildReceipts() keeps the
     full array for the methodology sheet, this is the clinical-page copy). */
  const renderedRows = rows.filter(row => row.rendered);
  const rowCaveats = {};
  for (let i = 0; i < cards.length; i++) {
    const rr = renderedRows[i];
    if (!rr || !rr.scales) continue;
    const caveats = useCaveatsOf(rr);
    if (caveats.length) rowCaveats[cards[i].parameter] = caveats[0];
  }

  /* clinical: plain language. No citation, no reference id, no grade letter.
     EVERY rendered card reaches exactly one of these three branches, and no
     card reaches none — a card cannot be measured and simply absent from
     `clinical` (fix round 1: a `gap`ped card with a value used to fall
     through both this loop and `notAssessed` below, which is a breach of
     CLAUDE.md § 1.2 this project does not get to relax). */
  const facts = [{parameter: null,
                  text: buildHistory(model.selection, buildContext(model.selection), model.labs)}];
  const usedStatements = new Set();
  const gapDetails = [];
  /* W-112. Alongside `facts` (the flat, history-first union kept verbatim for
     logic.test.js P7/P9 and any non-render consumer), every per-card fact is
     also filed by what it is worth to a reader: `noninterp` and `abnormal` and
     `gap` are the readings the page should lead with, `normal` folds into one
     closing sentence, and `normal-qualified` is a normal reading that carried a
     published qualifier which must not be lost to that fold. The classes are
     the same four `severityClass` ranks; the renderer, not this function,
     composes them into the two labelled groups. */
  const classified = [];
  for (const c of cards) {
    const r = rel.byParameter[c.parameter];
    const hasValue = c.value !== null && c.value !== undefined;
    if (r && r.interpretable === false) {
      const text = c.label + ' was measured but is not interpretable on this ' +
                   'study. ' + r.clinicalReason;
      facts.push({parameter: c.parameter, text: text});
      classified.push({parameter: c.parameter, text: text, kind: 'noninterp'});
    } else if (hasValue && c.gap) {
      /* Measured, and no published boundary covers it. Plain language only —
         the gap's own citations and reasons are reported through
         buildReceipts() on page two; here only the FACT of the absence, and
         that it is an absence of evidence rather than a normal result. */
      const text = c.label + ' was measured, and no published boundary ' +
                   'covers this value. That is an absence of evidence, ' +
                   'not a normal result.';
      facts.push({parameter: c.parameter, text: text});
      classified.push({parameter: c.parameter, text: text, kind: 'gap'});
      gapDetails.push({parameter: c.parameter, reason: c.gap});
    } else if (c.verdict && c.verdict.band) {
      let text = c.label + ' ' + c.value + (c.unit ? ' ' + c.unit : '') +
                 ' — ' + c.verdict.band + '.';
      let qualified = false;
      /* W-072. Every modifier that fired for this parameter and does NOT
         block interpretability (fails/uninterpretable already produced the
         OTHER branch above, via r.clinicalReason) is a published statement
         about why this reading may look the way it does. Printed once per
         report -- usedStatements is the W-051 guard, so a modifier that
         fired on two targets is not read out twice. */
      const modifiers = (r && r.modifiers) || [];
      for (const m of modifiers) {
        if (m.effect === 'fails' || m.effect === 'uninterpretable') continue;
        if (!m.statement || usedStatements.has(m.statement)) continue;
        usedStatements.add(m.statement);
        text += ' ' + m.statement;
        qualified = true;
      }
      /* W-072. The one existing useCaveat (CUT-0009, peds PDFF) is the
         source's OWN stated scope-of-use limit, quoted verbatim -- the same
         record buildReceipts() already prints on the methodology sheet, now
         also reaching the clinical paragraph. usedStatements is shared with
         the modifiers loop above so the same statement never prints twice. */
      const caveat = rowCaveats[c.parameter];
      if (caveat && !usedStatements.has(caveat.statement)) {
        usedStatements.add(caveat.statement);
        text += ' “' + caveat.statement + '”';
        qualified = true;
      }
      facts.push({parameter: c.parameter, text: text});
      const abnormal = c.verdict.sev && c.verdict.sev !== 'ok';
      classified.push({parameter: c.parameter, text: text,
                       kind: abnormal ? 'abnormal'
                                      : (qualified ? 'normal-qualified' : 'normal')});
    }
  }

  /* W-112. The reading order inside "Key findings": a reading the report could
     not interpret first, then an asserted abnormal band, then a value no
     published boundary covers. Ties keep the order the cards came in. */
  const KEY_RANK = {noninterp: 0, abnormal: 1, gap: 2};
  const keyFindings = classified
    .map((f, i) => ({f: f, i: i}))
    .filter(x => x.f.kind in KEY_RANK)
    .sort((a, b) => (KEY_RANK[a.f.kind] - KEY_RANK[b.f.kind]) || (a.i - b.i))
    .map(x => ({parameter: x.f.parameter, text: x.f.text}));
  /* A normal reading that carried a qualifier keeps its own sentence; a plain
     normal reading is named only in the collapsed summary. */
  const otherFindings = classified
    .filter(f => f.kind === 'normal-qualified')
    .map(f => ({parameter: f.parameter, text: f.text}));
  const plainNormals = classified.filter(f => f.kind === 'normal');
  let normalSummary = null;
  if (plainNormals.length) {
    const names = plainNormals.map(f =>
      (PARAMETER_LABELS[f.parameter] || f.parameter).split(' — ')[0]);
    const joined = names.length === 1
      ? names[0]
      : names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
    normalSummary = joined + (names.length === 1 ? ' was' : ' were') +
                    ' within normal limits.';
  }

  /* An unmeasured parameter is a CONCLUSION, not a blank. This is the entry the
     current impression does not produce, and the reason a reader cannot today
     tell "normal" from "not assessed". */
  const notAssessed = [];
  for (let i = 0; i < rows.length; i++) {
    if (!rows[i].rendered) continue;
    if (rows[i].value !== null && rows[i].value !== undefined) continue;
    /* W-063. The only way a row reaches here now is "toggled on, still
       empty" — a row nobody toggled on and nobody typed a value for no
       longer renders at all, so this sentence is unambiguous in a way its
       predecessor, "not assessed", was not (spec § 5). */
    notAssessed.push({parameter: rows[i].parameter,
                      text: PARAMETER_LABELS[rows[i].parameter] +
                            ' — No data available for this measurement.'});
  }

  /* No internal identifier of any kind reaches `clinical` — not a reference
     id, not a trigger id, not an interaction id (fix round 2, finding A).
     The correlation still exists; it lives in `evidence.abstentions` below,
     where a reader who wants to know WHICH rule abstained can find it. */
  /* One line per READING, not one per rule. Four rules abstaining on the MRE
     reliability check are four sentences saying the same thing to the reader,
     and the clinical page is one A4 side (W-009). The rules keep their separate
     entries -- with the ids that tell them apart -- in `evidence`.

     An abstention whose only missing input is a parameter already reported as
     "not assessed" is DROPPED here, and only here: the fact is on the page
     already, one line above, in the reader's own words. Nothing is lost, and
     SCHEMA 10.3 is satisfied by the entry that stays. */
  const naParams = new Set(notAssessed.map(n => n.parameter));
  const byTarget = new Map();
  for (const a of rel.abstentions) {
    const missing = a.missing.filter(m => !naParams.has(m));
    if (!missing.length) continue;
    const key = a.targets.join('|');
    if (!byTarget.has(key)) byTarget.set(key, {targets: a.targets.slice(), missing: []});
    const bucket = byTarget.get(key);
    for (const m of missing) {
      if (bucket.missing.indexOf(m) === -1) bucket.missing.push(m);
    }
  }
  const abstentions = [];
  for (const b of byTarget.values()) {
    abstentions.push({
      text: 'A reliability check on ' + b.targets.map(readerWord).join(' and ') +
            ' could not be run: ' + listWords(b.missing.map(readerWord)) +
            (b.missing.length === 1 ? ' was' : ' were') + ' not provided.'
    });
  }

  /* evidence: the same reasoning, with what it rests on. `gaps` is what
     `clinical`'s absence-of-evidence fact stated plainly — here it carries the
     engine's own reason, so an appendix reader can see what "no published
     boundary" means for this specific parameter (fix round 1). `abstentions`
     carries the ids `clinical.abstentions` no longer may (fix round 2). */
  const floor = evidenceFloor(rel.fired, _R.REFERENCES);
  const evidence = {
    rules: rel.fired.map(m => ({
      triggerId: m.triggerId, interactionId: m.interactionId, effect: m.effect,
      statement: m.statement, refIds: m.refIds, magnitude: m.magnitude, note: m.note,
      sourceQuote: m.sourceQuote, sourceRefId: m.sourceRefId, sourceKind: m.sourceKind
    })),
    inherited: Object.keys(rel.byParameter)
      .map(p => ({parameter: p, from: rel.byParameter[p].inherited}))
      .filter(x => x.from.length),
    gaps: gapDetails,
    abstentions: rel.abstentions.map(a => ({
      triggerId: a.triggerId, interactionId: a.interactionId,
      missing: a.missing.slice(), targets: a.targets.slice()
    })),
    floor: floor,
    floorLabel: 'weakest reference grade among the rules this text rests on',
    verb: FLOOR_VERB[floor]
  };

  /* W-098. The closing "Summary" block — published composite verdicts, then any
     consideration whose pattern fired (a quoted sentence with the source's own
     strength label), then coverage and the evidence-floor verb. Structured
     data; render.js composes the bold paragraph at the end of the impression.
     `text` / `facts` are untouched (logic.test.js P7 / P9). */
  const summary = buildConsiderations({
    cards: cards, reliability: rel, selection: model.selection,
    composite: model.composite, verb: FLOOR_VERB[floor]
  });

  /* W-081. One factual cross-read on page 1, ONLY when the ADC card read
     abnormal AND an IVIM value is present. It juxtaposes the ADC finding with
     the IVIM numbers and their reference; it asserts NO cause (a diagnostic
     synthesis ships only as a verbatim CONSIDERATIONS record — W-098). D never
     gets a within/outside word (R-30). f's F>=2 trend stays off page 1
     (Diffusion!B16 gap). Additive: `text` / `facts` / `keyFindings` are
     untouched (logic.test.js P7 / P9). */
  const ivimCrossRead = (function () {
    const iv = model.ivim;
    /* `iv.rendered` (its "Additional measurements" checkbox is on, or a value
       was typed) AND `iv.hasAny` (a value is actually present) — so a page-1
       line never cites a number the page-2 section does not itself carry. */
    if (!iv || !iv.hasAny || !iv.rendered) return null;
    const adc = cards.filter(c => c.parameter === 'adc')[0];
    if (!adc || !adc.verdict || !adc.verdict.band || adc.verdict.sev === 'ok') return null;
    const parts = ['Apparent diffusion coefficient ' + adc.value +
      (adc.unit ? ' ' + adc.unit : '') + ' — ' + adc.verdict.band + '.'];
    if (iv.d) {
      parts.push('IVIM true diffusion D ' + iv.d.value + ' ' + iv.d.unit +
        (iv.d.reference
          ? ' (reference ' + iv.d.reference + ' at ' + iv.fieldStrength + ')'
          : ' (no field-strength-matched reference)') + '.');
    }
    [iv.dstar, iv.f].forEach(function (b) {
      if (!b) return;
      const nm = b.parameter === 'ivim-dstar'
        ? 'IVIM pseudo-diffusion D*' : 'IVIM perfusion fraction f';
      parts.push(nm + ' ' + b.value + ' ' + b.unit +
        (b.interval
          ? ' (reference ' + b.interval[0] + '–' + b.interval[1] + ' at ' +
            iv.fieldStrength + ' — ' + b.membership + ')'
          : ' (no field-strength-matched reference)') + '.');
    });
    return parts.join(' ');
  })();

  return {
    clinical: {text: facts.map(f => f.text).join(' '), facts: facts,
               /* W-112. The priority split the renderer composes into two
                  labelled groups with the history sentence moved to the end.
                  `text` and `facts` are untouched above — this is additive. */
               history: facts[0].text,
               keyFindings: keyFindings, otherFindings: otherFindings,
               normalSummary: normalSummary,
               notAssessed: notAssessed, abstentions: abstentions,
               ivimCrossRead: ivimCrossRead,
               summary: summary},
    evidence: evidence
  };
}

/* The provenance census, COUNTED at build time. A hard-coded census is a claim
   that stops being true the next time a record is transcribed. */
function census() {
  const byClass = {};
  for (const c of _R.CUTOFFS) byClass[c.vendorClass] = (byClass[c.vendorClass] || 0) + 1;
  return {
    geExplicit: byClass['ge-explicit'] || 0,
    multiVendor: byClass['multi-vendor-incl-ge'] || 0,
    guideline: byClass['guideline'] || 0,
    nonGe: byClass['non-ge'] || 0,
    cutoffs: _R.CUTOFFS.length,
    references: _R.REFERENCES.length
  };
}

function buildReceipts(report) {
  const parameters = report.rows.map(function (row) {
    return {
      parameter: row.parameter,
      label: PARAMETER_LABELS[row.parameter],
      sources: row.scales ? sourcesOf(row) : [],
      /* The evidence half's copy of the same limit, so a reader holding only the
         methodology sheet is not missing what the source says about its own
         threshold (W-038). */
      useCaveats: row.scales ? useCaveatsOf(row) : [],
      disagreement: row.scales ? disagreementOf(row) : null,
      withheld: row.scales ? withheldOf(row) : null,
      gap: gapOf(row),
      /* A derived value's slope is a published record too, and page 2 is where
         it is cited rather than summarised. */
      calibration: row.calibration && row.calibration.calibration
        ? {id: row.calibration.calibration.id,
           /* Carried so the calibration line on the card and this entry name the
              same record in the same words (W-033). */
           name: row.calibration.calibration.name,
           expression: row.calibration.expression,
           vendorClass: row.calibration.calibration.vendorClass,
           refs: row.calibration.calibration.sourceRefIds,
           alternatives: row.calibration.alternatives.map(a => ({
             id: a.id, expression: a.expression, vendorClass: a.vendorClass}))}
        : null
    };
  });
  return {parameters: parameters, census: census()};
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {REPORT_PARAMETERS, PARAMETER_LABELS, PARAMETER_UNITS, PARAMETER_STEPS,
                    INDICATION_COHORTS, matchedScale, CARD_DOMAIN_ORDER,
                    orderCards, groupCardsByDomain, severityClass, LAB_INPUTS,
                    CONTEXT_INPUTS, buildContext,
                    buildReport, buildRow, buildCoverage, buildCards, buildReceipts,
                    buildLabs, buildComposite, buildConsiderations, buildHistory,
                    buildImpression, readerReason,
                    READER_REASONS, rankedReasons,
                    buildReliability, evidenceFloor, markInterpretability,
                    IVIM_PARAMS, IVIM_LABELS, IVIM_UNITS, IVIM_TREND_NOTE,
                    ivimCaveatOf, buildIvim, REFERENCE_RANGES: _R.REFERENCE_RANGES,
                    FLAG_SENTENCES, V2_REPORT_VERSION, TECHNIQUE_CONTROL_KEY};
}
