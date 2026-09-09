/* VeriLiv V2 — MEASUREMENT PRACTICE DESCRIPTIONS (W-180)
 * ---------------------------------------------------------------------------
 * NOT a workbook migration. This is the one file in v2/data/ whose sentences
 * were WRITTEN HERE. Every other record in this folder carries the source's own
 * words or numbers; a PRACTICE carries OUR description of what a named
 * publication publishes about how a measurement is taken.
 *
 * WHY IT EXISTS
 *   W-179 put the workbook's 92 Technical_Limitations rules on the entry card,
 *   so the reader sees "use ≥3 ROIs, avoid vessels" before typing a number. A
 *   rule is a short imperative; several of the publications behind it set the
 *   practice out at length, in a figure caption or in their own methods text.
 *   Those figures cannot be reproduced — none of the four is openly licensed
 *   (journal/completed/W-179.md, decision 3) — so what ships is a description
 *   in our own words, carrying the publication and the place inside it.
 *
 * WHAT A DESCRIPTION MAY AND MAY NOT DO
 *   May   restate, in plainer words, what the caption or the methods text says.
 *   May   name what the source excludes: vessels, lesions, the subcapsular rim,
 *         areas the reconstruction marks invalid.
 *   NEVER assert WHERE a region goes. The sources publish exclusions, never a
 *         placement map, so a position claim would be an unsourced clinical
 *         number wearing different clothes (CLAUDE.md § 1.3).
 *   NEVER carry a threshold, a cut-off or a staging judgment. The engine does
 *         not read this file, and v2/tests/schema.test.js R-PRAC-5 proves it.
 *
 * THE PROVENANCE RULE — the reason the type exists
 *   `supportsRuleIds` may name a limitation rule ONLY where that rule's own
 *   `sourceRefIds` already contains this record's `refId`. Otherwise a
 *   description would lend a publication's authority to a rule the workbook
 *   never attached it to — inventing a provenance (§ 1.2). R-PRAC-4 fails on
 *   any violation. An EMPTY list is legitimate and means what it says: the
 *   publication describes the measurement, and the workbook cites it on no rule
 *   for that measurement.
 *
 * SOURCES READ FOR THIS ROUND — full texts under reference/papers/fulltext/,
 * gitignored as copyrighted material (W-011). The figure survey that located
 * them is v2/data/LITERATURE.md § 18; the citation finding this round did NOT
 * act on is § 19.
 *
 * Loaded as a plain <script> (ES modules fail under file://) and require()-able
 * by the Node test suite, exactly like every other file here.
 * ---------------------------------------------------------------------------
 */

const PRACTICES_VERSION = '1.0';   /* W-180: record type created; PRAC-0001…0004 */
const PRACTICES_HASH = 'b903a1875a584d96a4ab28a9c4786d41dc973bce74097cb59c0a07220a144d46';

const PRACTICES = [
  {
    id: 'PRAC-0001',
    parameter: 'mre',
    refId: 'REF-039',
    locator: 'Figure 1, with the Techniques section',
    sourceKind: 'figure-caption',
    practiceKind: 'placement',
    description:
      'The region is drawn on the axial magnitude image while the wave image and the elastogram with its ' +
      'confidence map are read alongside it, taking in the largest portion of liver tissue available on that ' +
      'section. Left out are areas where the waves do not propagate coherently, large vessels, focal lesions, ' +
      'tissue at the liver margins where an edge effect appears, the outer 1 cm below the capsule, and any area ' +
      'the inversion algorithm itself marks as invalid. The mean stiffness of each section is recorded, and the ' +
      'reported value is the mean across the sections, weighted by the size of each region.',
    supportsRuleIds: ['INT-0034'],
    descriptionProvenance: 'authored-from-source-text'
  },
  {
    id: 'PRAC-0002',
    parameter: 'iron',
    refId: 'REF-038',
    locator: 'the signal-intensity-ratio and R2* sections',
    sourceKind: 'method-text',
    practiceKind: 'placement',
    description:
      'This guideline gives its measurement instruction in words rather than in a figure. For the ' +
      'signal-intensity-ratio method it places three regions of 1–2 cm diameter in the liver and two in the ' +
      'right and left paraspinal muscles on the same section, and forms the liver-to-muscle ratio at each echo ' +
      'time. It warns that where the liver is covered only sparsely, repeat examinations drift apart unless the ' +
      'regions can be placed in the same tissue again. For R2* maps it sets out no procedure of its own: it ' +
      'reports that region-based analyses agree better between and within readers when more and larger regions ' +
      'are used — one large region per Couinaud segment is the example it gives — and refers onward to the ' +
      'publication that proposed it.',
    supportsRuleIds: ['INT-0019'],
    descriptionProvenance: 'authored-from-source-text'
  },
  {
    id: 'PRAC-0003',
    parameter: 'iron',
    refId: 'REF-007',
    locator: 'Figure 1, with the calibration methods',
    sourceKind: 'figure-caption',
    practiceKind: 'placement',
    description:
      'The R2* value used here is the mean of three regions, one on each of three slices, shown on the R2* maps ' +
      'as circles. The regions were placed so as to avoid major vessels, artifacts, and the liver margins where ' +
      'they adjoin other anatomical structures or intra-abdominal fat. The study states plainly that no attempt ' +
      'was made to match its regions or slices to those the reference method used, which is part of why the two ' +
      'measurements of the same liver differ.',
    supportsRuleIds: [],
    descriptionProvenance: 'authored-from-source-text'
  },
  {
    id: 'PRAC-0004',
    parameter: 'pdff',
    refId: 'REF-009',
    locator: 'Figure 7, with Figure 3',
    sourceKind: 'figure-caption',
    practiceKind: 'sampling-rationale',
    description:
      'This is not a procedure to repeat in a patient — the work was done on 13 explanted human livers with ' +
      'markers on the surface — but it is the measured reason for sampling more than one place. Five biopsy ' +
      'cores were taken from each of 117 liver segments, 585 in all, and the plots show how far apart the five ' +
      'samples from a single segment fall, as well as how much segments differ from one another; 6.3% of the ' +
      'cores placed the liver in the wrong steatosis grade. A companion figure shows the same unevenness as an ' +
      'image, one liver reading 10% fat in segment IVa against 20% in segment VII.',
    supportsRuleIds: [],
    descriptionProvenance: 'authored-from-source-text'
  }
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {PRACTICES, PRACTICES_VERSION, PRACTICES_HASH};
}
