/* VeriLiv V2 — REPORT RENDERER  (W-007)
 * ---------------------------------------------------------------------------
 * ONE ENGINE, ONE TEMPLATE. The two acquisition paths differ in what the vendor
 * profile SUPPLIES and in what the scope resolution RETURNS — never in which
 * code path runs. There is no `if (path === …)`, no `if (tier === …)` and no
 * `if (policy === …)` in this file, and v2/tests/render.test.js § K6 reads this
 * source to keep it that way. A branch here means the profile or the resolved
 * row is missing a field, and the field is what gets added.
 *
 * ⛔ THIS FILE DECIDES NOTHING CLINICAL. Every value, band, verdict, provenance
 *    sentence and gap arrives already composed from js/report.js, which took it
 *    from js/thresholds.js. Nothing is re-derived here and no number is written
 *    here.
 *
 * ⛔ NO DOM. Every function returns a string, so the Node suite asserts on the
 *    exact output the browser will insert. js/app.js owns the single DOM write,
 *    and § K6 checks this file for DOM access by reading it.
 *
 * THE THREE SHEETS (W-007, developer's layout call)
 *   1  entry, the acquisition summary, the laboratory block, and every
 *      parameter the scanner's own products quantify
 *   2  third-party quantification and research measurements — each section only
 *      if it has a card, and the sheet only if a section does
 *   3  the receipts: limitations, how the numbers were derived, the reference
 *      list in the profile's order, the provenance census, the stamp
 * ---------------------------------------------------------------------------
 */

const V2_RENDER_VERSION = '3.66';  /* W-080: the three page-2 "additional" headings
   (Additional measurements / Third-party quantification / Research measurements) merge into
   one `#section-additional` — one heading, one shared note; the per-card tier tag (`ptag`)
   is removed; the entry panel's "Additional measurements" grid is reordered to match the
   report card order. Render layer only — no v2/data/ file opened, no hash lock moved.
   Was 3.65 for W-159: the pediatric MRE card gains an orientation
   reference strip — `card.orientationStrip` drawn through the ordinary ruler frame as
   `.rul.rul-orientation`, its four `z-none` bands tinted by a neutral `rul-ramp-{0..3}` ramp
   (a single --uncertain colour stepped by opacity — NO `--sev-*`, W-085), the three adapted
   boundary values ticked, a patient marker when a value is entered. The not-staged "—" chip
   and the W-157 scope sentence are unchanged; the strip carries no verdict. Render-layer
   only — no v2/data/ record, band, sev or hash lock moved.
   ── W-158: a partial pediatric iron card renders the
   `card.boundaryGap` scope line in a `.scopegap` slot (why the top of the bar is grey), and
   the grey `unresolved` zone draws through the existing uncoloured `z-none` path with no
   verdict tag. Render-layer only — no v2/data/ record, band, sev or hash lock moved.
   ── W-154: the on-screen 281mm page-break
   preview line (W-128) is withdrawn — see the styles.css `.page` base rule and
   `body[data-mode="sample"] .page` comments. The estimate was blind to content
   and routinely crossed a parameter card mid-way while the real print keeps
   each card whole (`.pcard { break-inside: avoid }`); behind the sample
   watermark it read as a render glitch. render.js change is comment-only (this
   block and the toolbar() caption note), but render.js is a released artifact
   so the stamp advances with every hash unchanged (SCHEMA § 5.1.1).
   render.test.js N60 rewritten (W-014). Developer-approved, 2026-09-02.

   Was 3.62 for W-152: holistic toolbar redesign. One row
   of buttons over one caption line: "New Report" (always, leftmost — exits a
   sample or clears a live report), "Print / Save as PDF" (the one filled
   control), "Email" (live only), "View Sample" / dev scenario picker (far
   right). Buttons carry inline-SVG icons, size to their content (the W-126
   fixed box is gone). The three inline mono notes were first folded into one
   state-dependent `.tb-caption`; round 2 (developer, same day) withdrew the
   dashed-line note and the "print dialog first" note, so a live, ready report
   now carries no caption at all. Screen-only — every change is inside
   @media screen / .screen-only, no printed-page effect, no clinical value /
   threshold / calibration / hash moved. render.test.js N22/N29/N54/N60 and
   entry.test.js I4/I4k rewritten to state the new rules (W-014).
   Developer-approved, 2026-09-02.

   Was 3.61 for W-151: the light/dark theme toggle button
   is withdrawn from toolbar() so the reader can never enter dark mode. Machinery
   left dormant, not deleted: styles.css keeps every :root[data-theme="dark"]
   block, app.js keeps readTheme/writeTheme/applyTheme/toggleTheme; nothing
   writes data-theme any more, so the dark blocks never apply. Screen-only
   change, no printed-page effect, no clinical value / threshold / hash moved.
   render.test.js N59 keeps locking the dormant dark palette (W-014: rewrite a
   lock to state the new rule, don't drop it). Developer-approved, 2026-09-02.

   Was 3.60 for W-150: a screen-only, non-blocking NUDGE
   under the Cohort cell (studyMeta / cohortNudgeNeeded) — when the entered age
   is a number below PAEDIATRIC_AGE_MAX (18) and the cohort is still 'adult', the
   entry form suggests switching Cohort to Paediatric. Advisory only: the engine
   still reads only the human's Cohort <select>, no derivation, no model state
   touched, `@media screen` / screen-only so the printed page is unaffected
   (W-079). No clinical value, threshold, calibration or data hash moved; a hard
   age→cohort auto-derive was rejected (no guideline mandates one age for cut-off
   selection) — v2/data/LITERATURE.md § 13. Developer-approved, 2026-09-02
   (journal W-150).

   Was 3.59 for W-149: the W-134 fill-state wash collapses
   to ONE tone (data-fill-emph and --fill-needed-quiet are gone) and widens to
   every empty staging-affecting field — the MRE card's ascites/etiologyCohort
   selects (once mre has a value), the header bmi/age inputs, the laboratory
   grid cells, the study indication select once it is cleared to "not set"
   (selection.js now accepts indication:null), and the acquisition-method
   control (methodControl) on a non-GE path, where nothing stages until a
   method is picked. Presentation only: no clinical value, threshold,
   calibration or data hash moved. Developer-approved, 2026-09-02 (journal
   W-149).

   Was 3.58 for W-148: the Tier-1 checkbox block heading
   (performedBlock()) changes from "Which measurements were performed" to
   "Measurements used in the staging assessment" — all three Tier-1 groups
   feed a staging ladder, so the wording names that stake instead of asking a
   neutral inventory question. Screen-only heading, the separate Tier-2
   "Additional measurements" heading is untouched. Presentation copy only: no
   clinical value, threshold, calibration or hash moved. Developer-approved,
   2026-09-01 (journal W-148).

   W-147 round 2: the guideline/matched
   disagreement note (card.disagreement, report.js) moved from `.pfacts`,
   below the verdict chip, to sit between the consensus and matched ruler
   blocks in `.rulers` — the point the eye crosses while comparing the two
   bars, instead of a paragraph reached only after a judgment is already
   formed from the bars alone. Round 1 (a bordered, cream-background box with
   the sentence's first clause bolded) read as an alarm rather than a note to
   skim, per developer feedback on a screenshot — round 2 drops the box
   entirely (plain muted text, `.disagree` now matches `.prov`/`.vfrom`'s
   low-weight style) and the sentence itself is shortened in `report.js`
   ("Guideline and matched publication disagree — both shown, neither
   preferred.", was two clauses across two lines) so it reads as one short
   line rather than a block to read closely. Removed from `.pfacts` so it
   prints once, not twice. Presentation-only: no clinical value or threshold
   moved. Developer-approved design, 2026-09-01 (journal W-147).

   W-146: bmi moves out of the laboratory-
   adjacent "Clinical context (optional)" block (contextBlock(), deleted) and
   into the patient/accession header (patientMeta) — IDENTITY_CELLS keeps
   accession/studyDate/age, STUDY_CELLS gains cohort/indication ahead of
   fieldStrength/path (same axis route order as before, only the visual row
   moved). Height/weight move behind a new "Calculate BMI" popup, open state
   threaded through app.js the same way `viewMode` is (not part of
   `selection`); when closed, height/weight are not rendered at all, so
   entryRoute only routes them while the popup is open (same "no route stop
   without a field" rule as etiologyCohort's). A "?" affordance on the BMI
   label carries a native `title` tooltip (existing screen-only idiom,
   .pbars[title] etc.) summarising which parameters BMI affects. The bmi-echo
   wording on the mre/pdff cards changes from "(Clinical context)" to
   "(patient header)" to match. Presentation-only: no clinical value,
   threshold, calibration or hash moved; CONTEXT_INPUTS/buildContext() are
   untouched, only WHERE bmi/height/weight are drawn and routed changed.
   Developer-approved design, 2026-09-01 (journal W-146).

   W-144: three entry-form reorganisations.
   (1) Ascites moves out of the standalone "Fibrosis — reliability context"
   block (fibrosisContextHtml(), now deleted) and into the MRE card's own
   .pident, directly under the 'Closest evidence cohort' selector
   (ascitesCellHtml(), called right after etiologyCohortHtml() in
   parameterCard()) — same visibility rule as that selector: gone when the
   MRE card is not rendered. (2) ALT upper limit and GGT move out of the same
   deleted block and into the Laboratory grid itself, spliced between ALT and
   Platelets by report.js buildLabs() when Fibrosis is performed or either
   already carries a value; `.labs-grid` gains a `labs-fib` modifier class
   (styles.css) that widens it from 5 to 4 columns in that state only — row 1
   becomes AST/ALT/ALT upper limit/GGT, row 2 becomes Platelets/Ferritin/
   Transferrin sat. — and is byte-identical to the original 5-column single
   row otherwise. (3) entryRoute() follows both moves: altUln/ggt's Tab stops
   now come from the existing `model.labs.inputs` loop for free (they are
   IN that list when shown, per (2)), and ascites gets one new stop in the
   MRE row's own block, gated by `row.parameter === 'mre'` the same as
   etiologyCohort's stop right above it. Grounds for moving ascites/altUln/
   ggt off the always-reachable W-063 block: reliability.js:216 shows every
   trigger built from these three (TRG-0002/TRG-0004/TRG-0005) only ever
   attaches to `mre` once `mre` already carries a value, so none of the
   three can affect a printed page the MRE card itself is not on — the same
   finding W-141 already used for etiologyCohort, checked directly against
   this task rather than assumed from the shape of the old W-063 comment
   (that lesson's own warning: a queued worry does not automatically
   transfer to a new control that only looks like the same shape of
   problem). Developer-approved design, 2026-09-01 (journal W-144).
   Presentation-only: no clinical value, threshold, calibration or hash
   moved; CONTEXT_INPUTS/buildContext()/reliability.js are untouched, only
   WHERE the fields are drawn changed.
   W-141: the 'Closest evidence cohort
   (if known)' cell moved out of the always-drawn identity row (IDENTITY_CELLS)
   and into the MRE card's own .pident, right after the value block — its only
   live effect today is steering report.js matchedScale for the 'mre' row
   (report.js:834-847,955-967,1252), so it now disappears along with the MRE
   card exactly when the card itself is not rendered (the existing
   hasTypedValue/isGroupToggledOn data-protection rule, unchanged), costing
   nothing since the axis would do nothing there either — developer decision
   2026-09-01, journal W-141. entryRoute's stop for it moved with it, into the
   per-row loop right after the mre row's own data-value stop; it no longer
   resolves from a null model (W-046: the route now genuinely needs the row it
   is a stop for). No clinical value, threshold or hash moved.
   Was 3.52 for W-142: DOMAIN_ORDER re-sequenced to match
   report.js CARD_DOMAIN_ORDER (MRE first, iron block whole on sheet 2 — developer
   decision 2026-08-31). Reference-group order on the methodology sheet follows.
   Presentation order only; no clinical value or hash moved.
   Was 3.50 for W-136 review: the 'Closest evidence cohort'
   cell is CONSTRAINED — it offers only the stated indication's own cohort family
   (report.js INDICATION_COHORTS ∩ selection.js ETIOLOGY_COHORTS), is drawn
   nowhere at all under an indication with no cohort-specific evidence, and the
   Tab route (entryRoute) follows the same condition; selectCell gains a
   `nullable` flag so a chosen cohort can be cleared back to "not stated".
   Was 3.49 for W-136: a new entry-form cell, 'Closest evidence
   cohort (if known)' (IDENTITY_CELLS, render.js), wired automatically through the
   existing generic data-axis change handler and Tab route (W-017's "nearly free"
   pattern) — no app.js change. Left unset, the printed report is byte-identical to
   before this task.
   W-138 — masthead <h1> renamed to
                                      "Quantitative Imaging Biomarkers" (QIBA term);
                                      naming only, no clinical value, no hash moved.
                                      W-134 — Live Report fill-state affordance on
                                      unentered value fields + indication-driven
                                      emphasis; screen-only, no clinical value.
                                      W-133 — matched-ladder citation fix,
   two-case header sentence, evidence-grade badge. Was 3.45 for W-113 — MEFIB/MAST
   composite section
   rewritten for a non-code reader: compositeSection() prints a new .cintro
   plain-language sentence before the verdict, and the .cnote footnote splits
   into two labelled paragraphs (MAST / rule strength) instead of one run-on
   paragraph. No new colour, no new selector reused elsewhere. Presentation-
   only, no clinical value/threshold/hash moved (report.js carries the
   matching W-113 comment on buildComposite()).
   W-128 — paper preview: screen density
   now matches print's (styles.css scopes the same seven-step --s-* scale
   print already used to .page), and every editable field on the sheet
   (.pcard .pval input, .lc input/select, and a new .method select rule) reads
   as a quiet underline instead of a boxed form control — print's own
   chrome-removal rules are unchanged throughout. Presentation-only: no
   v2/data/ file opened, no hash lock moved.
   (W-128 also added a ≈281mm background page-break line; W-154 withdrew it —
   see the styles.css .page comments. The density scale and the underline
   fields stay.)
   W-131 second revision (same day,
   developer feedback: the dark theme read as one flat grey plane, not
   layered). `--hair2` widens `#2E3136` -> `#34373D` — a real, visible step
   off `--paper` rather than the light theme's deliberate near-invisible
   nudge — and `.toolbar` moves onto it in dark mode (screen furniture beside
   the page, not part of it), reusing the exact token
   `.domaingroup`/`.mgroup`/`.evidence` already carry for the same "raised
   panel" job. `.labs-head .t`'s label moves off `--accent` (fails 4.5:1 on
   the wider `--hair2`) onto `--ink`. Three-step elevation now measurably
   distinct: backdrop < paper < hair2 (styles.css and N59 carry the numbers).
   No clinical value, no hash lock.
   W-131 first revision (same day, developer
   feedback: the dark theme read as too near-black). CSS-only: `--paper` and
   the page's outer backdrop lighten to a medium dark grey (`#26282C`/
   `#1A1B1E`, over `#17191B`/`#0C0D0E`); the severity ramp, `--frame` and
   every chip tint are UNCHANGED — they already cleared their N59 floor with
   room against the darker paper, so only the two values actually reported as
   the problem move, and every pair that reads `--paper` was re-measured
   (styles.css carries the full numbers). No clinical value, no hash lock.
   W-132: a browser page cannot attach a
   generated file to a `mailto:` draft — no attachment parameter any mail
   client honours, and every real cross-app file handoff (Web Share, the
   Clipboard API's file support, File System Access) needs a secure (https)
   context that `file://` never satisfies; six avenues checked, developer
   decision 2026-08-30, CHANGELOG.md carries the full reasoning. So
   `buildRequestorEmail()`'s closing sentence is retensed ("produce it with
   Print / Save PDF" -> "you were just asked to save"), and `toolbar()` gains
   a caption next to the send button ("Opens the print dialog first, then
   your mail app.") — app.js opens the same gated print dialog immediately
   before the mail draft, so the sentence describes what already happened.
   Screen-only; no clinical value, no v2/data/ file opened, no hash lock
   moved.
   W-129: the requesting-clinician identity
   fields are removed — IDENTITY_CELLS loses `requestorName`/`requestorEmail`
   (the strip goes from 7 cells to 5), and `buildRequestorEmail()`'s `to` is
   always empty now (there is no field left to source a recipient from — the
   clinician types it in their own mail client). `toolbar()` drops its 5th
   `canSend` argument: the send button is enabled whenever the report is
   `ready` and not `sample`, no e-mail-present gate, and its label changes
   "Send to requestor" -> "Send e-mail". Sample mode still never renders the
   button at all (W-126, unchanged). Screen-only; no clinical value, no
   v2/data/ file opened, no hash lock moved.
   W-131: a light/dark theme toggle. toolbar()
   gains a "Dark mode"/"Light mode" button (both label spans always render;
   CSS alone picks the visible one off `:root[data-theme]`, the same way the
   dark token block itself is keyed) — screen-only, no print form. No
   clinical value, no hash lock; see v2/css/styles.css's own W-131 comment for
   the dark palette's measured contrast pairs and v2/js/app.js for the
   localStorage-backed toggle. W-130: six presentation changes, render/CSS
   only — (1) IVIM's three research cards now reuse `.pcard`'s own grid, `.pident
   h4`, `.pval` and `.pverdict`, wholesale, instead of bare text; D's chip is the
   ordinary "not staged" v-na chip (verdictChip(null,true), never a new string),
   D-star/f's within/outside reuses the existing v-none "no severity grading
   published" register — no new visual meaning, R-30 untouched. (2) `masthead()`
   gains `<img class="brand-mark">` (v2/assets/brand-mark.png, the developer's
   own verisyn.co mark) beside the text lockup — DESIGN-DIRECTION.md's "quiet
   masthead" is kept on size and on carrying no second display face; it is
   knowingly relaxed on colour (the mark is full navy/blue), a named developer
   exception, not a silent contradiction. (3) the flat 'clinical' section's
   TIER2_GROUPS domains (t1/ct1/adc) now print under one "Additional
   measurements" `<h2>` (reuses `.psection > h2`, no new CSS) — IVIM stays on
   page 2 in Research measurements (developer decision 2026-08-30, W-081's
   page-budget reasoning unreversed) and gets one cross-reference line instead.
   (4) ascites/altUln/ggt (`fibrosisContextHtml`, new) moved out of
   `contextBlock` to print right after "Which measurements were performed" —
   same W-063b gating, same print visibility, only placement changed; the old
   "-> affects MRE stiffness reliability" caption is dropped, position carries
   it now. (5) the Laboratory block's FIB-4 formula sentence shortened to a
   pointer; the full expression + provenance moved into tableB (methodology,
   "How these numbers were formed") via a new `labs` parameter. (6) `.mgroup`
   paragraphs number themselves as clauses via a CSS counter, tightened
   line-height/margin on the existing --s-* scale — zero content removed.
   Mockup: https://claude.ai/code/artifact/71c8eccf-b1f2-4c68-9f3e-bdb43324b7a2
   No v2/data/ file opened, no hash moved.
   W-081: `ivimSectionHtml()` fills the dormant
   page-2 `research` section from model.ivim (D / D-star / f) — value + reference
   interval + the record's own caveat + a described gap, no ladder, no verdict
   chip, no severity (IVIM stages nothing, CLAUDE.md § 1.3). An "IVIM" checkbox
   is added to the "Additional measurements" block (`tier2Block`, `data-
   performed-group="ivim"` — not a TIER2_GROUPS entry, so it never touches
   `selection.scope`); the section renders when `model.ivim.rendered` is set
   (that checkbox on, or a value typed — the decision is report.js's, not a
   branch here, K6). `sectionsHtml` dispatches on the SECTIONS `ivim` flag,
   `entryRoute` appends the three `ivim-*` keys on `ivim.rendered`. The page-1
   impression trails one factual `ivimCrossRead` sentence when ADC is abnormal.
   Render-layer only — no v2/data/ file opened, no hash moved.
   W-126: the "Send to requestor" button is
   not rendered in a sample report (toolbar()), and the two `data-sample` toggle
   buttons share a fixed two-line box in styles.css so the toolbar does not shift
   on toggle. Screen-only; no v2/data/ record, band, sev or hash moved.
   W-125: the boundary-value row is pulled
   FLUSH to the bar (its CSS margins → 0, svg.ruler margin-top → 0), the SVG's
   empty above-bar headroom is cut (full-size barY 22 → 7, viewBox height
   38 → 24), and the patient's value chip leaves the SVG for its own positioned
   HTML row (markerValRow) ABOVE the boundary-value row — x from the same
   axisXOf() as the marker line, so it cannot drift, and on a separate row it
   cannot overlap a boundary number. mkc / mkt gone from the drawing; the flag
   (mkf) stays. Render-layer only; no v2/data/ record, band, sev or hash moved.
   3.35 (same task, follow-up): the chip is a third larger (`.mkval .mv`
   font 9 → 12 px), sits half a row lower (`top: var(--s-3)`), and gains a faint
   dashed vertical connector (`.mkval .mv::after`) from its centre down to the
   bar's value notch. CSS only besides this stamp.
   W-124: on EVERY ruler (consensus and the
   slim matched strip alike) the interior boundary VALUES move from a flowed
   prose line into a POSITIONED row ABOVE the bar, each number at its own tick's
   x (the shared axisXOf); the unit prints once in the ruler head; the flowed
   `.ticks` line and tickLine() are gone. Below the bar a muted `.ticknames`
   line carries the pooled n>1 spread, any kept non-pipe-composite boundary
   name, the short citation and the missing-rung note. Render-layer only; no
   v2/data/ record, band, sev or hash lock moved.
   W-122: parameter-value inputs step by
   their cut-offs' finest decimal place (PARAMETER_STEPS from report.js), so the
   arrow keys land on published thresholds instead of stepping by 1. Screen
   only; no DOM structure, clinical value or hash moved. W-123: toolbar labels renamed —
   "Clear values" -> "Start Reporting", "Load example" -> "Load Sample Report"
   (screen-only text, print output unchanged; `data-sample` attributes and
   handlers untouched).
   W-017 round 2: `buildRequestorEmail(model,
   selection, versions)` — a pure `{to, subject, body}` builder for a `mailto:`
   draft (the compact summary body: head line, one line per measured parameter
   with its band, the impression prose, the footer's own version stamp, a
   pointer to the full PDF). `IDENTITY_CELLS` gains `requestorName` /
   `requestorEmail` (the address cell typed `email`); `textCell` gains an
   optional `type`; `toolbar()` gains a 5th arg `canSend` and a "Send to
   requestor" button, disabled unless ready + not-sample + an e-mail is
   present. Nothing sends from here — app.js hands the body to the clinician's
   own mail client. No clinical value, threshold or hash moves.
   W-017 round 1: every numeric input the renderer emits now
   carries `inputmode="decimal"` (in addition to `type="number"`), so a phone
   shows the decimal keypad rather than the full alphabetic keyboard. Paired
   with the narrow-screen `@media` block added to css/styles.css for the mobile
   layout — presentation only, no clinical value, threshold or hash moves.
   W-120: band-legend labels under a ruler now sit
   at the same x their band occupies in the bar above (`axisXOf()`, shared with
   `rulerSvg()`). Two row-based fallbacks for a narrow-neighbour collision were
   each caught by a developer screenshot reading as a stray word in empty
   space; the one that replaced them is the published-figure convention for a
   dense categorical axis — when any pair on a ruler would collide upright,
   EVERY label on that ruler rotates -45deg together (never a per-band fix).
   The dot pivots from its own band's LEFT edge, not its centre (a developer
   refinement — the left edge is a point the bar itself already marks, the
   same x as the boundary tick), and the word's LAST letter is the pivot, so
   only the near end stays tight to the bar. See bandLegend()/`.bands-rot` for
   the story. Presentation-only. */
/* W-119: `impressionSection` drops the "what was
   entered" history clause (`c.history`) from the printed impression entirely -- it
   was fully redundant with content already on the page (IDENTITY_CELLS/STUDY_CELLS
   meta cells + contextBlock()/labsBlock() grids). The flat, history-first fallback
   (`c.text`, for a shape with no rendered card at all) now only fires when the
   flags list (`notAssessed`/`abstentions`) is ALSO empty, so a page with flags but
   no Key/Other findings prints the flags alone instead of reintroducing the same
   redundant clause above them. `buildImpression`'s `text`/`facts`/`history` fields
   are unchanged (logic.test.js P7/P9, reliability.test.js) -- render-layer only, no
   v2/data/ record, band, sev or hash lock moved, no clinical value changed. W-116:
   `toolbar(view, ready, dev, scenarios)` grows two
   optional arguments. Both falsy (or omitted, as every call site outside app.js
   still does), the bar is byte-identical to 3.21's. When app.js hands in
   `dev: true` (a file:// or localhost host) and a scenario list from the new
   SAMPLE_CASES registry (v2/js/sample-cases.js) AND the view is already in
   SAMPLE mode, a <select data-sample-scenario> is inserted beside "Clear
   values" — live mode (including the moment "Clear values" is pressed) never
   carries the menu, developer decision 2026-08-29: nothing to switch between
   until a scenario is loaded, so the control leaves with the mode in the same
   render rather than needing a separate clear. No v2/data/ record, band, sev
   or hash lock moved, no clinical value changed. W-098:
   `impressionSection` gains a closing bold "Summary" block (`summaryBlock`) — the published composite verdicts, then any fired diagnostic consideration quoted VERBATIM in quotation marks, then coverage + the evidence-floor verb; the source panel is named once in a muted mechanism line at the head, no per-sentence speaker labels, no record id rendered. `.summary` / `.summary-mech` / `.summary-body` added to `v2/css/styles.css`. No v2/data/ record, band, sev or hash lock moved. W-112: the Impression is laid out by priority -- `impressionSection` builds a "Key findings" group (non-interpretable, abnormal, no-published-boundary readings), an "Other findings" group (normal readings folded into one sentence, plus any qualified-normal), and moves the "what was entered" history sentence to the end. Composition/CSS only (`impressionSection` + `.impression h4`/`.impression p.history` in `v2/css/styles.css`) -- `buildImpression` gains fields but changes no `text`/`facts`, no v2/data/ record, band, sev or hash lock moved, no clinical value changed. W-111: the impression paragraph is ~80% wide and centred (equal gutters) instead of a 66ch left-aligned column, and the methodology prose (`#methodology p`, sections A and B) drops its 92ch cap for the full column -- both left a large empty band on the right on a wide window. Developer visual call (§ 2.4); reverses W-097's preserved 66ch measure, N47 finding 1 rewritten. `v2/css/styles.css` only besides this stamp -- no v2/data/ record, band, sev or hash lock moved, no clinical value changed. W-104: the printed report reads as a report, not a form -- `.lc input`/`.lc select` chrome is stripped in @media print, a null-valued `.lc` cell is tagged `lc-empty` (from the model, not the DOM) and hidden in print so an un-entered optional field leaves no empty box, the "Clinical context (optional)" head loses its fill and drops from accent to muted on both surfaces, and the "→ affects MRE stiffness reliability" caption is emitted once after the grid instead of once per MRE-linked field. Presentation-only, `v2/css/styles.css` + this file -- no v2/data/ record, band, sev or hash lock moved, no clinical value changed. W-096: printed pages carry "Page N of M" (bottom-center)
and "continued from previous page" (top-right, cleared on page 1 only) via native `@page`
margin-box counters in `v2/css/styles.css` -- no markup or JS change, no v2/data/ record or
hash lock moved. A matching mark at the bottom was considered and dropped: `@page :nth()` is
unsupported in Blink (measured), so the true last physical page cannot be selected, and a
mark that would also print on the last sheet is a false statement rather than a true one.
W-097: six measured findings on how little of their allotted space several text fields used -- `.pcard .pval` gains `flex-wrap:wrap` and `.pval .unit` gains `white-space:nowrap` so a multi-word unit (LIC's "mg Fe/g dw") wraps as a whole rather than breaking word by word; a ruler-less card's value column shrinks to `min-content` (`.pcard:has(.pbars:empty)`) so the freed width goes to the gap sentence beside it; the verdict chip is vertically centred (`.pverdict{align-self:center}`) against the ruler instead of pinned to the row's top; `.gap`/`.withheld`/`.scopegap` and `.acqsum` shrink to their content (`display:table` / `width:fit-content`, both capped at `max-width:100%` so a long one still falls back to full width). Presentation-only, `v2/css/styles.css` only -- no v2/data/ record, band, sev or hash lock moved, no clinical value changed. The 66ch impression measure (correct by design) and the 90px laboratory input width (W-040's overflow-risk rejection) are unchanged and now asserted as such. W-095: the .domaingroup .pcard + .pcard divider (styles.css) changes its token from --hair2 to --rule so the separator between the three Iron rows (R2* / T2* / LIC) is visible against the --hair2 group-box fill; markup and DOM unchanged, no v2/data/ record or hash moved. W-063b: Tier-1 block rewritten to purpose groups (Fat/Iron/Fibrosis) with method subtitles, Tier-2 "Additional measurements" block added, tierOffer removed, ascites/altUln/ggt made Fibrosis-conditional, entryRoute gated to match. W-094 and W-063 each advanced this to 3.12 independently — W-094 on the w-101 branch, W-063 on `main` — and the collision is resolved here, at the merge, to 3.13, the same pattern the rest of this comment already documents. W-101: a sample-mode rule drops the W-091 box fill to transparent so the W-014 watermark shows through, warmed to a developer-approved orange, no new colour token. W-094: rulerSvg()/bandLegend()/tickLine() mirror their draw direction for a `dir: 'down'` ruler (today t2star and adc only) so the bar and its text read left-to-right normal-to-severe like every `up` card; the marker moves with it since it goes through the same xOf. W-063: the always-visible per-parameter performed toggle, the moved-then-reversed MRE-reliability caption, the BMI height/weight cells, and (Task 9) the BMI echo line on pdff (3.0T)/mre cards. No v2/data/ record, band, order, sev or hash lock moved. W-100: masthead brand mark ("Veri.Liv") and a page-1 footer colophon (copyright, site, email), both developer-specified verbatim. W-091: card/domain-group separation and methodology-sheet hierarchy. W-072: the impression paragraph this renders grew a new clause shape. Both branches bumped 3.8 to 3.9 independently; the collision is resolved here, at the merge, rather than by rewriting either branch's history. W-139: masthead lockup and the page-1 colophon renamed ("VERISYNCO" → "VERISYN.CO", domain-aligned; "Veri.Liv" → "veri.liver") — developer-specified verbatim strings, same as W-100. `brand-mark` comes out of the lockup row and is repositioned into the empty space beside the masthead `<h1>`, `position:absolute` inside a now-`position:relative` `.masthead` so it adds no flow height; resized 15px → 36px, an explicit off-scale value the same way W-122's per-parameter `step` is (comment states why, not on the `--s-7` scale). Text lockup position and size unchanged — the developer's own instruction was to move the mark, not the text. Presentation-only: no v2/data/ record, band, sev or hash lock moved, `stampText()`'s separate undotted "VeriLiv V2" stamp line left untouched (not requested). */

const _RN = (typeof module !== 'undefined' && module.exports)
  ? (function () {
      const p = require('path');
      const d = require(p.join(__dirname, 'domains.js'));
      const sel = require(p.join(__dirname, 'selection.js'));
      const rep = require(p.join(__dirname, 'report.js'));
      const ven = require(p.join(__dirname, 'vendors.js'));
      const sc = require(p.join(__dirname, 'scope.js'));
      const tech = require(p.join(__dirname, '..', 'data', 'techniques.data.js'));
      return {DOMAIN_OF: d.DOMAIN_OF, CONTROLLED_UNITS: d.CONTROLLED_UNITS,
              TIER1_GROUPS: d.TIER1_GROUPS,
              TIER2_GROUPS: d.TIER2_GROUPS, GROUP_PARAMETERS: d.GROUP_PARAMETERS,
              purposeGroupOf: d.purposeGroupOf,
              GE_IRON_PRODUCTS: d.GE_IRON_PRODUCTS, TECHNIQUES: tech.TECHNIQUES,
              optionsForDomain: d.optionsForDomain, displayExamples: d.displayExamples,
              PATHS: sel.PATHS, FIELD_STRENGTHS: sel.FIELD_STRENGTHS,
              AGE_GROUPS: sel.AGE_GROUPS, SCOPE_CHOICES: sel.SCOPE_CHOICES,
              INDICATIONS: sel.INDICATIONS, ETIOLOGY_COHORTS: sel.ETIOLOGY_COHORTS,
              INDICATION_COHORTS: rep.INDICATION_COHORTS,
              defaultTechniques: sel.defaultTechniques,
              PARAMETER_LABELS: rep.PARAMETER_LABELS, PARAMETER_UNITS: rep.PARAMETER_UNITS,
              PARAMETER_STEPS: rep.PARAMETER_STEPS,
              REPORT_PARAMETERS: rep.REPORT_PARAMETERS,
              IVIM_PARAMS: rep.IVIM_PARAMS, IVIM_LABELS: rep.IVIM_LABELS,
              IVIM_UNITS: rep.IVIM_UNITS, IVIM_TREND_NOTE: rep.IVIM_TREND_NOTE,
              orderCards: rep.orderCards,
              groupCardsByDomain: rep.groupCardsByDomain,
              CONTEXT_INPUTS: rep.CONTEXT_INPUTS, buildContext: rep.buildContext,
              orderReferences: ven.orderReferences,
              V2_SCOPE_VERSION: sc.V2_SCOPE_VERSION,
              SCOPE_VERSION: require(p.join(__dirname, '..', 'data', 'scope.data.js')).SCOPE_VERSION,
              REFERENCES: require(p.join(__dirname, '..', 'data', 'references.data.js')).REFERENCES,
              /* W-066: the four record kinds a reference can be named by. The page
                 already loads all four before this file (v2/index.html:132-138), so
                 the grouping costs no new script tag and no fetch. */
              CUTOFFS: require(p.join(__dirname, '..', 'data', 'cutoffs.data.js')).CUTOFFS,
              CALIBRATIONS: require(p.join(__dirname, '..', 'data', 'calibrations.data.js')).CALIBRATIONS,
              REFERENCE_RANGES: require(p.join(__dirname, '..', 'data', 'ranges.data.js')).REFERENCE_RANGES,
              INTERACTIONS: require(p.join(__dirname, '..', 'data', 'interactions.data.js')).INTERACTIONS,
              CARD_DOMAIN_ORDER: rep.CARD_DOMAIN_ORDER};
    })()
  : {DOMAIN_OF: DOMAIN_OF, CONTROLLED_UNITS: CONTROLLED_UNITS,
     TIER1_GROUPS: TIER1_GROUPS,
     TIER2_GROUPS: TIER2_GROUPS, GROUP_PARAMETERS: GROUP_PARAMETERS,
     purposeGroupOf: purposeGroupOf,
     GE_IRON_PRODUCTS: GE_IRON_PRODUCTS, TECHNIQUES: TECHNIQUES,
     optionsForDomain: optionsForDomain, displayExamples: displayExamples,
     PATHS: PATHS, FIELD_STRENGTHS: FIELD_STRENGTHS, AGE_GROUPS: AGE_GROUPS,
     SCOPE_CHOICES: SCOPE_CHOICES, INDICATIONS: INDICATIONS,
     ETIOLOGY_COHORTS: ETIOLOGY_COHORTS,
     INDICATION_COHORTS: INDICATION_COHORTS,
     defaultTechniques: defaultTechniques,
     PARAMETER_LABELS: PARAMETER_LABELS, PARAMETER_UNITS: PARAMETER_UNITS,
     PARAMETER_STEPS: PARAMETER_STEPS,
     REPORT_PARAMETERS: REPORT_PARAMETERS,
     IVIM_PARAMS: IVIM_PARAMS, IVIM_LABELS: IVIM_LABELS,
     IVIM_UNITS: IVIM_UNITS, IVIM_TREND_NOTE: IVIM_TREND_NOTE,
     orderCards: orderCards, groupCardsByDomain: groupCardsByDomain,
     CONTEXT_INPUTS: CONTEXT_INPUTS, buildContext: buildContext,
     orderReferences: orderReferences, V2_SCOPE_VERSION: V2_SCOPE_VERSION,
     SCOPE_VERSION: SCOPE_VERSION, REFERENCES: REFERENCES,
     CUTOFFS: CUTOFFS, CALIBRATIONS: CALIBRATIONS,
     REFERENCE_RANGES: REFERENCE_RANGES, INTERACTIONS: INTERACTIONS,
     CARD_DOMAIN_ORDER: CARD_DOMAIN_ORDER};

/* ─────────────────────────────────────────────────────────────────── LABELS */

const DOMAIN_LABELS = {
  pdff: 'PDFF method', r2star: 'R2* method', t2star: 'T2* method',
  lic: 'LIC method', mre: 'MRE method',
  t1: 'Native T1 method', ct1: 'cT1 method'
};

/* W-013 fixed these three. The middle tier's label deliberately avoids the word
   "cleared": the workbook names products and licence requirements, never a
   510(k) or a CE mark, so no printed string here claims a regulatory status. */
const SCOPE_LABELS = {
  native: 'Clinical products (default)',
  cleared: '+ third-party products',
  research: '+ research'
};

/* The blocks V1 prints, by measurement domain rather than by parameter — which
   is why LIC, R2* and T2* share one block, exactly as they share one method
   control. The numbering is counted, not written. The order was V1's until W-142
   re-set it (developer decision 2026-08-31) to match report.js CARD_DOMAIN_ORDER
   — fibrosis first, iron whole on sheet 2; render.test.js N33 binds the two
   element for element. */
const DOMAIN_ORDER = ['mre', 'pdff', 'iron', 't1', 'ct1', 'adc'];
const DOMAIN_TITLES = {
  pdff: 'Fat — steatosis',
  iron: 'Iron — R2* / T2* / LIC',
  mre: 'Fibrosis — MR elastography',
  t1: 'Relaxometry — native T1',
  ct1: 'Iron-corrected T1',
  adc: 'Diffusion — ADC'
};

const VENDOR_CLASS_LABELS = {
  'ge-explicit': 'GE-explicit',
  'multi-vendor-incl-ge': 'multi-vendor, GE included',
  'non-ge': 'other platforms',
  'guideline': 'guideline / consensus'
};

/* ───────────────────────────────────────────────── WHERE A PARAMETER LANDS */
const SECTIONS = [
  /* `grouped` is W-035: the cards on the clinical page are printed under the
     domain heading they belong to. The two tier sections below stay flat --
     they already carry their own title and note, and a second heading level
     inside a short list costs page budget for a grouping the reader can see
     at a glance (developer decision, 2026-08-24). */
  {id: 'clinical', mount: 'page1-inline', title: null, note: null,
   grouped: true},
  {id: 'additional', title: 'Additional measurements', additional: true,
   note: 'These sit apart from the primary staging: some are produced by the ' +
         'scanner\u2019s own software, some by third-party post-processing, some ' +
         'by no product on record \u2014 and each is staged only where a ' +
         'published cut-off exists, the rest shown for reference. Regulatory ' +
         'status is not recorded here.'}
];

/* W-080. The shared note, verbatim, for the on-screen head of `#section-additional`.
   The methodology sheet prints the same words from the SECTIONS entry above. */
const ADDITIONAL_NOTE = SECTIONS[1].note;

/* W-080. The merged section collects rows from more than one mountPoint -- the
   Tier-1 native readings that used to sit inline on page 1 (native T1, ADC), the
   third-party rows (cT1), and the dormant `page2-research` mount -- plus IVIM,
   appended separately (it is not a report row). Row selection is this predicate,
   stated once, not a conditional in the renderer below. */
function additionalRows(ordered) {
  return ordered.filter(p =>
    p.row.mountPoint === 'page2-thirdparty' ||
    p.row.mountPoint === 'page2-research' ||
    (p.row.mountPoint === 'page1-inline' &&
     _RN.TIER2_GROUPS.indexOf(p.row.domain) !== -1));
}

/* W-080. True when the merged section drew anything at all -- used by the
   methodology sheet's note loop, which cannot key on a single `mount`. */
function additionalSectionDrew(model) {
  return model.report.rows.some(r => r.rendered &&
    (r.mountPoint === 'page2-thirdparty' || r.mountPoint === 'page2-research' ||
     (r.mountPoint === 'page1-inline' &&
      _RN.TIER2_GROUPS.indexOf(r.domain) !== -1))) ||
    !!(model.ivim && model.ivim.rendered);
}

/* ──────────────────────────────────────────────────────────────── ESCAPING
   Attribute-safe, not just text-safe. Every interpolation below lands in a
   double-quoted attribute or in text, and the same helper must cover both — a
   text-only escaper reads as protection while leaving `value="…"` open. */
function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* THE METHOD CONTROL — one control per domain, not per parameter (W-006).
   Rebuilt when the setup panel dissolved at W-030. The vocabulary is domains.js's
   own, read at render time, so the control cannot drift from the technique list
   the engine validates against — an entry control that drifted would crash the
   report rather than empty it (W-027), and this is the surface that could drift.

   Screen only: the printed card already names the acquisition through
   report.js:acquisitionLine(), which is the sourced one. `data-domain` is the
   selector app.js wires; changing it here silently unwires the control. */
function methodControl(selection, domain) {
  const chosen = (selection.techniques && selection.techniques[domain]) || '';
  const groups = _RN.optionsForDomain(domain);
  /* W-149 — this control only renders where the scanner path has no preset
     technique (parameterCard's showControl), i.e. the non-GE paths, and NOTHING
     on the card stages until a method is picked (the ruler bar does not draw).
     So an unpicked one carries the fill wash, the same as an empty value input.
     Caught by the shared `.pcard .pident select[data-fill="needed"]` rule. */
  const fillAttr = chosen ? '' : ' data-fill="needed"';
  let html = '<label class="method screen-only">' +
    '<span class="mlabel">Acquisition method</span>' +
    '<select data-domain="' + esc(domain) + '"' + fillAttr + '>' +
    '<option value=""' + (chosen ? '' : ' selected') + '>Not selected</option>';
  for (const g of groups) {
    html += '<optgroup label="' + esc(g.label) + '">';
    for (const o of g.options) {
      html += '<option value="' + esc(o.id) + '"' +
              (o.id === chosen ? ' selected' : '') + '>' + esc(o.label) + '</option>';
    }
    html += '</optgroup>';
  }
  html += '</select>';
  if (chosen) {
    const owner = groups.filter(g => g.options.some(o => o.id === chosen))[0];
    if (owner) html += '<span class="mgroup">' + esc(owner.label) + '</span>';
    /* displayExamples strips every manufacturer token (entry suite C1), so what
       reaches the screen is a sequence family, not somebody's brand. */
    const ex = _RN.displayExamples(chosen);
    /* W-079. `etc.` because the list is now a SAMPLE and no longer looks like one:
       seven product names were withdrawn, so most lines carry a single name, and a
       single name reads as an identity -- "CSE-MRI IS IDEAL-IQ" -- where three read
       as examples. The suffix makes no claim about what the others are, which is
       the point: what was withdrawn was withdrawn deliberately. Developer decision
       2026-08-26; `e.g.` was offered as the alternative and `etc.` chosen. An empty
       list still prints nothing, so no line ever reads `etc.` on its own. */
    if (ex.length) html += '<span class="mex">' + esc(ex.join(' \u00b7 ')) + ' etc.</span>';
  }
  return html + '</label>';
}

/* W-090. A SECOND control, GE-only, offered beside the technique control for
   r2star/t2star specifically — which GE console produced the reading. It
   never changes which cut-off ladder or calibration resolves (that is still
   `technique`, untouched); it only feeds `row.product`, which acquisitionLine
   (report.js) prefers over the scope-based default when set. Visible
   regardless of whether the TECHNIQUE control itself is showing (GE still
   hides that one by default — see parameterCard) because the product choice
   is the whole point of this task even when the technique stays defaulted. */
function productControl(selection, parameter, technique) {
  const offered = _RN.GE_IRON_PRODUCTS[parameter];
  if (selection.path !== 'ge' || !offered) return '';
  const t = technique ? _RN.TECHNIQUES[technique] : null;
  if (!t || t.group !== 'iron-r2star') return '';

  const chosen = (selection.products && selection.products[parameter]) || '';
  let html = '<label class="method screen-only">' +
    '<span class="mlabel">GE product</span>' +
    '<select data-product="' + esc(parameter) + '">' +
    '<option value=""' + (chosen ? '' : ' selected') + '>Not selected</option>';
  for (const o of offered) {
    html += '<option value="' + esc(o.id) + '"' +
            (o.id === chosen ? ' selected' : '') + '>' + esc(o.label) + '</option>';
  }
  html += '</select></label>';
  return html;
}

/* ═════════════════════════════════════════════════════════════════ THE FRAME
   V1's page IS the form, so the separate setup panel does not exist: the
   controls live in the report's own rows and are hidden under @media print. */

function masthead(profile) {
  /* W-130. A real mark, not a placeholder \u2014 v2/assets/brand-mark.png, the
     developer's own verisyn.co logo, resized to 200x200 and clipped to its
     circle (border-radius:50% in CSS; the source PNG has a near-paper
     background inside the ring, so a raw square would read as a faint box on
     paper \u2014 the clip removes that with no image edit). DESIGN-DIRECTION.md
     keeps the masthead the quietest thing on the page by SIZE and by having no
     second display FACE; this mark carries no type, so it holds that. What it
     does knowingly relax is COLOUR \u2014 the mark is full navy/blue, not ink-only
     \u2014 a deliberate developer choice 2026-08-30 (CLAUDE.md \u00a7 2.4), recorded
     here and in CHANGELOG.md rather than silently contradicting the design
     doc's "no colour risk" language.

     W-139. The mark moved OUT of this text row and into the masthead's own
     top-right corner (`.masthead{position:relative}`, `.brand-mark{position:
     absolute}` in styles.css) \u2014 the empty space beside the <h1> title \u2014
     and grew 15px \u2192 36px, both screen and print. `position:absolute` resolves
     against the nearest positioned ancestor regardless of DOM depth, so its
     placement in markup below is cosmetic; it stays after the lockup div in
     source order only because that reads more naturally next to the text it
     used to sit beside. */
    /* W-100/W-139: this lockup is V2's own \u2014 no longer verbatim V1's
       (v1/index.html:133, frozen, unchanged). Developer-specified brand +
       product strings, scoped to this one string: "VERISYN.CO" (renamed from
       "VERISYNCO" to read as the domain, verisyn.co) and "veri.liver"
       (renamed from "Veri.Liv"). */
  return '<div class="masthead"><div><div class="lockup">VERISYN.CO - <b>veri.liver</b></div>' +
    '<img class="brand-mark" src="assets/brand-mark.png" alt="verisyn.co">' +
    '<h1>Liver MRI \u2014 Quantitative Imaging Biomarkers</h1>' +
    '<div class="sub">Measurements in, published staging out, every cut-off shown ' +
    'with its source.</div>' +
    '<p class="detail">This report converts quantitative liver MRI measurements into ' +
    'stages drawn from named, peer-reviewed cut-offs. Each parameter is shown against ' +
    'the consensus ladder that stages it and, where one exists, against the publication ' +
    'matched to the stated indication. Where no published cut-off covers a measurement, ' +
    'the report says so instead of printing a number. It is an educational reference ' +
    'tool, not a diagnostic device, and does not replace radiologist interpretation.</p>' +
    /* No acquisition badge here: the path is named in the study-meta row and the
       page stamp. `profile.badge` stays the profile's canonical path name; it is
       no longer surfaced on the sheets (developer call, § 2.4). */
    '</div></div>';
}

/* A CONTROL NEVER DISPLAYS A CHOICE THE MODEL HAS NOT MADE.
   `path` is the one axis whose modelled default is null — W-006 assumes no
   acquisition — and a <select> with no option marked `selected` shows its FIRST
   option regardless. That printed "GEHC SIGNA MR" over a null path: the report
   never built, and picking that same first entry fired no change event, so there
   was no way forward. The old setup panel asked this with radios, where "none
   checked" is representable; a select needs the placeholder to say it.

   Written for every axis rather than for `path`, because the next nullable axis
   would arrive with the same defect and no test would notice.

   W-136 review — `nullable: true` keeps the "Not selected" option in the list
   even after a value is chosen, so an optional axis (etiologyCohort) can be
   cleared back to not-stated from the form. Without it the empty option
   appeared only while the value was still null. Non-nullable cells are
   unchanged: they show the empty option only when unset. */
function selectCell(label, axis, options, chosen, screenOnly, nullable, fillNeeded) {
  const unset = chosen === null || chosen === undefined;
  return '<div class="cell' + (screenOnly ? ' screen-only' : '') + '"><label>' +
    esc(label) + '</label><select data-axis="' + esc(axis) + '"' +
    (fillNeeded ? ' data-fill="needed"' : '') + '>' +
    ((unset || nullable)
      ? '<option value=""' + (unset ? ' selected' : '') + '>Not selected</option>' : '') +
    options.map(o => '<option value="' + esc(o.value) + '"' +
      (o.value === chosen ? ' selected' : '') + '>' + esc(o.label) + '</option>').join('') +
    '</select></div>';
}

/* AN EMPTY IDENTITY CELL SAYS SO, ON PAPER (W-014). A placeholder is screen
   furniture: no browser prints it, so an unfilled accession left an empty box on
   the sheet, which reads as a field that went missing rather than one nobody
   filled in. The span carries the sentence and the stylesheet shows it only in
   print, where the input it replaces is hidden. Same rule as § 1.2 — absence is
   recorded as a described fact, never as silence. */
function textCell(label, axis, value, placeholder, type, fillNeeded) {
  const unset = value === null || value === undefined || String(value) === '';
  return '<div class="cell"><label>' + esc(label) + '</label>' +
    '<input data-axis="' + esc(axis) + '"' +
    (fillNeeded ? ' data-fill="needed"' : '') +
    (type ? ' type="' + esc(type) + '"' : '') + ' value="' +
    esc(unset ? '' : String(value)) +
    '" placeholder="' + esc(placeholder) + '">' +
    (unset ? '<span class="unset">not provided</span>' : '') + '</div>';
}

const INDICATION_LABELS = {
  'iron-overload': 'Iron overload',
  'steatotic-liver-disease': 'Steatotic liver disease',
  'chronic-liver-disease': 'Chronic liver disease',
  'non-specific': 'Not specified'
};

/* W-136. Sentence-case labels for the <select>, same split as INDICATION_LABELS
   vs report.js's own lower-case INDICATION_READER_LABEL (report.js:749) — this
   map has no lower-case sentence twin because the etiology axis never
   appears in a printed sentence; it only steers which publication matches
   (report.js matchedScale). W-136 review dropped 'adult-multi-etiology'
   (withdrawn from ETIOLOGY_COHORTS — its records can never pin). */
const ETIOLOGY_COHORT_LABELS = {
  'adult-hbv': 'Hepatitis B',
  'adult-hcv': 'Hepatitis C',
  'adult-nafld': 'NAFLD / MASLD'
};

/* W-136 review — the etiology-cohort cell is offered only for the cohorts that
   (a) can pin a publication at all (selection.js ETIOLOGY_COHORTS) AND (b)
   belong to the stated indication's own family (report.js INDICATION_COHORTS).
   Under an indication with no such cohort the intersection is empty and the
   cell is drawn nowhere — a control offering only "Not selected" would be a
   choice the reader could make and have silently ignored (finding #1). One
   predicate, read by both metaCell (the cell) and entryRoute (the Tab stop),
   so the page and the keyboard route can never disagree about whether it
   exists (W-046). */
function etiologyCohortsFor(selection) {
  const family = _RN.INDICATION_COHORTS[selection && selection.indication] || [];
  return _RN.ETIOLOGY_COHORTS.filter(c => family.indexOf(c) !== -1);
}

/* W-141. The same cell IDENTITY_CELLS used to carry for `etiologyCohort`
   (label, nullable, options), now drawn inside the MRE card's own .pident
   instead of the always-drawn identity row — see the note left at
   IDENTITY_CELLS' old 'indication' entry. metaCell already returns '' when
   options(selection) is empty, so an indication with no cohort family still
   draws nothing here, same as before. */
const ETIOLOGY_COHORT_CELL = {axis: 'etiologyCohort',
  label: 'Closest evidence cohort (if known)', nullable: true,
  options: (selection) => etiologyCohortsFor(selection).map(
    c => ({value: c, label: ETIOLOGY_COHORT_LABELS[c]}))};

/* W-149 — the MRE card's own context selects (ascites, etiologyCohort) only
   refine staging once mre carries a value: a trigger built from either only
   attaches to `mre` after `mre` already has one (reliability.js:216). So the
   fill wash on an unset one is gated on exactly that — Fibrosis performed, mre
   valued, the select still "not stated". */
function mreContextFillNeeded(row, selection, chosen) {
  return chosen === null || chosen === undefined
    ? !!(row.value !== null && row.value !== undefined &&
         selection && selection.performed && selection.performed.fibrosis === true)
    : false;
}

function etiologyCohortHtml(row, selection) {
  if (row.parameter !== 'mre') return '';
  const chosen = selection && selection.etiologyCohort;
  return metaCell(ETIOLOGY_COHORT_CELL, selection,
    mreContextFillNeeded(row, selection, chosen));
}

/* W-144. Was fibrosisContextHtml()'s ascites field, drawn far below in a
   separate "Fibrosis — reliability context" block. Moved into the MRE
   card's own .pident, right under the cohort selector above, on the same
   reasoning: TRG-0002 only ever attaches to `mre` once `mre` has a value
   (reliability.js:216), so the control doing nothing when the card is not
   rendered costs nothing (the same finding W-141 used for etiologyCohort).
   Reuses the `.cell` wrapper (and its existing `.pcard .pident .cell select`
   styling) rather than the `.lc` shape the old block used — `data-value`,
   not `data-axis`, because ascites lives in selection.values, not on the
   selection object directly. */
function ascitesCellHtml(row, selection) {
  if (row.parameter !== 'mre') return '';
  const v = (selection && selection.values && selection.values.ascites);
  const chosen = (v === true || v === false) ? v : null;
  const fill = mreContextFillNeeded(row, selection, chosen) ? ' data-fill="needed"' : '';
  return '<div class="cell"><label>Ascites</label><select data-value="ascites"' + fill + '>' +
    '<option value=""' + (chosen === null ? ' selected' : '') + '>not provided</option>' +
    '<option value="true"' + (chosen === true ? ' selected' : '') + '>present</option>' +
    '<option value="false"' + (chosen === false ? ' selected' : '') + '>absent</option>' +
    '</select></div>';
}

/* W-134. Presentation-only: the purpose group the selected indication leads
   with. It GATES NOTHING and STAGES NOTHING — every group stays in the same
   unfiltered pool, every card renders on the same rule as before.
   W-149 — this no longer picks a fill-wash strength (the wash is one tone now);
   its only remaining reader is `performedAlsoOpen`, which names the OTHER
   Tier-1 groups so the reader can hide them. A null primary (non-specific, or a
   cleared indication) means there is no "other" set to name — the line is not
   drawn. */
const PRIMARY_GROUP_BY_INDICATION = {
  'iron-overload': 'iron',
  'steatotic-liver-disease': 'fat',
  'chronic-liver-disease': 'fibrosis',
  'non-specific': null
};

/* THE IDENTITY AND STUDY CELLS, DECLARED ONCE (W-046). They used to be a
   literal argument list inside each of the two builders below, which was fine
   while the markup was their only consumer. `entryRoute` is a second consumer,
   and a second hand-written copy of the same seven fields is the shape that
   drifts: a cell added to the sheet and forgotten in the route is a field the
   reader's Tab silently skips. One list, two readers.

   The options are thunks rather than arrays because they are read out of
   selection.js at call time; an array evaluated here would freeze the
   vocabulary at module load. */
const IDENTITY_CELLS = [
  {axis: 'accession', label: 'Patient / Accession', placeholder: 'e.g. 2026-00123'},
  {axis: 'studyDate', label: 'Study date', placeholder: 'YYYY-MM-DD'},
  {axis: 'age', label: 'Age (yr)', placeholder: ''},
  /* Age does NOT silently derive the cohort — the engine still reads only the
     human's Cohort <select> (unchanged). W-150 added a screen-only, non-blocking
     NUDGE toward Paediatric when the entered age is below PAEDIATRIC_AGE_MAX
     (studyMeta / cohortNudgeNeeded, below); the age value itself still feeds only
     FIB-4. No staging boundary was created: a hard auto-derive was rejected
     because no guideline mandates one age for cut-off selection — see
     v2/data/LITERATURE.md § 13 for the search and the reasoning. */
  /* W-146: cohort/indication moved OUT of this array and into STUDY_CELLS,
     below, so the header's first row can carry bmi instead — the axes
     themselves, and their route order, are unchanged; only which visual row
     they print in moved. */
  /* W-136 added `etiologyCohort` here as its own cell. W-141 moved it out: the
     axis only ever steers report.js matchedScale for the MRE row (its only
     live effect today), so it now lives inside the MRE card itself
     (etiologyCohortCell, parameterCard's .pident) rather than in the
     always-drawn identity row — it disappears along with the card when
     Fibrosis is off, which costs nothing because the axis would do nothing
     there either. See etiologyCohortCell below for the cell definition. */
  /* W-017 round 2 added a `requestorName`/`requestorEmail` pair here so the
     finished report could be e-mailed straight to the requesting clinician.
     W-129 removes both: the send button no longer needs an e-mail on file to
     open a mailto: draft (buildRequestorEmail's `to` is simply empty, and the
     clinician types the recipient themselves), so there was nothing left for
     the fields to gate. */
];

const STUDY_CELLS = [
  /* W-146: cohort/indication, formerly IDENTITY_CELLS' last two entries —
     their route position (right after age, right before fieldStrength) is
     unchanged, only the visual row they print in moved. */
  {axis: 'cohort', label: 'Cohort',
   options: () => _RN.AGE_GROUPS.map(
     a => ({value: a, label: a === 'adult' ? 'Adult' : 'Paediatric'}))},
  {axis: 'indication', label: 'Indication', nullable: true,
   /* W-149 — `nullable` keeps the "Not selected" option in the list even after
      a value is chosen, so the reader can clear it back to "not set"
      (selection.js now accepts indication:null). The default is still a stated
      value; a null indication reads as 'non-specific' in report.js. */
   options: () => _RN.INDICATIONS.map(
     i => ({value: i, label: INDICATION_LABELS[i]}))},
  {axis: 'fieldStrength', label: 'Field strength',
   options: () => _RN.FIELD_STRENGTHS.map(f => ({value: f, label: f}))},
  {axis: 'path', label: 'Scanner',
   options: () => Object.keys(_RN.PATHS).map(
     k => ({value: k, label: _RN.PATHS[k].label}))}
];

/* A cell with an option list is a <select>; a cell with a placeholder is a text
   box. The distinction is the descriptor's own shape, so a new cell declares
   what it is by what it carries. `fillNeeded` (W-149) is the caller's own
   decision — metaCell only forwards it — because the condition ("this axis is
   empty AND its value would change a staging output") is per-axis and lives
   with the surface that draws the axis. */
function metaCell(cell, selection, fillNeeded) {
  if (!cell.options) {
    return textCell(cell.label, cell.axis, selection[cell.axis], cell.placeholder,
                    cell.type, fillNeeded);
  }
  const opts = cell.options(selection);
  /* W-136 review — a <select> with no options for the current selection (the
     etiology-cohort cell under an indication with no cohort-specific evidence)
     is drawn nowhere rather than as an inert control offering only "Not
     selected". entryRoute applies the same test so the Tab route matches. */
  if (!opts.length) return '';
  return selectCell(cell.label, cell.axis, opts, selection[cell.axis], false,
                    cell.nullable, fillNeeded);
}

/* W-149 — an axis value is empty (no staging input to read from it yet). */
function axisIsEmpty(v) {
  return v === null || v === undefined || String(v) === '';
}

/* W-150 — the age below which the entry form NUDGES (screen-only, non-blocking)
   toward the Paediatric cohort. This is NOT a clinical cut-off and NOT a staging
   input: the engine still reads only the human's Cohort <select>, exactly as
   before this task. 18 is the operational boundary the paediatric liver-MRI
   literature uses consistently — the repo's own paediatric MRE normative source,
   Trout 2020 (EXT-004, PMID 32960728), enrols 7–17.9 y, and the QIBA-adjacent
   multi-site paediatric MRE cohort is defined "< 18 years". No single guideline
   SENTENCE mandates one age for cut-off selection (a minority of studies use
   ≤ 21), which is why the nudge is advisory and no hard auto-derive was built.
   Full search and reasoning: v2/data/LITERATURE.md § 13. */
const PAEDIATRIC_AGE_MAX = 18;

/* W-150 — true when the entered age is a number below PAEDIATRIC_AGE_MAX and the
   cohort has not been set to 'peds'. Pure; its only consumer is studyMeta, which
   draws a screen-only advisory. */
function cohortNudgeNeeded(selection) {
  const raw = selection.age;
  if (raw === null || raw === undefined || String(raw).trim() === '') return false;
  const n = Number(raw);
  if (!Number.isFinite(n)) return false;
  return n < PAEDIATRIC_AGE_MAX && selection.cohort === 'adult';
}

function patientMeta(selection, uiState) {
  const context = _RN.buildContext(selection);
  return '<div class="meta">' +
    /* W-149 — `age` is a FIB-4 term; an empty one gets the fill wash. The other
       identity cells (accession, studyDate) change no staging output, so they
       do not. */
    IDENTITY_CELLS.map(c => metaCell(c, selection,
      c.axis === 'age' && axisIsEmpty(selection.age))).join('') +
    bmiHeaderCellHtml(context) +
    bmiCalcCellHtml(context, uiState) +
    '</div>';
}

function studyMeta(selection, profile) {
  /* Each path states its CONSEQUENCE and claims nothing about accuracy. The
     sentence is the PROFILE's field, read here — never a path comparison, which
     is the branch K6 forbids. */
  const consequence = profile && profile.pathNote
    ? '<p class="pathnote screen-only">' + esc(profile.pathNote) + '</p>' : '';
  /* W-150 — a screen-only, non-blocking suggestion sitting under the Cohort
     cell. It changes no model state; the reader acts on it by picking
     Paediatric in the Cohort <select> above, which stays fully editable. */
  const cohortNudge = cohortNudgeNeeded(selection)
    ? '<p class="cohort-nudge screen-only">Age entered is under ' + PAEDIATRIC_AGE_MAX +
      ' — set Cohort to Paediatric if this is a paediatric study.</p>'
    : '';
  return '<div class="meta study">' +
    /* W-149 — `indication` cleared to "not set" (selection.js now allows null)
       gets the wash. fieldStrength / path / cohort always carry a value. */
    STUDY_CELLS.map(c => metaCell(c, selection,
      c.axis === 'indication' && axisIsEmpty(selection.indication))).join('') +
    '</div>' + cohortNudge + consequence;
}

/* W-063b. One checkbox per PURPOSE GROUP (domains.js TIER1_GROUPS), always
   visible — it is the only way to reveal a card the toggle controls, so it
   cannot live inside a card the toggle hides (spec § 4.1). Each row carries a
   method subtitle so the surrogate ("stiffness" for "Fibrosis") is named where
   the reader sees it. Screen only: the printed page shows which cards exist. */
const GROUP_LABELS = {
  fat:      {label: 'Fat',      sub: 'Proton density fat fraction'},
  iron:     {label: 'Iron',     sub: 'R2* / T2* / LIC'},
  fibrosis: {label: 'Fibrosis', sub: 'MR elastography — liver stiffness'}
};
function performedBlock(selection) {
  const performed = selection.performed || {};
  const rows = _RN.TIER1_GROUPS.map(g => {
    const m = GROUP_LABELS[g];
    return '<label class="perf-row"><input type="checkbox" data-performed-group="' +
      esc(g) + '"' + (performed[g] === true ? ' checked' : '') + '>' +
      '<span class="perf-text"><span class="perf-label">' + esc(m.label) + '</span>' +
      '<span class="perf-sub">' + esc(m.sub) + '</span></span></label>';
  }).join('');
  return '<div class="labs-head ctx-head screen-only"><span class="t">' +
    'Measurements used in the staging assessment</span></div>' +
    '<div class="perf-grid screen-only">' + rows + '</div>' +
    performedAlsoOpen(selection, performed);
}

/* W-134. One screen-only line under the Tier-1 checkboxes, shown only when the
   indication has a primary group (§ PRIMARY_GROUP_BY_INDICATION) AND the other
   Tier-1 groups are switched on: it names them and offers a one-click Hide.
   Hide/Show is a shortcut to the checkboxes above — it writes the same
   `performed` axis, it does not change any default. Tier-1 only, so app.js needs
   no scope recompute. */
function performedAlsoOpen(selection, performed) {
  const prim = PRIMARY_GROUP_BY_INDICATION[selection.indication];
  if (!prim) return '';
  const others = _RN.TIER1_GROUPS.filter(g => g !== prim);
  const names = others.map(g => GROUP_LABELS[g] ? GROUP_LABELS[g].label : g).join(' and ');
  const indLabel = INDICATION_LABELS[selection.indication] || selection.indication;
  const onOthers = others.filter(g => performed[g] === true);
  if (onOthers.length) {
    return '<p class="perf-also screen-only">This report is set for ' + esc(indLabel) +
      '. ' + esc(names) + ' are also open. ' +
      '<button type="button" data-perf-set="' + esc(onOthers.join(',')) +
      '" data-perf-to="false">Hide</button></p>';
  }
  return '<p class="perf-also screen-only">This report is set for ' + esc(indLabel) +
    '. ' + esc(names) + ' are hidden. ' +
    '<button type="button" data-perf-set="' + esc(others.join(',')) +
    '" data-perf-to="true">Show</button></p>';
}

/* W-063b. The Tier-2 decision, made explicit and always-visible — it replaces
   the bottom-of-page `tierOffer` radio. One checkbox per TIER2_GROUPS entry
   whose parameter can ever render (quantification !== 'none'). Checking one
   patches selection.performed[group] AND, in app.js, raises selection.scope to
   the tier that parameter needs; the render side only draws the control. */
const TIER2_LABELS = {t1: 'Native T1', ct1: 'cT1', adc: 'ADC'};
/* W-080. The entry checkbox order mirrors the report's card order in the merged
   "Additional measurements" section (native T1, then ADC, then the third-party
   cT1), so the panel and the report read the same left to right. This is a
   local presentation order — `TIER2_GROUPS` (domains.js) keeps its own order,
   which partitions GROUP_PARAMETERS and is asserted elsewhere. */
const TIER2_ENTRY_ORDER = ['t1', 'adc', 'ct1'];
function tier2Block(model, selection) {
  const performed = selection.performed || {};
  const byParam = {};
  model.report.rows.forEach(r => { byParam[r.parameter] = r; });
  const rows = TIER2_ENTRY_ORDER.filter(g => {
    const p = _RN.GROUP_PARAMETERS[g][0];
    const r = byParam[p];
    return !r || !r.scope || r.scope.quantification !== 'none';
  }).map(g =>
    '<label class="perf-row"><input type="checkbox" data-performed-group="' +
    esc(g) + '"' + (performed[g] === true ? ' checked' : '') + '>' +
    '<span>' + esc(TIER2_LABELS[g]) + '</span></label>').join('');
  /* W-081. IVIM sits in this same block, labelled "IVIM" (developer decision,
     2026-08-30). It is NOT a TIER2_GROUPS entry — that array partitions
     GROUP_PARAMETERS (entry.test.js A3) and IVIM has no report row — so it is
     appended here directly. The checkbox uses the same `data-performed-group`
     attribute, so app.js's generic handler sets `selection.performed.ivim`;
     `ivim` is not in TIER2_GROUPS, so it never touches `selection.scope`. */
  const ivimRow =
    '<label class="perf-row"><input type="checkbox" data-performed-group="ivim"' +
    (performed.ivim === true ? ' checked' : '') + '>' +
    '<span>IVIM</span></label>';
  if (!rows && !ivimRow) return '';
  return '<div class="labs-head ctx-head screen-only"><span class="t">' +
    'Additional measurements</span></div>' +
    '<div class="perf-grid screen-only">' + rows + ivimRow + '</div>';
}

/* W-063. BMI enters two ways on one line: typed directly, or computed from
   height and weight beside it. A typed value always wins (buildContext,
   report.js) — this cell only decides how to SHOW that, never which number
   is correct; no coefficient or formula is written here (spec § 7). */
/* W-104. An `.lc` cell with no value is `lc-empty`, so @media print can drop it
   rather than print an empty labelled box. The class is decided from the model
   alone (report re-renders on every committed change), never from the DOM. */
function lcClass(isEmpty) { return isEmpty ? 'lc lc-empty' : 'lc'; }

/* W-146. BMI moved out of the laboratory-adjacent "Clinical context
   (optional)" block (contextBlock(), W-015/W-063, removed below) and into
   the patient/accession header (patientMeta) — it is patient identity
   metadata, read once per study, not a lab value. Height/weight — collected
   solely to derive bmi when it is not typed directly (report.js
   buildContext) — moved with it, but behind a "Calculate BMI" popup rather
   than sitting on the header row directly: two more always-visible number
   boxes would not fit the same five-cell row accession/studyDate/age/bmi
   already share with the popup trigger.

   The popup's open/closed state is NOT part of `selection` (the clinical
   model): it is a screen-only concern, and the whole app re-renders through
   one DOM write on every `change` (app.js), so a UI toggle placed in
   `selection` would pollute the clinical model and would be exercised by
   the hash-lock tests for no reason. It is threaded the same way `viewMode`
   already is — an ephemeral flag owned by app.js, passed down as a plain
   argument (`uiState`). Closed by default: when closed, height/weight are
   not rendered at all (not just visually hidden), matching the same
   "no route stop without a field, no field without a route stop" rule
   (W-046) etiologyCohort already uses for its own conditional cell. */
const BMI_HINT = 'Above 35, BMI can affect MRE reliability (up to 20% of ' +
  'scans fail) and, at 3.0T, can bias PDFF over the anterior right lobe.';

function bmiHeaderCellHtml(context) {
  const bmiValue = (context.bmi === null || context.bmiDerived)
    ? '' : esc(String(context.bmi));
  const computed = context.bmiDerived
    ? '<span class="bmi-computed">' + esc(String(context.bmi)) +
      ' kg/m² (computed)</span>' : '';
  /* W-149 — bmi feeds TRG-0001 (mre) and TRG-0014 (pdff at 3.0T); an absent one
     (neither typed nor derived from height/weight) gets the fill wash. */
  const fillNeeded = context.bmi === null;
  return '<div class="cell"><label>Body-mass index <span class="hint" title="' +
    esc(BMI_HINT) + '">?</span></label>' +
    '<input type="number" inputmode="decimal" step="any" data-value="bmi"' +
    (fillNeeded ? ' data-fill="needed"' : '') + ' value="' +
    bmiValue + '">' + computed + '</div>';
}

function bmiCalcCellHtml(context, uiState) {
  const open = !!(uiState && uiState.bmiPopupOpen);
  const dialog = !open ? '' : '<dialog class="bmi-calc-dialog screen-only" open>' +
    '<div class="bmi-calc-head"><span>Calculate BMI</span>' +
    '<button type="button" data-action="close-bmi-calc" aria-label="Close">×</button></div>' +
    '<div class="' + lcClass(context.heightCm === null) + '"><label>Height</label><div class="r2">' +
      '<input type="number" inputmode="decimal" step="any" data-value="heightCm" value="' +
      (context.heightCm === null ? '' : esc(String(context.heightCm))) +
      '"><span class="u">cm</span></div></div>' +
    '<div class="' + lcClass(context.weightKg === null) + '"><label>Weight</label><div class="r2">' +
      '<input type="number" inputmode="decimal" step="any" data-value="weightKg" value="' +
      (context.weightKg === null ? '' : esc(String(context.weightKg))) +
      '"><span class="u">kg</span></div></div>' +
    '</dialog>';
  return '<div class="cell calc-bmi-cell screen-only">' +
    '<button type="button" class="bmi-calc-btn" data-action="toggle-bmi-calc">Calculate BMI</button>' +
    dialog + '</div>';
}

/* W-144. Was fibrosisContextHtml() (W-130): ascites/altUln/ggt printed as
   their own "Fibrosis — reliability context" block here. All three now have
   a new home — ascites inside the MRE card's own .pident (ascitesCellHtml,
   below), altUln/ggt spliced into labs.inputs itself (report.js buildLabs())
   — so this function has nothing left to draw and is removed rather than
   kept as a dead shell. reliability.js:216 is the reason this is safe: a
   trigger built from any of these three only ever attaches to `mre` once
   `mre` already carries a value, so none of them can affect a printed page
   the MRE card itself is not on — the same finding W-141 already used for
   the etiologyCohort selector. See render.js's ascitesCellHtml() and
   report.js buildLabs() for where the fields live now. */
function labsBlock(labs, selection, model) {
  if (!labs) return '';
  /* W-149 — an empty laboratory cell gets the fill wash: ast/alt/platelets feed
     FIB-4, altUln feeds INT-0035, ggt the reliability rules. Screen-only and
     live-only via the CSS guard, exactly like the parameter-card inputs. */
  const grid = labs.inputs.map(f =>
    '<div class="' + lcClass(f.value === null) + '"><label>' + esc(f.label) + '</label><div class="r2">' +
    '<input type="number" inputmode="decimal" step="any" data-value="' + esc(f.key) + '"' +
    (f.value === null ? ' data-fill="needed"' : '') + ' value="' +
    (f.value === null ? '' : esc(String(f.value))) + '"><span class="u">' +
    esc(f.unit) + '</span></div></div>').join('');

  return '<section class="labs" id="labs">' +
    '<div class="labs-head"><span class="t">Laboratory (supporting)</span>' +
    '<span class="derived">FIB-4 <b>' +
      (labs.fib4.value === null ? '\u2014' : esc(labs.fib4.value.toFixed(2))) +
    '</b> \u00b7 AST/ALT <b>' +
      (labs.aar.value === null ? '\u2014' : esc(String(labs.aar.value))) +
    '</b></span></div>' +
    /* W-144. `labs-fib` widens the grid from 5 columns to 4 only when
       altUln/ggt are actually spliced into labs.inputs (report.js
       buildLabs()) \u2014 without it, this grid is byte-identical to the
       original 5-field/5-column layout. */
    '<div class="labs-grid' + (labs.hasFibrosisLabs ? ' labs-fib' : '') + '">' + grid + '</div>' +
    /* W-130. The full expression + provenance sentence moved to the
       methodology sheet (tableB, "How these numbers were formed") -- this
       is now a one-line pointer, not the formula itself. The number stays
       right here in the header chip above; only the derivation's ACCOUNT
       of it relocated -- the same "fact stays on the card, reason goes to
       the methodology sheet" rule the parameter cards already follow
       (§ 5.4). */
    (labs.fib4.value !== null
      ? '<p class="labs-prov">FIB-4 formula and provenance — see ' +
        'Methodology, “How these numbers were formed”.</p>' : '') +
    (labs.pending ? '<p class="labs-pending">' + esc(labs.pending) + '</p>' : '') +
    performedBlock(selection) +
    tier2Block(model, selection) +
    '</section>';
}

/* V1's two number formatters, ported verbatim from v1/js/app.js. */
/* RULER GEOMETRY, ported from V1's drawRuler(). V1 read its width from the live
   element (`svg.clientWidth || 460`) and padded 4px each side; a pure string
   builder cannot touch the DOM, so V1's own fallback width becomes the fixed
   viewBox width and the SVG scales to its container in CSS. barY/barH below are
   V1's 20/13 unchanged. */
const RULER_W = 460;
const RULER_PAD = 4;

function fmtTick(v) {
  return (Math.abs(v) < 10 && v % 1 !== 0)
    ? v.toFixed(2).replace(/0$/, '') : (v % 1 === 0 ? v : v.toFixed(1));
}
function fmtVal(v) {
  return (Math.abs(v) < 10 && v % 1 !== 0)
    ? v.toFixed(2).replace(/0+$/, '').replace(/\.$/, '') : String(v);
}

/* A band's colour class. `sev` is null for every parameter V1 never staged, and
   that null is the whole point: it produces an outlined, uncoloured band rather
   than a severity this repository cannot source (CLAUDE.md § 1.2). */
function zoneClass(sev) {
  return sev ? 'z z-' + sev : 'z z-none';
}

/* THE SAME X-MAPPING THE BAR DRAWS WITH (W-120). `rulerSvg`'s zones/edges/marker
   and `bandLegend`'s label boxes both have to answer "where on the 0..RULER_W
   line does this value sit" — extracted once so the HTML legend positions its
   boxes from the identical function the SVG rects use, rather than a second
   copy of the same arithmetic that could drift from it. Returns x in the SAME
   0..RULER_W space rulerSvg's rect x/width attributes use. */
function axisXOf(ruler, axis) {
  const span = axis[1] - axis[0];
  const innerW = RULER_W - RULER_PAD * 2;
  const mirror = ruler.dir === 'down';
  return v => {
    const t = Math.max(0, Math.min(1, (v - axis[0]) / (span || 1)));
    return RULER_PAD + (mirror ? 1 - t : t) * innerW;
  };
}

/* ONE RULER. `axis` is passed in rather than read from the ruler so that two
   ladders for the same parameter are drawn against the same frame — a second bar
   on its own axis would put two different values at the same x.

   NO TEXT THAT MUST BE READ IS DRAWN HERE (W-040). This SVG scales to its
   container and text scales WITH it, so a size declared in the drawing is not the
   size delivered to the eye. MEASURED with Edge headless on the worst-case sheet:
   the ruler is drawn at 346 px for a 460-unit viewBox — a scale of 0.753, worse
   than the 0.84 this task estimated from the grid before measuring it. The old
   8 px band name therefore arrived at 6.0 px and the 7.5 px boundary value at
   5.6 px, both under the 8 px floor the design system sets and under the size at
   which N17's contrast pairs were measured. The band names and the boundary values are
   printed as HTML beneath the bar, where a declared size IS the delivered size,
   and both were already printed there.

   The patient's own value is the single exception and stays in the drawing,
   because its meaning is its horizontal position and a line of prose cannot carry
   that. It is the one label declared ABOVE the floor, to survive the scaling.

   Returns the SVG string. There is no longer anything to report back to the
   caller: nothing letters the bar, so nothing can fail to fit. */
function rulerSvg(ruler, axis, slim) {
  /* W-094. `dir: 'down'` means a HIGHER value is the BETTER reading (today
     only t2star and adc) — the ladder's healthy end sits at the high-value
     end of the axis. Left unmirrored, ascending-axis order draws the severe
     band on the LEFT for exactly those two parameters, the opposite reading
     direction from every `up` card. Mirroring `xOf` is the only change this
     needs: every x on the bar — zones, edges, the patient marker — is
     computed through this one function. */
  const xOf = axisXOf(ruler, axis);
  const innerW = RULER_W - RULER_PAD * 2;
  const mirror = ruler.dir === 'down';
  /* W-125. The full-size bar sits near the TOP of the viewBox now: the tall
     empty band above it (barY 22 of a 38-unit box) existed only to hold the
     patient's value chip, and that chip moved to its own HTML row above the
     bar (markerValRow). What is left above the bar is the marker line/halo top
     and the small flag, both at barY - 6 — so barY 7 and a 24-unit box clear
     them with nothing to spare and nothing wasted. */
  const barY = slim ? 3 : 7, barH = slim ? 6 : 13, H = slim ? 14 : 24;

  let s = '';
  for (const z of ruler.zones) {
    /* Mirrored, `xOf` is a DECREASING function of value, so `xOf(z.a)` can
       land to the right of `xOf(z.b)` even though `z.a <= z.b` always holds —
       take the min/max rather than assume the first call is the left edge. */
    const xa = xOf(z.a), xb = xOf(z.b);
    const x1 = Math.min(xa, xb), x2 = Math.max(xa, xb), w = x2 - x1;
    s += '<rect class="' + zoneClass(z.sev) +
         (z.ramp != null ? ' rul-ramp-' + z.ramp : '') +
         '" x="' + x1.toFixed(1) + '" y="' + barY +
         '" width="' + w.toFixed(1) + '" height="' + barH + '">' +
         '<title>' + esc((z.label || 'unnamed band') + (z.tag ? ' — ' + z.tag : '')) +
         '</title></rect>';
  }
  /* Interior edges only: the outer two are the frame, not published boundaries.
     The tick is the LINE. Its value is printed by tickValRow(), in HTML, at the
     same x ABOVE the bar; the boundary's name and its published spread ride the
     muted tickNamesLine() below — things a drawn number never carried. */
  for (const e of ruler.edges) {
    const x = xOf(e.value);
    s += '<line class="tick" x1="' + x.toFixed(1) + '" y1="' + (barY - 2) +
         '" x2="' + x.toFixed(1) + '" y2="' + (barY + barH + 2) + '"/>';
  }
  s += '<rect class="frame" x="' + RULER_PAD + '" y="' + barY + '" width="' + innerW +
       '" height="' + barH + '"/>';

  if (ruler.value !== null && ruler.value !== undefined && !isNaN(ruler.value)) {
    const mx = xOf(Number(ruler.value));
    /* W-041. The halo is painted FIRST, because SVG has no z-index and document
       order is the whole of the stacking answer: drawn second it would cover the
       line it exists to support. It carries the same geometry as the line and
       differs only in the stylesheet — one wider stroke, in the sheet's colour —
       so the marker keeps one position, one colour and one meaning while gaining
       the second edge that makes it findable on the darkest fill. */
    s += '<line class="mkh" x1="' + mx.toFixed(1) + '" y1="' + (barY - (slim ? 3 : 6)) +
         '" x2="' + mx.toFixed(1) + '" y2="' + (barY + barH + 3) + '"/>';
    s += '<line class="mk" x1="' + mx.toFixed(1) + '" y1="' + (barY - (slim ? 3 : 6)) +
         '" x2="' + mx.toFixed(1) + '" y2="' + (barY + barH + 3) + '"/>';
    if (!slim) {
      /* W-125. Only the flag stays in the drawing — a shape, pointing up from
         the bar toward the value chip that now prints in HTML above (see
         markerValRow). The chip rect and its text left the SVG: W-040's scaling
         delivered a 12 px label at 9 px, and in HTML the declared size is the
         delivered one. */
      s += '<path class="mkf" d="M ' + (mx - 4.5).toFixed(1) + ' ' + (barY - 6) + ' L ' +
           (mx + 4.5).toFixed(1) + ' ' + (barY - 6) + ' L ' + mx.toFixed(1) + ' ' +
           (barY - 1.5) + ' Z"/>';
    }
  }

  /* The screen-reader and greyscale-proof equivalent of the drawing: the same
     bands, in the same order, as words — mirrored the same way the bar is, so
     this stays true for a `down` ruler too. */
  const spokenZones = mirror ? ruler.zones.slice().reverse() : ruler.zones;
  const spoken = spokenZones.map(z => (z.label || 'unnamed') + ' ' +
                                 fmtTick(z.a) + ' to ' + fmtTick(z.b)).join(', ');
  return '<svg class="ruler' + (slim ? ' slim' : '') + '" viewBox="0 0 ' + RULER_W + ' ' + H +
         '" role="img" aria-label="' + esc(ruler.scaleLabel + ': ' + spoken) + '">' + s + '</svg>';
}

/* A label's estimated on-paper width, in the same RULER_W units xOf() returns
   x in — so it can be compared directly against a zone's own width without
   knowing the container's real pixel size (render.js touches no DOM). Scaled
   from the existing patient-marker estimate below (`label.length * 7.4 + 9` at
   a declared 12px), which this repo already trusts for the same kind of "will
   this text fit" question; rescaled to `.bands`'s declared 8.5px. The px→unit
   conversion uses 346/460 (W-040's own measured WORST-CASE render — the
   smallest real width this ruler has been measured at), the conservative
   choice: a wider real render only ever has MORE room than this predicts,
   never less, so this can over-trigger rotation but never under-trigger it. */
const BAND_CHARPX = 7.4 * (8.5 / 12), BAND_FIXEDPX = 9 * (8.5 / 12);
const BAND_PX_PER_UNIT = 346 / 460;
function estBandWidthUnits(label) {
  const px = (label ? label.length : 7) * BAND_CHARPX + BAND_FIXEDPX + 12; /* +12: swatch + gap */
  return px / BAND_PX_PER_UNIT;
}

/* How tall a rotated legend needs to be, in real px — measured, not guessed:
   "Advanced fibrosis" at this font (8.5px mono) renders 84.7 px wide and
   11.9 px tall (Edge headless, 2026-08-29), and 11.9 / (8.5 * 1.4) is within
   1% of that font's usual line-height ratio, which is what the 1.4 below
   comes from rather than a second measured constant. Rotated -45deg, a
   label's own bounding box contributes (width + height) * sin(45deg) of
   vertical space beneath its anchor; the tallest label on THIS ruler decides
   the row's height, so a short-labelled ladder that still needed rotation
   (two narrow neighbours with short names) does not pay for a tall one it
   does not have. */
const BAND_LINEHEIGHT = 1.4;
function rotatedLegendHeightPx(zones) {
  let maxTextPx = 0;
  for (const z of zones) {
    const textPx = (z.label ? z.label.length : 7) * BAND_CHARPX + BAND_FIXEDPX;
    if (textPx > maxTextPx) maxTextPx = textPx;
  }
  const fontHeightPx = 8.5 * BAND_LINEHEIGHT;
  return Math.ceil(13 + (maxTextPx + fontHeightPx) * Math.SQRT1_2 + 4);
}

/* The bands as words, left to right — for EVERY ruler since W-040, not only the
   tight ones. It is the same sequence in the same order as the bar, so a reader
   can map one onto the other without counting, and it is the only place the names
   are now set at a size the reader actually receives.

   W-120. Each label now sits at the same x its band occupies in the bar above —
   `axisXOf()` is the SAME function `rulerSvg()` draws the rects with, so a box
   here cannot drift from the segment it names. `left`/`width` are the one thing
   that has to be inline (they are per-patient data, not a fixed rule a
   stylesheet can state); the stylesheet still owns everything else (position,
   font, colour).

   TWO NEIGHBOURING NARROW BANDS can each need more width than they are drawn
   with — measured (2026-08-29): "normal" and "borderline" on the MRE guideline
   ladder interleaved into unreadable text when both were left centred on their
   own (30px- and 24px-wide) segments. When no pair on a ruler is estimated to
   collide, every label prints upright, centred on its own segment, and may
   still spill a little past its own edge (developer-accepted, § 2.4) — the
   common case (bands wide enough to hold their own name) stays the single
   tight row W-040 designed. When a pair WOULD collide, the whole ruler's
   legend rotates instead (see the `needsRotation` block below) — never a
   per-label fix, so one legend never mixes an upright word with a tilted
   one beside it. */
function bandLegend(ruler, axis) {
  const xOf = axisXOf(ruler, axis);
  /* W-094. Text, not a drawing — but it sits directly under a bar that
     mirrors for a `dir: 'down'` ruler, and this list is built from the same
     ascending-axis `ruler.zones` order the bar used to draw in. Reverse it
     the same way, or the words read the opposite of the picture above them.
     (Position no longer depends on this order — `left`/`width` place each
     box regardless — but DOM order still is the order a screen reader or a
     print reader reading the markup top-to-bottom encounters them in.) */
  const zones = ruler.dir === 'down' ? ruler.zones.slice().reverse() : ruler.zones;
  const placed = zones.map(z => {
    const xa = xOf(z.a), xb = xOf(z.b);
    const x1 = Math.min(xa, xb), x2 = Math.max(xa, xb);
    const center = (x1 + x2) / 2, halfEst = estBandWidthUnits(z.label) / 2;
    return {z: z, x1: x1, x2: x2, center: center, textL: center - halfEst, textR: center + halfEst};
  });
  /* ROTATE THE WHOLE ROW, OR NONE OF IT (W-120, third correction). Two
     earlier versions of this function tried to keep every label upright and
     move the ones that did not fit — first to a second row (a lone word
     floating in a gap), then with the swatch pinned and only the word
     dropping (still a lone word, just tethered to its dot by position
     alone). Both read as a mistake on a developer's screenshot. The
     convention this replaces them with is the one already standard for a
     dense categorical axis in a published figure — matplotlib's, R's, and
     every guideline chart with more category labels than horizontal room:
     rotate every tick label the same way, so a reader used to that idiom
     recognises it immediately, rather than mixing an upright label beside a
     tilted one on the same axis. Whether ANY pair on this ruler would
     collide upright decides the whole ruler's mode — never a per-label
     decision, so the rhythm along one legend is always one thing or the
     other. */
  const needsRotation = placed.some((p, i) =>
    i > 0 && p.textL < placed[i - 1].textR);
  const rotStyle = needsRotation
    ? ' style="height:' + rotatedLegendHeightPx(zones) + 'px"' : '';
  return '<p class="bands' + (needsRotation ? ' bands-rot' : '') + '"' + rotStyle + '>' +
    placed.map(p => {
      const left = (p.x1 / RULER_W * 100).toFixed(2), width = ((p.x2 - p.x1) / RULER_W * 100).toFixed(2);
      return '<span class="bd' + (p.z.sev ? ' bd-' + p.z.sev : '') +
             (p.z.ramp != null ? ' bd-ramp-' + p.z.ramp : '') +
             '" style="left:' + left + '%;width:' + width + '%">' +
             '<span class="bd-t">' + esc(p.z.label || 'unnamed') + '</span></span>';
    }).join('') + '</p>';
}

/* The verdict chip — V1's, in V1's markup. A band with no severity to port gets
   the neutral class, never a colour chosen here. The band NAME is always
   printed, so the chip survives a greyscale print with its meaning intact. */
function verdictChip(verdict, interpretable) {
  /* W-015. The withheld assertion, and only the assertion: the ruler, the
     boundaries and the patient's marked value are drawn exactly as they would
     be. The GREY register (--uncertain), never the severity ramp -- this is an
     absence of a reading, not a degree of one, and N17 locks the two apart. */
  if (interpretable === false) {
    return '<div class="verdict v-nointerp">measured, not interpretable' +
           '<span class="vsub">a reliability rule fired — see the ' +
           'methodology sheet</span></div>';
  }
  if (!verdict || !verdict.band) {
    return '<div class="verdict v-na">—<span class="vsub">not staged</span></div>';
  }
  /* W-044. Three states, not two. A ported band carries V1's own word; a band
     shaded from a ladder that names its own rungs has no such word and gets none
     invented, so the sub-line says where the band NAME came from instead; and a
     band with no severity at all still says that plainly. Printing "no severity
     grading published" beneath a shaded band — which is what the two-state
     version did the moment the ladder supplied colour — states the opposite of
     what the drawing shows. */
  const sub = verdict.tag ||
              (verdict.sev ? 'band named by the published ladder'
                           : 'no severity grading published');
  return '<div class="verdict v-' + esc(verdict.sev || 'none') + '">' + esc(verdict.band) +
         '<span class="vsub">' + esc(sub) + '</span></div>';
}

/* W-125. THE PATIENT'S MEASURED VALUE AS A POSITIONED HTML ROW, above the
   boundary-value row. It sat in the SVG until now because its meaning is its
   horizontal position — but tickValRow() proved that position carries fine in
   HTML through an inline `left`%, and in HTML the declared size is the delivered
   size (W-040's scaling had a 12 px label arriving at 9 px). x is xOf(value),
   the SAME axisXOf() the marker LINE, the tick values and the band legend are
   placed with, so the chip cannot drift from its own marker. On its own row it
   can never overlap a boundary number, wherever the value sits. Emitted only for
   a ruler that carries a value, and never for the slim matched strip (no
   marker). Returns '' otherwise. */
function markerValRow(ruler, axis) {
  if (ruler.role === 'matched') return '';
  const v = ruler.value;
  if (v === null || v === undefined || isNaN(v)) return '';
  const left = (axisXOf(ruler, axis)(Number(v)) / RULER_W * 100).toFixed(2);
  return '<p class="mkval"><span class="mv" style="left:' + left + '%">' +
         esc(fmtVal(Number(v))) + '</span></p>';
}

/* W-124. THE INTERIOR BOUNDARY VALUES AS A POSITIONED ROW, ABOVE the bar, on
   EVERY ruler (developer decision 2026-08-29 — the slim matched strip gets the
   same treatment, not the old flowed line). Each number sits at its own tick's
   x, from the SAME axisXOf() rulerSvg() draws the tick lines with and
   bandLegend() places its boxes with — one function, so a value cannot drift
   from the tick it labels (the W-120 lesson). NUMBER ONLY, through fmtTick();
   the unit prints once in the head. NO severity colour (W-085): this row says
   where a boundary is, not how bad it is. `left` is inline because it is
   per-patient geometry, not a fixed rule; the stylesheet owns everything else. */
function tickValRow(ruler, axis) {
  const xOf = axisXOf(ruler, axis);
  /* Same trap as bandLegend(): reverse a `dir: 'down'` ruler's ascending-axis
     edge list so DOM / screen-reader / print order matches the mirrored bar.
     Position already mirrors through xOf, independent of this. */
  const edges = ruler.dir === 'down' ? ruler.edges.slice().reverse() : ruler.edges;
  return '<p class="tickvals">' + edges.map(e => {
    const left = (xOf(e.value) / RULER_W * 100).toFixed(2);
    return '<span class="tv" style="left:' + left + '%">' +
           esc(String(fmtTick(e.value))) + '</span>';
  }).join('') + '</p>';
}

/* W-124. A boundary NAME is kept on paper only where it is not provably
   redundant. Mechanical, no editorial call: split `edge.boundary` on "|" into a
   SET and compare it to the SET of the two band names it sits between. Equal →
   the name is a pipe-composite of its neighbours (pdff `S0|S1`, r2star
   `normal|borderline`, t2star, lic), both already printed by bandLegend() →
   drop it. No pipe, or a set that differs (mre `F>=1`, adc `F>=2`) → it carries
   what the legend does not → keep it. SETS not strings: on a `dir: 'down'`
   ladder the pipe order is ladder order, not axis order. */
function boundaryRedundant(edge, zones) {
  const parts = String(edge.boundary).split('|').map(s => s.trim());
  if (parts.length < 2) return false;
  const flank = zones.filter(z => z.a === edge.value || z.b === edge.value)
                     .map(z => String(z.label));
  if (flank.length !== parts.length) return false;
  const a = parts.slice().sort(), b = flank.slice().sort();
  return a.every((x, i) => x === b[i]);
}

/* W-124. The muted line UNDER the band legend. It carries the two things the
   positioned value row above cannot: the pooled spread of a two-source boundary
   (a tick is one number, "3.17 (3.14–3.2)" is three), and the kept
   non-redundant boundary name. A boundary appears here when it has a spread
   (always) OR when its name is not a pipe-composite of the two flanking bands.
   Then the short citation and the missing-rung note, which used to ride at the
   end of the removed flowed line. Returns '' when it would be empty. */
function tickNamesLine(ruler, shortCite, rung) {
  const edges = ruler.dir === 'down' ? ruler.edges.slice().reverse() : ruler.edges;
  const parts = [];
  for (const e of edges) {
    const spread = (e.n > 1 && e.min !== null && e.max !== null)
      ? ' ' + esc(e.min + '–' + e.max) : '';
    if (!spread && boundaryRedundant(e, ruler.zones)) continue;
    parts.push(esc(e.boundary) + spread);
  }
  const cite = shortCite ? '<span class="cite">' + esc(shortCite) + '</span>' : '';
  if (!parts.length && !cite && !rung) return '';
  const names = parts.length ? 'thresholds: ' + parts.join(' · ') : '';
  return '<p class="ticknames">' + [names, cite].filter(Boolean).join(' ') + rung + '</p>';
}

/* One drawable ladder: its name, its ruler, its boundary values and — where the
   presentation could not be fully sourced — the sentence saying so. */
/* ONE FRAME FOR EVERY BAR ON A CARD. The patient marker has to sit at the same x
   on each bar, or a disagreement between two published ladders would read as a
   difference in the drawing rather than in the evidence. The shared axis is the
   UNION of the bars own axes — never a subset, because a narrowed frame would
   clip a published boundary off the page. */
function sharedAxis(rulers) {
  let lo = rulers[0].axis[0], hi = rulers[0].axis[1];
  for (const r of rulers) {
    if (r.axis[0] < lo) lo = r.axis[0];
    if (r.axis[1] > hi) hi = r.axis[1];
  }
  return [lo, hi];
}

/* W-133. A small, familiar signal — GRADE A/B/C, the vocabulary this report's
   own methodology table already prints per source (render.js's REFERENCES
   table) — reusing the `.dbadge` component wholesale (styles.css, currently
   the derived-LIC badge) rather than inventing new iconography (CLAUDE.md § 6:
   no new icon asset, no build step). The value is the SET UNION of every
   boundary's OWN `evidenceGrades` on this ladder (zones.js, W-133 — an
   already-computed field, nothing new is derived): a uniform ladder reads
   "Evidence A", a ladder whose boundaries mix grades reads "Evidence A/B" —
   a mechanical set operation, never an editorial judgement about which grade
   the ladder "really" is. Absent where no boundary carries a grade at all. */
function evidenceGradeBadge(ruler) {
  const grades = new Set();
  for (const e of (ruler.edges || [])) {
    for (const g of (e.evidenceGrades || [])) grades.add(g);
  }
  if (!grades.size) return '';
  return ' <span class="dbadge">Evidence ' + esc([...grades].sort().join('/')) + '</span>';
}

function rulerBlock(ruler, axis) {
  const drawnSvg = rulerSvg(ruler, axis, ruler.role === 'matched');
  /* THE CARD CARRIES FACTS; THE REASONS MOVED. What used to print here as four
     paragraphs — the full citation, the other eligible publications, the band
     note, the rung this publication does not cover — is why the report ran to
     seven pages. Each is now a native tooltip on the bar it belongs to, and each
     prints in full on the methodology sheet. A tooltip needs no script, works
     under file://, and adds nothing to the paper (DESIGN-DIRECTION § 5.4). */
  const why = [];
  if (ruler.matchLabel) why.push(ruler.matchLabel);
  if (ruler.scanner) why.push('Published on ' + ruler.scanner);
  if (ruler.matchedRefs && ruler.matchedRefs.length > 1) {
    why.push('Also eligible: ' + ruler.matchedRefs.slice(1).join(' · '));
  }
  if (ruler.missingRungs && ruler.missingRungs.length) {
    why.push('Does not cover ' + ruler.missingRungs.join(', ') +
             '; that rung is absent from the strip rather than drawn blank.');
  }
  if (ruler.note) why.push(ruler.note);

  /* The SHORT form stays visible: a reader must be able to see WHICH publication
     the strip is, without a hover and without the methodology sheet in hand.
     W-133 FIX: `ruler.matchLabel` is "<refId> — <citation>" (report.js), built
     for the LONG tooltip form above. This used to take `.split('—')[0]` — the
     bare id, BEFORE the em-dash — and print that as if it were the short cite,
     discarding the author/year the reader actually needs. The id is still the
     first half; what changed is that it is now looked up through the SAME
     `shortCite(refId)` this file already uses correctly on the "not
     interpretable" line (below), instead of a second, wrong, inline format. */
  const matchRefId = ruler.matchLabel ? ruler.matchLabel.split('—')[0].trim() : null;
  const shortCiteText = matchRefId
    ? shortCite(matchRefId) + (ruler.scanner ? ' · ' + ruler.scanner.split(',')[0] : '')
    : null;
  const rung = (ruler.missingRungs && ruler.missingRungs.length)
    ? '<span class="norung">no ' + esc(ruler.missingRungs.join(', ')) + '</span>' : '';

  /* W-133. A "matched" second bar is drawn for two different reasons, and both
     used to print the identical "named for this indication" sentence: (a) the
     guideline ladder and the pooled primary-studies ladder for this SAME
     parameter simply differ (no single publication is named, matchLabel is
     null) — an evidence-conflict signal (SCHEMA § 10.5); vs (b) one
     publication's own ladder was matched to this specific indication
     (matchLabel is set). The reader could not tell which was true; now the
     header says so. */
  const roleText = ruler.role === 'orientation'
    ? 'shown for orientation — not used to stage'
    : (ruler.role === 'consensus' ? 'stages this value'
      : (ruler.matchLabel ? 'a publication specific to this indication'
                          : 'guideline and published studies disagree here'));

  return '<div class="rul rul-' + esc(ruler.role) + '" data-role="' + esc(ruler.role) + '"' +
    (why.length ? ' title="' + esc(why.join('\n')) + '"' : '') + '>' +
    '<div class="rul-head"><span class="rul-scale">' + esc(ruler.scaleLabel) +
      (ruler.unit ? ' · ' + esc(ruler.unit) : '') + evidenceGradeBadge(ruler) + '</span>' +
    '<span class="rul-role">' + esc(roleText) + '</span></div>' +
    /* W-125 / W-124. Above the bar, top to bottom: the patient's value chip on
       its own row (consensus rulers with a value only), then the tick-aligned
       boundary values flush to the bar (every ruler). Below the bar: the band
       legend, then the muted line carrying any pooled spread, kept non-redundant
       name, citation and missing-rung note. */
    markerValRow(ruler, axis) +
    tickValRow(ruler, axis) +
    drawnSvg +
    /* Unconditional. The names left the drawing at W-040, so this is not a
       fallback for a narrow bar any more — it is where the bands are named. */
    bandLegend(ruler, axis) +
    tickNamesLine(ruler, shortCiteText, rung) +
    '</div>';
}

function rulersHtml(card) {
  if (!card.rulers || !card.rulers.length) return '';
  const axis = sharedAxis(card.rulers);
  /* Order is fixed by ROLE, not by match. The consensus ladder is drawn top and
     full size; the matched publication is the slim strip beneath it. The top bar
     is therefore always the one the verdict came from (W-030 § 3.2). */
  const ordered = card.rulers.filter(r => r.role === 'consensus')
                    .concat(card.rulers.filter(r => r.role !== 'consensus'));
  const blocks = ordered.map(r => rulerBlock(r, axis));
  /* W-147: the disagreement note sits at the junction between the two bars —
     after the first (consensus), before the rest (matched) — the point the
     eye crosses while comparing them, rather than below both in `.pfacts`.
     Round 2: plain text, not a box (developer feedback — round 1's bordered,
     bold-lead box read as an alarm); the sentence prints as-is, unsplit. */
  const note = card.disagreement
    ? '<p class="disagree">' + esc(card.disagreement) + '</p>' : '';
  const parts = note && blocks.length > 1
    ? [blocks[0], note].concat(blocks.slice(1))
    : blocks.concat(note ? [note] : []);
  return '<div class="rulers">' + parts.join('') + '</div>';
}

/* W-051. ONE gap sentence per card, and it is `card.gap`. Nothing else on the
   card restates it.

   This block used to print a second version of the same fact: for a gated row
   the engine's own throw message, technique-group ids and a schema clause number
   included; for an ungapped row the raw reason list joined with a middle dot. A
   reader met the fact twice, in two vocabularies, and had to reconcile them.

   ⛔ NO REASON PARAGRAPH IS WRITTEN HERE AT ALL, and the second attempt is why
      the rule is stated rather than implied. W-051 first printed ONE ranked
      reader sentence for the case `card.gap` does not cover — a row that staged
      against one policy while the other ladder could not be closed. MEASURED, on
      the non-specific scanner path with every sequence named: it fired on five
      cards and ran the CLINICAL sheet from two A4 pages to three, against a
      budget § 5.4 says that half meets in every case.

      It was also a reason on a card, which W-033 had already settled the other
      way and locked: the FACT that only one ladder was drawn stays sayable and
      is printed by `class="onebar"` beside the bars; the paragraph explaining
      WHY is a reason, and lives in that block's tooltip and on the methodology
      sheet — where `gapReasonTable` now puts it in full. Two tasks reaching
      opposite conclusions about one paragraph is what a tested decision is for.

   `scopegap` is a different fact — this parameter is out of scope for the tier
   being printed, which is not a gap in the evidence — and is untouched. */
function rowGapHtml(row) {
  return row.scope.absent
    ? '<p class="scopegap">' + esc(row.scope.note) + '</p>'
    : '';
}


/* ═══════════════════════════════════════════════════════ THE PARAMETER CARD
   A three-column frame over ONE card. There is no view flag and no second
   builder: with the bars back on the card the two views the superseded design
   drew differ by nothing worth a flag, and a shared builder branching on a view
   is the shape that drifts (W-030 § 14).

   Left   identity and entry — the label, the acquisition line, the value, the
          method control on the rows that carry one
   Middle two bars on one axis — the consensus ladder full size, the matched
          publication as a slim strip beneath it
   Right  the verdict chip, naming the ladder it came from

   ⛔ FOUR FACTS NEVER LEAVE THIS CARD (decision § 2.3): card.gap, row.gate,
      row.scope.note and card.disagreement. Their REASONS belong to the
      methodology sheet; the facts do not. */
/* The short form of a reference, for the one place a citation now appears on the
   clinical page: the withheld-reading line. Built from the record's OWN fields --
   the citation string up to its first comma, and the year -- never a label typed
   here, and always beside the `REF-` id the methodology table is keyed by, so a
   reader who wants the full record can find the row. */
function shortCite(refId) {
  const r = _RN.REFERENCES.filter(x => x.id === refId)[0];
  if (!r) return refId;
  const lead = String(r.citation || '').split(',')[0].trim();
  return (lead ? lead + ' ' + r.year + ' · ' : '') + r.id;
}

/* Why a reading was withheld, IN THE PARAMETER'S OWN FIELD (developer decision,
   2026-08-24). The sentence is the workbook's, quoted through the interaction
   record; this layer writes only the label in front of it. */
function notInterpretableHtml(card) {
  if (card.interpretable !== false) return '';
  const reasons = card.notInterpretableReasons || [];
  if (!reasons.length) {
    return '<p class="nointerp"><b>Not interpretable.</b> ' +
           esc(card.notInterpretableReason || '') + '</p>';
  }
  return reasons.map(x =>
    '<p class="nointerp"><b>Not interpretable' +
    (x.inheritedFrom
      ? ' — inherited from ' + esc(_RN.PARAMETER_LABELS[x.inheritedFrom] ||
                                        x.inheritedFrom)
      : '') + '.</b> ' +
    esc(x.statement || card.notInterpretableReason || '') +
    (x.refIds && x.refIds.length
      ? '<span class="src">' + esc(x.refIds.map(shortCite).join('; ')) + '</span>'
      : '') +
    '</p>').join('');
}

/* W-038. A caveat is NOT a withheld reading, and the label is what keeps the two
   apart: the band is staged, the chip prints, the ruler prints, and this block
   adds the limit the PUBLICATION puts on its own threshold. It shares
   notInterpretableHtml's grey register on purpose — both are the report speaking
   about the strength of what it just said, and a second visual register would
   contest a measured palette (W-009) for a distinction the label already makes.
   The sentence is quoted, never summarised at this layer, and it is printed
   inside quotation marks so a reader can see that it is a quotation. */
function sourceCaveatHtml(card) {
  const caveats = card.useCaveats || [];
  if (!caveats.length) return '';
  return caveats.map(c =>
    '<p class="nointerp caveat"><b>The source\'s own limit on this threshold.</b> ' +
    '“' + esc(c.statement) + '”' +
    (c.refIds && c.refIds.length
      ? '<span class="src">' + esc(c.refIds.map(shortCite).join('; ')) + '</span>'
      : '') +
    '</p>').join('');
}

/* THE VALUE AREA HAS TWO STATES, AND THE DIFFERENCE IS THE POINT (W-033).

   A LIC this report COMPUTED prints as a read-only readout. It used to print
   inside the same number input as a typed one, which had two costs: the reader
   could not tell a computed number from an entered one, and the first accidental
   keystroke turned the computed value into a typed one — freezing it, so it no
   longer followed R2*, the field strength or the scanner path.

   The override box stays, empty, beside the readout. The engine derives only
   where no LIC was given (report.js buildRow), so removing the box would remove
   the only way a site whose scanner MEASURES LIC — spin-echo R2 / FerriScan, for
   which no R2*->LIC calibration is published — could report one at all. What the
   readout removes is the accident, never the deliberate override.

   `valueProvenance` is read, not recomputed: this function makes no judgement
   about where a number came from. */
/* W-061. `canDerive` is true for a row that CAN be reached through a calibration,
   whether or not this report derived the value — `row.calibration !== null`, the
   same key W-033 chose, and deliberately not `card.derived`. A slot that appeared
   the moment somebody typed an override would make the override look like a
   different reading. The class reserves height on screen and is removed in print. */
function valueAreaHtml(row, card, canDerive, fillNeeded) {
  const unit = '<span class="unit">' + esc(_RN.PARAMETER_UNITS[row.parameter]) +
               '</span>';
  /* W-134. Screen-only, Live-Report-only affordance: an unentered value field
     whose measurement group is switched on carries data-fill="needed" so the
     reader can see what is still expected. Inert without the
     body[data-mode="live"] CSS, so it is safe to emit unconditionally. Never on
     the derived branch — a derived card already shows a number.
     W-149 collapsed W-134's two-tone emphasis: there is one wash now, so no
     data-fill-emph and no indication-dependent strength — every needed field,
     here and across the entry form, reads the same. */
  const fillAttr = fillNeeded ? ' data-fill="needed"' : '';
  /* W-122: the arrow-key step matches this parameter's cut-off precision, so
     the up/down arrows land on every published threshold rather than stepping
     by 1. Falls back to "any" for a parameter with no PARAMETER_STEPS entry. */
  const step = (_RN.PARAMETER_STEPS && _RN.PARAMETER_STEPS[row.parameter]) || 'any';
  if (card.valueProvenance === 'derived') {
    return '<div class="pval derived' + (canDerive ? ' can-derive' : '') + '">' +
             '<span class="pderived">' + esc(String(row.value)) + '</span>' + unit +
             '<span class="dbadge">derived</span>' +
             '<label class="povr"><input type="number" inputmode="decimal" step="' + step + '" data-value="' +
               esc(row.parameter) + '" value="">' +
               '<span class="ohint">override</span></label>' +
           '</div>';
  }
  return '<label class="pval' + (canDerive ? ' can-derive' : '') +
    '"><input type="number" inputmode="decimal" step="' + step + '" data-value="' +
    esc(row.parameter) + '"' + fillAttr + ' value="' +
    (row.value === null || row.value === undefined ? '' : esc(String(row.value))) +
    '">' + unit +
    (card.valueProvenance === 'measured'
      ? '<span class="dbadge measured">measured</span>' : '') +
    '</label>';
}

/* The calibration that produced the number, beside the number. A SUMMARY of the
   methodology sheet's entry, never a second copy of it: the PMIDs, the
   alternative calibrations and the flags stay on page 2, where a reader who
   wants the evidence goes. Every part comes from the card model; no coefficient
   is written here, so this renderer cannot restate a clinical value. */
function calibrationLineHtml(card, canDerive) {
  const d = card.derivation;
  /* W-061. A row that can be reached through a calibration keeps the slot while
     nothing has been derived, so the card does not grow the moment its inputs
     arrive. MEASURED: the LIC card went 159.6 -> 194.5 px at that moment.
     The slot is blank, carries no text, and print removes it -- on paper a card
     with nothing to say must not carry an empty line. */
  if (!d) {
    return canDerive
      ? '<p class="calline calline-reserved" aria-hidden="true"></p>' : '';
  }
  return '<p class="calline">' + esc(d.expression) +
    ' \u00b7 ' + esc(d.from) + ' = ' + esc(String(d.input)) + ' ' + esc(d.inputUnit) +
    ' \u2192 ' + esc(String(d.value)) + ' ' + esc(d.outputUnit) +
    ' \u00b7 ' + esc(d.calibrationName) + '</p>';
}

/* W-063 addendum (Task 9). The read-only bmi echo spec § 6/§ 7.3 required and
   Task 5 never wrote: `bmi` feeds two cards through two different triggers
   (TRG-0001 -> mre, TRG-0014 -> pdff at 3.0T only, triggers.data.js:54-59,
   145-150) and each qualifying card restates the number it fed, never a
   second way to edit it — the same read-only idiom the calibration line uses
   (render.js:797-811). `buildContext` is called fresh here, the way
   `contextBlock` already calls it at line 465, rather than threaded through
   `model` — `selection` is already this function's own argument and the call
   is pure and cheap; a second, model-shaped context object would be a second
   copy of a value this file already knows how to ask for.
   W-146: the wording says "patient header" now, not "Clinical context" —
   bmi lives in patientMeta, not in the (now-deleted) contextBlock(). */
function bmiEchoHtml(row, selection) {
  const showsBmi = row.parameter === 'mre' ||
    (row.parameter === 'pdff' && selection.fieldStrength === '3.0T');
  if (!showsBmi) return '';
  const context = _RN.buildContext(selection);
  if (context.bmi === null || context.bmi === undefined) return '';
  return '<p class="bmi-echo">Body-mass index — ' + esc(String(context.bmi)) +
    ' kg/m² (' + (context.bmiDerived ? 'computed, patient header' : 'patient header') +
    ')</p>';
}

function parameterCard(row, card, selection) {
  /* W-090. Was `row.domain` — the SAME value ('iron') for lic/r2star/t2star,
     which is why they used to draw an IDENTICAL control on all three cards.
     `row.controlKey` is that value for every other parameter and the
     parameter's OWN name for the iron trio (report.js TECHNIQUE_CONTROL_KEY),
     so each card now gates and keys its OWN control. */
  const controlled = _RN.CONTROLLED_UNITS.indexOf(row.controlKey) !== -1;
  const preset = _RN.defaultTechniques(selection.path);
  const showControl = controlled && !preset[row.controlKey];

  /* W-071. Two facts the card already prints, stated once more as data so that
     a consumer never has to read the printed sentence back. The band is the
     ladder's own published name and the refusal is the engine's own code -- both
     decided in report.js, neither derived here. Spec § 3.4. */
  const vd = card.verdict;
  const attrs = vd
    ? ' data-band="' + esc(vd.band) + '" data-sev="' + esc(vd.sev) + '"'
    : (card.gapCode ? ' data-reason="' + esc(card.gapCode) + '"' : '');

  /* W-134. The unentered-field affordance: this row needs a value when its
     purpose group is switched on and it holds no number (the same condition the
     screen-only pval-warn below already uses).
     W-149 removed the indication-dependent emphasis — one wash for every needed
     field. `PRIMARY_GROUP_BY_INDICATION` still exists, but only
     `performedAlsoOpen` reads it now. */
  const fillGroup = _RN.purposeGroupOf(row.parameter);
  const fillNeeded = !!(selection.performed && fillGroup !== null &&
    selection.performed[fillGroup] === true &&
    (row.value === null || row.value === undefined));

  return '<section class="pcard" data-param="' + esc(row.parameter) + '"' + attrs + '>' +
    '<div class="pident">' +
      /* W-080: the per-card tier tag (`third-party` / `research`) is gone. The
         `quantification` provenance is unchanged in the data; it is surfaced now
         only by the "Additional measurements" heading + its shared note and by
         the methodology sheet's provenance census (SCHEMA / LITERATURE record
         the cost). */
      '<h4>' + esc(_RN.PARAMETER_LABELS[row.parameter]) + '</h4>' +
      /* Read from report.js:acquisitionLine, NOT rebuilt here. That function
         names a product only where the resolved scope row's vendor is GE and a
         product is recorded — the one place in this repository where a product
         carries a factProvenance. No sequenceNames map (W-007 § 1.1). */
      /* W-061: the sentence the derived state appends runs to two further lines,
         MEASURED at 39.9 -> 66.5 px, so a derivable row reserves them. */
      '<p class="acq' + (row.calibration !== null ? ' can-derive' : '') + '">' +
        esc(card.acquisitionLine) +
        (card.derived ? ' \u00b7 value computed through a published calibration' : '') +
      '</p>' +
      valueAreaHtml(row, card, row.calibration !== null, fillNeeded) +
      /* W-063. Screen only: the printed page either carries a value or
         carries card.noData's own sentence below — a live authoring hint
         has no reason to survive onto paper. W-063b: `performed` is
         group-keyed now, so this reads the row's purpose group
         (purposeGroupOf), mirroring report.js isGroupToggledOn — a
         per-parameter lookup here is always undefined and the warning
         would never show. */
      ((selection.performed && _RN.purposeGroupOf(row.parameter) !== null &&
        selection.performed[_RN.purposeGroupOf(row.parameter)] === true &&
        (row.value === null || row.value === undefined))
        ? '<p class="pval-warn screen-only">Turned on, no value entered yet.</p>' : '') +
      calibrationLineHtml(card, row.calibration !== null) +
      etiologyCohortHtml(row, selection) +
      ascitesCellHtml(row, selection) +
      (showControl ? methodControl(selection, row.controlKey) : '') +
      productControl(selection, row.parameter, row.technique) +
    '</div>' +
    '<div class="pbars"' +
      (card.singleLadderReason ? ' title="' + esc(card.singleLadderReason) + '"' : '') + '>' +
      rulersHtml(card) +
      /* One bar is a fact, so it stays sayable; the paragraph explaining WHY is a
         reason and is now the tooltip plus the methodology sheet. */
      (card.singleLadderReason ? '<p class="onebar">one published ladder</p>' : '') +
    '</div>' +
    '<div class="pverdict">' + verdictChip(card.verdict, card.interpretable) +
      (card.verdictScale
        ? '<span class="vfrom">from the ' + esc(card.verdictScale) + '</span>' : '') +
    '</div>' +
    '<div class="pfacts">' +
      notInterpretableHtml(card) +
      sourceCaveatHtml(card) +
      (card.gap ? '<p class="gap">' + esc(card.gap) + '</p>' : '') +
      (card.noData ? '<p class="gap">No data available for this measurement.</p>' : '') +
      /* W-158 — the partial-ladder scope line: WHY the top of the pediatric iron
         bar is grey. Reuses `.scopegap` (W-157's slot for a cohort scope
         statement — same register, and it belongs on paper). Non-null only on a
         partial row, so it never renders beside `card.gap`. */
      (card.boundaryGap ? '<p class="scopegap">' + esc(card.boundaryGap) + '</p>' : '') +
      rowGapHtml(row) +
      bmiEchoHtml(row, selection) +
    '</div>' +
    '</section>';
}

/* ══════════════════════════════════════════════════════════════ THE SECTIONS */

function rowsForSection(model, section) {
  const out = [];
  for (let i = 0; i < model.report.rows.length; i++) {
    const row = model.report.rows[i];
    if (!row.rendered) continue;
    if (row.mountPoint !== section.mount) continue;
    out.push({row: row, card: model.cards[i]});
  }
  return out;
}

/* A SECTION IS AN ORDERED LIST OF CARDS, GROUPED UNDER DOMAIN HEADINGS.

   It printed a flat list between W-030 and W-035, and the reason is worth
   keeping because W-035 reverses it deliberately rather than by drift. W-030's
   argument was that the order is a statement about severity and about the
   indication (report.js:orderCards), and that grouping by domain reorders it --
   an abnormal iron reading sinks to wherever the iron domain happens to sit.
   That is exactly what now happens, and the developer took the decision on
   2026-08-24 with the cost written on the board card: a measurement is easier to
   read beside the ones it shares a method control with, and LIC standing alone
   in the middle of the sheet was the case that made it concrete.

   What the reversal is NOT allowed to cost is the finding being seen. Two things
   carry that instead of position: the model's own ranking is untouched
   (logic.test.js section O still holds over `orderCards`), and the impression
   block names the parameter, its value and its band in a sentence, wherever the
   card sits. render.test.js N6 and N23 assert both, and R6 in logic.test.js
   prints the sunk abnormal reading on purpose so the cost cannot be lost.

   Only the clinical section is grouped. The two tier sections stay flat: they
   already carry their own title and note, and a second heading level inside a
   short list costs page budget for a grouping the reader can see at a glance.

   Numbering was also carrying a claim it could not support: 01/02/03 reads as a
   sequence, and this list is a ranking, not a sequence.

   The tier wrapper stays, because it says something the cards cannot: which
   product measured them. A section that collects no row is not written at all
   (SCHEMA § 10.3, in its printed form), and neither is a heading whose group is
   empty. */
/* The heading a group of cards is printed under (W-035). The TEXT is
   DOMAIN_TITLES', the report's own vocabulary -- a heading typed here would be a
   second vocabulary nobody maintains, and the board card's own instruction was
   that no new heading is written for this task. */
function domainHeadHtml(domain) {
  return '<h3 class="domainhead">' + esc(DOMAIN_TITLES[domain] || domain) + '</h3>';
}

/* W-091. The domain group as its own boxed container, so "these cards are one
   group" is a shape the reader sees rather than a small label they might miss.
   No card is added, dropped or reordered here — this wraps exactly what
   groupCardsByDomain already returned. */
function domainGroupHtml(g, build) {
  return '<div class="domaingroup">' + domainHeadHtml(g.domain) +
    g.pairs.map(build).join('') + '</div>';
}

/* W-080. The `clinical` section prints the Tier-1 domain groups only. The
   TIER2_GROUPS domains (native T1, cT1, ADC) no longer take a sub-heading here --
   they move, with their domain grouping intact, into the merged `additional`
   section (additionalSectionHtml). A domain with no card in this section prints
   no heading, as before (domainGroupHtml's own rule). */
function groupedCardsHtml(pairs, build) {
  return _RN.groupCardsByDomain(pairs)
    .filter(g => _RN.TIER2_GROUPS.indexOf(g.domain) === -1)
    .map(g => domainGroupHtml(g, build)).join('');
}

function sectionHtml(section, pairs, counter, build) {
  if (!pairs.length) return '';
  return '<section class="psection" id="section-' + esc(section.id) + '">' +
    (section.title ? '<h2>' + esc(section.title) + '</h2>' : '') +
    (section.grouped
      ? groupedCardsHtml(pairs, build)
      : pairs.map(build).join('')) +
    '</section>';
}

/* W-081. The `research` SECTION is dormant today — nothing mounts to
   page2-research. IVIM fills it, from model.ivim rather than a report row
   (buildIvim is a standalone builder, spec § 1). Screen: all three inputs
   always render at `research` scope so a first value can be typed. Print: an
   `.ivim-empty` block is dropped by the stylesheet, and the whole section with
   it when every block is empty (the W-104 lc-empty pattern). No ruler, no
   verdict chip — IVIM stages nothing (spec § 3). */
const IVIM_NO_BAND =
  'No field-strength-matched reference interval (study field strength is not ' +
  '1.5 T or 3.0 T). Reported without a reference comparison.';

/* W-130. IVIM's chip reuses verdictChip's OWN markup, not a new register: D
   never carries a membership word (R-30) and gets the identical "not staged"
   v-na chip an ordinary card shows for an absent verdict; D-star/f's within/outside
   fact reuses the v-none "no severity grading published" register already
   printed for r2star/t2star/cT1 — a fact this repository can source, with no
   severity attached. `state` is 'within' | 'outside' | null. */
function ivimChipHtml(state) {
  if (state === 'within' || state === 'outside') {
    return '<div class="verdict v-none">' + esc(state) +
      '<span class="vsub">no severity grading published</span></div>';
  }
  return verdictChip(null, true);
}

/* W-130. Each IVIM parameter as a `.pcard` — the SAME 3-column grid, name and
   mono value styling every staged parameter card already uses (spec:
   https://claude.ai/code/artifact/71c8eccf-b1f2-4c68-9f3e-bdb43324b7a2), so the
   research section stops reading as an appendix in a different visual
   language. No ruler is drawn (IVIM stages nothing) — the middle column carries
   the reference/interval sentence and the record's own quoted caveat, set apart
   from the reference sentence rather than run into one clause. */
function ivimBlockHtml(param, block) {
  const has = !!block;
  const val = has ? esc(String(block.value)) : '';
  const trend = (has && param === 'ivim-f')
    ? '<p class="icn-trend">' + esc(_RN.IVIM_TREND_NOTE) + '</p>' : '';
  let mid, chip;
  if (!has) {
    mid = ''; chip = ivimChipHtml(null);
  } else if (param === 'ivim-d') {
    mid = block.reference
      ? '<p class="icn-ref">Reference population ' + esc(block.reference) +
        ' (grade ' + esc(block.grade) + ')</p>' +
        '<p class="icn-caveat">“' + esc(block.caveat) + '”</p>'
      : '<p class="icn-ref ivim-gap">' + esc(IVIM_NO_BAND) + '</p>';
    chip = ivimChipHtml(null); /* D never carries membership, ever — R-30 */
  } else {
    mid = block.interval
      ? '<p class="icn-ref">Reference interval ' + esc(String(block.interval[0])) +
        '–' + esc(String(block.interval[1])) + ' (grade ' + esc(block.grade) + ')</p>' +
        '<p class="icn-caveat">“' + esc(block.caveat) + '”</p>' + trend
      : '<p class="icn-ref ivim-gap">' + esc(IVIM_NO_BAND) + '</p>' + trend;
    chip = ivimChipHtml(block.interval ? block.membership : null);
  }
  /* A `<div>`, not `<section>` (unlike a real parameterCard): the research
     block sits inside `#section-research`, itself already a `<section>`, and
     three real nested `<section>` landmarks with no document outline reader
     buys nothing here — a `<div class="pcard ...">` picks up every `.pcard`
     CSS rule identically (class-based, tag-agnostic) without it. */
  return '<div class="pcard ivim-card' + (has ? '' : ' ivim-empty') +
    '" data-param="' + esc(param) + '">' +
    '<div class="pident"><h4>' + esc(_RN.IVIM_LABELS[param]) + '</h4>' +
    '<label class="pval"><input type="number" inputmode="decimal" step="any" ' +
      'data-value="' + esc(param) + '" value="' + val + '">' +
      '<span class="unit">' + esc(_RN.IVIM_UNITS[param]) + '</span></label></div>' +
    '<div class="icn-mid">' + mid + '</div>' +
    '<div class="pverdict">' + chip + '</div>' +
    '</div>';
}

/* W-080. The merged "Additional measurements" section: one heading, one
   screen-only shared note, then the staged additional readings (native T1, ADC,
   cT1) under their own domain headings, then IVIM. IVIM keeps exactly what it
   had -- no ruler, no verdict chip, no severity (it stages nothing, CLAUDE.md
   § 1.3); that structural absence, next to cards that DO carry a ladder, is now
   the only in-card signal that a reading is not staged. Print-drop: when the
   section has no staged card and IVIM carries no value, `ivim-section-empty`
   lets the stylesheet drop the bare heading (the W-104 pattern); the on-screen
   IVIM inputs still render as the entry affordance. `ivim.rendered` carries the
   scope decision from the model (report.js buildIvim); the renderer takes no
   scope branch of its own (K6). */
function additionalSectionHtml(pairs, build, ivim) {
  const ivimOn = !!(ivim && ivim.rendered);
  if (!pairs.length && !ivimOn) return '';
  const cardHtml = _RN.groupCardsByDomain(pairs)
    .map(g => domainGroupHtml(g, build)).join('');
  const blockOf = {'ivim-d': 'd', 'ivim-dstar': 'dstar', 'ivim-f': 'f'};
  const ivimHtml = ivimOn
    ? _RN.IVIM_PARAMS.map(p => ivimBlockHtml(p, ivim[blockOf[p]])).join('')
    : '';
  const emptyCls = (!pairs.length && ivimOn && !ivim.hasAny)
    ? ' ivim-section-empty' : '';
  return '<section class="psection' + emptyCls + '" id="section-additional">' +
    '<h2>Additional measurements</h2>' +
    '<p class="snote screen-only">' + esc(ADDITIONAL_NOTE) + '</p>' +
    cardHtml + ivimHtml + '</section>';
}

/* ═══════════════════════════════════════════════════════════ SHEET 3 — RECEIPTS */

function acquisitionSummary(profile, selection) {
  const p = _RN.PATHS[selection.path];
  return '<div class="acqsum">' +
    '<span class="axis">' + esc(p.label) + '</span>' +
    '<span class="axis">' + esc(selection.fieldStrength) + '</span>' +
    '<span class="axis">' + esc(selection.cohort) + '</span>' +
    '<span class="axis">' + esc(SCOPE_LABELS[selection.scope]) + '</span></div>';
}

/* Counted from the rows, never written down. A hard-coded sentence about how
   much of this report rests on weak evidence stops being true the first time a
   record changes. */
function fallbackSentence(coverage) {
  const weak = coverage.rows.filter(r => r.rung !== null && r.rung >= 3);
  if (!weak.length) return null;
  return weak.length + ' of ' + coverage.ladderCount + ' staged measurement' +
    (coverage.ladderCount === 1 ? '' : 's') +
    (weak.length === 1 ? ' rests' : ' rest') + ' on evidence at the lower fallback ' +
    'rungs — a single published study, sources from other platforms only, or a value ' +
    'reached through a calibration resolved that way: ' +
    weak.map(r => r.label).join('; ') + '.';
}

function gapListSentence(cards) {
  const gapped = cards.filter(c => c.gap);
  if (!gapped.length) return null;
  return gapped.length + ' measurement' + (gapped.length === 1 ? '' : 's') +
    ' could not be staged and ' + (gapped.length === 1 ? 'prints' : 'print') +
    ' a described gap instead of a number: ' +
    gapped.map(c => c.label).join('; ') + '.';
}





function censusHtml(census) {
  return '<p class="census">Evidence pool as counted at build time: ' +
    esc(String(census.cutoffs)) + ' cut-offs and ' + esc(String(census.references)) +
    ' references — ' + esc(String(census.geExplicit)) + ' GE-explicit, ' +
    esc(String(census.multiVendor)) + ' multi-vendor including GE, ' +
    esc(String(census.nonGe)) + ' from other platforms, ' +
    esc(String(census.guideline)) + ' guideline or consensus.</p>';
}

function stampText(model, selection, versions) {
  const s = model.report.stamp;
  const p = _RN.PATHS[selection.path];
  const techs = _RN.CONTROLLED_UNITS
    .map(d => DOMAIN_LABELS[d].replace(' method', '') + ' ' +
              (selection.techniques[d] || '—')).join(' · ');
  return 'VeriLiv V2 · Tool v' + versions.app + ' · Renderer v' + V2_RENDER_VERSION +
    (s ? ' · Thresholds v' + s.thresholds + ' · Cut-offs v' + s.cutoffs +
         ' (' + s.cutoffsHash.slice(0, 8) + '…)' : '') +
    ' · Scope data v' + _RN.SCOPE_VERSION + ' · Scope logic v' + _RN.V2_SCOPE_VERSION + '\n' +
    'Acquisition: ' + p.label + ' · ' + selection.fieldStrength + ' · ' + selection.cohort +
    ' · Scope: ' + SCOPE_LABELS[selection.scope] + '\n' +
    'Techniques: ' + techs;
}

/* W-113. Two additions for a reader who has not read the papers this section
   comes from: a one-sentence plain-language intro before the verdict, and the
   footnote split into two LABELLED parts (MAST / rule strength) instead of one
   run-on paragraph — each still just prose, no new fact. */
function compositeSection(composite) {
  if (!composite) return '';
  const lines = composite.lines.map(l =>
    '<span class="chip' + (l.met ? ' met' : '') + '"><b>' + esc(l.label) + '</b> ' +
    esc(String(l.value)) + (l.unit ? ' ' + esc(l.unit) : '') +
    '<span class="from">' + esc(l.origin) + '</span>' +
    '<span class="test">' + esc(l.test) + '</span></span>').join('');
  return '<section class="composite"><div class="section-head"><h3>' +
    esc(composite.name) + '</h3><span class="rule"></span></div>' +
    '<p class="cintro">' + esc(composite.intro) + '</p>' +
    (composite.pending
      ? '<p class="gap">' + esc(composite.pending) + '</p>'
      : '<div class="chips">' + lines + '</div>' + verdictChip(composite.verdict)) +
    '<p class="cnote"><b>MAST</b> ' + esc(composite.note.mast) + '</p>' +
    '<p class="cnote"><b>Rule strength</b> ' + esc(composite.note.strength) +
    '</p></section>';
}

/* W-098. The closing "Summary" block: the published composite verdicts, then
   any diagnostic consideration whose pattern fired — quoted VERBATIM, in
   quotation marks, so the reader sees the words are the sources' — then the
   coverage clause and the evidence-floor verb. `buildConsiderations` did the
   gating and returns structured data; this only lays it out. Design spec § 7.

   The panel is named ONCE, in the mechanism line at the head (spec § 3.2): no
   per-sentence speaker labels inside the prose. No record id of any kind is
   rendered here — `summary.panelRefIds` is the methodology sheet's, not this
   block's (spec § 7, logic.test L9/L10). */
function _pShort(p) {
  return (_RN.PARAMETER_LABELS[p] || p).split(' — ')[0];
}
function _joinWords(a) {
  if (a.length <= 1) return a.join('');
  return a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
}
function summaryBlock(summary) {
  if (!summary || !summary.present) return '';
  const s = summary;
  const raw = [];

  /* 1. Published composite verdicts — the holistic read here is a cited
     publication's (MEFIB), not the tool's. */
  s.composites.forEach(function (cp) {
    raw.push(cp.label.replace(/\s+rule$/i, '') + ' composite: ' + cp.band.toLowerCase() +
             (cp.tag ? ' — ' + cp.tag : '') + '.');
  });

  /* 2. Fired considerations, verbatim, in quotation marks. The source's own
     strength label is already inside each quoted sentence. */
  s.considerations.forEach(function (f) {
    raw.push('“' + f.statement + '”');
  });

  /* 3. A consideration whose pattern applied but whose input was missing or
     withheld — silent in the quotes, named here (SCHEMA § 10.3). */
  var seenGap = {};
  s.gaps.forEach(function (g) {
    var key = g.parameter + '|' + g.reason;
    if (seenGap[key]) return;
    seenGap[key] = true;
    raw.push('A published diagnostic consideration could not be evaluated: ' +
             _pShort(g.parameter) + ' was ' +
             (g.reason === 'withheld' ? 'not interpretable on this study' : 'not measured') + '.');
  });

  /* 4. Coverage and the evidence-floor verb. The assessed readings and any
     withheld one are NAMED (a withheld reading is a real caveat); the readings
     that were simply not entered are COUNTED, not listed — the itemised version
     only repeated the card grid on page one and cost a printed line (W-098
     developer call). */
  var cov = s.coverage, parts = [];
  if (cov.assessed.length) {
    parts.push(_joinWords(cov.assessed.map(_pShort)) +
               (cov.assessed.length === 1 ? ' was' : ' were') + ' assessed');
  }
  if (cov.notAssessed.length) {
    parts.push(cov.notAssessed.length +
               (cov.assessed.length ? ' other' : '') + ' measurement' +
               (cov.notAssessed.length === 1 ? ' was' : 's were') + ' not assessed');
  }
  if (cov.withheld.length) {
    parts.push(_joinWords(cov.withheld.map(_pShort)) +
               (cov.withheld.length === 1 ? ' was' : ' were') + ' withheld as not interpretable');
  }
  var coverage = parts.length ? parts.join('; ') + '.' : '';
  coverage += (coverage ? ' ' : '') + 'On the weakest evidence grade among the ' +
    'reliability rules applied, this summary ' + s.verb + ' rather than establishes its findings.';
  raw.push(coverage);

  /* The mechanism line: how many sources, named once. */
  var mech;
  if (s.sourceLabels.length) {
    mech = 'Assembled from ' + s.sourceLabels.length + ' published source' +
      (s.sourceLabels.length === 1 ? '' : 's') + ', quoted verbatim: ' +
      _joinWords(s.sourceLabels) + '.';
  } else if (s.composites.length) {
    mech = 'A closing read of the composite verdict above and this report’s coverage; it adds no new interpretation.';
  } else {
    mech = 'A closing read of this report’s coverage; it adds no new interpretation.';
  }

  return '<section class="summary"><h4>Summary</h4>' +
    '<p class="summary-mech">' + esc(mech) + '</p>' +
    '<p class="summary-body">' + esc(raw.join(' ')) + '</p></section>';
}

/* W-015 split `impression` into `clinical` (this function) and `evidence` (the
   appendix Task 6 renders and gates on approval, per W-030 § 8). This function
   is a minimal adaptation so the page keeps building on the new shape — the
   citation chip and the printed appendix are Task 6's, not this task's. */
function impressionSection(clinical) {
  if (!clinical) return '';
  const c = clinical;
  const flags = c.notAssessed.map(n => n.text).concat(c.abstentions.map(a => a.text));
  /* W-112. The page reads by priority: the readings that carry weight
     (non-interpretable, abnormal, no-published-boundary) under "Key findings",
     the normal readings folded into one sentence under "Other findings". The
     split is `buildImpression`'s (`keyFindings` / `otherFindings` /
     `normalSummary`); this function only lays it out.

     W-119. `c.history` (cohort/field/indication + "what was entered") used to
     print last, here. It never prints now — it is fully redundant with
     content already on the same page: cohort, indication and field strength
     are already labeled meta cells (IDENTITY_CELLS/STUDY_CELLS, above the
     findings), and every entered lab/context value already has its own grid
     row (contextBlock/labsBlock). `buildImpression` still returns `history`
     (and `text`/`facts`) unchanged for logic.test.js P7/P9 and
     reliability.test.js — this is a render-layer-only removal, not a data
     change; nothing relocates it elsewhere on the page (N37/N50). */
  const blocks = [];
  const key = c.keyFindings || [];
  if (key.length || c.ivimCrossRead) {
    /* W-081. The IVIM cross-read is a factual juxtaposition, not a ranked
       finding — it trails the key-findings prose, never enters `keyFindings`
       or carries a severity (buildImpression, spec § 4.1). */
    blocks.push('<h4>Key findings</h4><p>' +
      key.map(f => esc(f.text)).join(' ') +
      (c.ivimCrossRead
        ? (key.length ? ' ' : '') +
          '<span class="ivim-crossread">' + esc(c.ivimCrossRead) + '</span>'
        : '') +
      '</p>');
  }
  const other = [];
  if (c.normalSummary) other.push(esc(c.normalSummary));
  (c.otherFindings || []).forEach(f => other.push(esc(f.text)));
  if (other.length) {
    blocks.push('<h4>Other findings</h4><p>' + other.join(' ') + '</p>');
  }
  /* `c.text` — the flat, history-first paragraph, still including the
     redundant clause above — is the LAST-RESORT fallback for a page that
     would otherwise print an Impression with nothing under it at all: no Key
     findings, no Other findings, AND no flags (`notAssessed`/`abstentions`
     both empty). Whenever flags exist they are themselves a non-silent,
     per-parameter gap statement (CLAUDE.md § 1.2) — printing the flat
     history-first paragraph ABOVE them would just reintroduce the redundant
     clause W-119 removed, for no gain, so flags alone are enough to skip this
     fallback. Only a genuinely empty selection (nothing toggled, nothing
     entered) still reaches it. */
  if (!blocks.length && !flags.length) blocks.push('<p>' + esc(c.text) + '</p>');
  return '<section class="impression"><h3>Impression</h3>' +
    blocks.join('') +
    (flags.length
      ? '<ul class="flags">' + flags.map(f => '<li>' + esc(f) + '</li>').join('') +
        '</ul>' : '') +
    '</section>' +
    /* W-098. The bold closing block — its own section immediately after the
       impression (kept a sibling, not nested, so the impression's `</section>`
       still closes where every existing slice expects it). What the report
       ADDS UP TO, in the sources' own words. */
    summaryBlock(c.summary);
}

function reportFooter(model, selection, versions) {
  return '<footer class="reportfoot">' +
    '<div class="disc">Educational reference tool. Verify technical quality and ' +
    'clinical context before reporting. Not a substitute for radiologist ' +
    'interpretation. See the methodology sheet for limitations and references.</div>' +
    '<pre id="ver-line">' + esc(stampText(model, selection, versions)) + '</pre>' +
    '<div id="ack-line">Disclaimer v' + esc(versions.disclaimer) + ' acknowledged ' +
    esc(new Date(versions.ackTs).toLocaleString('en-GB')) + '</div>' +
    /* W-100/W-139: developer-specified colophon, page-1 footer only (not the
       methodology sheet's own footer below). Not a clinical field — no hash
       lock reads it. "VERISYNCO" renamed to "VERISYN.CO" to read as the
       domain (verisyn.co); domain and email strings unchanged. */
    '<div class="colophon">© 2026 VERISYN.CO · verisyn.co · ' +
    'verisyn.co@gmail.com</div></footer>';
}

/* W-017 round 2 — the compact plain-text summary body for a `mailto:` draft.
   Pure, so render.test.js unit-tests it from Node. NOTHING here sends: app.js
   drops this text into the clinician's OWN mail client (the transport decided
   2026-08-24), which is the only thing that leaves the browser. A `mailto:`
   body carries no attachment and some clients cap its length, so the numbers
   below are a preview and the full PDF is what the clinician reads. Body
   content is option A (developer decision 2026-08-29): a head line, one line
   per MEASURED
   parameter with the band it fell in, the impression prose, the same version
   stamp the footer prints, and a pointer to the full PDF.
   W-129: the recipient is always empty — there is no requesting-clinician
   identity field left to read it from (removed, together with the name
   field it was paired with). The clinician fills in the recipient themselves
   in their own mail client; every other part of the body is unchanged. */
function requestorMeasureLines(cards) {
  return (cards || [])
    .filter(c => c.value !== null && c.value !== undefined)
    .map(c => {
      const band = c.verdict ? c.verdict.band : 'not staged';
      const dis = c.disagreement
        ? ' (guideline and primary studies disagree — see the full report)' : '';
      return c.label + ': ' + c.value + (c.unit ? ' ' + c.unit : '') + ' — ' + band + dis;
    });
}

function buildRequestorEmail(model, selection, versions) {
  const sel = selection || {};
  const accession = sel.accession || 'no accession';
  const studyDate = sel.studyDate || 'undated';
  const to = '';
  const subject = 'VeriLiv quantitative liver MRI report — ' + accession + ' — ' + studyDate;

  const head = 'Quantitative liver MRI — ' + (sel.cohort || 'adult') +
    (sel.fieldStrength ? ', ' + sel.fieldStrength : '') +
    (sel.indication && sel.indication !== 'non-specific'
      ? ', requested for ' + sel.indication : '') + '.';

  const measures = requestorMeasureLines(model && model.cards);
  const impression = (model && model.impression && model.impression.clinical &&
                      model.impression.clinical.text) || '';

  const body = [
    head,
    '',
    'Measurements and staging',
    measures.length ? measures.join('\n') : 'No parameter was measured.',
    '',
    'Impression',
    impression || '(no impression generated)',
    '',
    stampText(model, sel, versions),
    '',
    'This is a summary. The full report — every cut-off with its published ' +
      'source, and the methodology sheet — is the PDF you were just asked ' +
      'to save: attach it to this message before sending.'
  ].join('\n');

  return {to: to, subject: subject, body: body};
}

/* ═════════════════════════════════════════════════════════════════ ONE PASS
   The clinical sheets, then the methodology sheet. One order, no view flag, and
   the methodology sheet is NOT OPTIONAL: a sheet that is always in the reader's
   hand cannot become the appendix nobody prints, which the report surface
   decision named as its largest risk (W-030 § 0.2). */

function sectionsHtml(model, selection) {
  const counter = {n: 0};
  const indication = selection.indication || 'non-specific';
  /* The order is the MODEL's, read here and not re-derived: severity class first,
     the indication's own parameters first inside a class. A sort written in this
     file could not be asserted without rendering (plan D5). */
  /* The indication no longer orders anything (W-061); `orderCards` lists. */
  const ordered = _RN.orderCards(model.report, model.cards);
  const build = p => parameterCard(p.row, p.card, selection);
  let html = '';
  for (const section of SECTIONS) {
    /* W-080. The merged `additional` section has no single `mount`: its rows are
       chosen by additionalRows(), and IVIM (not a report row) is appended by
       additionalSectionHtml itself. */
    if (section.additional) {
      html += additionalSectionHtml(additionalRows(ordered), build, model.ivim);
      continue;
    }
    const pairs = ordered.filter(p => p.row.mountPoint === section.mount);
    html += sectionHtml(section, pairs, counter, build);
  }
  return html;
}

/* ═══════════════════════════════════════════════════════════ SAMPLE MODE (W-014)
   The report opens on a demonstration case, and a demonstration that cannot be
   told from a real report is the hazard this whole task exists to remove. Three
   markers carry that, and only one of them is markup the reader can lose: the
   watermark is a stylesheet rule keyed on the body, so it survives every
   re-render and is painted by the browser on every printed sheet. What is built
   here is the sentence that names the mode, and the control that leaves it.

   The mode NEVER reaches a card, a verdict or an impression. It is a view flag,
   the way `removed` is (app.js), and v2/tests/render.test.js § N22 asserts that
   the two modes render every parameter byte for byte alike. */
function sampleLine() {
  return '<div class="sampleline">Sample report — the values are fabricated ' +
    'for demonstration and belong to no patient. Not a patient report.</div>';
}

/* THE TOOLBAR (W-052; `sampleBar` until then, renamed for what it now carries).
   Rendered OUTSIDE the sheets, because the sheets are `inert` while the sample
   is loaded and a control inside an inert subtree cannot be pressed — including
   the one control that leaves the mode.

   THE PRINT BUTTON OPENS NO NEW AUTHORITY. It calls the wrapped `window.print()`
   in app.js, which refuses unless the terms were accepted AND an acquisition was
   named; the browser's own Ctrl+P is refused by the @media print rules instead.
   This bar reads neither condition and carries no handler of its own — a second
   gate here is a second thing that can disagree with the first.

   `ready` IS THE ONE THING IT IS TOLD. Where no acquisition has been named the
   wrapper returns silently, and a button that does nothing and says nothing is
   worse than no button at all: the control is disabled and prints its reason, in
   the same words the stylesheet puts on paper for the same state.

   NO PAGE COUNT IN THE LABEL. V1's says "(2 pages)" and V2 measures 4 — but no
   test in this repo can count the pages of a PDF, so a number here would be a
   claim nothing locks (§ 1.2). */
/* `dev` + `scenarios` (W-116). The scenario menu is a DEVELOPMENT aid: app.js
   hands `dev` in only on a dev host (file:// or localhost) and `scenarios`
   only from the registry it owns — render.js stays pure, it never reads
   SAMPLE_CASES itself. Either argument missing or false and the bar is
   byte-identical to what it printed before this task: the published page's
   single "Load example" / "Clear values" pair is never replaced, only, on a
   dev host, joined by a way to pick which case that button loads. */
/* "Send e-mail" (W-017 round 2, renamed and ungated in W-129). The control
   opens the clinician's own mail client on a `mailto:` draft (app.js). In a
   SAMPLE report it is not rendered at all (W-126) — a demonstration must
   never carry a send affordance, real-looking or greyed. In a LIVE report it
   is enabled whenever the report is `ready` — no e-mail-present gate, since
   W-129 removed the identity field that gate would have read.
   W-132: no browser can attach a generated file to a `mailto:` draft (no
   attachment parameter any client honours, and every real file-handoff API
   needs a secure — https — context that `file://` never has; CHANGELOG.md
   records the six avenues checked). So app.js opens the print dialog FIRST,
   then the draft — the caption below says so up front. */
/* W-152. Toolbar icons are inline SVG — no icon font, no external file (runtime
   constraint 6). Each glyph is drawn on a 16-unit box, stroked, inheriting
   `currentColor` so the filled Print button and the ghost buttons colour their
   icon by the same rule as their label. `aria-hidden` + `focusable="false"`:
   the visible text is the accessible name, the icon is decoration. */
function tbIcon(name) {
  const d = {
    'new':   '<line x1="8" y1="3.5" x2="8" y2="12.5"/><line x1="3.5" y1="8" x2="12.5" y2="8"/>',
    'print': '<path d="M4 6.5V2.5h8v4"/><rect x="2.5" y="6.5" width="11" height="5.5" rx="1"/>' +
             '<path d="M4.5 12v1.5h7V12"/>',
    'mail':  '<rect x="2" y="3.5" width="12" height="9" rx="1"/><path d="M2.5 4.5 8 8.5l5.5-4"/>',
    'eye':   '<path d="M1.2 8S3.8 3.5 8 3.5 14.8 8 14.8 8 12.2 12.5 8 12.5 1.2 8 1.2 8Z"/>' +
             '<circle cx="8" cy="8" r="1.9"/>'
  };
  return '<svg class="tb-ic" viewBox="0 0 16 16" width="15" height="15" aria-hidden="true" ' +
    'focusable="false" fill="none" stroke="currentColor" stroke-width="1.5" ' +
    'stroke-linecap="round" stroke-linejoin="round">' + (d[name] || '') + '</svg>';
}

/* W-152 rebuilt this bar as one coherent control strip: a single row of buttons
   over one caption line. LEFT is always "New Report" — in a sample it leaves the
   sample (what "Start Reporting" used to do), in a live report it clears every
   entered value (app.js asks first). MIDDLE is the output group: "Print / Save
   as PDF" (the one filled, primary control — the browser has a single
   window.print() dialog, and "Save as PDF" is a destination inside it, so this
   is one button, not two) and, in a live report only, "Email". RIGHT, pushed to
   the far edge: "View Sample" in a live report, or the dev-only scenario picker
   in a sample.

   The button opens no new authority (W-052). It calls the WRAPPED
   window.print() in app.js, which refuses unless the terms were accepted AND an
   acquisition was named; Ctrl+P is refused by the @media print rules. This bar
   reads neither condition and carries no handler of its own. `ready` is the one
   thing it is told: where no acquisition has been named, Print and Email are
   disabled and the caption says why.

   THE CAPTION IS ONE LINE, AND ONLY TWO STATES CARRY IT. W-128's dashed-line
   note and W-132's "print dialog first" note were withdrawn in round 2
   (developer, 2026-09-02): a live, ready report shows no caption at all. What
   remains is W-052's not-ready reason and the sample lock note, one `.tb-caption`
   under the row, rendered only when there is a word to say. NO PAGE COUNT in any
   label — no test here can count a PDF's pages, so a number would be a claim
   nothing locks (§ 1.2). */
function toolbar(view, ready, dev, scenarios) {
  const sample = !!(view && view.mode === 'sample');
  /* SAMPLE mode only — there is nothing to switch between until a scenario is
     already loaded, so "New Report" (which leaves sample mode) makes the menu
     disappear with it in the same render, with no separate state to forget. */
  const menu = (sample && dev && Array.isArray(scenarios) && scenarios.length)
    ? '<label class="tb-scenario">Scenario ' +
      '<select data-sample-scenario>' +
      scenarios.map(s => '<option value="' + esc(s.key) + '">' +
                          esc(s.label) + '</option>').join('') +
      '</select></label>'
    : '';
  /* W-152 round 2 (developer, 2026-09-02): a live, ready report carries NO
     caption. The dashed-line note (W-128) and the "Email opens the print
     dialog first" note (W-132) are withdrawn — and W-154 then withdrew the
     on-screen page-break line the first note used to describe, so there is
     nothing left to label; the print dialog opening on an Email click is left
     unexplained. Only the two states that still need a word keep one: the
     not-ready reason, and the sample lock note. */
  const caption = !ready
    ? 'Not ready to print: no acquisition has been selected yet.'
    : sample
      ? 'Sample data is loaded and the fields are locked.'
      : '';
  return '<div class="toolbar screen-only">' +
    '<div class="tb-row">' +
      '<button type="button" class="tb-new" data-action="new-report">' +
        tbIcon('new') + 'New Report</button>' +
      '<button type="button" class="tb-print" data-action="print"' +
        (ready ? '' : ' disabled') + '>' + tbIcon('print') +
        'Print / Save as PDF</button>' +
      (sample
        ? ''
        : '<button type="button" class="tb-send" data-action="send-requestor"' +
            (ready ? '' : ' disabled') + '>' + tbIcon('mail') + 'Email</button>') +
      (sample
        ? menu
        : '<button type="button" class="tb-sample" data-sample="load">' +
            tbIcon('eye') + 'View Sample</button>') +
    '</div>' +
    (caption ? '<p class="tb-caption">' + caption + '</p>' : '') +
  '</div>';
}

function renderClinicalSheets(model, profile, selection, versions, view) {
  const sample = !!(view && view.mode === 'sample');
  return '<div class="page" id="clinical"' + (sample ? ' inert' : '') + '>' +
    masthead(profile) +
    patientMeta(selection, view) +
    studyMeta(selection, profile) +
    labsBlock(model.labs, selection, model) +
    sectionsHtml(model, selection) +
    compositeSection(model.composite) +
    impressionSection(model.impression && model.impression.clinical) +
    (sample ? sampleLine() : '') +
    reportFooter(model, selection, versions) +
    '</div>';
}



/* ═══════════════════════════════════════════════════════════ THE ENTRY ROUTE
   THE ORDER THE READER TABS THROUGH, WHICH IS NOT THE ORDER THE PAGE PRINTS IN.

   Two facts about this surface make a fixed route necessary rather than a
   nicety. The sheet is rebuilt in one write on every `change` (app.js), and
   `change` fires exactly when a filled field is tabbed out of —
   so the element holding the cursor is destroyed mid-tab. And `orderCards`
   ranks the cards by severity on every render, so the card being typed into
   MOVES as soon as its value lands in a different band. Restoring focus alone
   would fix the first and leave the second: the reader would be returned to a
   field whose neighbours had changed underneath it.

   So the route is built from the model, never from the rendered page: the
   engine's own row order (`report.rows`), which no ranking touches. Reading the
   DOM would import the very ordering this exists to escape.

   Each entry names an element the way app.js already addresses it — the data
   attribute the change handlers are wired to. A method control is keyed by its
   card as well, because the iron domain draws one on each of its rows and the
   domain alone would name three elements.

   `model` may be absent: before a scanner is chosen there is no report, only
   the identity and study cells (plus bmi, which draws in the header
   regardless of report state, W-146), and the route says so rather than
   pretending the rest of the sheet exists. */
function entryRoute(model, selection, uiState) {
  const route = [];
  /* W-136 review — a select cell whose option list is empty for the current
     selection (etiologyCohort under an indication with no cohort-specific
     evidence) is not drawn by metaCell, so it must not be a Tab stop either:
     a route entry with no field behind it is the dead stop W-046 fixed. */
  for (const c of IDENTITY_CELLS) {
    if (c.options && !c.options(selection).length) continue;
    route.push({attr: 'data-axis', key: c.axis});
  }
  for (const c of STUDY_CELLS) route.push({attr: 'data-axis', key: c.axis});
  /* W-146: bmi's header cell (patientMeta) draws unconditionally — same as
     the axes above, not gated behind `model.report` the way the labs/
     parameter stretch below is. Height/weight only exist on the page (and
     only get a route stop) while the Calculate BMI popup is open — same
     "no route stop without a field" rule as etiologyCohort's, above. */
  route.push({attr: 'data-value', key: 'bmi'});
  if (uiState && uiState.bmiPopupOpen) {
    route.push({attr: 'data-value', key: 'heightCm'});
    route.push({attr: 'data-value', key: 'weightKg'});
  }
  if (!model || !model.report) return route;

  /* The laboratory grid, in the order its own record list declares — the
     same list labsBlock draws from, so the route cannot name a field the
     sheet does not render.
     W-144: altUln/ggt no longer have a route entry of their own here — they
     are spliced into `model.labs.inputs` itself (report.js buildLabs()) when
     shown, so the loop right below already stops for them in the right
     place, in the right order, for free. ascites moved into the MRE row's
     own route entry, below. */
  if (model.labs && model.labs.inputs) {
    for (const f of model.labs.inputs) route.push({attr: 'data-value', key: f.key});
  }

  const preset = _RN.defaultTechniques(selection.path);
  for (const row of model.report.rows) {
    if (!row.rendered) continue;
    route.push({attr: 'data-value', key: row.parameter});
    /* W-141. Same gate etiologyCohortHtml/metaCell use — a cell with no options
       for the current indication is drawn nowhere, so it is not a Tab stop
       either (W-046). Placed right after the row's own value, before its
       method/product control, matching the .pident stacking order. */
    if (row.parameter === 'mre' && etiologyCohortsFor(selection).length) {
      route.push({attr: 'data-axis', key: 'etiologyCohort'});
    }
    /* W-144. Ascites moved into the same .pident block, right after the cell
       above — no options-length gate needed (it always offers the same
       three choices; row.rendered, already checked at the top of this
       loop, is the only thing that decides whether it exists on the page). */
    if (row.parameter === 'mre') {
      route.push({attr: 'data-value', key: 'ascites'});
    }
    /* The same condition parameterCard uses to decide whether it draws one. A
       second rule here would let the route point at a control that is not on
       the page, which is a dead stop the reader falls out of. W-090: keyed by
       `row.controlKey`, so r2star/t2star/lic each route their own element
       instead of all three pointing at 'iron'. */
    if (_RN.CONTROLLED_UNITS.indexOf(row.controlKey) !== -1 && !preset[row.controlKey]) {
      route.push({attr: 'data-domain', key: row.controlKey, param: row.parameter});
    }
    /* The product control (W-090) is independent of the technique control's
       visibility — it can show even when the technique stays defaulted/hidden
       on the GE path, so it needs its own route entry rather than piggy-
       backing on the condition above. Written as a negative comparison
       (K6, above, forbids the positive form in this file) — mirrors
       productControl's own guard. */
    if (selection.path !== 'ge' || !_RN.GE_IRON_PRODUCTS[row.parameter]) continue;
    const tech = row.technique ? _RN.TECHNIQUES[row.technique] : null;
    if (tech && tech.group === 'iron-r2star') {
      route.push({attr: 'data-product', key: row.parameter, param: row.parameter});
    }
  }

  /* W-081. The three research inputs render exactly when `model.ivim.rendered`
     is set (ivimSectionHtml, the scope decision made in report.js), with no
     per-row `rendered` gate — so they join the Tab route on the same flag. */
  if (model && model.ivim && model.ivim.rendered) {
    for (const p of _RN.IVIM_PARAMS) route.push({attr: 'data-value', key: p});
  }
  return route;
}

/* ═════════════════════════════════════════════════════ THE METHODOLOGY SHEET
   Always printed (§ 9). Reorganised from paragraphs into five tables:

     A  what was measured
     B  how the numbers were formed
     C  limitations — the profile's caveats plus sentences COUNTED from the rows
     D  references, ordered by the profile then by indication, NEVER filtered
     E  the provenance census, printed as counted

   ⛔ NO VERDICT AND NO STAGE INDEX APPEARS HERE. The receipts describe the
      LITERATURE; the card describes the patient. A stage printed twice is a fact
      the reader has to reconcile with itself. */

function tableHead(idx, title) {
  return '<div class="p2-h" data-table="' + esc(idx) + '"><span class="idx">' +
    esc(idx) + '</span><h2>' + esc(title) + '</h2><span class="rule"></span></div>';
}

/* The reasons the cards no longer print. Nothing was deleted when the card got
   shorter — it moved here, where a reason belongs, and it is still one line per
   measurement rather than four paragraphs. */
function measurementNotes(model) {
  const rows = [];
  for (let i = 0; i < model.report.rows.length; i++) {
    const row = model.report.rows[i], card = model.cards[i];
    if (!row.rendered) continue;
    const bits = [];
    for (const ruler of card.rulers) {
      if (ruler.matchLabel) bits.push(ruler.matchLabel +
        (ruler.scanner ? ' (published on ' + ruler.scanner + ')' : ''));
      if (ruler.matchedRefs && ruler.matchedRefs.length > 1) {
        bits.push('also eligible: ' + ruler.matchedRefs.slice(1).join('; '));
      }
      if (ruler.missingRungs && ruler.missingRungs.length) {
        bits.push('the matched publication does not cover ' + ruler.missingRungs.join(', '));
      }
      if (ruler.note) bits.push(ruler.note);
    }
    if (card.singleLadderReason) bits.push(card.singleLadderReason);
    if (!bits.length) continue;
    rows.push('<tr class="mn-row"><td>' + esc(card.label) + '</td><td>' +
              esc(bits.join(' · ')) + '</td></tr>');
  }
  if (!rows.length) return '';
  return '<table class="mtab"><thead><tr><th>Measurement</th>' +
    '<th>What the card could not print</th></tr></thead><tbody>' +
    rows.join('') + '</tbody></table>';
}

/* The evidence half's copy of the caveat the clinical card prints (W-038). The
   clinical page carries the sentence where the number is READ; this table
   carries it where the numbers are accounted for, so a reader who only has the
   methodology sheet is not missing the limit the source states on its own
   threshold. */
function sourceCaveatsTable(model) {
  const rows = [];
  for (const par of model.receipts.parameters) {
    for (const c of (par.useCaveats || [])) {
      rows.push('<tr class="mn-row"><td>' + esc(par.label) + '</td><td>“' +
                esc(c.statement) + '” ' +
                esc(c.refIds.map(shortCite).join('; ')) + '</td></tr>');
    }
  }
  if (!rows.length) return '';
  return '<table class="mtab"><thead><tr><th>Measurement</th>' +
    '<th>The limit its source states on its own threshold</th></tr></thead><tbody>' +
    rows.join('') + '</tbody></table>';
}

/* W-050. Evidence the engine HELD BACK, named where the numbers are accounted
   for. `withheldOf()` has produced this sentence since W-029 and `buildReceipts`
   has carried it since; no sheet read the field, so a disclosure the engine had
   already written reached nobody.

   It sits beside sourceCaveatsTable and not on the clinical page on purpose. The
   FACT that a measurement could not be answered is on the card, in its gap
   sentence, whether this sheet is read or not (SCHEMA § 10.3). What is here is
   the REASONING — that published values exist and on what ground they were not
   used — and stating the same fact twice in two vocabularies is something the
   reader would have to reconcile with itself.

   The sentence is the engine's, printed as it comes; this layer writes the
   column heads and nothing else. */
function withheldTable(model) {
  const rows = [];
  for (const par of model.receipts.parameters) {
    if (!par.withheld) continue;
    rows.push('<tr class="mn-row"><td>' + esc(par.label) + '</td><td>' +
              esc(par.withheld) + '</td></tr>');
  }
  if (!rows.length) return '';
  return '<table class="mtab"><thead><tr><th>Measurement</th>' +
    '<th>Published evidence held back, and why</th></tr></thead><tbody>' +
    rows.join('') + '</tbody></table>';
}

/* W-051. The engine's own reason strings, named where the gaps are accounted
   for. They are NOT deleted from the model when the card stops printing them:
   "the cited paper does not contain this number" and "this sentence is unusable
   at a clinician" are different claims, and only the second one was made here.

   Same placement argument as `withheldTable` above, which is the pattern this
   follows rather than modifies. The FACT that a measurement could not be
   answered is on the card whether this sheet is read or not (SCHEMA § 10.3);
   what is here is the engine's account of it, in the vocabulary it writes for
   the test suite and for diagnostics — a schema clause number, a technique-group
   id and a provenance class among them.

   `receipts.parameters[].gap` has carried this string since W-029 and no sheet
   read it, which is the `withheldOf` defect a second time: a value computed and
   never rendered is not a disclosure. */
function gapReasonTable(model) {
  const rows = [];
  for (const par of model.receipts.parameters) {
    if (!par.gap) continue;
    rows.push('<tr class="mn-row"><td>' + esc(par.label) + '</td><td>' +
              esc(par.gap) + '</td></tr>');
  }
  if (!rows.length) return '';
  return '<table class="mtab"><thead><tr><th>Measurement</th>' +
    '<th>Why no scale could be completed, in the terms the engine records</th>' +
    '</tr></thead><tbody>' + rows.join('') + '</tbody></table>';
}

/* W-130. FIB-4's own expression + provenance sentence, moved here from the
   labs block's inline paragraph (labsBlock now prints a one-line pointer to
   this table instead). Same content, unchanged: labs.fib4.expression,
   .provenance and .flags, read verbatim — nothing here is a new clinical
   fact, only a relocated account of one already computed in report.js. */
function fib4MethodNote(labs) {
  if (!labs || !labs.fib4 || labs.fib4.value === null) return '';
  return '<p>FIB-4: ' + esc(labs.fib4.expression || '') +
    ' · provenance ' + esc(labs.fib4.provenance || 'unrecorded') +
    (labs.fib4.flags.length ? ' · ' + esc(labs.fib4.flags.join(', ')) : '') +
    '</p>';
}

function tableB(profile, labs) {
  return tableHead('A', 'How these numbers were formed') +
    profile.derivation.map(c => '<p>' + esc(c) + '</p>').join('') +
    fib4MethodNote(labs);
}

function tableC(profile, model) {
  /* COUNTED from the rows, never written down: a hard-coded sentence about how
     much of this report rests on a fallback rung stops being true the first time
     a record changes. */
  const counted = [fallbackSentence(model.coverage), gapListSentence(model.cards)]
    .filter(x => x !== null);
  /* W-080. The merged "Additional measurements" section's shared note lives here
     rather than beside a card — the paragraph explaining what the section covers
     is a reason, not a fact. Printed only when that section actually drew
     something (additionalSectionDrew): a note for a section the reader never saw
     describes nothing. */
  return tableHead('B', 'Limitations and measurement notes') +
    profile.caveats.map(c => '<p>' + esc(c) + '</p>').join('') +
    measurementNotes(model) +
    sourceCaveatsTable(model) +
    withheldTable(model) +
    gapReasonTable(model) +
    counted.map(c => '<p class="counted">' + esc(c) + '</p>').join('') +
    (additionalSectionDrew(model)
      ? '<p class="snote"><b>Additional measurements.</b> ' +
        esc(ADDITIONAL_NOTE) + '</p>'
      : '');
}

/* Which parameters and BOUNDARIES cite a reference — counted from the receipts, so
   folding the per-boundary source list into this table deletes no traceability
   (plan decision D4). */
function citationIndex(receipts) {
  const idx = {};
  for (const par of receipts.parameters) {
    for (const src of (par.sources || [])) {
      const key = src.citation || 'citation unresolved';
      (idx[key] || (idx[key] = [])).push(
        par.label + ' ' + src.boundary + ' = ' + src.value +
        (src.unit ? ' ' + src.unit : ''));
    }
  }
  return idx;
}

/* ══════════════════════════════════════ THE REFERENCE LIST'S GROUPS  (W-066)
   A source's HOME is the measurement that names it, and the home is DERIVED FROM
   THE RECORDS rather than written by hand: a cut-off, a calibration, a reference
   range or an interaction that carries a reference id puts that reference under
   its own parameter's heading. Where a source feeds more than one measurement it
   still gets ONE home — the first in the report's own card order — and the other
   measurements are named beside the row, so the fact that it is shared is on the
   page rather than lost in the choice.

   ⛔ THE POOL IS NOT FILTERED HERE and no row is dropped. Grouping changes the
      ORDER and adds headings; forty records go in and forty come out, which N32
      asserts by id and not by count alone.

   ⛔ NO HEADING STRING IS INVENTED. The six measurement headings are the ones the
      cards already print (DOMAIN_TITLES). Of the three that are not measurement
      domains:
        mast      the records' own word for a composite score this report carries
                  cut-offs for (CUT-0069, CUT-0070, CAL-0007) and stages nowhere
        unstaged  a parameter no card stages — dce, ivim, t2, ge-platform
        uncited   no record of any kind names the reference
      the last two were named by the developer on 2026-08-25, because naming is
      theirs (CLAUDE.md § 2.4), and `mast` is the parameter id as the records
      spell it. */

const REFERENCE_GROUP_ORDER = DOMAIN_ORDER.concat(['mast', 'unstaged', 'uncited']);

const REFERENCE_GROUP_TITLES = {
  mast: 'MAST',
  unstaged: 'Sequences this report does not stage',
  uncited: 'Background \u2014 no boundary in this report cites it'
};

const referenceGroupTitle = key =>
  DOMAIN_TITLES[key] || REFERENCE_GROUP_TITLES[key] || key;

/* Every record that can name a reference, in one list. `parameter` is a report
   parameter on a cut-off or a range ('lic', 'ct1'), and already a domain name on
   an interaction ('iron', 'dce'), so DOMAIN_OF maps the first kind and the second
   passes through unchanged. */
function referenceFeeds() {
  const feeds = {};
  const records = [].concat(_RN.CUTOFFS || [], _RN.CALIBRATIONS || [],
                            _RN.REFERENCE_RANGES || [], _RN.INTERACTIONS || []);
  for (const rec of records) {
    const domain = _RN.DOMAIN_OF[rec.parameter] || rec.parameter;
    for (const id of [].concat(rec.sourceRefIds || [], rec.workbookRefIds || [])) {
      const seen = feeds[id] || (feeds[id] = []);
      if (seen.indexOf(domain) === -1) seen.push(domain);
    }
  }
  return feeds;
}

/* refId -> {home, also[]}. `also` names the OTHER measurements this source feeds,
   never its own group: the heading has already said that, and printing it twice is
   the defect W-051 closed on a different field. */
function referenceHomes() {
  const feeds = referenceFeeds();
  const homes = {};
  for (const id of Object.keys(feeds)) {
    const named = feeds[id].filter(d => REFERENCE_GROUP_ORDER.indexOf(d) !== -1);
    const ranked = REFERENCE_GROUP_ORDER.filter(d => named.indexOf(d) !== -1);
    homes[id] = ranked.length
      ? {home: ranked[0], also: ranked.slice(1)}
      : {home: 'unstaged', also: []};
  }
  return homes;
}

/* Partitions an ALREADY ORDERED pool. Splitting a stable list preserves the
   relative order inside every part, which is how `orderReferences`' contract —
   vendor class, then indication match, then record order — survives untouched:
   it is still the only thing that orders two references, now within a group. */
function groupReferences(ordered) {
  const homes = referenceHomes();
  const groups = REFERENCE_GROUP_ORDER.map(key => ({key: key, refs: []}));
  const byKey = {};
  groups.forEach(g => { byKey[g.key] = g; });
  for (const ref of ordered) {
    const h = homes[ref.id];
    byKey[h ? h.home : 'uncited'].refs.push(
      {ref: ref, also: h ? h.also : []});
  }
  return groups.filter(g => g.refs.length);
}

function tableD(profile, model, indication) {
  const ordered = _RN.orderReferences(_RN.REFERENCES, profile, indication);
  const cites = citationIndex(model.receipts);
  /* ONE LINE PER REFERENCE. The title and the boundaries citing it move to the
     tooltip — forty references still print, every one of them, because the pool is
     never filtered and compressing a row is not dropping it. */
  const row = entry => {
    const r = entry.ref;
    const also = entry.also.length
      ? '<span class="alsofeeds"> \u00b7 also feeds ' +
        esc(entry.also.map(referenceGroupTitle).join(', ')) + '</span>'
      : '';
    return '<tr class="d-row" data-ref="' + esc(r.id) +
      '" title="' + esc(r.title + '\n\nCited by: ' +
        ((cites[r.citation] || []).join(' \u00b7 ') || 'no boundary in this report')) + '">' +
    '<td><span class="rid">' + esc(r.id) + '</span> ' + esc(r.citation) + also + '</td>' +
    '<td>' + esc(VENDOR_CLASS_LABELS[r.vendorClass] || r.vendorClass) + '</td>' +
    '<td>' + esc(String(r.year)) + '</td>' +
    '<td>' + esc(r.evidenceGrade) + '</td>' +
    '<td>' + (r.pmid ? esc(r.pmid)
                     : 'unresolved (' + esc(r.pmidProvenance) + ')') + '</td>' +
    '</tr>';
  };
  const groups = groupReferences(ordered);
  /* The heading is a row of the SAME table, not a table of its own: the print
     stylesheet flows this one table in two columns, and a second table would break
     that flow and cost the sheet a page. */
  const rows = groups.map(g =>
    '<tr class="d-group" id="refgroup-' + esc(g.key) + '">' +
    '<th colspan="5">' + esc(referenceGroupTitle(g.key)) +
    ' <span class="gcount">' + g.refs.length + '</span></th></tr>' +
    g.refs.map(row).join('')).join('');
  /* SCREEN ONLY (W-067, absorbed here 2026-08-25). The jump links are plain
     anchors — no script reaches them — and the filter box is bound in js/app.js by
     an event listener, never by an inline handler and never as a second gate
     (W-052's lesson). `noprint` is what keeps both off the paper, and N32 asserts
     the print output carries neither. */
  const nav = '<div class="refnav noprint">' +
    '<label class="reffilter">Filter <input type="search" id="ref-filter" ' +
    'placeholder="author, year, PMID\u2026" autocomplete="off"></label>' +
    '<nav class="refjump">' + groups.map(g =>
      '<a href="#refgroup-' + esc(g.key) + '">' + esc(referenceGroupTitle(g.key)) +
      ' (' + g.refs.length + ')</a>').join('') + '</nav>' +
    '<p class="reffilternote">Filtering hides rows on screen only. Every printed ' +
    'report carries all ' + _RN.REFERENCES.length + ' records.</p></div>';
  return tableHead('C', 'References') +
    '<p class="refnote">The reference pool is never filtered \u2014 not by vendor and ' +
    'not by indication. Every record this report can cite is printed below; the ' +
    'acquisition path and the indication decide only which is cited first. The ' +
    'headings are derived from the records: a source sits under the measurement ' +
    'whose cut-off, calibration, reference range or interaction names it.</p>' +
    nav +
    /* `reflist` is a LAYOUT hook and nothing else: the print stylesheet sets this
       one table in two columns, which is how forty references fit the sheet
       without a row being dropped or a field being hidden. The markup, the row
       class and the count are unchanged (v2/tests/render.test.js N12). */
    '<table class="mtab reflist"><thead><tr><th>Reference</th><th>Vendor class</th>' +
    '<th>Year</th><th>Grade</th><th>PMID</th></tr></thead><tbody>' + rows +
    '</tbody></table>';
}

function tableE(census) {
  return tableHead('D', 'Provenance census') + censusHtml(census);
}

/* ═════════════════════════════════════════════ THE EVIDENCE HALF (W-015)
   The other half of what buildImpression returned. It sits on the methodology
   sheet, which is NOT optional (W-030 section 0.2), so the reasoning behind a
   withheld reading is always in the reader's hand -- and it is the only place a
   reference id, a trigger id or an evidence grade is printed. The FACT that a
   parameter could not be answered never lives here; it is on the clinical page
   whether this sheet is read or not (SCHEMA section 10.3). */
function evidenceAppendix(evidence) {
  if (!evidence) return '';
  /* W-037. A rule whose number was read out of a PUBLICATION prints that
     publication's sentence here, and nowhere else. This is the only sheet on
     which a reference id may appear at all, so it is the only sheet on which a
     quote attributed to one can appear either; the clinical page carries the
     FACT that a reading was withheld and never the paper behind it. Absent on
     every workbook-sourced rule, which is thirteen of the fourteen. */
  const rows = evidence.rules.map(r =>
    '<li><b>' + esc(r.effect) + '</b> · ' + esc(r.statement) +
    (r.magnitude ? ' <i>' + esc(r.magnitude) + '</i>' : '') +
    (r.sourceQuote
      ? '<div class="quote">“' + esc(r.sourceQuote) + '” <span class="src">' +
        esc(r.sourceRefId) + ' · read from ' + esc(r.sourceKind) + '</span></div>'
      : '') +
    '<span class="src">' + esc(r.triggerId) + ' · ' + esc(r.interactionId) +
    ' · ' + esc(r.refIds.join(', ')) + '</span></li>').join('');
  const inherited = evidence.inherited.map(i =>
    '<li>' + esc(_RN.PARAMETER_LABELS[i.parameter] || i.parameter) +
    ' inherits the downgrade of ' +
    esc(i.from.map(f => _RN.PARAMETER_LABELS[f] || f).join(', ')) + '</li>').join('');
  const abst = evidence.abstentions.map(a =>
    '<li>' + esc(a.triggerId) + ' · ' + esc(a.interactionId) +
    ' abstained: ' + esc(a.missing.join(' and ')) + ' not provided — ' +
    esc(a.targets.join(', ')) + ' not assessable on this ground</li>').join('');
  const gaps = evidence.gaps.map(g =>
    '<li>' + esc(_RN.PARAMETER_LABELS[g.parameter] || g.parameter) + ' — ' +
    esc(g.reason) + '</li>').join('');

  /* W-091. Four sub-findings used to sit as four <h4><ul> pairs in one run, with
     nothing telling the eye where one ended and the next began. Each now sits in
     its own left-ruled block — the STRUCTURAL idiom .nointerp already uses
     elsewhere in this stylesheet, on the NEUTRAL --rule token rather than
     --uncertain-edge: that colour already carries one meaning here (a withheld
     or qualified reading, W-015/W-038) and a grouping line borrowing it would
     make a structural device look like a second clinical qualification
     (CLAUDE.md § 5, the W-085 lesson — a surface that already spends a colour on
     one meaning does not get to spend it again on another). */
  const evBlock = (title, items) => items
    ? '<div class="evblock"><h4>' + esc(title) + '</h4><ul class="ev">' + items + '</ul></div>'
    : '';

  return '<section class="evidence"><h3>Impression — the evidence behind it</h3>' +
    '<p class="floor">Evidence floor <b>' + esc(evidence.floor) + '</b> — ' +
    esc(evidence.floorLabel) + '. At this floor the report ' +
    esc(evidence.verb) + ' rather than asserts more strongly.</p>' +
    evBlock('Rules that fired', rows) +
    evBlock('Inherited downgrades', inherited) +
    evBlock('Rules that abstained', abst) +
    evBlock('Measured, with no published boundary', gaps) +
    '</section>';
}

/* W-091. The same boxed language domainGroupHtml gives the clinical sheet's
   groups, on the sheet whose own document says density is allowed here (§ 5.2)
   — a dense block still needs a visible edge saying where it ends. One wrapper
   per lettered table; the evidence appendix already draws its own <section
   class="evidence">, so the CSS selector list covers it directly instead of a
   second wrapper. */
function mgroup(html) {
  return html ? '<div class="mgroup">' + html + '</div>' : '';
}

function renderMethodology(model, profile, selection, versions, view) {
  const sample = !!(view && view.mode === 'sample');
  return '<div class="page pagebreak" id="methodology"' + (sample ? ' inert' : '') + '>' +
    '<h2 class="sheet-title">Methodology, limitations and references</h2>' +
    acquisitionSummary(profile, selection) +
    /* "What was measured" is gone: it repeated the identity block of every card the
       reader has just read, and its room is what the remaining tables needed. */
    mgroup(tableB(profile, model.labs)) + mgroup(tableC(profile, model)) +
    mgroup(tableD(profile, model, selection.indication)) +
    mgroup(tableE(model.receipts.census)) +
    evidenceAppendix(model.impression && model.impression.evidence) +
    (sample ? sampleLine() : '') +
    '<footer><pre id="ver-line">' + esc(stampText(model, selection, versions)) + '</pre>' +
    '<div id="ack-line">Disclaimer v' + esc(versions.disclaimer) + ' acknowledged ' +
    esc(new Date(versions.ackTs).toLocaleString('en-GB')) +
    ' \u00b7 Educational reference \u2014 not a diagnostic device.</div></footer>' +
    '</div>';
}

/* `view` is optional and absent means LIVE. Every call written before W-014 —
   and every check in v2/tests/render.test.js that predates it — passes four
   arguments, so the live report is what the default has to be. */
function renderReport(model, profile, selection, versions, view) {
  return renderClinicalSheets(model, profile, selection, versions, view) +
         renderMethodology(model, profile, selection, versions, view);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {renderReport, renderClinicalSheets, renderMethodology,
                    masthead, patientMeta, studyMeta, labsBlock,
                    compositeSection, impressionSection, summaryBlock, evidenceAppendix, reportFooter,
                    notInterpretableHtml, shortCite,
                    tableB, tableC, tableD, tableE, measurementNotes,
                    groupReferences, referenceHomes, referenceGroupTitle,
                    REFERENCE_GROUP_ORDER, REFERENCE_GROUP_TITLES,
                    gapReasonTable,
                    parameterCard, stampText, buildRequestorEmail, esc, fmtTick, toolbar, sampleLine,
                    entryRoute, IDENTITY_CELLS, STUDY_CELLS,
                    cohortNudgeNeeded, PAEDIATRIC_AGE_MAX,
                    SECTIONS, SCOPE_LABELS, DOMAIN_LABELS, DOMAIN_TITLES,
                    VENDOR_CLASS_LABELS,
                    additionalRows, additionalSectionDrew, ADDITIONAL_NOTE,
                    TIER2_GROUPS: _RN.TIER2_GROUPS,
                    V2_RENDER_VERSION};
}
