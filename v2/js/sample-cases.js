/* VeriLiv V2 — SAMPLE MODE SCENARIO REGISTRY (W-116)
 * ---------------------------------------------------------------------------
 * THE DEMONSTRATION CASES. Every number in every entry is fabricated: it
 * belongs to no patient, it was not measured on any scanner, and it is not a
 * cut-off, a calibration constant or a coefficient — so CLAUDE.md § 1 does not
 * reach this file, and nothing in v2/data/ sources it. Each value was chosen to
 * land in a named staging band read from v2/data/cutoffs.data.js, so the
 * scenario tells the clinical story its label names; a value is never authored
 * here as a threshold.
 *
 * It lives in v2/js/, NOT v2/data/: the data layer holds published evidence,
 * and a folder whose whole contract is "nothing in here is invented" is the
 * wrong home for a set of invented patients. It is a plain <script> (ES modules
 * fail under file://) with a module.exports tail, so the Node tests load the
 * very same file the browser does.
 *
 * WHAT THE SET IS FOR
 *   A development aid. app.js exposes a <select> over these entries in the
 *   report toolbar, but ONLY on a dev host (file:// or localhost) — the
 *   published page shows the single "Load example" button it always did and
 *   loads DEFAULT_SAMPLE_KEY. Switching scenario re-enters SAMPLE mode with a
 *   different case; the watermark, the footer sample line and the locked sheets
 *   are unchanged for every one of them.
 *
 * EACH ENTRY carries `key` + `label` (English, shown in the menu) followed by
 * exactly the shape one selection takes: path / fieldStrength / cohort / scope
 * / indication / accession / studyDate / age, a `performed` map with all six
 * purpose groups on, a `values` map, and the GE console `products` picks. Every
 * scenario is a GE 1.5T adult study. FIB-4 is not stored — the engine computes
 * it from age / ast / alt / plt, which are tuned so it lands where the story
 * needs it.
 * ---------------------------------------------------------------------------
 */

const SAMPLE_CASES = [
  /* The original demonstration case: a fully worked-through GE 1.5T study with a
     value in every section and mild abnormalities across the board. Its iron
     maps are now filled (LIC + T2*), so it no longer prints an absence row —
     "partial-study" below is the entry that keeps that behaviour. W-081: it also
     carries IVIM (the "Additional measurements" IVIM checkbox on, D / D* / f
     entered), so "Load Sample Report" shows the page-2 research section — D and
     D* within their 1.5 T reference intervals, f below its (15–25%), reading
     with the rest of the early-fibrosis picture. */
  {
    key: 'fully-worked',
    label: 'Fully worked study',
    path: 'ge', fieldStrength: '1.5T', cohort: 'adult', scope: 'cleared',
    indication: 'steatotic-liver-disease',
    accession: 'SAMPLE-WORKED-01', studyDate: '2026-01-15', age: 54,
    performed: {fat: true, iron: true, fibrosis: true, t1: true, ct1: true,
                adc: true, ivim: true},
    values: {
      pdff: 14.2, r2star: 87, lic: 2.2, t2star: 18, mre: 3.4,
      t1: 610, ct1: 820, adc: 1.35,
      'ivim-d': 0.98, 'ivim-dstar': 72, 'ivim-f': 13,
      ast: 48, alt: 61, plt: 178, ferritin: 340, tsat: 33,
      bmi: 31.2, ascites: false, altUln: 33, ggt: 82
    },
    products: {r2star: 'idealiq', t2star: 'starmap'}
  },

  /* Steatosis with early fibrosis and a mild iron confounder. LIC is up enough
     to bias PDFF (the iron→PDFF reliability note fires), and MRE + FIB-4 both
     clear the MEFIB rule-in pair (MRE ≥ 3.3 kPa AND FIB-4 ≥ 1.6). */
  {
    key: 'masld-early',
    label: 'MASLD + early fibrosis + mild iron',
    path: 'ge', fieldStrength: '1.5T', cohort: 'adult', scope: 'cleared',
    indication: 'steatotic-liver-disease',
    accession: 'SAMPLE-MASLD-01', studyDate: '2026-01-15', age: 55,
    performed: {fat: true, iron: true, fibrosis: true, t1: true, ct1: true, adc: true},
    values: {
      pdff: 17.6, r2star: 158, lic: 4.0, t2star: 14, mre: 3.6,
      t1: 625, ct1: 855, adc: 1.30,
      ast: 46, alt: 40, plt: 180, ferritin: 480, tsat: 38,
      bmi: 33.4, ascites: false, altUln: 33, ggt: 95
    },
    products: {r2star: 'idealiq', t2star: 'starmap'}
  },

  /* Iron-overload dominant. T2* below 12 ms pulls the MRE band (the scan may
     have failed unrecognised), and iron staged abnormal biases PDFF. cT1 is
     kept — T2* is above the 2 ms floor where cT1 would be withdrawn. */
  {
    key: 'iron-dominant',
    label: 'Iron overload dominant',
    path: 'ge', fieldStrength: '1.5T', cohort: 'adult', scope: 'cleared',
    indication: 'iron-overload',
    accession: 'SAMPLE-IRON-01', studyDate: '2026-01-15', age: 38,
    performed: {fat: true, iron: true, fibrosis: true, t1: true, ct1: true, adc: true},
    values: {
      pdff: 8.0, r2star: 670, lic: 17.0, t2star: 3.5, mre: 3.2,
      t1: 505, ct1: 780, adc: 1.45,
      ast: 40, alt: 44, plt: 240, ferritin: 1850, tsat: 78,
      bmi: 24.0, ascites: false, altUln: 33, ggt: 55
    },
    products: {r2star: 'idealiq', t2star: 'starmap'}
  },

  /* Advanced fibrosis / cirrhosis with ascites. Ascites removes the MRE band
     (a named technical-failure setting); MRE itself sits in the F4 range and
     FIB-4 is high on a low platelet count. */
  {
    key: 'cirrhosis-ascites',
    label: 'Advanced fibrosis / cirrhosis + ascites',
    path: 'ge', fieldStrength: '1.5T', cohort: 'adult', scope: 'cleared',
    indication: 'chronic-liver-disease',
    accession: 'SAMPLE-CIRR-01', studyDate: '2026-01-15', age: 62,
    performed: {fat: true, iron: true, fibrosis: true, t1: true, ct1: true, adc: true},
    values: {
      pdff: 6.5, r2star: 79, lic: 2.0, t2star: 19, mre: 5.4,
      t1: 640, ct1: 930, adc: 1.10,
      ast: 60, alt: 52, plt: 130, ferritin: 260, tsat: 34,
      bmi: 29.0, ascites: true, altUln: 33, ggt: 160
    },
    products: {r2star: 'idealiq', t2star: 'starmap'}
  },

  /* Steatohepatitis with a high inflammatory burden. ALT above 5× the site ULN
     and GGT above 120 U/L each attach an "MRE stiffness may be overestimated"
     caveat; PDFF is in the severe band. */
  {
    key: 'steatohepatitis-hot',
    label: 'Steatohepatitis, high inflammation',
    path: 'ge', fieldStrength: '1.5T', cohort: 'adult', scope: 'cleared',
    indication: 'steatotic-liver-disease',
    accession: 'SAMPLE-NASH-01', studyDate: '2026-01-15', age: 44,
    performed: {fat: true, iron: true, fibrosis: true, t1: true, ct1: true, adc: true},
    values: {
      pdff: 28.0, r2star: 102, lic: 2.6, t2star: 17, mre: 3.7,
      t1: 630, ct1: 910, adc: 1.38,
      ast: 120, alt: 190, plt: 210, ferritin: 520, tsat: 36,
      bmi: 32.5, ascites: false, altUln: 33, ggt: 145
    },
    products: {r2star: 'idealiq', t2star: 'starmap'}
  },

  /* A near-normal reference study: every measurement inside its healthy band,
     no specific indication, so no reliability caveat and no guideline
     consideration fires. The contrast case for the five above. */
  {
    key: 'reference',
    label: 'Reference / near-normal',
    path: 'ge', fieldStrength: '1.5T', cohort: 'adult', scope: 'cleared',
    indication: 'non-specific',
    accession: 'SAMPLE-REF-01', studyDate: '2026-01-15', age: 40,
    performed: {fat: true, iron: true, fibrosis: true, t1: true, ct1: true, adc: true},
    values: {
      pdff: 3.1, r2star: 40, lic: 1.0, t2star: 26, mre: 2.4,
      t1: 545, ct1: 740, adc: 1.65,
      ast: 22, alt: 24, plt: 260, ferritin: 120, tsat: 28,
      bmi: 23.0, ascites: false, altUln: 33, ggt: 30
    },
    products: {r2star: 'idealiq', t2star: 'starmap'}
  },

  /* The gap-object demonstration: iron is requested but NOTHING iron-related
     was produced — no R2*, so LIC has nothing to derive from either (a typed
     LIC is never overwritten, but an absent one IS derived from R2* when R2*
     is present — measured directly in this task, see the note below). All
     three iron rows print "No data available for this measurement." rather
     than being read as normal, and serum ferritin present with LIC absent
     attaches the "ferritin does not replace LIC" context note (TRG-0011). */
  {
    key: 'partial-study',
    label: 'Partial study (missing iron maps)',
    path: 'ge', fieldStrength: '1.5T', cohort: 'adult', scope: 'cleared',
    indication: 'steatotic-liver-disease',
    accession: 'SAMPLE-PARTIAL-01', studyDate: '2026-01-15', age: 54,
    performed: {fat: true, iron: true, fibrosis: true, t1: true, ct1: true, adc: true},
    values: {
      pdff: 12.5, mre: 3.2,
      t1: 600, ct1: 800, adc: 1.28,
      ast: 44, alt: 50, plt: 190, ferritin: 320, tsat: 32,
      bmi: 30.0, ascites: false, altUln: 33, ggt: 78
    },
    products: {}
  }
];

/* Loaded on first open and by the published page's single button. */
const DEFAULT_SAMPLE_KEY = 'fully-worked';

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {SAMPLE_CASES, DEFAULT_SAMPLE_KEY};
}
