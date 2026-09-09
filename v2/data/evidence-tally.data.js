/* VeriLiv V2 — EVIDENCE TALLY RECORDS (W-177)
 * ---------------------------------------------------------------------------
 * NOT a workbook migration. Like practices.data.js, this is a file whose
 * sentences were WRITTEN HERE — but what it records is not a description of a
 * measurement, it is the evidence behind a LETTER.
 *
 * WHY IT EXISTS
 *   Every staged number prints an `Evidence A` badge. The letter is
 *   cutoff.evidenceGrade, transcribed from the workbook, and W-175 found the
 *   criterion the workbook graded it by, declared twice on its own Instructions
 *   sheet: "A = guideline-endorsed + >=4 studies · B = 2-3 studies · C =
 *   single-study" (LITERATURE.md § 17.3). The workbook publishes ONE primary
 *   Ref # per row and never the count it graded on, so no individual letter can
 *   be audited from anything shipped here (§ 17.4). A reviewing radiologist's
 *   first question about this product had no answer.
 *
 * WHAT A TALLY IS, AND IS NOT
 *   NOT a recovery of the workbook's own count. That number was never
 *   published; reconstructing "the number the workbook used" would be an
 *   invented figure wearing a data record's clothes (CLAUDE.md § 1.3).
 *   IS an independent tally, named as such: the studies the endorsing guideline
 *   itself cites for the bands a boundary separates, plus what a search of the
 *   full texts this project already holds added.
 *
 * THE TWO CLAIMS THIS TYPE KEEPS APART — the reason it has two counts
 *   "The endorsing guideline cites this publication for this band" and "this
 *   publication states this boundary value" are different assertions, and this
 *   round's reading found they come apart: of the seven studies the ESGAR/SAR
 *   guideline cites across the iron bands, ONE states the four threshold values;
 *   the rest are the clinical-outcome literature the bands' MEANING rests on —
 *   chelation targets, survival, complication risk. So every study entry carries
 *   `verification` (what text was actually read) and `statesBoundary` (what that
 *   text carried), and the record carries both `tally` and
 *   `statesBoundaryCount`. Collapsing the two would lend a paper's authority to
 *   a number it never printed, which is the defect W-183 was opened for.
 *
 * A GUIDELINE IS NEVER COUNTED AS A STUDY
 *   `ladderCitations` holds the publications the guideline attaches to the
 *   ladder as a whole rather than to one boundary's bands — a review and three
 *   consensus documents. They are visible and uncounted: they synthesise the
 *   same primaries the tally already counts, and counting them would double the
 *   evidence exactly the way § 1.4 keeps a guideline out of a mean.
 *
 * NEITHER IS A CALIBRATION -- BUT A PAPER IS JUDGED BY THE PASSAGE THAT WAS READ
 *   Wood 2005 (REF-001) and Hankins 2009 (REF-003) are the R2*->LIC calibration
 *   papers the cut-off records cite. A calibration converts a boundary into
 *   another unit; it is not evidence for where the boundary sits. That role
 *   stays on CAL-0001 / CAL-0004, which `derivedSiblings` names for every record
 *   whose number is a conversion rather than a published value.
 *   W-185 narrowed this, and the narrowing is the rule worth keeping: a
 *   publication is counted, or not counted, for the PASSAGE that was actually
 *   read -- never for the role it happens to play elsewhere in this repository.
 *   Wood 2005 also states three of the four boundaries in its own text and
 *   stratifies its own biopsied cohort by them, reporting how often MRI and
 *   biopsy assign the same band. That is the same kind of evidence Serai 2022
 *   was counted for in W-177, and treating the two differently was an
 *   inconsistency rather than a rule. So Wood 2005 is counted on TALLY-0002,
 *   TALLY-0003 and TALLY-0004 for that passage, and is still not counted for its
 *   calibration. Hankins 2009 stays uncounted: nothing in the text held here
 *   puts it at a boundary.
 *
 * ⛔ WHAT A RECORD MAY NEVER DO
 *   Carry a threshold, a cut-off or a staging judgment the engine could read.
 *   Change or re-derive an evidence letter — where a tally disagrees with the
 *   letter, `agreesWithGrade` is false, the disagreement is written up in
 *   LITERATURE.md § 21, and the letter stands until a § 4 three-step change with
 *   its own approval moves it.
 *
 * SOURCES READ FOR THESE ROUNDS
 *   W-177: full text of reference/papers/fulltext/PMID-36809220.txt (the
 *   guideline) and PMID-36194113.txt (Serai 2022, already REF-015 in this pool).
 *   W-185: full text of PMID-15860670.txt (Wood 2005, REF-001), reached by
 *   scanning all 40 full texts held here for the four threshold values. What
 *   that scan did NOT cover -- any database outside this repository -- is
 *   written out in LITERATURE.md § 22. Abstracts, as
 *   PubMed supplies them, under reference/papers/abstracts/ — gitignored as
 *   copyrighted material (W-011), each with a header saying what it can and
 *   cannot settle. The reading itself is written out in LITERATURE.md § 21.
 *
 * Loaded as a plain <script> (ES modules fail under file://) and require()-able
 * by the Node test suite, exactly like every other file here.
 * ---------------------------------------------------------------------------
 */

const EVIDENCE_TALLY_VERSION = '1.1';   /* W-185: Wood 2005 counted on TALLY-0002/0003/0004; no letter moved */

/* SHA-256 over the canonical serialisation of every record. See
   v2/tests/schema.test.js HASH-EVIDENCE-TALLY. It covers what a record ASSERTS —
   the claim, its endorser, which papers stand behind it and how each was found
   and read, both counts, and which cut-offs the claim speaks for. The free prose
   (`publishes`, `note`, `endorsementLocator`) is outside it. */
const EVIDENCE_TALLY_HASH = '3e11f3751c59f15c279c3ebcb9b2e1603f5d903110975d26e375188a171518c8';

/* One publication (St Pierre 2005) stands behind all four boundaries, and Serai
   2022 measures detection at all four. Each claim still carries its OWN entry
   for them rather than a shared reference, because `publishes` states what that
   paper establishes FOR THAT BOUNDARY — the sentence differs even where the
   citation does not. */

const EVIDENCE_TALLY = [
  {
    id: 'TALLY-0001',
    parameter: 'lic',
    boundary: 'normal|borderline',
    claimValue: 1.8,
    claimUnit: 'mg Fe/g dw',
    endorsingRefId: 'REF-038',
    endorsementLocator:
      'PMID-36809220.txt lines 73-74 — "less than 1.8 mg/g (32 µmol/g) is considered normal"',
    studies: [
      {
        pmid: '15256427',
        citation: 'St Pierre TG, Clark PR, Chua-anusorn W, et al. Blood 2005;105(2):855-861',
        locator: 'abstract, reference/papers/abstracts/PMID-15256427.abstract.md',
        publishes:
          'Measures liver R2 against needle-biopsy iron concentration in 105 people and reports sensitivity ' +
          'and specificity at four named boundaries, of which 1.8 mg Fe/g dry tissue is the first: the ' +
          'abstract calls them "the clinically significant LIC thresholds of 1.8, 3.2, 7.0, and 15.0 mg Fe/g ' +
          'dry tissue".',
        foundVia: 'guideline-citation',
        verification: 'abstract-read',
        statesBoundary: true
      },
      {
        pmid: '3943787',
        citation: 'Bassett ML, Halliday JW, Powell LW. Hepatology 1986;6(1):24-29',
        locator: 'abstract, reference/papers/abstracts/PMID-3943787.abstract.md',
        publishes:
          'Measures hepatic iron in 30 homozygous hemochromatosis relatives against heterozygotes, alcoholic ' +
          'liver disease and controls, and reports that the groups barely overlap. The boundary its abstract ' +
          'names is a different one: fibrosis or cirrhosis appeared only above roughly 400 µmol/g (22.3 mg/g) ' +
          'dry weight. The guideline cites it for the normal band; the number 1.8 does not appear in the ' +
          'abstract read here.',
        foundVia: 'guideline-citation',
        verification: 'abstract-read',
        statesBoundary: false
      },
      {
        pmid: '9028304',
        citation: 'Olivieri NF, Brittenham GM. Blood 1997;89(3):739-761',
        locator: 'abstract, reference/papers/abstracts/PMID-9028304.abstract.md',
        publishes:
          'A review of iron-chelating therapy in thalassemia major, which is what the guideline leans on for ' +
          'the borderline band being "the lower range of optimal chelation therapy". No liver iron ' +
          'concentration appears in the abstract read here.',
        foundVia: 'guideline-citation',
        verification: 'abstract-read',
        statesBoundary: false
      },
      {
        pmid: '14584759',
        citation: 'Nuttall KL, Palaty J, Lockitch G. Ann Clin Lab Sci 2003;33(4):443-450',
        locator: 'abstract, reference/papers/abstracts/PMID-14584759.abstract.md',
        publishes:
          'Derives reference limits from 141 liver biopsies by rank order and reports an iron limit of ' +
          '1800 µg/g dry weight — this boundary, in its own units — with the explicit qualification ' +
          '"(adults only)".',
        foundVia: 'independent-search',
        verification: 'abstract-read',
        statesBoundary: true
      },
      {
        pmid: '36194113',
        citation: 'Serai SD, Hernando D, Reeder SB, et al. Radiology 2022;306:e213256',
        locator: 'reference/papers/fulltext/PMID-36194113.txt lines 416-420 and 531-533',
        publishes:
          'A multicentre reproducibility study that treats 1.8 mg/g as the upper limit of normal LIC and ' +
          'measures how well R2* detects it: at both 1.5 T and 3 T the area under the ROC curve for this and ' +
          'the other three thresholds is 0.98 or higher.',
        foundVia: 'independent-search',
        verification: 'full-text-read',
        statesBoundary: true
      }
    ],
    ladderCitations: [
      {
        pmid: '31392478',
        citation: 'Henninger B, Alustiza J, Garbowski M, Gandon Y. Eur Radiol 2020;30(1):383-393',
        whatItIs: 'A practical guide the endorsing guideline says summarised a similar set of thresholds, with an additional moderate-to-severe category this project does not stage.'
      },
      {
        pmid: '20471131',
        citation: 'European Association For The Study Of The Liver. J Hepatol 2010;53(1):3-22',
        whatItIs: 'EASL clinical practice guidelines for HFE hemochromatosis, one of the three published guidelines that summary rests on.'
      },
      {
        pmid: '11020008',
        citation: 'Adams P, Brissot P, Powell LW. J Hepatol 2000;33(3):485-504',
        whatItIs: 'EASL International Consensus Conference on Haemochromatosis, likewise.'
      },
      {
        pmid: '17729397',
        citation: 'Deugnier Y, Turlin B. World J Gastroenterol 2007;13(35):4755-4760',
        whatItIs: 'A pathology review of hepatic iron overload, likewise.'
      }
    ],
    tally: 5,
    statesBoundaryCount: 3,
    tallyProvenance: 'guideline-cited-plus-found',
    guidelineEndorsed: true,
    coversCutoffIds: ['CUT-0010', 'CUT-0011', 'CUT-0021', 'CUT-0022', 'CUT-0023',
                      'CUT-0039', 'CUT-0040', 'CUT-0041', 'CUT-0042', 'CUT-0043'],
    derivedSiblings: [
      {cutoffId: 'CUT-0011', calibrationId: 'CAL-0001'},
      {cutoffId: 'CUT-0021', calibrationId: 'CAL-0004'},
      {cutoffId: 'CUT-0022', calibrationId: 'CAL-0001'},
      {cutoffId: 'CUT-0023', calibrationId: 'CAL-0004'},
      {cutoffId: 'CUT-0040', calibrationId: 'CAL-0001'},
      {cutoffId: 'CUT-0041', calibrationId: 'CAL-0004'},
      {cutoffId: 'CUT-0042', calibrationId: 'CAL-0001'},
      {cutoffId: 'CUT-0043', calibrationId: 'CAL-0004'}
    ],
    agreesWithGrade: true,
    note:
      'Five studies and a guideline endorsement, so the A letter is supported on the criterion as read. ' +
      'One thing this tally makes visible and does not act on: the one source that publishes 1800 µg/g dry ' +
      'weight as a reference limit says "adults only", while CUT-0039..CUT-0043 apply this boundary to a ' +
      'pediatric cohort. Recorded, not resolved — the cohort question is its own reading.'
  },

  {
    id: 'TALLY-0002',
    parameter: 'lic',
    boundary: 'borderline|mild',
    claimValue: 3.2,
    claimUnit: 'mg Fe/g dw',
    endorsingRefId: 'REF-038',
    endorsementLocator:
      'PMID-36809220.txt lines 74-77 — "Between 1.8 and 3.2 mg/g … is considered borderline … whereas ' +
      '3.2-7.0 mg/g … is considered mild iron overload"',
    studies: [
      {
        pmid: '15256427',
        citation: 'St Pierre TG, Clark PR, Chua-anusorn W, et al. Blood 2005;105(2):855-861',
        locator: 'abstract, reference/papers/abstracts/PMID-15256427.abstract.md',
        publishes:
          'Names 3.2 mg Fe/g dry tissue as one of the four clinically significant LIC thresholds and reports ' +
          'the sensitivity and specificity of R2 against biopsy at it.',
        foundVia: 'guideline-citation',
        verification: 'abstract-read',
        statesBoundary: true
      },
      {
        pmid: '9028304',
        citation: 'Olivieri NF, Brittenham GM. Blood 1997;89(3):739-761',
        locator: 'abstract, reference/papers/abstracts/PMID-9028304.abstract.md',
        publishes:
          'The chelation-therapy review the guideline cites on BOTH sides of this boundary — the band below ' +
          'it as the lower range of optimal chelation, the band above it as mild overload up to the upper ' +
          'limit of that range. No liver iron concentration appears in the abstract read here.',
        foundVia: 'guideline-citation',
        verification: 'abstract-read',
        statesBoundary: false
      },
      {
        pmid: '36194113',
        citation: 'Serai SD, Hernando D, Reeder SB, et al. Radiology 2022;306:e213256',
        locator: 'reference/papers/fulltext/PMID-36194113.txt lines 416-420 and 531-533',
        publishes:
          'Treats 3.2 mg/g as the lower end of the optimal range for chelation therapy and measures R2* ' +
          'detection of it, with an area under the ROC curve of 0.98 or higher at both field strengths.',
        foundVia: 'independent-search',
        verification: 'full-text-read',
        statesBoundary: true
      },
      {
        pmid: '15860670',
        citation: 'Wood JC, Enriquez C, Ghugre N, et al. Blood 2005;106:1460-1465',
        locator: 'reference/papers/fulltext/PMID-15860670.txt line 168',
        publishes:
          'States the boundary in its own text, as one of four bands it takes from the Olivieri and ' +
          'Brittenham algorithm: below 3.2 mg/g a concern for chelator toxicity, 3.2 to 7.0 mg/g the ' +
          'optimal chelation range. It then stratifies its own 19 biopsied patients by those bands and ' +
          'reports how MRI-derived and biopsy-measured assignment compare, with a single classification ' +
          'disagreement across the cohort. Units are mg/g dry weight, the same quantity this claim is ' +
          'written in. Counted for that passage, not for the calibration equation the same paper publishes.',
        foundVia: 'independent-search',
        verification: 'full-text-read',
        statesBoundary: true
      }
    ],
    ladderCitations: [
      {
        pmid: '31392478',
        citation: 'Henninger B, Alustiza J, Garbowski M, Gandon Y. Eur Radiol 2020;30(1):383-393',
        whatItIs: 'A practical guide the endorsing guideline says summarised a similar set of thresholds.'
      },
      {
        pmid: '20471131',
        citation: 'European Association For The Study Of The Liver. J Hepatol 2010;53(1):3-22',
        whatItIs: 'EASL clinical practice guidelines for HFE hemochromatosis.'
      },
      {
        pmid: '11020008',
        citation: 'Adams P, Brissot P, Powell LW. J Hepatol 2000;33(3):485-504',
        whatItIs: 'EASL International Consensus Conference on Haemochromatosis.'
      },
      {
        pmid: '17729397',
        citation: 'Deugnier Y, Turlin B. World J Gastroenterol 2007;13(35):4755-4760',
        whatItIs: 'A pathology review of hepatic iron overload.'
      }
    ],
    tally: 4,
    statesBoundaryCount: 3,
    tallyProvenance: 'guideline-cited-plus-found',
    guidelineEndorsed: true,
    coversCutoffIds: ['CUT-0024', 'CUT-0025', 'CUT-0026', 'CUT-0027', 'CUT-0028',
                      'CUT-0044', 'CUT-0045', 'CUT-0046', 'CUT-0047', 'CUT-0048'],
    derivedSiblings: [
      {cutoffId: 'CUT-0025', calibrationId: 'CAL-0001'},
      {cutoffId: 'CUT-0026', calibrationId: 'CAL-0004'},
      {cutoffId: 'CUT-0027', calibrationId: 'CAL-0001'},
      {cutoffId: 'CUT-0028', calibrationId: 'CAL-0004'},
      {cutoffId: 'CUT-0045', calibrationId: 'CAL-0001'},
      {cutoffId: 'CUT-0046', calibrationId: 'CAL-0004'},
      {cutoffId: 'CUT-0047', calibrationId: 'CAL-0001'},
      {cutoffId: 'CUT-0048', calibrationId: 'CAL-0004'}
    ],
    agreesWithGrade: true,
    note:
      'Four studies and a guideline endorsement, so this reconstruction supports the A letter these ten ' +
      'records carry — but it did not until W-185. W-177 reached three, one short of the criterion, and ' +
      'recorded the disagreement rather than moving the letter. The fourth is Wood 2005, found by scanning ' +
      'the full texts this project already holds and counted for a passage W-177 had not read; the ' +
      'reasoning is in LITERATURE.md § 22. Worth seeing beside the count: this is still the rung the ' +
      'guideline supports most thinly, attaching a single publication to both bands the boundary ' +
      'separates, and three of the four studies state 3.2 mg/g in their own text.'
  },

  {
    id: 'TALLY-0003',
    parameter: 'lic',
    boundary: 'mild|moderate',
    claimValue: 7,
    claimUnit: 'mg Fe/g dw',
    endorsingRefId: 'REF-038',
    endorsementLocator:
      'PMID-36809220.txt lines 76-80 — "3.2-7.0 mg/g … mild iron overload … LIC values between 7.0 and ' +
      '15.0 mg/g … are considered indicative of moderate iron overload"',
    studies: [
      {
        pmid: '15256427',
        citation: 'St Pierre TG, Clark PR, Chua-anusorn W, et al. Blood 2005;105(2):855-861',
        locator: 'abstract, reference/papers/abstracts/PMID-15256427.abstract.md',
        publishes:
          'Names 7.0 mg Fe/g dry tissue as one of the four clinically significant LIC thresholds and reports ' +
          'the sensitivity and specificity of R2 against biopsy at it.',
        foundVia: 'guideline-citation',
        verification: 'abstract-read',
        statesBoundary: true
      },
      {
        pmid: '9028304',
        citation: 'Olivieri NF, Brittenham GM. Blood 1997;89(3):739-761',
        locator: 'abstract, reference/papers/abstracts/PMID-9028304.abstract.md',
        publishes:
          'The chelation-therapy review the guideline cites for the band below this boundary, which it calls ' +
          'the upper limit of the optimal range for chelation therapy. No liver iron concentration appears ' +
          'in the abstract read here.',
        foundVia: 'guideline-citation',
        verification: 'abstract-read',
        statesBoundary: false
      },
      {
        pmid: '4058506',
        citation: 'Niederau C, Fischer R, Sonnenberg A, et al. N Engl J Med 1985;313(20):1256-1262',
        locator: 'abstract, reference/papers/abstracts/PMID-4058506.abstract.md',
        publishes:
          'Follows 163 people with primary hemochromatosis for a mean of 10.5 years and reports that those ' +
          'diagnosed before cirrhosis and treated by venesection have a normal life expectancy, while ' +
          'cirrhotic patients do not. This is the risk the guideline attaches to the moderate band; the ' +
          'abstract read here carries no liver iron concentration.',
        foundVia: 'guideline-citation',
        verification: 'abstract-read',
        statesBoundary: false
      },
      {
        pmid: '8613000',
        citation: 'Niederau C, Fischer R, Pürschel A, et al. Gastroenterology 1996;110(4):1107-1119',
        locator: 'abstract, reference/papers/abstracts/PMID-8613000.abstract.md',
        publishes:
          'Follows 251 people with hereditary hemochromatosis for about 14 years and reports survival ' +
          'reduced in those with severe iron overload against those with less, with prognosis depending on ' +
          'the amount and duration of iron excess. The abstract read here states no liver iron concentration.',
        foundVia: 'guideline-citation',
        verification: 'abstract-read',
        statesBoundary: false
      },
      {
        pmid: '36194113',
        citation: 'Serai SD, Hernando D, Reeder SB, et al. Radiology 2022;306:e213256',
        locator: 'reference/papers/fulltext/PMID-36194113.txt lines 416-420 and 531-533',
        publishes:
          'Treats 7.0 mg/g as the upper limit of the optimal range for chelation therapy and as the ' +
          'threshold for increased risk of hepatic fibrosis and diabetes, and measures R2* detection of it ' +
          'with an area under the ROC curve of 0.98 or higher at both field strengths.',
        foundVia: 'independent-search',
        verification: 'full-text-read',
        statesBoundary: true
      },
      {
        pmid: '15860670',
        citation: 'Wood JC, Enriquez C, Ghugre N, et al. Blood 2005;106:1460-1465',
        locator: 'reference/papers/fulltext/PMID-15860670.txt line 168',
        publishes:
          'States the boundary in its own text, as one of four bands it takes from the Olivieri and ' +
          'Brittenham algorithm: 3.2 to 7.0 mg/g the optimal chelation range, 7 to 15 mg/g elevated ' +
          'hepatic iron. It then stratifies its own 19 biopsied patients by those bands and reports how ' +
          'MRI-derived and biopsy-measured assignment compare, with a single classification disagreement ' +
          'across the cohort — that one case sitting at this boundary, a 7.8 mg/g biopsy value placed in ' +
          'the band below by R2. Units are mg/g dry weight. Counted for that passage, not for the ' +
          'calibration equation the same paper publishes.',
        foundVia: 'independent-search',
        verification: 'full-text-read',
        statesBoundary: true
      }
    ],
    ladderCitations: [
      {
        pmid: '31392478',
        citation: 'Henninger B, Alustiza J, Garbowski M, Gandon Y. Eur Radiol 2020;30(1):383-393',
        whatItIs: 'A practical guide the endorsing guideline says summarised a similar set of thresholds.'
      },
      {
        pmid: '20471131',
        citation: 'European Association For The Study Of The Liver. J Hepatol 2010;53(1):3-22',
        whatItIs: 'EASL clinical practice guidelines for HFE hemochromatosis.'
      },
      {
        pmid: '11020008',
        citation: 'Adams P, Brissot P, Powell LW. J Hepatol 2000;33(3):485-504',
        whatItIs: 'EASL International Consensus Conference on Haemochromatosis.'
      },
      {
        pmid: '17729397',
        citation: 'Deugnier Y, Turlin B. World J Gastroenterol 2007;13(35):4755-4760',
        whatItIs: 'A pathology review of hepatic iron overload.'
      }
    ],
    tally: 6,
    statesBoundaryCount: 3,
    tallyProvenance: 'guideline-cited-plus-found',
    guidelineEndorsed: true,
    coversCutoffIds: ['CUT-0029', 'CUT-0030', 'CUT-0031', 'CUT-0032', 'CUT-0033'],
    derivedSiblings: [
      {cutoffId: 'CUT-0030', calibrationId: 'CAL-0001'},
      {cutoffId: 'CUT-0031', calibrationId: 'CAL-0004'},
      {cutoffId: 'CUT-0032', calibrationId: 'CAL-0001'},
      {cutoffId: 'CUT-0033', calibrationId: 'CAL-0004'}
    ],
    agreesWithGrade: true,
    note:
      'Six studies and a guideline endorsement, so the A letter is supported on the criterion as read. ' +
      'Worth seeing beside that count: three of the six state 7.0 mg/g. The other three are the ' +
      'outcome literature the moderate band means — survival with and without cirrhosis, and the risk that ' +
      'rises with the amount and duration of iron excess. The sixth study, Wood 2005, was added by W-185.'
  },

  {
    id: 'TALLY-0004',
    parameter: 'lic',
    boundary: 'moderate|severe',
    claimValue: 15,
    claimUnit: 'mg Fe/g dw',
    endorsingRefId: 'REF-038',
    endorsementLocator:
      'PMID-36809220.txt lines 78-82 — "LIC values between 7.0 and 15.0 mg/g … moderate iron overload … ' +
      'Greater than 15.0 mg/g (269 µmol/g) is considered severe iron overload with increased risk of early ' +
      'death"',
    studies: [
      {
        pmid: '15256427',
        citation: 'St Pierre TG, Clark PR, Chua-anusorn W, et al. Blood 2005;105(2):855-861',
        locator: 'abstract, reference/papers/abstracts/PMID-15256427.abstract.md',
        publishes:
          'Names 15.0 mg Fe/g dry tissue as the highest of the four clinically significant LIC thresholds ' +
          'and reports the sensitivity and specificity of R2 against biopsy at it.',
        foundVia: 'guideline-citation',
        verification: 'abstract-read',
        statesBoundary: true
      },
      {
        pmid: '4058506',
        citation: 'Niederau C, Fischer R, Sonnenberg A, et al. N Engl J Med 1985;313(20):1256-1262',
        locator: 'abstract, reference/papers/abstracts/PMID-4058506.abstract.md',
        publishes:
          'The survival study the guideline cites for the moderate band below this boundary: liver cancer ' +
          '219 times and cardiomyopathy 306 times more frequent than expected among those followed. The ' +
          'abstract read here carries no liver iron concentration.',
        foundVia: 'guideline-citation',
        verification: 'abstract-read',
        statesBoundary: false
      },
      {
        pmid: '8613000',
        citation: 'Niederau C, Fischer R, Pürschel A, et al. Gastroenterology 1996;110(4):1107-1119',
        locator: 'abstract, reference/papers/abstracts/PMID-8613000.abstract.md',
        publishes:
          'The long-term follow-up the guideline cites alongside it, reporting survival reduced in those ' +
          'with severe iron overload against those with less. No liver iron concentration in the abstract ' +
          'read here.',
        foundVia: 'guideline-citation',
        verification: 'abstract-read',
        statesBoundary: false
      },
      {
        pmid: '7877649',
        citation: 'Olivieri NF, Brittenham GM, Matsui D, et al. N Engl J Med 1995;332(14):918-922',
        locator: 'abstract, reference/papers/abstracts/PMID-7877649.abstract.md',
        publishes:
          'A prospective deferiprone trial in 21 people with thalassemia major. It names a level associated ' +
          'with complications of iron overload — at least 80 µmol per gram of liver, WET weight — which is ' +
          'a different quantity in different units from this boundary. Nothing here converts one into the ' +
          'other; the guideline cites this paper for the severe band and the abstract does not state ' +
          '15.0 mg/g dry weight.',
        foundVia: 'guideline-citation',
        verification: 'abstract-read',
        statesBoundary: false
      },
      {
        pmid: '14226168',
        citation: 'Engle MA, Erlandson M, Smith CH. Circulation 1964;30(5):698-705',
        locator: 'reference/papers/abstracts/PMID-14226168.abstract.md — PubMed publishes no abstract for this record',
        publishes:
          'Cited by the guideline for the early-death risk attached to the severe band. PubMed publishes no ' +
          'abstract for it and the full text was not retrieved, so nothing about what it establishes is ' +
          'asserted here beyond the guideline attaching it to that band.',
        foundVia: 'guideline-citation',
        verification: 'no-abstract-published',
        statesBoundary: false
      },
      {
        pmid: '36194113',
        citation: 'Serai SD, Hernando D, Reeder SB, et al. Radiology 2022;306:e213256',
        locator: 'reference/papers/fulltext/PMID-36194113.txt lines 416-420 and 531-533',
        publishes:
          'Carries 15.0 mg/g as the highest of the four clinically relevant LIC thresholds and measures R2* ' +
          'detection of it, with an area under the ROC curve of 0.98 or higher at both field strengths.',
        foundVia: 'independent-search',
        verification: 'full-text-read',
        statesBoundary: true
      },
      {
        pmid: '15860670',
        citation: 'Wood JC, Enriquez C, Ghugre N, et al. Blood 2005;106:1460-1465',
        locator: 'reference/papers/fulltext/PMID-15860670.txt line 168',
        publishes:
          'States the boundary in its own text, as the top of the four bands it takes from the Olivieri ' +
          'and Brittenham algorithm: 7 to 15 mg/g elevated hepatic iron, above 15 mg/g markedly increased ' +
          'iron and potential cardiotoxicity. It then stratifies its own 19 biopsied patients by those ' +
          'bands and reports how MRI-derived and biopsy-measured assignment compare, with a single ' +
          'classification disagreement across the cohort. Units are mg/g dry weight. Counted for that ' +
          'passage, not for the calibration equation the same paper publishes.',
        foundVia: 'independent-search',
        verification: 'full-text-read',
        statesBoundary: true
      }
    ],
    ladderCitations: [
      {
        pmid: '31392478',
        citation: 'Henninger B, Alustiza J, Garbowski M, Gandon Y. Eur Radiol 2020;30(1):383-393',
        whatItIs: 'A practical guide the endorsing guideline says summarised a similar set of thresholds.'
      },
      {
        pmid: '20471131',
        citation: 'European Association For The Study Of The Liver. J Hepatol 2010;53(1):3-22',
        whatItIs: 'EASL clinical practice guidelines for HFE hemochromatosis.'
      },
      {
        pmid: '11020008',
        citation: 'Adams P, Brissot P, Powell LW. J Hepatol 2000;33(3):485-504',
        whatItIs: 'EASL International Consensus Conference on Haemochromatosis.'
      },
      {
        pmid: '17729397',
        citation: 'Deugnier Y, Turlin B. World J Gastroenterol 2007;13(35):4755-4760',
        whatItIs: 'A pathology review of hepatic iron overload.'
      }
    ],
    tally: 7,
    statesBoundaryCount: 3,
    tallyProvenance: 'guideline-cited-plus-found',
    guidelineEndorsed: true,
    coversCutoffIds: ['CUT-0034', 'CUT-0035', 'CUT-0036', 'CUT-0037', 'CUT-0038'],
    derivedSiblings: [
      {cutoffId: 'CUT-0035', calibrationId: 'CAL-0001'},
      {cutoffId: 'CUT-0036', calibrationId: 'CAL-0004'},
      {cutoffId: 'CUT-0037', calibrationId: 'CAL-0001'},
      {cutoffId: 'CUT-0038', calibrationId: 'CAL-0004'}
    ],
    agreesWithGrade: true,
    note:
      'The best-cited rung of the four: seven studies and a guideline endorsement. Three of the seven ' +
      'state 15.0 mg/g; the rest are the outcome literature behind "increased risk of early death", and ' +
      'one of those — a 1964 paper — has no abstract to read at all, which is recorded rather than filled ' +
      'in. The seventh study, Wood 2005, was added by W-185.'
  }
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {EVIDENCE_TALLY, EVIDENCE_TALLY_VERSION, EVIDENCE_TALLY_HASH};
}
