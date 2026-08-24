/* VeriLiv V2 — RELIABILITY TRIGGERS (W-015)
 * ---------------------------------------------------------------------------
 * HAND-AUTHORED, deliberately. interactions.data.js is generated from the
 * workbook and stays generated; this file is the small machine-readable layer
 * over the 12 of its 92 rules whose trigger can be evaluated against data this
 * report actually holds. The other 80 are acquisition and platform guidance
 * addressed to whoever runs the scanner — recorded as unfirable, not printed.
 *
 * ⛔ EVERY NUMBER HERE IS QUOTED FROM THE STATEMENT OF ITS interactionId.
 *    Schema rule R-39 asserts it verbatim. A number that is not in the workbook
 *    sentence cannot reach the report. R-39 catches a wrong VALUE; it cannot
 *    catch a wrong operator or a wrong target, which is why every row is
 *    reviewed against the sentence it cites.
 *
 * `when` grammar — one condition, or {all: [...]} for a conjunction:
 *   {param: 't2star', op: '<', value: 12}       a measured value
 *   {param: 't2star', op: 'between', value: [8, 12]}
 *   {context: 'bmi', op: '>', value: 35}        a clinical-context field
 *   {context: 'ascites', is: true}
 *   {ratio: {num: 'alt', den: 'altUln'}, op: '>', value: 5}
 *   {field: '3.0T'}                             the selected field strength
 *   {ironAbnormal: true}                        lic/r2star/t2star staged abnormal
 *   {verdict: 'pdff', is: 'abnormal'}           a staged verdict this report printed
 *   {present: 'ferritin'} / {absent: 'lic'}
 *
 * `effect` — what a fired rule does to the target's READING:
 *   fails           the acquisition may have failed unrecognised → band removed
 *   uninterpretable the number produced is invalid → band removed
 *   overestimates / underestimates / biased / precision → band survives, note attached
 *   context         printed beside the reading; changes nothing
 *
 * Loaded as a plain <script> and require()-able by the Node tests, like every
 * other file in this folder.
 * ---------------------------------------------------------------------------
 */

const TRIGGERS_VERSION = '1.0';
const TRIGGERS_HASH = '30eae02bb23398accbe280a3c9212b0a13e37c1b75336c057924cfd779791f46';

const TRIGGERS = [
  {
    id: 'TRG-0001', interactionId: 'INT-0033',
    when: {context: 'bmi', op: '>', value: 35},
    targets: ['mre'], effect: 'fails',
    magnitude: 'up to 20% of scans fail in these settings',
    note: 'Body habitus above this index is one of the three settings the sheet names for MRE technical failure.'
  },
  {
    id: 'TRG-0002', interactionId: 'INT-0033',
    when: {context: 'ascites', is: true},
    targets: ['mre'], effect: 'fails',
    magnitude: 'up to 20% of scans fail in these settings',
    note: 'Ascites is named in the same sentence, as an independent setting rather than a modifier of the others.'
  },
  {
    id: 'TRG-0003', interactionId: 'INT-0033',
    when: {param: 't2star', op: '<', value: 12},
    targets: ['mre'], effect: 'fails',
    magnitude: 'up to 20% of scans fail in these settings',
    note: 'The sheet supplies this threshold itself, in parentheses, as its own definition of iron overload for this rule.'
  },
  {
    id: 'TRG-0004', interactionId: 'INT-0035',
    when: {ratio: {num: 'alt', den: 'altUln'}, op: '>', value: 5},
    targets: ['mre'], effect: 'overestimates',
    magnitude: null,
    note: 'Stiffness rises with acute inflammation independently of fibrosis. The multiple is of the SITE ULN, which is why altUln is collected rather than assumed.'
  },
  {
    id: 'TRG-0005', interactionId: 'INT-0037',
    when: {context: 'ggt', op: '>', value: 120},
    targets: ['mre'], effect: 'overestimates',
    magnitude: 'at F0-F1',
    note: 'Chen 2023 IPD-MA associates this with overestimation at the low end of the ladder specifically. The sentence names TWO independently associated factors, and its verb is plural, so this fires on GGT alone. Reading it as a joint condition was REJECTED: it would require a steatohepatitis-severity field this report does not collect, and would drop a grade-A rule out of the pool entirely.'
  },
  {
    id: 'TRG-0006', interactionId: 'INT-0040',
    when: {all: [{field: '1.5T'}, {param: 't2star', op: 'between', value: [8, 12]}]},
    targets: ['mre'], effect: 'context',
    magnitude: null,
    note: 'A mitigating observation, printed beside the failure note. It NEVER cancels one: conservative wins ties (CLAUDE.md 2.1).'
  },
  {
    id: 'TRG-0007', interactionId: 'INT-0041',
    when: {all: [{field: '3.0T'}, {ironAbnormal: true}, {verdict: 'pdff', is: 'abnormal'}]},
    targets: ['mre'], effect: 'fails',
    magnitude: null,
    note: 'Iron together with steatosis at 3.0 T. Both limbs resolve from verdicts this report already printed, so no new threshold is introduced.'
  },
  {
    id: 'TRG-0008', interactionId: 'INT-0024',
    when: {all: [{field: '3.0T'}, {param: 'lic', op: '>', value: 15}]},
    targets: ['lic', 'r2star'], effect: 'uninterpretable',
    magnitude: 'all echoes below the noise floor',
    note: 'Signal decays twice as fast at 3.0 T; above this liver iron the multi-echo GRE sequence still returns a figure while the physics behind it has broken down.'
  },
  {
    id: 'TRG-0009', interactionId: 'INT-0022',
    when: {all: [{field: '1.5T'}, {param: 'lic', op: '>', value: 20}]},
    targets: ['lic'], effect: 'uninterpretable',
    magnitude: null,
    note: 'Ultra-short-TE is not routinely available; above this the decay is too rapid to measure.'
  },
  {
    id: 'TRG-0010', interactionId: 'INT-0021',
    when: {all: [{field: '1.5T'}, {param: 'lic', op: '<', value: 3}]},
    targets: ['lic'], effect: 'precision',
    magnitude: 'reported error about 15%',
    note: 'Low SNR at very mild overload. A precision caveat, not a failure — the band survives.'
  },
  {
    id: 'TRG-0011', interactionId: 'INT-0020',
    when: {all: [{present: 'ferritin'}, {absent: 'lic'}]},
    targets: ['lic'], effect: 'context',
    magnitude: null,
    note: 'An ABSENCE rule, and the only one: it attaches to the notAssessed entry for liver iron, not to a reading. Serum ferritin does not correlate reliably with LIC and does not replace it.'
  },
  {
    id: 'TRG-0012', interactionId: 'INT-0003',
    when: {ironAbnormal: true},
    targets: ['pdff'], effect: 'biased',
    magnitude: null,
    note: 'Concomitant iron biases PDFF unless R2* correction is applied. The report cannot know whether it was, so the note says which condition would remove the caveat.'
  },
  {
    id: 'TRG-0013', interactionId: 'INT-0011',
    when: {all: [{field: '3.0T'}, {ironAbnormal: true}]},
    targets: ['pdff'], effect: 'underestimates',
    magnitude: null,
    note: 'Faster T2* decay at 3.0 T can mask fat signal where iron is present.'
  },
  {
    id: 'TRG-0014', interactionId: 'INT-0008',
    when: {all: [{field: '3.0T'}, {context: 'bmi', op: '>', value: 35}]},
    targets: ['pdff'], effect: 'biased',
    magnitude: 'over the anterior right lobe',
    note: 'Dielectric shading at 3.0 T can produce a regional signal void; the sheet names segments VI-VII as the unaffected fallback.'
  }
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {TRIGGERS, TRIGGERS_VERSION, TRIGGERS_HASH};
}
