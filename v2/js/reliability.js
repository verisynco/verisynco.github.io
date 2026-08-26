/* VeriLiv V2 — RELIABILITY (W-015)
 * ---------------------------------------------------------------------------
 * Turns the trigger rows of data/triggers.data.js into per-parameter
 * reliability modifiers. PURE: no DOM, no `document`, and every table arrives
 * as an argument, exactly as js/thresholds.js works — which is what lets Node
 * test it the way staging is tested.
 *
 * ⛔ THIS FILE DECIDES NOTHING CLINICAL. Every threshold it compares against
 *    comes from a trigger row, and every trigger row quotes the workbook
 *    sentence it cites (schema rule R-39).
 *
 * A BLANK FIELD NEVER FIRES A RULE. It makes the rule abstain, and the
 * abstention is returned so the report can print it. A missing input must be
 * visible, never read as a negative finding.
 *
 * Loaded as a plain <script> (ES modules fail under file://) and require()-able
 * by the Node test suite, exactly like js/thresholds.js.
 * ---------------------------------------------------------------------------
 */

/* Which parameters count as "iron" for the rules that name iron overload
   without publishing a number of their own. Resolved from the verdicts this
   report already printed, so no new threshold is introduced (design § 4). */
const IRON_PARAMETERS = ['lic', 'r2star', 't2star'];

function has(v) { return v !== null && v !== undefined && v !== ''; }

function compare(actual, op, value) {
  if (op === '>') return actual > value;
  if (op === '<') return actual < value;
  if (op === 'between') return actual >= value[0] && actual <= value[1];
  throw new Error('unrecognised trigger operator: ' + String(op));
}

/* Returns true, false, or the list of field names that were blank. A blank
   list is never conflated with false: "nobody answered" and "answered no" are
   different facts and only the second is a negative finding. */
function evaluate(cond, input) {
  if (cond.all) {
    /* A conjunction with a DEFINITELY FALSE limb is false, even when another
       limb is blank. Without this, TRG-0009 — a 1.5 T rule — would abstain at
       3.0 T with no LIC entered, printing "not assessable: lic not provided"
       for a rule that could not have fired at any LIC value. An abstention that
       names a rule the field strength already excluded is a false report of a
       gap, which is the one thing the abstention mechanism exists to prevent. */
    const missing = [];
    let definitelyFalse = false;
    for (const c of cond.all) {
      const r = evaluate(c, input);
      if (Array.isArray(r)) { for (const m of r) missing.push(m); }
      else if (!r) definitelyFalse = true;
    }
    if (definitelyFalse) return false;
    return missing.length ? missing : true;
  }
  if (cond.field) return input.field === cond.field;
  if (cond.ironAbnormal) return IRON_PARAMETERS.some(p => input.abnormal[p] === true);
  if (cond.verdict) {
    /* `cond.is` is a STRING label ('abnormal' / 'normal'); input.abnormal
       holds BOOLEANs, so the two states are mapped explicitly rather than
       compared directly — comparing 'abnormal' === true would never match.
       An unmeasured parameter reads `undefined` here, which is neither state:
       that absence is reported by its own not-assessed entry, not by this
       branch, so both 'abnormal' and 'normal' correctly return false for it.
       Anything other than those two labels is a data-authoring mistake in
       triggers.data.js and must be loud rather than silently mis-evaluated. */
    const v = input.abnormal[cond.verdict];
    if (cond.is === 'abnormal') return v === true;
    if (cond.is === 'normal') return v === false;
    throw new Error('unrecognised verdict state: ' + String(cond.is));
  }
  if (cond.present) return has(input.labs[cond.present]) || has(input.values[cond.present]);
  if (cond.absent) return !has(input.values[cond.absent]);
  if (cond.context !== undefined) {
    const v = input.context[cond.context];
    /* has(false) is already true, so a separate `v !== false` guard here
       never changes the outcome — removed as dead code. `null`/`undefined`/''
       still abstain (return the missing-field list); `false` is still a real
       answered "no" and falls through to the comparison below. */
    if (!has(v)) return [cond.context];
    if ('is' in cond) return v === cond.is;
    return compare(v, cond.op, cond.value);
  }
  if (cond.param !== undefined) {
    const v = input.values[cond.param];
    if (!has(v)) return [cond.param];
    return compare(v, cond.op, cond.value);
  }
  if (cond.ratio) {
    const num = input.labs[cond.ratio.num], den = input.context[cond.ratio.den];
    const missing = [];
    if (!has(num)) missing.push(cond.ratio.num);
    /* A non-positive upper limit of normal is not a laboratory value — an
       unset or zero-or-negative altUln abstains exactly like a blank one,
       rather than falling through to `compare` and silently reading as
       false (finding 4). */
    if (!has(den) || den <= 0) missing.push(cond.ratio.den);
    if (missing.length) return missing;
    return compare(num / den, cond.op, cond.value);
  }
  throw new Error('unrecognised trigger condition: ' + JSON.stringify(cond));
}

/* Iron confounds fat and fibrosis, and nothing in the sheet runs the other way,
   so the propagation is one-directional by construction rather than by a guard.
   A reading that inherits a downgrade names the parameter and the rule it came
   from, because "not interpretable" with no stated cause is the footnote this
   task exists to replace. */
const PROPAGATES_INTO = {lic: ['pdff', 'mre'], r2star: ['pdff', 'mre'], t2star: ['pdff', 'mre']};

/* The sentence the CLINICAL page prints when a band is withheld. Plain language,
   no citation, no reference id, no rung name — the reason's evidence lives in the
   appendix and the FACT lives here (design section 8). A lookup rather than a
   composed string, so one effect cannot produce two different explanations. */
const CLINICAL_REASON = {
  fails: 'The acquisition may have failed in this setting, and this report cannot ' +
         'confirm that it did not.',
  uninterpretable: 'The measurement was produced under conditions in which the ' +
                   'sequence is not valid.',
  inherited: 'This reading depends on a measurement that is not interpretable on ' +
             'this study.'
};

function propagate(byParameter) {
  for (const source of Object.keys(PROPAGATES_INTO)) {
    const from = byParameter[source];
    if (!from || from.interpretable) continue;
    for (const target of PROPAGATES_INTO[source]) {
      if (!byParameter[target]) continue;   /* nothing measured — 6.1 owns it */
      byParameter[target].interpretable = false;
      if (!byParameter[target].clinicalReason) {
        byParameter[target].clinicalReason = CLINICAL_REASON.inherited;
      }
      for (const m of from.modifiers) {
        if (m.effect !== 'fails' && m.effect !== 'uninterpretable') continue;
        byParameter[target].inherited.push({
          from: source, triggerId: m.triggerId, interactionId: m.interactionId
        });
      }
    }
  }
  return byParameter;
}

/* Every `{absent: X}` condition inside a `when` tree, walked through `{all}`
   conjunctions. This is how a target's ABSENCE exception is discovered — from
   the condition the trigger itself already states, never from the trigger's
   id or its effect. TRG-0011 (ferritin entered, lic absent) is the one row
   that currently exercises this; a future absence rule is covered by the same
   walk with no code change, because the exception is a property of the
   condition, not a lookup table naming triggers. */
function absentFields(when) {
  if (when.all) {
    const out = [];
    for (const c of when.all) out.push.apply(out, absentFields(c));
    return out;
  }
  if (when.absent !== undefined) return [when.absent];
  return [];
}

function applyReliability(input) {
  const byIntId = new Map(input.interactions.map(i => [i.id, i]));
  const byParameter = {};
  const fired = [];
  const abstentions = [];

  for (const t of input.triggers) {
    const rec = byIntId.get(t.interactionId);
    const outcome = evaluate(t.when, input);

    if (Array.isArray(outcome)) {
      abstentions.push({triggerId: t.id, interactionId: t.interactionId,
                        missing: outcome, targets: t.targets.slice()});
      continue;
    }
    if (!outcome) continue;

    /* W-037: the quote channel travels with the modifier. A row whose number
       comes from a PAPER rather than from the workbook sentence carries the
       sentence that licenses it, and a licence no page can reach is not a
       disclosure — the `withheldOf` defect W-050 found, and the reason these
       three lines exist rather than the record standing alone in the data file.
       Null on every workbook-sourced row, which is most of them. */
    const modifier = {
      triggerId: t.id, interactionId: t.interactionId, effect: t.effect,
      statement: rec ? rec.statement : null,
      refIds: rec ? rec.sourceRefIds.slice() : [],
      magnitude: t.magnitude, note: t.note, inheritedFrom: null,
      sourceQuote: t.sourceQuote || null,
      sourceRefId: t.sourceRefId || null,
      sourceKind: t.sourceKind || null
    };
    fired.push(modifier);
    /* A modifier attaches to a target only when the target HAS a value, or
       when the trigger's own condition explicitly names that target as
       absent — the one deliberate exception, and it is an ABSENCE rule by
       construction (design section 8). Without this guard a trigger whose
       `when` reads one parameter but whose `targets` name a second,
       unmeasured one produces BOTH a "not interpretable" fact and a
       "not assessed" entry for that second parameter — two contradictory
       lines about the same measurement on the same page. */
    const declaredAbsent = absentFields(t.when);
    for (const p of t.targets) {
      if (!has(input.values[p]) && declaredAbsent.indexOf(p) === -1) continue;
      if (!byParameter[p]) {
        byParameter[p] = {modifiers: [], interpretable: true, inherited: [],
                          clinicalReason: null};
      }
      byParameter[p].modifiers.push(modifier);
      if (t.effect === 'fails' || t.effect === 'uninterpretable') {
        byParameter[p].interpretable = false;
        /* First writer wins: a parameter carrying both a `fails` and an
           `uninterpretable` rule keeps the reason of the first one recorded,
           rather than the last one to run. Order is the trigger table's order,
           which is stable and hashed. */
        if (!byParameter[p].clinicalReason) {
          byParameter[p].clinicalReason = CLINICAL_REASON[t.effect];
        }
      }
    }
  }

  return {byParameter: propagate(byParameter), abstentions: abstentions, fired: fired};
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {applyReliability, IRON_PARAMETERS};
}
