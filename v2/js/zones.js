/* VeriLiv V2 — THE ZONE BUILDER  (W-028)
 * ---------------------------------------------------------------------------
 * V1 draws every parameter as a coloured segmented ruler with a named verdict
 * chip. The four fields that make that drawing possible — `label`, `sev`, `tag`
 * and `axis` — are PRESENTATION and are forbidden from v2/data/*.data.js
 * (SCHEMA § 8.5): no publication is their source. SCHEMA § 8.5 also says where
 * they belong instead — "a V2 zone-builder assembles them around cut-off values
 * pulled from CUTOFFS". This file is that zone-builder.
 *
 * ⛔ NO CLINICAL NUMBER IS WRITTEN HERE. Every band edge is a value the engine
 *    returned from a resolved scale. The only numbers in this file are V1's
 *    drawing bounds, ported verbatim from v1/js/thresholds.js buildModels(), and
 *    where V1 has no bound the axis is derived from the ladder itself.
 *
 * ⛔ NO DOM, no import/export, no fetch. Plain script + a module.exports tail,
 *    exactly like every other V2 module (CLAUDE.md § 6).
 *
 * ── WHERE EACH FIELD COMES FROM ──────────────────────────────────────────────
 *   band edges   the engine. `scale.boundaries[i].value`, never re-derived.
 *   band names   the LADDER first: a rung written `normal|borderline` names both
 *                of its sides, so the name is DERIVED FROM DATA. Only the F-form
 *                ladders (mre, adc) cannot name themselves, and there V1's own
 *                labels are ported.
 *   sev          the PORT first, for the five parameters V1 stages: pdff, lic,
 *                mre, adc, t1. Where V1 left nothing and the ladder names its own
 *                rungs, `deriveSeverities()` supplies the ramp position from the
 *                ladder's own order (W-044). Nowhere else — a ladder that cannot
 *                name its bands cannot order them either.
 *   tag          ported verbatim from V1, for those five parameters and NOWHERE
 *                ELSE. It is a descriptive sentence and V1 is its only source.
 *   axis         V1's drawing bounds for those same five; derived from the
 *                ladder for the rest.
 *
 * ── WHAT IS DELIBERATELY NOT HERE ────────────────────────────────────────────
 * `r2star`, `t2star` and `ct1` have NO V1 presentation values, and none are
 * manufactured. Until W-044 they came back named and `severitySource:
 * 'unresolved'`, drawn as outlined uncoloured bands. What changed is not the
 * standard but where the answer was found: their ladders are written
 * `normal|borderline` … `moderate|severe`, so the published rungs name both the
 * bands AND their order, and shading them in that order renders a published word
 * instead of grading a patient. Their `tag` is still null, because a tag is a
 * sentence no ladder supplies.
 *
 * The distinction that keeps this inside CLAUDE.md § 1.2: V1's `t2` bands were
 * dropped because THE BANDS THEMSELVES had no source. Here the bands, their
 * edges and their names are all published; only the colour index was missing,
 * and the ladder's own order is what supplies it.
 *
 * V1's `t2` bands are NOT ported onto `t2star`. W-020 dropped V1's unsourced t2
 * bands from V2, and the two are not the same object anyway: V1's t2 is a
 * short/normal/long trio about a relaxation time, t2star is a five-rung overload
 * ladder. Porting one onto the other would re-import exactly what W-020 removed.
 * ---------------------------------------------------------------------------
 */

const V2_ZONES_VERSION = '1.1';   /* W-044: severity derived from a self-naming ladder */

/* V1's severity vocabulary, spelled the same way so the CSS classes match. */
const ZONE_SEV = {ok: 'ok', low: 'low', mid: 'mid', high: 'high', sev: 'sev'};

/* ─────────────────────────────────────────────── PORTED FROM V1, VERBATIM
   Source: v1/js/thresholds.js, buildModels(). Read out of the frozen file, not
   from memory. Each list is in ASCENDING-AXIS order, exactly as V1 writes it —
   which for a `down` parameter (adc) means the worst band comes first, because
   on that axis the worst band is the leftmost one.

   `dir` is recorded here only to be CHECKED against the direction the engine
   reports. It is never used in place of it: if the two ever disagree, the port
   no longer describes this ladder and the parameter falls back to neutral
   rather than colouring bands by a stale assumption.

   `label` is used only where the ladder cannot name its own bands. */
const V1_PRESENTATION = {
  pdff: {
    axis: [0, 35], dir: 'up',
    zones: [{label: 'S0', sev: ZONE_SEV.ok,  tag: 'No steatosis'},
            {label: 'S1', sev: ZONE_SEV.low, tag: 'Mild'},
            {label: 'S2', sev: ZONE_SEV.mid, tag: 'Moderate'},
            {label: 'S3', sev: ZONE_SEV.sev, tag: 'Severe'}]
  },
  lic: {
    axis: [0, 20], dir: 'up',
    zones: [{label: 'Norm', sev: ZONE_SEV.ok,   tag: 'Normal'},
            {label: 'Bord', sev: ZONE_SEV.low,  tag: 'Borderline'},
            {label: 'Mild', sev: ZONE_SEV.mid,  tag: 'Mild overload'},
            {label: 'Mod',  sev: ZONE_SEV.high, tag: 'Moderate'},
            {label: 'Sev',  sev: ZONE_SEV.sev,  tag: 'Severe'}]
  },
  mre: {
    axis: [1.5, 7], dir: 'up',
    zones: [{label: 'F0', sev: ZONE_SEV.ok,   tag: 'No fibrosis'},
            {label: 'F1', sev: ZONE_SEV.low,  tag: 'Mild'},
            {label: 'F2', sev: ZONE_SEV.mid,  tag: 'Significant'},
            {label: 'F3', sev: ZONE_SEV.high, tag: 'Advanced'},
            {label: 'F4', sev: ZONE_SEV.sev,  tag: 'Cirrhosis'}]
  },
  adc: {
    axis: [0.8, 1.8], dir: 'down',
    zones: [{label: 'F3–F4',    sev: ZONE_SEV.sev, tag: 'Advanced fibrosis'},
            {label: 'F2–F4',    sev: ZONE_SEV.mid, tag: 'Significant'},
            {label: 'Low prob', sev: ZONE_SEV.ok,  tag: 'Not suggestive'}]
  },
  t1: {
    axis: [400, 1050], dir: 'up',
    zones: [{label: 'Low',      sev: ZONE_SEV.low, tag: 'Below normal'},
            {label: 'Normal',   sev: ZONE_SEV.ok,  tag: 'Normal'},
            {label: 'Elevated', sev: ZONE_SEV.mid, tag: 'Elevated'}]
  }
};

/* ─────────────────────────────────────────── SEVERITY FROM THE LADDER (W-044)
   A rung written `normal|borderline` names its own bands, and the ladder's ORDER
   is the order stage() counts in — so the ladder index IS the severity index.
   Nothing about a patient is decided here: the ramp already exists, its five
   steps are W-009's measured ones, and this only says which band stands on
   which step. That is what separates this from V1's dropped t2 bands, where the
   BANDS THEMSELVES had no source.

   THE PROOF IT INVENTS NOTHING is in the tests, not in this comment: applied to
   the two parameters that name their own bands AND carry a V1 port, it must
   reproduce the port exactly — pdff ok,low,mid,sev and lic ok,low,mid,high,sev.

   The two ends are anchored and the interior fills from the LIGHTEST step up, so
   a three-band ladder reads ok,low,sev rather than ok,mid,sev. Both were
   available; this is the one that under-claims (CLAUDE.md § 2.1).

   Past five bands there is no assignment that is not an invention — the rule
   returns null and the parameter stays uncoloured rather than reusing a step. */
function deriveSeverities(bandCount) {
  if (!(bandCount >= 2 && bandCount <= 5)) return null;
  const interior = [ZONE_SEV.low, ZONE_SEV.mid, ZONE_SEV.high].slice(0, bandCount - 2);
  return [ZONE_SEV.ok].concat(interior, [ZONE_SEV.sev]);
}

/* ------------------------------------------------------------ Small helpers */

/* A drawing bound, rounded so a tick reads cleanly. Not a clinical value. */
function roundAxis(v) {
  return Math.round(v * 100) / 100;
}

/* WHERE V1 HAS NO AXIS. The ladder is asked instead of a number being chosen:
   the outer bands are given the mean width of the interior ones, so the drawing
   is symmetric and every edge stays inside the frame. The lower bound is not
   allowed below zero — no quantity on this report is measurable there — and
   that clamp is a drawing decision, not a claim about a normal range. */
function deriveAxis(values) {
  const lo = Math.min.apply(null, values), hi = Math.max.apply(null, values);
  const pad = values.length > 1
    ? (hi - lo) / (values.length - 1)
    : (Math.abs(lo) * 0.5 || 1);
  return [roundAxis(Math.max(0, lo - pad)), roundAxis(hi + pad)];
}

/* An axis must never clip a band edge: a value drawn outside the frame would sit
   on top of a boundary it is not at. A ported bound that a pooled V2 cut-off has
   outgrown is widened rather than trusted, and the caller is told it happened. */
function coverAxis(axis, values) {
  const lo = Math.min.apply(null, [axis[0]].concat(values));
  const hi = Math.max.apply(null, [axis[1]].concat(values));
  return {axis: [roundAxis(lo), roundAxis(hi)],
          widened: lo !== axis[0] || hi !== axis[1]};
}

/* ──────────────────────────────────────────────────────────── THE BUILDER
   Input: one resolved scale from buildScales() and the parameter it belongs to.
   Output: V1's own shape — {axis, unit, dir, zones:[{label, a, b, sev, tag}]} —
   plus the fields V1 never needed: the stage `index` each zone answers to, and
   three provenance flags saying where the names, the axis and the severities
   came from.

   Returns null for a scale that cannot be drawn. An incomplete ladder is not
   drawn as a partial bar: the missing rung is exactly where the patient's value
   might have fallen (the engine's own rule in stage()). */
function buildZones(scale, parameter) {
  if (!scale || !scale.complete || !scale.boundaries || !scale.boundaries.length) return null;

  const edges = scale.boundaries.filter(b => b.value !== null);
  if (!edges.length) return null;

  const unit = edges[0].unit || null;
  const dir = edges[0].direction === 'below-is-worse' ? 'down' : 'up';
  const bandCount = edges.length + 1;

  /* Names first, in LADDER order — the order stage() counts in. A rung written
     `a|b` names the band before it and the band after it; a rung written `F>=2`
     names neither, and this returns nulls rather than a guess. */
  const split = edges.every(e => String(e.boundary).indexOf('|') !== -1);
  const ladderNames = [];
  for (let i = 0; i < bandCount; i++) {
    ladderNames.push(!split ? null
      : (i === 0 ? String(edges[0].boundary).split('|')[0]
                 : String(edges[i - 1].boundary).split('|')[1]));
  }

  /* Ladder order → ascending-axis order. For an `up` parameter they are the same
     sequence; for a `down` one (adc, t2star) the ladder starts at the healthy
     end, which is the RIGHT of the axis, so both the names and the edges are
     reversed to be drawn. */
  const ascEdges = edges.slice().sort((a, b) => a.value - b.value);
  const ascValues = ascEdges.map(e => e.value);
  const ascNames = dir === 'up' ? ladderNames : ladderNames.slice().reverse();

  /* The port applies only where it still describes THIS ladder: same number of
     bands, same direction. Either mismatch means the ladder moved under the
     port, and a severity assigned by position would then be assigned to the
     wrong band — so the parameter goes neutral instead. */
  const ported = V1_PRESENTATION[parameter] || null;
  const portApplies = !!ported && ported.zones.length === bandCount && ported.dir === dir;

  const covered = coverAxis(portApplies ? ported.axis : deriveAxis(ascValues), ascValues);

  /* The port still wins where it applies — it carries tags this rule cannot
     source. The rule fills only where V1 left nothing, and only for a ladder
     that names its own bands: a rung written `F>=2` names neither side, so it
     orders nothing either. Reversed alongside the names on a `down` axis, for
     the same reason and by the same rule. */
  const derived = (split && !portApplies) ? deriveSeverities(bandCount) : null;
  const ascSevs = derived ? (dir === 'up' ? derived : derived.slice().reverse()) : null;

  const zones = [];
  for (let k = 0; k < bandCount; k++) {
    const p = portApplies ? ported.zones[k] : null;
    zones.push({
      /* The derived name wins over the ported one: it comes from the data. */
      label: ascNames[k] !== null ? ascNames[k] : (p ? p.label : null),
      a: k === 0 ? covered.axis[0] : ascValues[k - 1],
      b: k === bandCount - 1 ? covered.axis[1] : ascValues[k],
      sev: p ? p.sev : (ascSevs ? ascSevs[k] : null),
      tag: p ? p.tag : null,
      /* Which stage index this band is. stage() counts from the healthy end of
         the ladder, so on a `down` axis index 0 is the RIGHTMOST band. */
      index: dir === 'up' ? k : bandCount - 1 - k
    });
  }

  return {
    parameter: parameter,
    axis: covered.axis,
    unit: unit,
    dir: dir,
    zones: zones,
    /* The boundary values, ascending, so a renderer can tick them without
       re-reading the scale. `n`, `min` and `max` travel with them because the
       tick is also where a pooled spread is legible. */
    /* W-133. `evidenceGrades` rides with every other edge field — it is the
       engine's OWN already-computed field (thresholds.js's boundary merge),
       never re-derived here. A renderer needs it to say how well-sourced a
       boundary is without re-reading the raw scale. */
    edges: ascEdges.map(e => ({boundary: e.boundary, value: e.value, unit: e.unit,
                               n: e.n || null, min: e.min, max: e.max,
                               evidenceGrades: e.evidenceGrades || null})),
    nameSource: split ? 'ladder' : (portApplies ? 'v1-ported' : 'unresolved'),
    /* The field a renderer reads to decide whether it may use colour at all. */
    severitySource: portApplies ? 'v1-ported'
                                : (ascSevs ? 'ladder-derived' : 'unresolved'),
    axisSource: portApplies ? (covered.widened ? 'v1-ported-widened' : 'v1-ported')
                            : 'derived-from-ladder'
  };
}

/* Which band a staged index belongs to. stage() returns the index; this returns
   the zone that index names, so a verdict chip prints a band rather than a
   number a reader has to decode. */
function zoneForIndex(zoneModel, index) {
  if (!zoneModel || index === null || index === undefined) return null;
  return zoneModel.zones.filter(z => z.index === index)[0] || null;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {buildZones, zoneForIndex, deriveAxis, deriveSeverities,
                    V1_PRESENTATION, ZONE_SEV, V2_ZONES_VERSION};
}
