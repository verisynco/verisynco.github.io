/* VeriLiv V2 — RELIABILITY TRIGGERS (W-015, extended W-037)
 * ---------------------------------------------------------------------------
 * HAND-AUTHORED, deliberately. interactions.data.js is generated from the
 * workbook and stays generated; this file is the small machine-readable layer
 * over the 13 of its 92 rules whose trigger can be evaluated against data this
 * report actually holds. The other 79 are acquisition and platform guidance
 * addressed to whoever runs the scanner — recorded as unfirable, not printed.
 *
 * ⛔ EVERY NUMBER HERE IS QUOTED — never authored here. Schema rule R-39 asserts
 *    it verbatim, from one of exactly two places: the workbook statement of its
 *    interactionId, or the row's own `sourceQuote`. R-39 catches a wrong VALUE;
 *    it cannot catch a wrong operator or a wrong target, which is why every row
 *    is reviewed against the sentence it cites.
 *
 * THE QUOTE CHANNEL (W-037) — `sourceQuote` + `sourceRefId` + `sourceKind`.
 *   Until W-037 a relationship could only be expressed if the WORKBOOK had
 *   already stated its number. MEASURED then: `2 ms` occurs in no interaction
 *   statement anywhere, so an edge read from a publication had no channel at
 *   all and the table could only ever restate the sheet. The channel mirrors
 *   `useCaveat` (SCHEMA § 5.8): the publication's sentence verbatim, the
 *   reference it came from, and how it was read (fulltext / abstract /
 *   workbook). R-50 forbids quoting a reference the row's own rule does not
 *   already cite — the R-43 failure, one record type over: a paper must not
 *   turn quietly into evidence for a rule that never named it.
 *   All three fields travel together or none of them do.
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
 * `highlight` (W-190) — OPTIONAL array of literal substrings of the cited text (the
 *   interaction's `statement`, or the row's own `sourceQuote` when that channel is used)
 *   that THIS row's `when` names. A shared statement can cover more than one condition —
 *   INT-0033 covers BMI, ascites and T2* through three separate rows below — and the
 *   report bolds the phrase(s) that actually matched so a reader is not left guessing
 *   which clause applied to this patient. Never a paraphrase: R-53 (schema.test.js) fails
 *   loudly if a phrase is not verbatim in its own cited text. A leaf the sentence never
 *   literally names (most `{field: ...}` legs) simply has no phrase for it — omitted,
 *   never invented.
 *
 * Loaded as a plain <script> and require()-able by the Node tests, like every
 * other file in this folder.
 * ---------------------------------------------------------------------------
 */

const TRIGGERS_VERSION = '1.1';   /* W-037: TRG-0015, and the sourceQuote channel enters the lock */
const TRIGGERS_HASH = '4200d878b3bef0eaa223d6084e90413fa7f4515ab000698a532d8565949b0b83';

const TRIGGERS = [
  {
    id: 'TRG-0001', interactionId: 'INT-0033',
    when: {context: 'bmi', op: '>', value: 35},
    targets: ['mre'], effect: 'fails',
    magnitude: 'up to 20% of scans fail in these settings',
    note: 'Body habitus above this index is one of the three settings the sheet names for MRE technical failure.',
    highlight: ['BMI > 35']
  },
  {
    id: 'TRG-0002', interactionId: 'INT-0033',
    when: {context: 'ascites', is: true},
    targets: ['mre'], effect: 'fails',
    magnitude: 'up to 20% of scans fail in these settings',
    note: 'Ascites is named in the same sentence, as an independent setting rather than a modifier of the others.',
    highlight: ['ascites']
  },
  {
    id: 'TRG-0003', interactionId: 'INT-0033',
    when: {param: 't2star', op: '<', value: 12},
    targets: ['mre'], effect: 'fails',
    magnitude: 'up to 20% of scans fail in these settings',
    note: 'The sheet supplies this threshold itself, in parentheses, as its own definition of iron overload for this rule.',
    highlight: ['iron overload (T2* < 12 ms)']
  },
  {
    id: 'TRG-0004', interactionId: 'INT-0035',
    when: {ratio: {num: 'alt', den: 'altUln'}, op: '>', value: 5},
    targets: ['mre'], effect: 'overestimates',
    magnitude: null,
    note: 'Stiffness rises with acute inflammation independently of fibrosis. The multiple is of the SITE ULN, which is why altUln is collected rather than assumed.',
    highlight: ['ALT >5× ULN']
  },
  {
    id: 'TRG-0005', interactionId: 'INT-0037',
    when: {context: 'ggt', op: '>', value: 120},
    targets: ['mre'], effect: 'overestimates',
    magnitude: 'at F0-F1',
    note: 'Chen 2023 IPD-MA associates this with overestimation at the low end of the ladder specifically. The sentence names TWO independently associated factors, and its verb is plural, so this fires on GGT alone. Reading it as a joint condition was REJECTED: it would require a steatohepatitis-severity field this report does not collect, and would drop a grade-A rule out of the pool entirely.',
    highlight: ['GGT >120 U/L']
  },
  {
    id: 'TRG-0006', interactionId: 'INT-0040',
    when: {all: [{field: '1.5T'}, {param: 't2star', op: 'between', value: [8, 12]}]},
    targets: ['mre'], effect: 'context',
    magnitude: null,
    note: 'A mitigating observation, printed beside the failure note. It NEVER cancels one: conservative wins ties (CLAUDE.md 2.1).',
    highlight: ['T2* 8-12 ms']
  },
  {
    id: 'TRG-0007', interactionId: 'INT-0041',
    when: {all: [{field: '3.0T'}, {ironAbnormal: true}, {verdict: 'pdff', is: 'abnormal'}]},
    targets: ['mre'], effect: 'fails',
    magnitude: null,
    note: 'Iron together with steatosis at 3.0 T. Both limbs resolve from verdicts this report already printed, so no new threshold is introduced.',
    highlight: ['3T', 'iron overload combined with steatosis']
  },
  {
    id: 'TRG-0008', interactionId: 'INT-0024',
    when: {all: [{field: '3.0T'}, {param: 'lic', op: '>', value: 15}]},
    targets: ['lic', 'r2star'], effect: 'uninterpretable',
    magnitude: 'all echoes below the noise floor',
    note: 'Signal decays twice as fast at 3.0 T; above this liver iron the multi-echo GRE sequence still returns a figure while the physics behind it has broken down.',
    highlight: ['3T', 'LIC > 15 mg/g dw']
  },
  {
    id: 'TRG-0009', interactionId: 'INT-0022',
    when: {all: [{field: '1.5T'}, {param: 'lic', op: '>', value: 20}]},
    targets: ['lic'], effect: 'uninterpretable',
    magnitude: null,
    note: 'Ultra-short-TE is not routinely available; above this the decay is too rapid to measure.',
    highlight: ['LIC > 20 mg/g dw']
  },
  {
    id: 'TRG-0010', interactionId: 'INT-0021',
    when: {all: [{field: '1.5T'}, {param: 'lic', op: '<', value: 3}]},
    targets: ['lic'], effect: 'precision',
    magnitude: 'reported error about 15%',
    note: 'Low SNR at very mild overload. A precision caveat, not a failure — the band survives.',
    highlight: ['LIC < 3 mg/g dw']
  },
  {
    id: 'TRG-0011', interactionId: 'INT-0020',
    when: {all: [{present: 'ferritin'}, {absent: 'lic'}]},
    targets: ['lic'], effect: 'context',
    magnitude: null,
    note: 'An ABSENCE rule, and the only one: it attaches to the notAssessed entry for liver iron, not to a reading. Serum ferritin does not correlate reliably with LIC and does not replace it.',
    highlight: ['ferritin']
  },
  {
    id: 'TRG-0012', interactionId: 'INT-0003',
    when: {ironAbnormal: true},
    targets: ['pdff'], effect: 'biased',
    magnitude: null,
    note: 'Concomitant iron biases PDFF unless R2* correction is applied. The report cannot know whether it was, so the note says which condition would remove the caveat.',
    highlight: ['Concomitant iron overload']
  },
  {
    id: 'TRG-0013', interactionId: 'INT-0011',
    when: {all: [{field: '3.0T'}, {ironAbnormal: true}]},
    targets: ['pdff'], effect: 'underestimates',
    magnitude: null,
    note: 'Faster T2* decay at 3.0 T can mask fat signal where iron is present.',
    highlight: ['3T', 'concomitant iron overload']
  },
  {
    id: 'TRG-0014', interactionId: 'INT-0008',
    when: {all: [{field: '3.0T'}, {context: 'bmi', op: '>', value: 35}]},
    targets: ['pdff'], effect: 'biased',
    magnitude: 'over the anterior right lobe',
    note: 'Dielectric shading at 3.0 T can produce a regional signal void; the sheet names segments VI-VII as the unaffected fallback.',
    highlight: ['BMI>35']
  },
  {
    /* W-037. THE FIRST ROW WHOSE NUMBER COMES FROM A PAPER RATHER THAN THE SHEET.
       INT-0050 tells the reader to use cT1 when iron is present; REF-018 — the
       paper INT-0050 already cites — states where that instruction stops. The
       row is the boundary of its own rule, not a new claim beside it.
       TARGET IS ct1 ALONE, and native t1 is deliberately absent: R-41 forbids a
       note on a reading the report does not interpret, and native T1 stages
       under no technique in its vocabulary. The paper names cT1 and only cT1.
       QUOTED FROM THE FULL TEXT, held at reference/papers/fulltext/. The
       retrieved file encodes the asterisk as `⁎` and the less-than as `&lt;`;
       both are restored to their published characters here and nothing else in
       the sentence is touched. */
    id: 'TRG-0015', interactionId: 'INT-0050',
    when: {param: 't2star', op: '<', value: 2},
    targets: ['ct1'], effect: 'uninterpretable',
    magnitude: 'the method returned a result in 77 of the source cohort of 79 patients',
    sourceQuote: 'two of our patients had massive haemosiderosis, with T2* <2 ms, ' +
                 'which did not allow for the estimation of cT1 to determine the degree of fibrosis',
    sourceRefId: 'REF-018',
    sourceKind: 'fulltext',
    highlight: ['T2* <2 ms'],
    note: 'The same paper states the operational consequence in its own words — "in practical ' +
          'terms, T2* values of <2 ms immediately indicate the presence of marked haemosiderosis, ' +
          'but still requiring histological assessment of fibrosis" — so withholding the band is ' +
          'the instruction of the authors themselves rather than an inference from their failure ' +
          'count. The ' +
          'value and its ruler stay on the page; the report withdraws only its own claim.'
  }
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {TRIGGERS, TRIGGERS_VERSION, TRIGGERS_HASH};
}
