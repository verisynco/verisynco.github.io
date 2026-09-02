/* VeriLiv V2 — application logic  (W-006)
 * ---------------------------------------------------------------------------
 * DOM wiring only. Every decision lives in a pure module: domains.js,
 * selection.js, report.js, thresholds.js, scope.js. If a clinical or provenance
 * judgment appears in this file, it is in the wrong file.
 *
 * W-007 moved every HTML builder out to js/render.js and every vendor-facing
 * string to js/vendors.js. What is left here is state, events, the disclaimer
 * gate and one innerHTML.
 * ---------------------------------------------------------------------------
 */

const V2_APP_VERSION = '0.14.7';  /* W-161 moves this 0.14.6 -> 0.14.7: the
   trial feedback layer is opened to every reader who has accepted the terms
   (the invite code is retired as a gate), the reader now self-declares a name
   and e-mail kept in localStorage, and the sample scenario menu is no longer
   restricted to a dev host. Terms sections 05 and 07 are reworded, so
   V2_DISCLAIMER_VERSION goes 1.1 -> 1.2 and this released-change counter moves
   with it. No clinical value, no hash lock.
   W-156 moved this 0.14.5 -> 0.14.6: the
   V2 terms text is corrected — section 05 no longer describes a Google Fonts
   request that W-009 removed — so V2_DISCLAIMER_VERSION goes 1.0 -> 1.1 and this
   released-change counter moves with it. Prose only, no network, no storage, no
   clinical value, no hash lock.
   W-152 moves this 0.14.4 -> 0.14.5: the
   holistic toolbar redesign adds one "New Report" control. In a live report it
   clears every entered value behind a window.confirm; in a sample it leaves the
   sample. It only resets the in-memory selection and re-renders — no network,
   no storage. Screen-only, no clinical value, no hash lock.
   W-151 moves this 0.14.3 -> 0.14.4: the
   light/dark theme toggle is withdrawn — the module-top applyTheme(readTheme())
   call and the toggle-theme click binding are removed (with the render.js
   toolbar button). readTheme/writeTheme/applyTheme/toggleTheme + V2_THEME_KEY
   stay defined but dead; nothing writes data-theme, so styles.css's dark
   blocks never apply. Screen-only, no clinical value, no hash lock.
   W-134 moves this 0.14.2 -> 0.14.3: a
   click handler for the Live Report "also open" line's Hide/Show button, which
   flips a set of Tier-1 purpose groups on the same `performed` axis as the
   per-group checkboxes. No new default, no network call, no clinical value.
   W-132 moves this 0.14.1 -> 0.14.2: the
   "Send e-mail" click handler now calls the existing gated `window.print()`
   BEFORE building and dispatching the mailto: draft — no browser lets a page
   attach a generated file to a mailto: draft (six avenues checked, developer
   decision 2026-08-30, CHANGELOG.md), so this is the closest available
   "PDF first, then attach it to the e-mail" order. No new dependency, no
   network request, no https requirement — file:// is unaffected.
   W-129 moves this 0.14.0 -> 0.14.1: the
   requesting-clinician identity fields are gone (render.js IDENTITY_CELLS),
   so the `toolbar()` call site below no longer computes an e-mail-present
   flag — the call drops back to 4 arguments. No clinical value, no hash
   lock; the mailto: handler itself is unchanged (see its own comment below).
   W-131 moves this 0.13.0 -> 0.14.0: a
   light/dark theme toggle. `readTheme`/`writeTheme`/`applyTheme` are a
   localStorage-backed pair in the exact shape `readAck`/`writeAck` already
   use for the disclaimer (try/catch, fail closed) — the difference is the
   storage: `localStorage` persists across a reload on purpose (the developer's
   choice), where the disclaimer's `sessionStorage` deliberately does not.
   `applyTheme` runs at module top level, before `initDisclaimerGate()` --
   both the gate and `#app` start `hidden` in the markup, so nothing has
   painted yet and there is no flash to guard against. No clinical value
   moved and no hash lock covers this file. W-017 round 2 moves this 0.12.0 -> 0.13.0:
   a "Send to requestor" button is wired to open the clinician's own mail client
   on a mailto: draft (window.location.href), and the toolbar call gains the
   requestor-e-mail-present flag. It opens no network request of any kind; no
   clinical value, no hash lock. W-119 moved this 0.11.0 -> 0.12.0: no app.js
   behaviour changed, but every app.js version bump has always moved with any
   printed-report change and this is one — the redundant "what was entered"
   history clause no longer prints in the impression (v2/js/render.js
   impressionSection). No clinical value, no hash lock.
   W-116 moved this 0.10.0 -> 0.11.0: SAMPLE_CASE became
   SAMPLE_CASES (v2/js/sample-cases.js), enterSample() takes a scenario key, and a
   dev-only <select> in the toolbar switches which fabricated case is loaded. No
   clinical value moved and no hash lock covers this file. W-063 (performed-toggle
   wiring) and W-101 (the demo's GE product picks) each moved this 0.6.0 -> 0.7.0
   independently, on `main` and on the w-101 branch; the collision is resolved at
   the merge to 0.8.0. No clinical value moved with either, and the hash locks
   stood still. W-063b then moved it 0.8.0 -> 0.9.0 for the group toggle wiring
   (data-performed-group) plus the Tier-2 scope raise; again no clinical value,
   no hash. W-106 moves it 0.9.0 -> 0.10.0 for one CSS-only rule (the
   clinical-context grid laid on a single row); no render/report/selection
   version and no hash lock covers a stylesheet rule. */

/* Bumped independently of every other counter. V2 keeps its own namespace and its
   own storage key, so a V1 acknowledgement can never open V2 and vice versa. V1's
   disclaimer version and storage key (see v1/js/app.js) are not touched by this file.
   W-156 moved this 1.0 -> 1.1: terms section 05 no longer claims a Google Fonts
   request (removed in W-009). W-161 moves it 1.1 -> 1.2: sections 05 and 07 are
   reworded — the trial feedback layer no longer needs an invite code, the
   reader self-declares a name and e-mail kept in this browser, and section 05
   discloses that stored item. Text-only; a pre-1.2 acknowledgement re-gates. */
const V2_DISCLAIMER_VERSION = '1.2';
const V2_DISCLAIMER_KEY = 'veriliv-v2-disclaimer';

/* ═══════════════════════════════════════════════════════ W-131 — THE THEME
   (W-151: WITHDRAWN, DORMANT — NOT DELETED.) W-131 added a manual light/dark
   toggle; W-151 removed its two live wires — the module-top `applyTheme(readTheme())`
   below and the `data-action="toggle-theme"` click binding in wireSelectionScreen()
   — plus the button itself in render.js toolbar(). The four functions and the
   storage key stay defined so re-enabling is a few lines (restore both wires and
   the button). Nothing calls them now, so nothing ever writes `data-theme`, so
   styles.css's `:root[data-theme="dark"]` blocks never apply. render.test.js N59
   and entry.test.js I4j lock both the dormant palette and the absence of the
   wiring.

   Screen-only: styles.css keeps every dark token inside `@media screen`, so
   the printed page is unaffected by whatever this reads or writes. Manual
   toggle only, by developer decision — no `prefers-color-scheme` auto-switch.
   `localStorage`, not `sessionStorage`: the preference is meant to survive a
   reload, unlike the disclaimer acknowledgement and the sample mode above,
   which are deliberately NOT persisted. Same fail-closed shape as
   `readAck`/`writeAck`: a blocked or unavailable store is not an error the
   reader sees, it is a silent fall-back to the default (light). */
const V2_THEME_KEY = 'veriliv-v2-theme';

function readTheme() {
  try {
    const v = localStorage.getItem(V2_THEME_KEY);
    return v === 'dark' ? 'dark' : 'light';
  } catch (e) { return 'light'; }
}
function writeTheme(theme) {
  try { localStorage.setItem(V2_THEME_KEY, theme); } catch (e) {}
}
function applyTheme(theme) {
  if (theme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
  else document.documentElement.removeAttribute('data-theme');
}
function toggleTheme() {
  const next = readTheme() === 'dark' ? 'light' : 'dark';
  writeTheme(next);
  applyTheme(next);
}
/* W-151: the module-top `applyTheme(readTheme())` call was here. Removed so a
   theme persisted in localStorage from before W-151 no longer reapplies on
   load. Restore this one line (and the click binding + the render.js button) to
   bring dark mode back. */

/* ═══════════════════════════════════════════════════════ SAMPLE MODE (W-014)
   THE DEMONSTRATION CASES. Every number in every scenario is fabricated: it
   belongs to no patient, it was not measured on any scanner, and it is not a
   cut-off, a calibration constant or a coefficient — so CLAUDE.md § 1 does not
   reach any of them, and nothing in the data layer sources them. What DOES
   reach them is § 1.2's rule about silence: a fabricated case that does not
   say it is fabricated is the hazard, which is why the mode is carried by a
   watermark on every printed sheet, a sentence in both footers, and locked
   sheets — for every scenario, not only the default one.

   W-116 replaced the single case with SAMPLE_CASES, an ordered registry —
   v2/js/sample-cases.js, not this file and not v2/data/. That file's own
   header carries the full reasoning; what stays here is the wiring: which
   scenario is loaded, and (dev host only) the control that switches it. */
function caseByKey(key) {
  return SAMPLE_CASES.find(c => c.key === key) ||
         SAMPLE_CASES.find(c => c.key === DEFAULT_SAMPLE_KEY);
}

/* W-116 gated the scenario menu to a dev host (file:// or localhost). W-161
   opens it to the published site: the developer's call — a reader browsing the
   fabricated demonstration cases is the point of an educational tool. The menu
   still self-limits in render.js `toolbar()` — it is drawn only in SAMPLE mode
   and only when a scenario list is handed in, and "New Report" leaves sample
   mode and takes the menu with it. Kept as a named function (not inlined) so a
   future decision to re-gate it has one place to change. */
function sampleMenuAllowed() {
  return true;
}

function sampleScenarioList() {
  return SAMPLE_CASES.map(c => ({key: c.key, label: c.label}));
}

/* STATELESS BY DECISION. The mode is never written to sessionStorage: a reload
   returns to the sample, which is the safe direction — the dangerous drift is a
   sample that comes back looking live, never a live report that comes back
   looking like a sample. Which SCENARIO was loaded is stateless the same way:
   a reload returns to the default case, never to whichever one was picked. */
let viewMode = 'sample';
let selection = applySelection(createSelection(), caseByKey(DEFAULT_SAMPLE_KEY));

/* W-146. Whether the "Calculate BMI" popup is open — a screen-only concern,
   never part of `selection` (the clinical model): the whole app re-renders
   through one `innerHTML` write on every `change` (see the comment on that
   write, below), so a UI toggle placed in `selection` would pollute the
   clinical model and would be exercised by the hash-lock tests for no
   reason. Threaded the same way `viewMode` already is — read here, passed
   down as a plain argument. Reset on every render pass, never persisted:
   a reload (or leaving the sample) closing it is the safe direction. */
let bmiPopupOpen = false;
function toggleBmiPopup() {
  bmiPopupOpen = !bmiPopupOpen;
  renderSelectionScreen();
}
function closeBmiPopup() {
  bmiPopupOpen = false;
  renderSelectionScreen();
}

function enterSample(key) {
  viewMode = 'sample';
  selection = applySelection(createSelection(), caseByKey(key));
  removed = {};
  bmiPopupOpen = false;
  renderSelectionScreen();
}

/* The only way out, and it empties the page rather than merely unlocking it:
   an unlocked sample is a live-looking report full of invented numbers. */
function exitSample() {
  viewMode = 'live';
  selection = createSelection();
  removed = {};
  bmiPopupOpen = false;
  renderSelectionScreen();
}

/* W-152. "New Report" (toolbar, always leftmost). In a sample it leaves the
   sample the way exitSample() always has. In a live report it clears every
   entered value — so it asks first, through the browser's own confirm, when
   the selection differs from a fresh createSelection(). The dirty check is a
   plain structural compare: createSelection() and applySelection() both build
   their object in the same fixed key order, so a stringify compares equal
   until the reader has actually changed something. It errs toward asking. */
function selectionIsDirty() {
  return JSON.stringify(selection) !== JSON.stringify(createSelection());
}
function newReport() {
  if (viewMode === 'sample') { exitSample(); return; }
  if (selectionIsDirty() &&
      !window.confirm('Clear all entered values and start a new report?')) return;
  selection = createSelection();
  removed = {};
  bmiPopupOpen = false;
  renderSelectionScreen();
}

/* sessionStorage can be unavailable (file:// in some browsers, blocked site data).
   Failing closed — gate on every load — is the safe default. */
function readAck() {
  try {
    const raw = sessionStorage.getItem(V2_DISCLAIMER_KEY);
    if (!raw) return null;
    const rec = JSON.parse(raw);
    return (rec && rec.version === V2_DISCLAIMER_VERSION && rec.ts) ? rec : null;
  } catch (e) { return null; }
}
function writeAck(rec) {
  try { sessionStorage.setItem(V2_DISCLAIMER_KEY, JSON.stringify(rec)); } catch (e) {}
}

function acceptDisclaimer() {
  const rec = readAck() || {version: V2_DISCLAIMER_VERSION, ts: new Date().toISOString()};
  writeAck(rec);
  document.body.classList.add('gate-accepted');
  document.body.classList.remove('gate-open');
  document.getElementById('gate').hidden = true;
  document.getElementById('app').hidden = false;
  renderSelectionScreen(rec.ts);
}

function declineDisclaimer() {
  document.getElementById('gate-terms').hidden = true;
  const declined = document.getElementById('gate-declined');
  declined.hidden = false;
  document.body.classList.add('gate-locked');
  declined.setAttribute('tabindex', '-1');
  declined.focus();
}

function initDisclaimerGate() {
  const gate = document.getElementById('gate');
  const attest = document.getElementById('gate-attest');
  const accept = document.getElementById('gate-accept');

  const existing = readAck();
  if (existing) {
    document.body.classList.add('gate-accepted');
    document.getElementById('app').hidden = false;
    renderSelectionScreen(existing.ts);
    return;
  }

  gate.hidden = false;
  document.body.classList.add('gate-open');
  attest.addEventListener('change', () => { accept.disabled = !attest.checked; });
  accept.addEventListener('click', acceptDisclaimer);
  document.getElementById('gate-deny').addEventListener('click', declineDisclaimer);

  /* Modal semantics: no Esc dismissal, no click-through, focus stays inside
     whichever card is currently visible. Ported from v1/js/app.js. */
  gate.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); return; }
    if (e.key !== 'Tab') return;
    const card = gate.querySelector('.gate-card:not([hidden])');
    if (!card) return;
    const f = [...card.querySelectorAll('a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])')]
      .filter(el => el.offsetParent !== null || el === document.activeElement);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  document.addEventListener('focus', e => {
    if (!gate.hidden && !gate.contains(e.target)) {
      e.stopPropagation();
      const card = gate.querySelector('.gate-card:not([hidden])');
      if (card) (card.querySelector('#gate-scroll') || card).focus();
    }
  }, true);

  document.getElementById('gate-scroll').focus();
}

/* Printing before the terms are acknowledged AND a path is chosen is blocked here
   and, for the browser's own Ctrl+P, by the @media print rules in css/styles.css. */
const nativePrint = window.print.bind(window);
window.print = function () {
  const b = document.body.classList;
  if (!b.contains('gate-accepted') || !b.contains('path-chosen')) return;
  nativePrint();
};

/* PARAMETER_LABELS and PARAMETER_UNITS moved to js/report.js in W-029: the
   coverage strip and the cards are pure objects that name their own rows, and a
   renderer holding a second copy could disagree with the model about what a row
   is called. They arrive here as globals, like every other module's exports. */
/* The model is built ONCE per render and handed down. Rebuilding it inside a
   renderer would let two halves of the same page answer from two different
   models — and every producer in report.js is pure, so there is nothing to gain
   by rebuilding it anyway. */
/* WHICH OPTED-IN CARDS THE READER KEPT. A printing choice, so it lives here as
   view state and never enters `selection`. */
let removed = {};

/* ═══════════════════════════════════════════ THE ENTRY ROUTE, WIRED (W-046)
   THE DEFECT. This file rebuilds the whole entry surface in one write on every
   `change`, and `change` fires exactly when a filled field is tabbed out of.
   The element holding the cursor is therefore destroyed mid-tab: focus falls to
   the document, and the reader's next Tab restarts at the top of the page. The
   second half survives any focus fix — the cards are ranked by severity on
   every render, so the card being typed into MOVES the moment its value lands
   in a different band, and "the next field down" is not a stable idea.

   THE ANSWER, in two halves. `entryRoute` (render.js) publishes a fixed order
   built from the model, not from the page; and every re-render carries a
   pending focus across the rewrite, so the cursor lands where the ROUTE says
   rather than where the DOM happens to have put it.

   ⛔ No ordering is decided here. This file reads the route; it never sorts. */
let currentRoute = [];

/* The field the cursor must be in AFTER the next render. Set by the Tab handler
   (the next field along the route) or by a change on a control that re-renders
   while still focused (the same field, so a <select> does not throw the cursor
   away the moment an option is picked). */
let pendingFocus = null;

/* A route entry addresses an element by the same data attribute the change
   handlers below are wired to. A method control also carries the card it sits
   in, because the iron domain draws one on each of its rows. */
function routeSelector(entry) {
  return (entry.param ? '[data-param="' + entry.param + '"] ' : '') +
         '[' + entry.attr + '="' + entry.key + '"]';
}

function routeIndexOf(el) {
  if (!el || !el.getAttribute) return -1;
  for (let i = 0; i < currentRoute.length; i++) {
    const entry = currentRoute[i];
    if (el.getAttribute(entry.attr) !== entry.key) continue;
    if (entry.param) {
      const card = el.closest ? el.closest('[data-param]') : null;
      if (!card || card.getAttribute('data-param') !== entry.param) continue;
    }
    return i;
  }
  return -1;
}

function applyPendingFocus() {
  if (!pendingFocus) return;
  const target = document.getElementById('app')
                         .querySelector(routeSelector(pendingFocus));
  pendingFocus = null;
  if (target) target.focus();
}

/* EVERY CHANGE HANDLER GOES THROUGH HERE rather than calling the renderer
   directly. If nothing has already claimed the next field — the Tab handler
   has, when a Tab is what triggered this — the cursor is asked to come back to
   where it was, so a control that re-renders on its own change does not empty
   the keyboard's position as a side effect. */
function reRender() {
  if (!pendingFocus) {
    const i = routeIndexOf(document.activeElement);
    if (i !== -1) pendingFocus = currentRoute[i];
  }
  renderSelectionScreen();
}

/* Tab moves along the ROUTE, not along the DOM. Off either end of the route,
   and anywhere outside it — the sample control, the purpose checkboxes, the
   printing switches — the browser's own behaviour is left alone. */
function onEntryTab(e) {
  if (e.key !== 'Tab' || e.altKey || e.ctrlKey || e.metaKey) return;
  const i = routeIndexOf(e.target);
  if (i === -1) return;
  const j = e.shiftKey ? i - 1 : i + 1;
  if (j < 0 || j >= currentRoute.length) return;
  e.preventDefault();
  pendingFocus = currentRoute[j];
  /* Blurring is what fires `change` on an edited field, which is what triggers
     the rewrite. If one happens, the render consumes the pending focus; if the
     value was untouched there is no change and no render, so it is applied
     here instead. */
  e.target.blur();
  applyPendingFocus();
}

function buildModel(report, profile, sel) {
  const labs = buildLabs(sel);
  const cards = buildCards(report, profile);
  const reliability = buildReliability(cards, labs, sel);
  markInterpretability(cards, reliability);          /* Task 6 implements this */
  /* W-098. The composite is built before the impression now, because the
     impression's closing "Summary" block restates the composite verdict as its
     lead. One buildComposite() call, read by both. */
  const composite = buildComposite(report, labs, reliability);
  /* W-081. IVIM (D / D-star / f) — a standalone research-layer builder, not a
     report row. Feeds the page-2 research section and the page-1 cross-read. */
  const ivim = buildIvim(sel);
  return {report: report,
          coverage: buildCoverage(report),
          cards: cards,
          receipts: buildReceipts(report),
          labs: labs,
          reliability: reliability,
          composite: composite,
          ivim: ivim,
          impression: buildImpression({report: report, cards: cards, labs: labs,
                                       selection: sel, reliability: reliability,
                                       composite: composite, ivim: ivim})};
}

/* The single DOM write in V2. Everything above it is a pure string builder in
   js/render.js, which is what lets v2/tests/render.test.js assert on the exact
   markup this line inserts. */
function renderSelectionScreen(ackTs) {
  window.__ackTs = ackTs || window.__ackTs;
  const app = document.getElementById('app');
  /* One place says what the mode is, and the stylesheet reads the same place:
     the watermark is a rule keyed on this attribute, so it cannot fall out of
     step with the flag the renderer was handed. */
  document.body.dataset.mode = viewMode;
  /* The report is built before the profile is resolved, because until a path is
     chosen there IS no profile — profileForPath() refuses an unknown key rather
     than defaulting to one of the two, and a report silently rendered as the
     wrong path is worse than one that does not render. Still one buildReport()
     per render: the model is assembled from this object, never from a second. */
  const report = buildReport(selection);

  if (!report.ready) {
    /* No acquisition chosen yet. The report does not exist — which is not the
       same as its being empty — so only the question is drawn. */
    /* With the setup panel gone there is no separate question screen: the frame
       is drawn and the scanner cell is simply unset. Nothing is staged until an
       acquisition is named, and the page says so rather than showing an empty
       report a reader might take for a finished one. */
    document.body.classList.remove('path-chosen');
    const view = {mode: viewMode, bmiPopupOpen: bmiPopupOpen};
    currentRoute = entryRoute(null, selection, view);
    app.innerHTML = toolbar({mode: viewMode}, false, sampleMenuAllowed(), sampleScenarioList()) +
      '<div class="page" id="clinical">' +
      masthead(profileForPath('other')) + patientMeta(selection, view) +
      studyMeta(selection, profileForPath('other')) +
      '<p class="note">Choose the scanner above to build the report. Nothing is ' +
      'staged until an acquisition is named.</p></div>';
  } else {
    document.body.classList.add('path-chosen');
    const profile = profileForPath(selection.path);
    const model = buildModel(report, profile, selection);
    const view = {mode: viewMode, bmiPopupOpen: bmiPopupOpen};
    currentRoute = entryRoute(model, selection, view);
    app.innerHTML = toolbar({mode: viewMode}, true, sampleMenuAllowed(), sampleScenarioList()) +
      renderReport(model, profile, selection,
                   {app: V2_APP_VERSION,
                    disclaimer: V2_DISCLAIMER_VERSION,
                    ackTs: window.__ackTs},
                   view);
  }
  wireSelectionScreen();
  /* Last, because the elements it looks for are the ones just written. */
  applyPendingFocus();
}

function wireSelectionScreen() {
  const app = document.getElementById('app');
  /* Wired first, and OUTSIDE the sheets: while the sample is loaded both sheets
     carry `inert`, and a control inside an inert subtree cannot be pressed —
     including the one control that leaves the mode. */
  /* W-152: the only `data-sample` button left is "View Sample" (`load`) — the
     sample-mode exit moved to the `data-action="new-report"` control below,
     which is present in both modes. */
  app.querySelectorAll('button[data-sample]').forEach(el =>
    el.addEventListener('click', () => enterSample()));
  app.querySelectorAll('button[data-action="new-report"]').forEach(el =>
    el.addEventListener('click', newReport));
  /* W-116 / W-161. Scenario menu: picking an option re-enters SAMPLE mode
     loading that case. Drawn only in SAMPLE mode (render.js `toolbar()`); a
     listener on an element that was never drawn is simply never called. */
  app.querySelectorAll('select[data-sample-scenario]').forEach(el =>
    el.addEventListener('change', () => enterSample(el.value)));
  /* The print button calls the WRAPPED window.print() above — never
     `nativePrint` — so the terms and the acquisition stay a single gate that
     the button, the keyboard shortcut and the stylesheet all answer to. */
  app.querySelectorAll('button[data-action="print"]').forEach(el =>
    el.addEventListener('click', () => window.print()));
  /* W-151: the `data-action="toggle-theme"` click binding was here (W-131). It
     is gone with the toolbar button — restore both, plus the module-top
     `applyTheme(readTheme())` call above, to bring dark mode back. */
  app.querySelectorAll('button[data-action="toggle-bmi-calc"]').forEach(el =>
    el.addEventListener('click', toggleBmiPopup));
  app.querySelectorAll('button[data-action="close-bmi-calc"]').forEach(el =>
    el.addEventListener('click', closeBmiPopup));
  /* W-017 round 2, ungated in W-129. "Send e-mail" opens the clinician's OWN
     mail client on a `mailto:` draft — it opens no network request of any
     kind, so the report never leaves the browser (feedback.test.js E12 locks
     that half over this file). The button is `disabled` in the markup unless
     the report is ready and we are not in a sample (render.js `toolbar`); the
     guard here is belt-and-braces. `buildRequestorEmail` is render.js's pure
     builder — the model is rebuilt from the current selection, the same
     recompute pattern the reference filter above uses. Its recipient is
     always empty (no e-mail field exists to source one from); the clinician
     types it in themselves.
     W-132: `window.print()` (the SAME wrapped, gated function the Print/Save
     PDF button calls — never a second gate) fires FIRST, before the mailto:
     dispatch. No browser lets a page attach a generated file to an outgoing
     mailto: draft (checked six ways — no mailto: attachment parameter, no
     Clipboard/File-System/Web-Share route without a secure https context,
     which file:// never has; CHANGELOG.md carries the reasoning), so this is
     the closest the report can get to "PDF first, then attach it to the
     e-mail": the dialog opens, and only once it is dismissed does the draft
     open with a sentence telling the clinician to attach what they just
     saved. */
  app.querySelectorAll('button[data-action="send-requestor"]').forEach(el =>
    el.addEventListener('click', () => {
      if (el.disabled) return;
      window.print();
      const profile = profileForPath(selection.path);
      const mail = buildRequestorEmail(
        buildModel(buildReport(selection), profile, selection),
        selection,
        {app: V2_APP_VERSION, disclaimer: V2_DISCLAIMER_VERSION, ackTs: window.__ackTs});
      window.location.href = 'mailto:' + mail.to +
        '?subject=' + encodeURIComponent(mail.subject) +
        '&body=' + encodeURIComponent(mail.body);
    }));
  /* W-066: the reference filter. It hides ROWS ON SCREEN and nothing else — no
     record leaves the model, the group headings stay so the reader can see which
     measurement a surviving row belongs to, and the print stylesheet restores
     every hidden row unconditionally. Bound here with a listener, because a
     handler written into the markup would be a second place this behaviour is
     decided (W-052). */
  app.querySelectorAll('#ref-filter').forEach(el =>
    el.addEventListener('input', () => {
      const q = el.value.trim().toLowerCase();
      app.querySelectorAll('.mtab.reflist tr.d-row').forEach(tr => {
        tr.hidden = !!q && tr.textContent.toLowerCase().indexOf(q) === -1;
      });
    }));
  /* The patient and study text cells, the tier radios and the remove switches.
     `removed` is view state and never enters `selection`: it is a printing
     choice, and a presentation flag pushed through selection.js would reach the
     pure model (W-030 § 6). */
  app.querySelectorAll('input[data-axis]').forEach(el =>
    el.addEventListener('change', () => {
      const patch = {};
      const axis = el.getAttribute('data-axis');
      patch[axis] = el.value === ''
        ? null
        : (axis === 'age' ? Number(el.value) : el.value);
      selection = applySelection(selection, patch);
      reRender();
    }));
  /* W-063b. The bottom-of-page `tierOffer` scope radio is gone (render.js): a
     Tier-2 group checkbox raises `selection.scope` on its own now — see the
     `input[data-performed-group]` handler below. Nothing emits `name="scope"`
     any more, so no listener is wired for it. */
  app.querySelectorAll('button[data-remove]').forEach(el =>
    el.addEventListener('click', () => {
      removed[el.getAttribute('data-remove')] = true;
      reRender();
    }));
  app.querySelectorAll('input[name="path"]').forEach(el =>
    el.addEventListener('change', () => {
      selection = applySelection(selection, {path: el.value});
      reRender();
    }));
  app.querySelectorAll('select[data-axis]').forEach(el =>
    el.addEventListener('change', () => {
      /* The placeholder reads back as null, NOT as the empty string: '' would
         reach profileForPath() and throw, and a crash is worse than an unbuilt
         report. null is a real modelled state (selection.js says so). */
      const patch = {};
      patch[el.dataset.axis] = el.value === '' ? null : el.value;
      selection = applySelection(selection, patch);
      reRender();
    }));
  app.querySelectorAll('select[data-domain]').forEach(el =>
    el.addEventListener('change', () => {
      const t = {}; t[el.dataset.domain] = el.value || null;
      selection = applySelection(selection, {techniques: t});
      reRender();
    }));
  app.querySelectorAll('select[data-product]').forEach(el =>
    el.addEventListener('change', () => {
      const pr = {}; pr[el.dataset.product] = el.value || null;
      selection = applySelection(selection, {products: pr});
      reRender();
    }));
  app.querySelectorAll('input[data-value]').forEach(el =>
    el.addEventListener('change', () => {
      const v = {}; v[el.dataset.value] = el.value === '' ? null : Number(el.value);
      selection = applySelection(selection, {values: v});
      reRender();
    }));
  /* The tri-state context controls (W-015), e.g. ascites: 'not provided' reads
     back as null, never as false — "nobody answered" and "answered no" are
     different facts (buildContext, report.js), and only the true/false string
     carries a recorded answer. */
  app.querySelectorAll('select[data-value]').forEach(el =>
    el.addEventListener('change', () => {
      const v = {};
      v[el.dataset.value] = el.value === '' ? null : (el.value === 'true');
      selection = applySelection(selection, {values: v});
      reRender();
    }));
  /* W-063b. The purpose toggle: one checkbox per GROUP now, not per parameter
     — Tier-1 (fat/iron/fibrosis) in performedBlock, Tier-2 (t1/ct1/adc) in
     tier2Block (render.js). Checked patches `true`, unchecked `false`; there
     is no third state to preserve.

     For a Tier-2 group the change ALSO lifts selection.scope: it is recomputed
     as the highest SCOPE_CHOICES tier any currently-checked Tier-2 group needs,
     read from the model's own rows (row.scope.quantification) — never a list
     written here. A quantification not in SCOPE_CHOICES ('unknown', 'none',
     null) gives indexOf === -1 and counts as tier 0. If no Tier-2 group is
     checked the result is SCOPE_CHOICES[0] ('native'), so unchecking the last
     raised group drops scope back down. Tier-1 groups never touch scope. */
  app.querySelectorAll('input[data-performed-group]').forEach(el =>
    el.addEventListener('change', () => {
      const group = el.dataset.performedGroup;
      const patch = {performed: {}};
      patch.performed[group] = el.checked;
      if (TIER2_GROUPS.indexOf(group) !== -1) {
        const rows = buildReport(selection).rows;
        let tier = 0;
        app.querySelectorAll('input[data-performed-group]').forEach(c => {
          const g = c.dataset.performedGroup;
          if (TIER2_GROUPS.indexOf(g) === -1) return;
          if (!c.checked) return;
          const param = GROUP_PARAMETERS[g][0];
          const row = rows.filter(r => r.parameter === param)[0];
          const q = row && row.scope ? row.scope.quantification : null;
          const idx = SCOPE_CHOICES.indexOf(q);
          if (idx > tier) tier = idx;
        });
        /* A typed value floors the scope tier so a measured reading is never
           dropped off the report by a checkbox (spec § 10): if any Tier-2
           parameter carries a value in selection.values, raise `tier` to the
           tier that parameter needs — even when its box is now unchecked. */
        TIER2_GROUPS.forEach(g => {
          const param = GROUP_PARAMETERS[g][0];
          const v = selection.values[param];
          if (v === null || v === undefined) return;
          const row = rows.filter(r => r.parameter === param)[0];
          const q = row && row.scope ? row.scope.quantification : null;
          const idx = SCOPE_CHOICES.indexOf(q);
          if (idx > tier) tier = idx;
        });
        patch.scope = SCOPE_CHOICES[tier];
      }
      selection = applySelection(selection, patch);
      reRender();
    }));

  /* W-134. The "also open" line's Hide/Show shortcut (render.js
     performedAlsoOpen): flip a comma-separated set of Tier-1 purpose groups at
     once, to the state named by data-perf-to. Same `performed` axis as the
     per-group checkboxes above; Tier-1 only, so no selection.scope recompute
     (that is the Tier-2 rule). */
  app.querySelectorAll('button[data-perf-set]').forEach(el =>
    el.addEventListener('click', () => {
      const groups = el.dataset.perfSet.split(',').filter(Boolean);
      const to = el.dataset.perfTo === 'true';
      const patch = {performed: {}};
      groups.forEach(g => { patch.performed[g] = to; });
      selection = applySelection(selection, patch);
      reRender();
    }));
}

/* ATTACHED ONCE, and deliberately not inside wireSelectionScreen(): that
   function runs after every render, and while the CHILDREN of #app are replaced
   by the render, #app itself is not — a listener added there would stack one
   handler per render until a single Tab jumped several fields at once.
   entry.test.js I4e holds this. */
document.getElementById('app').addEventListener('keydown', onEntryTab);

initDisclaimerGate();
