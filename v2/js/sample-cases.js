/* VeriLiv V2 — SAMPLE MODE SCENARIO REGISTRY (W-116, expanded W-188)
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
 *   report toolbar. That menu is NOT gated to a dev host any more — W-161
 *   removed the file://-or-localhost check, `sampleMenuAllowed()` now returns
 *   true unconditionally, and the full scenario menu is shown on the published
 *   page exactly as it is here. Switching scenario re-enters SAMPLE mode with a
 *   different case; the watermark, the footer sample line and the locked sheets
 *   are unchanged for every one of them.
 *
 * SIZE AND SHAPE (W-188)
 *   21 entries, grouped by `group` into five clinical families: 5 `steatosis`,
 *   3 `iron`, 3 `fibrosis`, 6 `differential` (three matched pairs — see below)
 *   and 4 `technical`. The set deliberately spans both field strengths (1.5T
 *   and 3.0T), both cohorts (adult and paediatric), both scanner paths (`ge`
 *   and `other`) and all three scope settings (`native` / `cleared` /
 *   `research`), because a branch of the engine that no scenario reaches is a
 *   branch no reader of this repository ever sees exercised.
 *
 *   The 6 `differential` entries form 3 pairs, each pair sharing `pair` (a
 *   pair id) and `pairShares` (the name of the one value key both members of
 *   the pair report identically). Each pair holds one number fixed and lets
 *   everything the report's own sourced rules say about it move — the point
 *   being that an identical measurement can read two different ways once the
 *   surrounding picture changes.
 *
 * EACH ENTRY carries `key` + `label` (English, shown in the menu), `group`
 * (and, for the six differential entries, `pair` + `pairShares`), followed by
 * exactly the shape one selection takes: path / fieldStrength / cohort / scope
 * / indication / accession / studyDate / age, a `performed` map with all six
 * purpose groups on (one entry also turns IVIM on), a `values` map, and either
 * the GE console `products` picks (`path: 'ge'`) or a `techniques` map
 * (`path: 'other'`, or a GE entry that also wants to state its technique
 * explicitly). FIB-4 is not stored — the engine computes it from
 * age / ast / alt / plt, which are tuned so it lands where the story needs it.
 *
 * R2-STAR AND T2-STAR DISCIPLINE (W-188)
 *   R2* and T2* are one acquisition, not two independent readings: T2* (ms) =
 *   1000 / R2* (s⁻¹). Every entry below obeys that relationship. Before this
 *   task six of the seven original entries did not, and four of them reported
 *   the same acquisition landing in two different severity bands depending on
 *   which of the pair was read — a defect this task closes across the whole
 *   set, not only in the entries it adds. LIC in every entry equals what the
 *   published calibration for that entry's field strength and vendor mode
 *   returns for its R2* value; no entry states an LIC that its own R2* would
 *   not produce.
 * ---------------------------------------------------------------------------
 */

const SAMPLE_CASES = [
  /* ---------------------------- steatosis ---------------------------- */

  /* A near-normal reference study: every measurement inside its healthy band,
     no specific indication, so no reliability caveat and no guideline
     consideration fires. The contrast case for the rest of the steatosis
     group. */
  {
    key: 'reference',
    label: 'Reference / near-normal',
    group: 'steatosis',
    path: 'ge', fieldStrength: '1.5T', cohort: 'adult', scope: 'cleared',
    indication: 'non-specific',
    accession: 'SAMPLE-REF-01', studyDate: '2026-01-15', age: 40,
    performed: {fat: true, iron: true, fibrosis: true, t1: true, ct1: true, adc: true},
    values: {
      pdff: 3.1, r2star: 40, t2star: 25.0, lic: 1.0, mre: 2.4,
      t1: 545, ct1: 740, adc: 1.65,
      ast: 22, alt: 24, plt: 260, ferritin: 120, tsat: 28,
      bmi: 23.0, ascites: false, altUln: 33, ggt: 30
    },
    products: {r2star: 'idealiq', t2star: 'starmap'}
  },

  /* The original demonstration case, and the one the published page's single
     button opens: a fully worked-through GE 1.5T study with a value in every
     section and mild abnormalities across the board. It also carries IVIM (the
     "Additional measurements" IVIM checkbox on, D / D* / f entered), so the
     page-2 research section is shown — D and D* within their 1.5 T reference
     intervals, f below its (15–25%), reading with the rest of the picture.

     R2* IS DELIBERATELY BELOW 83 HERE, and moving it up breaks the scenario.
     T2* is the reciprocal of R2*, and a T2* under 12 ms withholds the stiffness
     measurement; at 83 s⁻¹ the two meet. The default scenario has to deliver a
     complete report, so the iron burden stays borderline — high enough that the
     iron→PDFF caveat still fires, low enough that the fibrosis answer survives.
     `masld-early` is the entry that shows the other side of that line.

     IT ALSO CARRIES A DISAGREEMENT ON PURPOSE. The stiffness ladder puts
     3.4 kPa in the mild band, while the composite rule — which reads the same
     stiffness against its own published cut-off — rules significant fibrosis
     IN. Both are published, both are shown, and neither is adjusted to agree
     with the other: reporting a disagreement rather than resolving it is this
     project's house style, and this is the scenario a reader meets it in. */
  {
    key: 'fully-worked',
    label: 'Fully worked study',
    group: 'steatosis',
    path: 'ge', fieldStrength: '1.5T', cohort: 'adult', scope: 'cleared',
    indication: 'steatotic-liver-disease',
    accession: 'SAMPLE-WORKED-01', studyDate: '2026-01-15', age: 54,
    performed: {fat: true, iron: true, fibrosis: true, t1: true, ct1: true,
                adc: true, ivim: true},
    values: {
      pdff: 14.2, r2star: 78, t2star: 12.8, lic: 2.0, mre: 3.4,
      t1: 610, ct1: 820, adc: 1.35,
      'ivim-d': 0.98, 'ivim-dstar': 72, 'ivim-f': 13,
      ast: 48, alt: 61, plt: 178, ferritin: 340, tsat: 33,
      bmi: 31.2, ascites: false, altUln: 33, ggt: 82
    },
    products: {r2star: 'idealiq', t2star: 'starmap'}
  },

  /* Steatosis with early fibrosis, and the scenario that shows what a modest
     iron burden COSTS. T2* sits at 9.1 ms — inside the 8–12 ms window no other
     scenario reaches, and below the 12 ms line at which the stiffness is
     withheld — so the fibrosis answer this study came for is not delivered,
     and the composite fibrosis rule reports that it cannot be computed rather
     than computing on a measurement the report has withheld.

     W-188 rewrote this entry's story rather than its rules. Until this task the
     comment claimed the composite rule cleared here; it never could, because
     T2* was stored at 14 ms while the R2* beside it implied 6.3 ms. Once the
     two agree, "mild iron and a working stiffness answer" turns out to be an
     impossible combination at 1.5T: any iron heavy enough to reach the mild
     band drives T2* under the withholding line. The honest scenario is this
     one — and `fully-worked` is where a complete answer is demonstrated, at a
     borderline iron burden that stays above the line. */
  {
    key: 'masld-early',
    label: 'MASLD + early fibrosis + borderline iron',
    group: 'steatosis',
    path: 'ge', fieldStrength: '1.5T', cohort: 'adult', scope: 'cleared',
    indication: 'steatotic-liver-disease',
    accession: 'SAMPLE-MASLD-01', studyDate: '2026-01-15', age: 55,
    performed: {fat: true, iron: true, fibrosis: true, t1: true, ct1: true, adc: true},
    values: {
      pdff: 17.6, r2star: 110, t2star: 9.1, lic: 2.8, mre: 3.6,
      t1: 625, ct1: 855, adc: 1.30,
      ast: 46, alt: 40, plt: 180, ferritin: 480, tsat: 38,
      bmi: 33.4, ascites: false, altUln: 33, ggt: 95
    },
    products: {r2star: 'idealiq', t2star: 'starmap'}
  },

  /* Steatohepatitis with a high inflammatory burden. ALT above 5× the site
     ULN and GGT above 120 U/L each attach an "MRE stiffness may be
     overestimated" caveat; PDFF is in the severe band.

     The iron burden is held low on purpose: a caveat that qualifies a stiffness
     reading is worth nothing on a page where the stiffness was withheld, and
     any R2* above 83 s⁻¹ withholds it. Both caveats are about a number the
     reader can still see. */
  {
    key: 'steatohepatitis-hot',
    label: 'Steatohepatitis, high inflammation',
    group: 'steatosis',
    path: 'ge', fieldStrength: '1.5T', cohort: 'adult', scope: 'cleared',
    indication: 'steatotic-liver-disease',
    accession: 'SAMPLE-NASH-01', studyDate: '2026-01-15', age: 44,
    performed: {fat: true, iron: true, fibrosis: true, t1: true, ct1: true, adc: true},
    values: {
      pdff: 28.0, r2star: 76, t2star: 13.2, lic: 1.9, mre: 3.7,
      t1: 630, ct1: 910, adc: 1.38,
      ast: 120, alt: 190, plt: 210, ferritin: 520, tsat: 36,
      bmi: 32.5, ascites: false, altUln: 33, ggt: 145
    },
    products: {r2star: 'idealiq', t2star: 'starmap'}
  },

  /* Fat has resolved (PDFF back in the normal range) but the stiffness value
     has not moved with it — fibrosis persists after the steatosis that likely
     drove it has cleared, the case for reading PDFF and MRE as two separate
     clinical questions rather than one following the other. */
  {
    key: 'fat-resolved-fibrosis-persists',
    label: 'Fat resolved, fibrosis persists',
    group: 'steatosis',
    path: 'ge', fieldStrength: '1.5T', cohort: 'adult', scope: 'cleared',
    indication: 'steatotic-liver-disease',
    accession: 'SAMPLE-RESOLVED-01', studyDate: '2026-01-15', age: 58,
    performed: {fat: true, iron: true, fibrosis: true, t1: true, ct1: true, adc: true},
    values: {
      pdff: 4.2, r2star: 60, t2star: 16.7, lic: 1.5, mre: 4.3,
      t1: 615, ct1: 880, adc: 1.20,
      ast: 38, alt: 30, plt: 165, ferritin: 210, tsat: 31,
      bmi: 27.0, ascites: false, altUln: 33, ggt: 70
    },
    products: {r2star: 'idealiq', t2star: 'starmap'}
  },

  /* ------------------------------- iron ------------------------------- */

  /* Iron-overload dominant. R2* 670 s⁻¹ implies T2* 1.5 ms, which sits below
     the 2 ms floor this repository withdraws the iron-corrected T1 at — so
     cT1 is withdrawn here, and the stiffness value is withheld too. That
     withdrawal is deliberate: this is the one scenario in the set that
     reaches the rule at all, and physics (T2* = 1000 / R2*) was kept rather
     than adjusted to dodge it. (An earlier version of this scenario claimed a
     3.5 ms T2* that kept cT1 — that claim contradicted its own R2* and is
     gone.) */
  {
    key: 'iron-dominant',
    label: 'Iron overload dominant',
    group: 'iron',
    path: 'ge', fieldStrength: '1.5T', cohort: 'adult', scope: 'cleared',
    indication: 'iron-overload',
    accession: 'SAMPLE-IRON-01', studyDate: '2026-01-15', age: 38,
    performed: {fat: true, iron: true, fibrosis: true, t1: true, ct1: true, adc: true},
    values: {
      pdff: 8.0, r2star: 670, t2star: 1.5, lic: 17.0, mre: 3.2,
      t1: 505, ct1: 780, adc: 1.45,
      ast: 40, alt: 44, plt: 240, ferritin: 1850, tsat: 78,
      bmi: 24.0, ascites: false, altUln: 33, ggt: 55
    },
    products: {r2star: 'idealiq', t2star: 'starmap'}
  },

  /* Paediatric iron overload past the published chelation-target threshold —
     the only scenario in the set that reaches that rule. Paediatric staging
     is partial (the ladder above the last resolved rung is not drawn), so the
     iron rows here read as a bounded "at least moderate" verdict rather than
     a specific grade, and the stiffness ruler is adult-adapted and printed as
     orientation-only, not a paediatric-validated stage. */
  {
    key: 'iron-above-chelation-target',
    label: 'Paediatric iron overload above the chelation target',
    group: 'iron',
    path: 'ge', fieldStrength: '1.5T', cohort: 'peds', scope: 'cleared',
    indication: 'iron-overload',
    accession: 'SAMPLE-PEDS-IRON-01', studyDate: '2026-01-15', age: 14,
    performed: {fat: true, iron: true, fibrosis: true, t1: true, ct1: true, adc: true},
    values: {
      pdff: 6.0, r2star: 850, t2star: 1.2, lic: 21.6, mre: 2.9,
      t1: 470, ct1: 810, adc: 1.40,
      ast: 52, alt: 60, plt: 195, ferritin: 4200, tsat: 88,
      bmi: 22.5, ascites: false, altUln: 33, ggt: 65
    },
    products: {r2star: 'idealiq', t2star: 'starmap'}
  },

  /* High serum ferritin with a normal liver iron concentration. Ferritin is
     an acute-phase reactant, not a stand-in for LIC, and this scenario prints
     that context note rather than letting the high ferritin read as iron
     overload on its own. */
  {
    key: 'ferritin-high-no-overload',
    label: 'High ferritin, no iron overload',
    group: 'iron',
    path: 'ge', fieldStrength: '1.5T', cohort: 'adult', scope: 'cleared',
    indication: 'non-specific',
    accession: 'SAMPLE-FERR-01', studyDate: '2026-01-15', age: 51,
    performed: {fat: true, iron: true, fibrosis: true, t1: true, ct1: true, adc: true},
    values: {
      pdff: 15.5, r2star: 48, t2star: 20.8, lic: 1.2, mre: 2.9,
      t1: 590, ct1: 845, adc: 1.33,
      ast: 55, alt: 68, plt: 205, ferritin: 980, tsat: 30,
      bmi: 31.8, ascites: false, altUln: 33, ggt: 110
    },
    products: {r2star: 'idealiq', t2star: 'starmap'}
  },

  /* ----------------------------- fibrosis ----------------------------- */

  /* Advanced fibrosis / cirrhosis with ascites. Ascites is a named
     technical-failure setting, so it withholds the MRE band outright; the
     composite MEFIB-style rule that reads MRE + FIB-4 together cannot
     compute here — contrast this against 'cirrhosis-compensated' below,
     which is otherwise the same clinical picture without ascites. */
  {
    key: 'cirrhosis-ascites',
    label: 'Advanced fibrosis / cirrhosis + ascites',
    group: 'fibrosis',
    path: 'ge', fieldStrength: '1.5T', cohort: 'adult', scope: 'cleared',
    indication: 'chronic-liver-disease',
    accession: 'SAMPLE-CIRR-01', studyDate: '2026-01-15', age: 62,
    performed: {fat: true, iron: true, fibrosis: true, t1: true, ct1: true, adc: true},
    values: {
      pdff: 6.5, r2star: 79, t2star: 12.7, lic: 2.0, mre: 5.4,
      t1: 640, ct1: 930, adc: 1.10,
      ast: 60, alt: 52, plt: 130, ferritin: 260, tsat: 34,
      bmi: 29.0, ascites: true, altUln: 33, ggt: 160
    },
    products: {r2star: 'idealiq', t2star: 'starmap'}
  },

  /* The same advanced fibrosis / cirrhosis picture as 'cirrhosis-ascites',
     compensated and without ascites: nothing withholds MRE here, so the
     composite MRE + FIB-4 rule computes and stages where the ascites
     scenario cannot — the pairing shows what one technical setting removes. */
  {
    key: 'cirrhosis-compensated',
    label: 'Compensated cirrhosis, no ascites',
    group: 'fibrosis',
    path: 'ge', fieldStrength: '1.5T', cohort: 'adult', scope: 'cleared',
    indication: 'chronic-liver-disease',
    accession: 'SAMPLE-CIRR-02', studyDate: '2026-01-15', age: 64,
    performed: {fat: true, iron: true, fibrosis: true, t1: true, ct1: true, adc: true},
    values: {
      pdff: 5.0, r2star: 72, t2star: 13.9, lic: 1.8, mre: 5.6,
      t1: 635, ct1: 925, adc: 1.12,
      ast: 58, alt: 46, plt: 118, ferritin: 240, tsat: 33,
      bmi: 26.5, ascites: false, altUln: 33, ggt: 95
    },
    products: {r2star: 'idealiq', t2star: 'starmap'}
  },

  /* Severe obesity with an MRE value read at technical risk of unreliability.
     BMI 38.4 is past the body-habitus reliability rule this repository
     carries for MRE — no other scenario in the set reaches it.

     THE BODY-HABITUS RULE WITHHOLDS THE STIFFNESS ON ITS OWN, exactly as
     ascites does in 'cirrhosis-ascites' — it is not a caveat printed beside a
     number the reader still gets. The iron burden is deliberately normal here
     so that the withholding has exactly one cause and a reader can attribute
     it: raise the iron and a second rule reaches the same conclusion, and the
     scenario stops being able to teach which one did it. */
  {
    key: 'mre-severe-obesity',
    label: 'Severe obesity, stiffness at technical risk',
    group: 'fibrosis',
    path: 'ge', fieldStrength: '1.5T', cohort: 'adult', scope: 'cleared',
    indication: 'steatotic-liver-disease',
    accession: 'SAMPLE-OBESE-01', studyDate: '2026-01-15', age: 47,
    performed: {fat: true, iron: true, fibrosis: true, t1: true, ct1: true, adc: true},
    values: {
      pdff: 21.0, r2star: 66, t2star: 15.2, lic: 1.7, mre: 3.9,
      t1: 600, ct1: 890, adc: 1.32,
      ast: 42, alt: 55, plt: 215, ferritin: 300, tsat: 31,
      bmi: 38.4, ascites: false, altUln: 33, ggt: 88
    },
    products: {r2star: 'idealiq', t2star: 'starmap'}
  },

  /* --------------------------- differential --------------------------- */
  /* Three matched pairs. Each pair holds ONE value key identical across its
     two members (`pairShares`) and lets everything the report's own sourced
     rules say about that number move — the point being that an identical
     measurement can read two different ways once the surrounding picture
     changes. */

  /* Pair 'fat-vs-iron-confounder' (shares pdff = 18.0). This half: iron is
     clear, so PDFF 18.0% is read at face value as moderate steatosis with no
     iron-confounder caveat attached. */
  {
    key: 'diff-fat-clean-iron',
    label: 'Fat 18% — iron clear',
    group: 'differential', pair: 'fat-vs-iron-confounder', pairShares: 'pdff',
    path: 'ge', fieldStrength: '1.5T', cohort: 'adult', scope: 'cleared',
    indication: 'steatotic-liver-disease',
    accession: 'SAMPLE-DIFF-A1', studyDate: '2026-01-15', age: 49,
    performed: {fat: true, iron: true, fibrosis: true, t1: true, ct1: true, adc: true},
    values: {
      pdff: 18.0, r2star: 45, t2star: 22.2, lic: 1.1, mre: 3.1,
      t1: 585, ct1: 830, adc: 1.36,
      ast: 40, alt: 52, plt: 220, ferritin: 190, tsat: 29,
      bmi: 30.5, ascites: false, altUln: 33, ggt: 62
    },
    products: {r2star: 'idealiq', t2star: 'starmap'}
  },

  /* Pair 'fat-vs-iron-confounder' (shares pdff = 18.0). This half: heavy iron
     is present alongside the identical PDFF 18.0%, which attaches the
     iron→PDFF reliability caveat this repository carries — the same fat
     number, read with an added note the clean-iron half never earns. */
  {
    key: 'diff-fat-heavy-iron',
    label: 'Fat 18% — heavy iron alongside',
    group: 'differential', pair: 'fat-vs-iron-confounder', pairShares: 'pdff',
    path: 'ge', fieldStrength: '1.5T', cohort: 'adult', scope: 'cleared',
    indication: 'steatotic-liver-disease',
    accession: 'SAMPLE-DIFF-A2', studyDate: '2026-01-15', age: 49,
    performed: {fat: true, iron: true, fibrosis: true, t1: true, ct1: true, adc: true},
    values: {
      pdff: 18.0, r2star: 420, t2star: 2.4, lic: 10.7, mre: 3.1,
      t1: 520, ct1: 845, adc: 1.34,
      ast: 44, alt: 48, plt: 210, ferritin: 1250, tsat: 62,
      bmi: 29.0, ascites: false, altUln: 33, ggt: 70
    },
    products: {r2star: 'idealiq', t2star: 'starmap'}
  },

  /* Pair 'stiffness-vs-inflammation' (shares mre = 3.8 kPa). This half:
     transaminases and GGT are quiet, so the 3.8 kPa reading carries no
     "stiffness may be overestimated by inflammation" caveat. */
  {
    key: 'diff-stiff-quiet-labs',
    label: 'Stiffness 3.8 kPa — enzymes quiet',
    group: 'differential', pair: 'stiffness-vs-inflammation', pairShares: 'mre',
    path: 'ge', fieldStrength: '1.5T', cohort: 'adult', scope: 'cleared',
    indication: 'chronic-liver-disease',
    accession: 'SAMPLE-DIFF-B1', studyDate: '2026-01-15', age: 56,
    performed: {fat: true, iron: true, fibrosis: true, t1: true, ct1: true, adc: true},
    values: {
      pdff: 9.0, r2star: 62, t2star: 16.1, lic: 1.6, mre: 3.8,
      t1: 605, ct1: 855, adc: 1.28,
      ast: 36, alt: 38, plt: 175, ferritin: 200, tsat: 30,
      bmi: 28.0, ascites: false, altUln: 33, ggt: 55
    },
    products: {r2star: 'idealiq', t2star: 'starmap'}
  },

  /* Pair 'stiffness-vs-inflammation' (shares mre = 3.8 kPa). This half:
     ALT/AST and GGT are markedly raised alongside the identical 3.8 kPa
     stiffness, which attaches the "MRE stiffness may be overestimated by
     active inflammation" caveat — the same number, read with reduced
     confidence because the surrounding labs changed, not the stiffness. */
  {
    key: 'diff-stiff-hot-labs',
    label: 'Stiffness 3.8 kPa — enzymes markedly raised',
    group: 'differential', pair: 'stiffness-vs-inflammation', pairShares: 'mre',
    path: 'ge', fieldStrength: '1.5T', cohort: 'adult', scope: 'cleared',
    indication: 'chronic-liver-disease',
    accession: 'SAMPLE-DIFF-B2', studyDate: '2026-01-15', age: 56,
    performed: {fat: true, iron: true, fibrosis: true, t1: true, ct1: true, adc: true},
    values: {
      pdff: 9.4, r2star: 62, t2star: 16.1, lic: 1.6, mre: 3.8,
      t1: 620, ct1: 905, adc: 1.26,
      ast: 165, alt: 205, plt: 175, ferritin: 210, tsat: 31,
      bmi: 28.2, ascites: false, altUln: 33, ggt: 165
    },
    products: {r2star: 'idealiq', t2star: 'starmap'}
  },

  /* Pair 'native-t1-masked-by-iron' (shares t1 = 600 ms). This half: iron is
     clear, so the native T1 of 600 ms and the iron-corrected T1 (cT1) sit
     close together, both reading unremarkable. Both entries in this pair
     also state their own `techniques` map alongside the GE `products` pick,
     so the technique that produced each parameter is explicit rather than
     inherited from the path default. */
  {
    key: 'diff-t1-clean-iron',
    label: 'Native T1 600 ms — iron clear',
    group: 'differential', pair: 'native-t1-masked-by-iron', pairShares: 't1',
    path: 'ge', fieldStrength: '1.5T', cohort: 'adult', scope: 'cleared',
    indication: 'steatotic-liver-disease',
    accession: 'SAMPLE-DIFF-C1', studyDate: '2026-01-15', age: 44,
    performed: {fat: true, iron: true, fibrosis: true, t1: true, ct1: true, adc: true},
    values: {
      pdff: 7.5, r2star: 50, t2star: 20.0, lic: 1.3, mre: 2.8,
      t1: 600, ct1: 795, adc: 1.50,
      ast: 30, alt: 34, plt: 235, ferritin: 160, tsat: 28,
      bmi: 26.0, ascites: false, altUln: 33, ggt: 40
    },
    products: {r2star: 'idealiq', t2star: 'starmap'},
    techniques: {
      pdff: 'pdff-cse-mri', r2star: 'iron-r2star-gre', t2star: 'iron-t2star-gre',
      lic: 'iron-r2star-gre', mre: 'mre-2d-gre-60hz', t1: 't1-molli',
      ct1: 'ct1-lms-molli', adc: 'dwi-adc'
    }
  },

  /* Pair 'native-t1-masked-by-iron' (shares t1 = 600 ms). This half: the
     identical native T1 of 600 ms sits behind heavy iron, and it is the
     iron-corrected T1 that separates the two — normal in the clean-iron half,
     high-risk here, once the T2* correction is applied. Native T1 alone
     cannot tell the two apart; it does not stage on its own (it is not a
     staging parameter in this repository) and reading it without the
     correction would miss the iron entirely. */
  {
    key: 'diff-t1-masked-by-iron',
    label: 'Native T1 600 ms — shortened by heavy iron',
    group: 'differential', pair: 'native-t1-masked-by-iron', pairShares: 't1',
    path: 'ge', fieldStrength: '1.5T', cohort: 'adult', scope: 'cleared',
    indication: 'steatotic-liver-disease',
    accession: 'SAMPLE-DIFF-C2', studyDate: '2026-01-15', age: 45,
    performed: {fat: true, iron: true, fibrosis: true, t1: true, ct1: true, adc: true},
    values: {
      pdff: 7.8, r2star: 480, t2star: 2.1, lic: 12.2, mre: 3.0,
      t1: 600, ct1: 940, adc: 1.48,
      ast: 34, alt: 36, plt: 228, ferritin: 1600, tsat: 70,
      bmi: 26.4, ascites: false, altUln: 33, ggt: 52
    },
    products: {r2star: 'idealiq', t2star: 'starmap'},
    techniques: {
      pdff: 'pdff-cse-mri', r2star: 'iron-r2star-gre', t2star: 'iron-t2star-gre',
      lic: 'iron-r2star-gre', mre: 'mre-2d-gre-60hz', t1: 't1-molli',
      ct1: 'ct1-lms-molli', adc: 'dwi-adc'
    }
  },

  /* ------------------------------ technical ----------------------------- */

  /* A non-GE scanner at 3.0T. The 'other' path's default technique map is all
     null, so this entry carries no GE `products` pick at all and instead
     names its own `techniques` explicitly — without that, an 'other'-path
     report stages nothing, because nothing tells the engine which technique
     produced each parameter. It is also the only entry whose liver-iron
     calibration has no vendor-neutral evidence behind it: at 3.0T the engine
     falls back to the GE-derived slope and flags that it did so.

     THIS ENTRY CARRIES THE FIELD-STRENGTH-SPECIFIC RULES. Four reliability
     rules in this repository fire only at 3.0T, and until W-188 no scenario
     reached any of them. The iron burden and the body-mass index here are set
     where they are so that all four do: severe iron, an abnormal fat fraction
     beside it, and a body habitus past the same threshold the 1.5T obesity
     scenario uses. The iron-corrected T1 is withdrawn as a consequence — T2*
     is under the 2 ms floor — which is why the cT1 demonstration lives in the
     'native-t1-masked-by-iron' pair and not here. Covering the four rules was
     worth one scenario's cT1 row; covering them by inventing a second 3.0T
     entry would not have been. */
  {
    key: 'non-ge-scanner',
    label: 'Non-GE scanner at 3.0T, severe iron',
    group: 'technical',
    path: 'other', fieldStrength: '3.0T', cohort: 'adult', scope: 'cleared',
    indication: 'iron-overload',
    accession: 'SAMPLE-OTHER-01', studyDate: '2026-01-15', age: 52,
    performed: {fat: true, iron: true, fibrosis: true, t1: true, ct1: true, adc: true},
    values: {
      pdff: 19.0, r2star: 1200, t2star: 0.8, lic: 16.2, mre: 3.4,
      t1: 640, ct1: 860, adc: 1.30,
      ast: 48, alt: 44, plt: 200, ferritin: 2400, tsat: 72,
      bmi: 36.5, ascites: false, altUln: 33, ggt: 90
    },
    techniques: {
      pdff: 'pdff-cse-mri', r2star: 'iron-r2star-gre', t2star: 'iron-t2star-gre',
      lic: 'iron-r2star-gre', mre: 'mre-2d-se-epi-60hz', t1: 't1-molli',
      ct1: 'ct1-lms-molli', adc: 'dwi-adc'
    }
  },

  /* MR elastography acquired with a 40 Hz driver, where every published
     stiffness cut-off in this repository is calibrated for a 60 Hz driver.
     The engine REFUSES to stage MRE for this one parameter because the
     published cut-offs are for a different acquisition — every other
     parameter still stages normally. That refusal is the point of the
     scenario, not a bug in it. */
  {
    key: 'wrong-driver-40hz',
    label: 'MR elastography at 40 Hz — cut-offs are 60 Hz',
    group: 'technical',
    path: 'other', fieldStrength: '1.5T', cohort: 'adult', scope: 'research',
    indication: 'chronic-liver-disease',
    accession: 'SAMPLE-40HZ-01', studyDate: '2026-01-15', age: 50,
    performed: {fat: true, iron: true, fibrosis: true, t1: true, ct1: true, adc: true},
    values: {
      pdff: 13.0, r2star: 60, t2star: 16.7, lic: 1.6, mre: 3.9,
      t1: 595, ct1: 820, adc: 1.42,
      ast: 35, alt: 40, plt: 210, ferritin: 220, tsat: 30,
      bmi: 27.5, ascites: false, altUln: 33, ggt: 55
    },
    techniques: {
      pdff: 'pdff-cse-mri', r2star: 'iron-r2star-gre', t2star: 'iron-t2star-gre',
      lic: 'iron-r2star-gre', mre: 'mre-2d-gre-40hz', t1: 't1-molli',
      ct1: 'ct1-lms-molli', adc: 'dwi-adc'
    }
  },

  /* Two-point Dixon fat signal fraction, not confounder-corrected PDFF. The
     engine REFUSES to stage this fat parameter because the published
     steatosis cut-offs are for confounder-corrected PDFF, a different
     acquisition than an uncorrected two-point Dixon fat fraction — every
     other parameter still stages normally. Same refusal shape as the 40 Hz
     MRE scenario above, on a different parameter. */
  {
    key: 'dixon-not-pdff',
    label: 'Two-point Dixon fat fraction — not PDFF',
    group: 'technical',
    path: 'other', fieldStrength: '1.5T', cohort: 'adult', scope: 'native',
    indication: 'steatotic-liver-disease',
    accession: 'SAMPLE-DIXON-01', studyDate: '2026-01-15', age: 43,
    performed: {fat: true, iron: true, fibrosis: true, t1: true, ct1: true, adc: true},
    values: {
      pdff: 16.0, r2star: 75, t2star: 13.3, lic: 2.0, mre: 3.1,
      t1: 588, ct1: 815, adc: 1.44,
      ast: 32, alt: 38, plt: 225, ferritin: 190, tsat: 29,
      bmi: 29.5, ascites: false, altUln: 33, ggt: 48
    },
    techniques: {
      pdff: 'pdff-two-point-dixon', r2star: 'iron-r2star-gre', t2star: 'iron-t2star-gre',
      lic: 'iron-r2star-gre', mre: 'mre-2d-se-epi-60hz', t1: 't1-molli',
      ct1: 'ct1-lms-molli', adc: 'dwi-adc'
    }
  },

  /* The gap-object demonstration: iron is requested but NOTHING iron-related
     was produced — no R2*, no T2*, no LIC key at all, so LIC has nothing to
     derive from either (a typed LIC is never overwritten, but an absent one
     IS derived from R2* when R2* is present — a typed absence here is a
     genuine gap, not a value the engine could have filled in). All three
     iron rows print "No data available for this measurement." rather than
     being read as normal, and serum ferritin present with LIC absent
     attaches the "ferritin does not replace LIC" context note (TRG-0011). */
  {
    key: 'partial-study',
    label: 'Partial study (missing iron maps)',
    group: 'technical',
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
