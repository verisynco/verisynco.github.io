/* VeriLiv V2 — TRIAL FEEDBACK LAYER  (W-071)
 * ---------------------------------------------------------------------------
 * A SHELL, NOT AN INTEGRATION. This file is loaded last and refuses to exist
 * unless all three conditions of the design § 3.2 hold: the page is served over
 * https, the URL carries an invite code, and the terms of use were accepted.
 * Under file:// none of that is true, so the layer writes no DOM node and opens
 * no connection — which is how CLAUDE.md § 6's offline guarantee survives a
 * layer that reaches a third party at all.
 *
 * NOTHING IS POSTED FROM HERE. Tally documents no endpoint that creates a
 * submission (GET and DELETE only), so the context travels in a URL and Tally's
 * own form — held in a sandboxed frame — collects the clinician's answers.
 * There is no fetch, no XMLHttpRequest and no sendBeacon in this repository.
 *
 * Spec: docs/superpowers/specs/2026-08-25-feedback-layer-design.md
 * ---------------------------------------------------------------------------
 */

/* W-162 round 2 moves this 1.4 -> 1.5: the feedback layer is a LIVE-report
   affordance now — over a sample report neither the pinned tab nor the
   per-card flag buttons are drawn (feedbackVisibleForMode), and a
   body[data-mode] observer draws them when the reader leaves the sample
   with "New Report". `?fb=open` from the landing page no longer opens on
   load; it is remembered and spent the first time the report is live. No
   network call, no gate condition changed, no clinical value. */
const FEEDBACK_VERSION = '1.5';

/* W-161. THE INVITE CODE IS RETIRED AS A GATE. Feedback is open to any reader
   who has accepted the terms on an https page — no code is distributed. Instead
   the reporter names themselves: the page asks for a name and an e-mail the
   first time the panel opens, keeps them in localStorage so they are not
   retyped (§ 5 of the terms text discloses this), and pre-fills them into the
   Tally URL. `readInvite` stays because an old `?r=…` link is still worth
   reading as a submission tag — it just no longer decides whether the layer
   appears. */
const INVITE_RE = /^[A-Za-z0-9_-]{1,64}$/;

function readInvite(search) {
  if (typeof search !== 'string' || search.length === 0) return null;
  const q = search.charAt(0) === '?' ? search.slice(1) : search;
  const hit = q.split('&').map(p => p.split('=')).filter(p => p[0] === 'r').map(p => p[1])[0];
  if (hit === undefined || hit === null) return null;
  let token;
  try { token = decodeURIComponent(hit); } catch (e) { return null; }
  return INVITE_RE.test(token) ? token : null;
}

/* W-162. A landing page deep-links straight into an open feedback panel by
   putting ?fb=open on the report URL. This is read exactly like the invite
   above — split, not a substring — and it only ever AUTO-OPENS a panel the
   https + terms gate has already allowed; it does not activate a refused
   layer, and the browser bootstrap routes it through the same requestOpen()
   the pinned tab uses, so a first-time reporter still meets the identity
   form. */
function wantsAutoOpen(search) {
  if (typeof search !== 'string' || search.length === 0) return false;
  const q = search.charAt(0) === '?' ? search.slice(1) : search;
  const hit = q.split('&').map(p => p.split('=')).filter(p => p[0] === 'fb').map(p => p[1])[0];
  if (hit === undefined || hit === null) return false;
  let val;
  try { val = decodeURIComponent(hit); } catch (e) { return false; }
  return val === 'open';
}

/* W-162 round 2. THE FEEDBACK LAYER BELONGS TO A LIVE REPORT, NOT THE SAMPLE.
   Over a SAMPLE report — the fabricated demonstration cases — neither the
   pinned tab nor the per-card flag buttons are drawn: a reader browsing the
   sample has nothing of their own to flag yet. They appear when the reader
   leaves the sample with "New Report" and the report goes live. `null` or an
   unknown mode reads as live, the same safe direction the payload's `view`
   field already takes. */
function feedbackVisibleForMode(mode) {
  return mode !== 'sample';
}

/* THE LAYER'S FIRST STATEMENT IS A REFUSAL, and it names which condition failed
   rather than returning a bare false: a trial link that quietly does nothing is
   indistinguishable from a broken one, and the reason is what tells the
   developer which of the three to fix. */
/* THE GATE IS ANSWERED ONCE FOR TWO OF ITS THREE CONDITIONS AND CONTINUOUSLY
   FOR THE THIRD, and the difference is where W-071's first live defect lived.
   The protocol and the invite are settled the moment the page loads and can
   never become true later. Acceptance of the terms is the opposite: at load it
   is normally FALSE, because the reader has not pressed the button yet. A layer
   that reads all three once and gives up is a layer that never appears for
   anybody who was not already holding an acknowledgement.

   Only one reason is worth waiting on, and it is named rather than inferred. */
function gateWatchNeeded(reason) {
  return reason === 'terms-not-accepted';
}

function activationState(env) {
  const e = env || {};
  const localhost = e.hostname === 'localhost' || e.hostname === '127.0.0.1';
  const secure = e.protocol === 'https:' || (e.protocol === 'http:' && localhost);
  if (!secure) return {active: false, reason: 'not-https'};
  /* W-161: no invite branch. Two conditions gate the layer now — a secure page
     and accepted terms — and 'no-invite' is a reason this function can no
     longer produce. */
  if ((e.bodyClasses || []).indexOf('gate-accepted') === -1) {
    return {active: false, reason: 'terms-not-accepted'};
  }
  return {active: true, reason: 'ok'};
}

/* ══════════════════════════════════════ THE REPORTER'S OWN IDENTITY (W-161)
   Self-declared, kept in localStorage so it is typed once, injected via a
   `store` argument so the pure layer stays testable and a blocked store (a
   private window, storage disabled) degrades to null rather than throwing. */
const IDENTITY_KEY = 'veriliv.v2.feedback.identity';

function identityStore(store) {
  if (store) return store;
  try { return typeof localStorage !== 'undefined' ? localStorage : null; }
  catch (e) { return null; }
}

function readIdentity(store) {
  try {
    const s = identityStore(store);
    if (!s) return null;
    const raw = s.getItem(IDENTITY_KEY);
    if (!raw) return null;
    const rec = JSON.parse(raw);
    if (!rec || typeof rec !== 'object') return null;
    return {name: rec.name || null, email: rec.email || null};
  } catch (e) { return null; }
}

function writeIdentity(id, store) {
  try {
    const s = identityStore(store);
    if (!s) return false;
    s.setItem(IDENTITY_KEY, JSON.stringify({
      name: (id && id.name) || null, email: (id && id.email) || null
    }));
    return true;
  } catch (e) { return false; }
}

/* ══════════════════════════════════════════════════ THE ALLOW-LIST (§ 4.1)
   Twelve names, and `buildPayload` writes each one explicitly. This is
   deliberately NOT a deny-list: written the other way, a field added next month
   leaves the browser without anyone deciding that it should, and no assertion
   in the suite would see it.

   The names are also the contract with Tally: form XxPG6Y carries these hidden
   fields named exactly this way, verified on 2026-08-25 by a submission that
   populated every column. A rename here empties a column there, silently
   — nothing errors, the clinician's comment still arrives, and the context it
   was about is simply gone.

   `paramLabel` is the thirteenth and was added because `param` alone reads as a
   filing id. A column of `pdff` and `t1` is a column somebody has to translate
   before they can act on it, and the form itself cannot say WHICH reading it is
   asking about unless the readable name is one of the fields it holds. */
const PAYLOAD_FIELDS = Object.freeze([
  'invite', 'path', 'fieldStrength', 'cohort', 'techniques', 'versions',
  'param', 'paramLabel', 'band', 'sev', 'reason', 'view', 'viewportWidth',
  /* W-161 — the reporter's own name and e-mail, self-declared in the page.
     Tally form XxPG6Y must carry these two fields or their columns arrive
     empty while every other field keeps working. */
  'reporterName', 'reporterEmail'
]);

/* THE BAND TRAVELS, THE VALUE DOES NOT, and that is the load-bearing decision.
   The band is what makes a staging complaint reproducible; the number the
   clinician typed adds nothing to that and would put a measurement onto a third
   party's server, which is the sentence "V2 must not be used to interpret
   patient data" losing its meaning by the back door. */
function buildPayload(ctx) {
  const c = ctx || {};
  const s = c.selection || {};
  const card = c.card || {};
  const v = c.versions || {};
  const t = s.techniques || {};
  return {
    invite:        c.invite || null,
    path:          s.path || null,
    fieldStrength: s.fieldStrength || null,
    cohort:        s.cohort || null,
    techniques:    Object.keys(t).sort().map(k => k + '=' + t[k]).join(' '),
    versions:      [v.app, v.thresholds, v.cutoffs, v.disclaimer].join('/'),
    param:         card.param || null,
    paramLabel:    card.paramLabel || null,
    band:          card.band === undefined ? null : card.band,
    sev:           card.sev === undefined ? null : card.sev,
    reason:        card.reason === undefined ? null : card.reason,
    view:          c.view || null,
    viewportWidth: c.viewportWidth === undefined ? null : c.viewportWidth,
    /* W-161. Only from c.reporter — never reconstructed from the selection. */
    reporterName:  (c.reporter && c.reporter.name) || null,
    reporterEmail: (c.reporter && c.reporter.email) || null
  };
}

/* ══════════════════════════════════════════════ THE URL, AND NOT A REQUEST
   Tally documents no endpoint that creates a submission, so the context travels
   as a query string and lands in the form's twelve hidden fields. `surveyFormId`
   is null until the closing-questions form exists, and null means the survey
   does not offer itself rather than pointing somewhere invented. */
const TALLY = {formId: 'XxPG6Y', surveyFormId: null};

function payloadToQuery(payload) {
  return PAYLOAD_FIELDS
    .filter(k => payload[k] !== null && payload[k] !== undefined && payload[k] !== '')
    .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(String(payload[k])))
    .join('&');
}

function formUrl(payload) {
  return 'https://tally.so/r/' + TALLY.formId + '?' + payloadToQuery(payload);
}

/* ══════════════════════════════════════════════════════════ THE SURFACES
   Escaping is done here rather than imported from the renderer: this file must
   not depend on the report, and a shell that borrows one function from the
   thing it is a shell for is no longer a shell. */
function esc(s) {
  return String(s === null || s === undefined ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* Said in the terms gate and again here, because the second place is where the
   clinician is actually about to type. */
const NOTICE =
  'What this sends: the name and e-mail you enter, the acquisition you ' +
  'selected, the band your reading fell in, and what you write. It never ' +
  'sends the measurements you typed, the accession number, the study date ' +
  'or the age. Your name and e-mail are kept in this browser so you need ' +
  'not retype them.';

/* NOT "Report". The document this layer sits on top of is called a report on
   every surface it has — the print button, the sheets, the footer — so a control
   labelled Report under a parameter reads as a second way to produce one. The
   word was reported as confusing by the developer on 2026-08-25 and is the only
   thing on this control that changed. */
/* A PENNANT, DRAWN RATHER THAN TYPED. The obvious glyph is the emoji flag, and
   it is rejected twice over: it renders red on most platforms, which would
   re-import through the back door the clinical colour v2/feedback/feedback.css
   explains at length why this control must not carry, and it is drawn by the
   operating system, so nothing in this suite could assert what actually
   reached the page. This one inherits `currentColor`, so it is the button's
   colour in every state including the inverted one, and it is hidden from
   assistive technology: the accessible name is already on `aria-label`, and a
   glyph exposed beside it is that name announced a second time in a worse
   vocabulary. The words stay -- an icon-only control is a control whose
   meaning has to be guessed. */
const FLAG_GLYPH =
  '<svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true" focusable="false">' +
  '<path d="M2.7 1.1v9.8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" fill="none"/>' +
  '<path d="M3.9 1.7h5.9L8.1 4.2l1.7 2.5H3.9z" fill="currentColor"/>' +
  '</svg>';

function cardButtonHtml(param, label) {
  return '<button type="button" class="fb-flag" data-fb-param="' + esc(param) + '"' +
         ' aria-label="Flag an issue with ' + esc(label) + '">' +
         FLAG_GLYPH + 'Flag issue</button>';
}

/* `labels` is the report's own parameter table, passed in rather than reached
   for: this file must not depend on the report (§ the shell rule above), and a
   lookup that silently finds nothing must degrade to the id rather than to an
   empty name. */
function readCardFacts(el, labels) {
  const d = (el && el.dataset) || {};
  const param = d.param === undefined ? null : d.param;
  const table = labels || {};
  return {
    param:      param,
    paramLabel: param === null ? null : (table[param] || param),
    band:       d.band === undefined ? null : d.band,
    sev:        d.sev === undefined ? null : d.sev,
    reason:     d.reason === undefined ? null : d.reason
  };
}

/* ONE QUESTION, DERIVED FROM THE CARD RATHER THAN LISTED PER PARAMETER. A hand
   written prompt for each of the eight parameters would be eight sentences with
   no source, drifting apart the first time one card's behaviour changed. What
   the card already states is enough to ask the right question: a reading that
   landed in a band is a question about that band, a parameter that could not be
   staged is a question about the refusal, and the corner control — which belongs
   to no card — asks nothing extra and lets the form ask its own.

   The band is quoted in the card's own word. Nothing here interprets it. */
function promptFor(facts) {
  const f = facts || {};
  if (!f.param) return null;
  const name = f.paramLabel || f.param;
  if (f.band !== null && f.band !== undefined && f.band !== '') {
    return 'This card placed ' + name + ' in the ' + f.band + ' band. ' +
           'Does that match your own reading, and is the card clear about why?';
  }
  if (f.reason !== null && f.reason !== undefined && f.reason !== '') {
    return name + ' was not staged. Should it have been, and is the reason the ' +
           'card gives usable at the scanner?';
  }
  return null;
}

/* A CLOSED PANEL HOLDS NO FRAME. The third party is not contacted because the
   page was opened; it is contacted because the clinician asked to report
   something. */
function panelHtml(state) {
  const st = state || {};
  const tab = '<button type="button" class="fb-tab" data-fb-open' +
              ' aria-label="Report a problem with this report">Feedback</button>';
  if (!st.open || !st.src) return '<div class="fb-root">' + tab + '</div>';
  /* THE PANEL NAMES THE PARAMETER THE WAY THE CARD DOES. It printed the record
     id — `pdff`, `t1` — which is the L9 rule arriving on a surface nobody had
     applied it to: an internal filing id is not something a clinician can use. */
  const name = st.paramLabel || st.param || null;
  const prompt = promptFor(st);
  return '<div class="fb-root">' + tab +
    '<div class="fb-panel" role="dialog" aria-label="Flag an issue"' +
    ' data-fb-yield="false">' +
      '<div class="fb-head">' +
        '<p class="fb-title">Flag an issue' +
          (name ? ' · ' + esc(name) : '') + '</p>' +
        '<button type="button" class="fb-close" data-fb-close' +
        ' aria-label="Close the feedback panel">Close</button>' +
      '</div>' +
      (prompt ? '<p class="fb-prompt">' + esc(prompt) + '</p>' : '') +
      '<p class="fb-notice">' + esc(NOTICE) + '</p>' +
      '<iframe class="fb-frame" title="Trial feedback form"' +
      ' src="' + esc(st.src) + '"' +
      ' sandbox="allow-forms allow-scripts allow-same-origin"' +
      ' referrerpolicy="no-referrer" loading="lazy"></iframe>' +
    '</div></div>';
}

/* ══════════════════════════════════════════════ THE EXIT SURVEY (§ 6, § 13)
   Three fields, not twelve: the closing questions are about the report as a
   whole, so a card's band and refusal have nothing to say there, and a field
   carried for no reason is one somebody later reads as meaningful. */
const SURVEY_FIELDS = Object.freeze(['invite', 'path', 'versions']);

function surveyDue(counters) {
  const c = counters || {};
  return !c.surveyShown && (c.printed === true || (c.submissions || 0) >= 2);
}

/* Null until the second Tally form exists. Null means the survey does not
   offer itself — NOT a disabled button and not a placeholder: a control that
   cannot work is worse than no control, because the reader spends attention
   deciding to ignore it. */
function surveyUrl(ctx) {
  if (TALLY.surveyFormId === null) return null;
  const c = ctx || {};
  const q = SURVEY_FIELDS
    .filter(k => c[k] !== null && c[k] !== undefined && c[k] !== '')
    .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(String(c[k])))
    .join('&');
  return 'https://tally.so/r/' + TALLY.surveyFormId + '?' + q;
}

function surveyPromptHtml(url) {
  if (!url) return '';
  return '<div class="fb-survey" role="note">' +
    '<p class="fb-title">Four closing questions, if you have a minute.</p>' +
    '<button type="button" class="fb-tab" data-fb-survey-open' +
    ' aria-label="Open the four closing questions">Answer</button>' +
    '<button type="button" class="fb-close" data-fb-survey-skip' +
    ' aria-label="Skip the closing questions">Skip</button>' +
    '</div>';
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {readInvite, wantsAutoOpen, feedbackVisibleForMode, activationState, gateWatchNeeded, buildPayload, PAYLOAD_FIELDS,
                    readIdentity, writeIdentity, IDENTITY_KEY,
                    TALLY, payloadToQuery, formUrl,
                    cardButtonHtml, readCardFacts, promptFor, panelHtml, NOTICE,
                    surveyDue, surveyUrl, surveyPromptHtml, SURVEY_FIELDS,
                    FEEDBACK_VERSION};
}


/* ══════════════════════════════════════════════════════ BROWSER BOOTSTRAP
   Everything above is pure and is what the suite tests. Everything below runs
   only in a browser, only when invited, and touches the report in exactly two
   ways: it appends one root element BESIDE #app, and it appends one button to
   each parameter card. It reads no text, changes no value, and removes
   nothing. */
if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  (function () {
    function gate() {
      return activationState({
        protocol: location.protocol,
        hostname: location.hostname,
        search: location.search,
        bodyClasses: Array.prototype.slice.call(document.body.classList)
      });
    }

    const first = gate();
    /* THE WHOLE LAYER, UNDER file://, IS THIS BRANCH NOT TAKEN. */
    if (!first.active) {
      if (!gateWatchNeeded(first.reason)) return;
      /* The terms may still be accepted. Watch the one attribute that says so,
         and stop watching the moment it does — this observer exists to answer a
         question once, not to follow the page around. */
      const gateWatch = new MutationObserver(function () {
        if (gate().active) { gateWatch.disconnect(); start(); }
      });
      gateWatch.observe(document.body, {attributes: true, attributeFilter: ['class']});
      return;
    }
    start();

    function start() {
    const invite = readInvite(location.search);
    const app = document.getElementById('app');
    if (!app) return;

    const root = document.createElement('div');
    document.body.appendChild(root);

    let open = false, openFacts = null, lastOpener = null;
    /* W-162. ?fb=open opens the panel once. The latch stops it from fighting a
       manual close or re-firing on a later re-render. W-162 round 2: it no
       longer fires on load — `pendingAutoOpen` remembers the intent and
       `maybeAutoOpen()` spends it the first time the report is live. */
    let autoOpened = false, pendingAutoOpen = false;

    /* W-162 round 2. The mode is written to body[data-mode] on every render
       (app.js). The layer draws nothing while it says 'sample'. */
    function currentMode() {
      return document.body.getAttribute('data-mode') === 'sample' ? 'sample' : 'live';
    }
    function layerLive() { return feedbackVisibleForMode(currentMode()); }

    /* W-161. The reporter names themselves once. `identity` is re-read from the
       store on every request rather than cached, so an edit in one tab is seen
       in the next use; `needIdentity` is the transient state of showing the
       little form; `pendingCard` is the card the reporter clicked while the
       form was up. */
    let identity = readIdentity();
    let needIdentity = false, pendingCard = null;

    function idFormHtml() {
      const n = esc((identity && identity.name) || '');
      const em = esc((identity && identity.email) || '');
      return '<form class="fb-identity" data-fb-identity>' +
        '<p class="fb-prompt">Tell the trial who is reporting. Kept in this ' +
        'browser so you enter it once; it never identifies a patient.</p>' +
        '<label class="fb-idrow">Name' +
          '<input type="text" name="name" value="' + n + '" autocomplete="name" required></label>' +
        '<label class="fb-idrow">E-mail' +
          '<input type="email" name="email" value="' + em + '" autocomplete="email"></label>' +
        '<button type="submit" class="fb-tab" data-fb-identity-submit>Continue</button>' +
      '</form>';
    }

    function idEditHtml() {
      const who = (identity && identity.name) || 'anonymous';
      return '<button type="button" class="fb-idedit" data-fb-identity-edit' +
        ' aria-label="Change the name and e-mail used for feedback">' +
        'Reporting as ' + esc(who) + ' — change</button>';
    }

    /* The report's own parameter table, read once per use and never cached: the
       page can be rebuilt under this layer at any moment (W-046). */
    function labelTable() {
      return (typeof PARAMETER_LABELS === 'object' && PARAMETER_LABELS) || {};
    }

    /* WHAT IS COUNTED IS REPORTS OPENED, NOT REPORTS SENT, and the difference is
       not hidden behind the field name by accident -- it cannot be closed. The
       form lives in a cross-origin frame, so this page cannot observe whether
       the clinician pressed submit inside it. Counting opens over-counts: a
       clinician who opens the panel twice and sends nothing still meets the
       survey. That is the conservative direction for a prompt (it appears a
       little early rather than never), and it is the wrong direction for a
       measurement, which is why no submission count is reported anywhere. */
    const counters = {printed: false, submissions: 0, surveyShown: false};

    function versions() {
      return {
        app: typeof V2_APP_VERSION === 'string' ? V2_APP_VERSION : null,
        thresholds: typeof V2_THRESHOLDS_VERSION === 'string' ? V2_THRESHOLDS_VERSION : null,
        cutoffs: typeof CUTOFFS_VERSION === 'string' ? CUTOFFS_VERSION : null,
        disclaimer: typeof V2_DISCLAIMER_VERSION === 'string' ? V2_DISCLAIMER_VERSION : null
      };
    }

    /* The selection is read for four named fields and nothing else. The layer
       is never handed the values object, so the allow-list is not the only
       thing standing between the payload and the patient's numbers. */
    function selectionFacts() {
      const s = (typeof selection === 'object' && selection) || {};
      return {path: s.path || null, fieldStrength: s.fieldStrength || null,
              cohort: s.cohort || null, techniques: s.techniques || {}};
    }

    function srcFor(facts) {
      return formUrl(buildPayload({
        invite: invite,
        reporter: identity || null,
        selection: selectionFacts(),
        card: facts,
        view: document.body.getAttribute('data-mode') === 'sample' ? 'sample' : 'live',
        viewportWidth: window.innerWidth,
        versions: versions()
      }));
    }

    let pendingSrc = null;
    function draw() {
      /* W-162 round 2. Nothing over a sample — not the tab, not the panel. */
      if (!layerLive()) { root.innerHTML = ''; return; }
      /* W-161. Identity first: no Tally frame is built until a name is known. */
      if (needIdentity) {
        root.innerHTML = '<div class="fb-root"><div class="fb-panel" role="dialog"' +
          ' aria-label="Identify yourself for the trial"><div class="fb-head">' +
          '<p class="fb-title">Flag an issue</p>' +
          '<button type="button" class="fb-close" data-fb-close' +
          ' aria-label="Close the feedback panel">Close</button></div>' +
          idFormHtml() + '</div></div>';
        const inp = root.querySelector('.fb-identity input');
        if (inp) inp.focus();
        return;
      }
      const f = openFacts || {};
      root.innerHTML = panelHtml({
        open: open, src: pendingSrc,
        param: f.param || null, paramLabel: f.paramLabel || null,
        band: f.band === undefined ? null : f.band,
        reason: f.reason === undefined ? null : f.reason
      });
      if (open) {
        const panel = root.querySelector('.fb-panel');
        if (panel) panel.insertAdjacentHTML('beforeend', idEditHtml());
      }
    }

    function openFor(cardEl, opener) {
      openFacts = cardEl
        ? readCardFacts(cardEl, labelTable())
        : {param: null, paramLabel: null, band: null, sev: null, reason: null};
      pendingSrc = srcFor(openFacts);
      open = true;
      lastOpener = opener || null;
      counters.submissions += 1;
      draw();
      const frame = root.querySelector('.fb-frame');
      if (frame) frame.focus();
    }

    /* W-161. Every open goes through here: if no name is stored, show the
       identity form and remember which card to open once it is filled. */
    function requestOpen(cardEl, opener) {
      lastOpener = opener || null;
      pendingCard = cardEl || null;
      identity = readIdentity();
      if (!identity || !identity.name) { needIdentity = true; draw(); return; }
      needIdentity = false;
      openFor(pendingCard, lastOpener);
    }

    function close() {
      open = false; needIdentity = false; pendingSrc = null; openFacts = null;
      draw();
      if (lastOpener && document.contains(lastOpener)) lastOpener.focus();
      lastOpener = null;
    }

    /* W-162 round 2. ?fb=open no longer opens on load — the reader lands on
       the sample. The intent is spent the first time the report is live (the
       "New Report" click), through the same pinned-tab path a manual open
       uses, so a first-time reporter still meets the identity form. */
    function maybeAutoOpen() {
      if (autoOpened || !pendingAutoOpen || !layerLive()) return;
      autoOpened = true;
      requestOpen(null, root.querySelector('[data-fb-open]'));
    }

    draw();

    document.addEventListener('submit', function (e) {
      const form = e.target.closest && e.target.closest('[data-fb-identity]');
      if (!form) return;
      e.preventDefault();
      const nameEl = form.querySelector('input[name="name"]');
      const mailEl = form.querySelector('input[name="email"]');
      const name = (nameEl && nameEl.value || '').trim();
      const email = (mailEl && mailEl.value || '').trim();
      if (!name) { if (nameEl) nameEl.focus(); return; }
      writeIdentity({name: name, email: email});
      identity = readIdentity();
      needIdentity = false;
      openFor(pendingCard, lastOpener);
    });

    document.addEventListener('click', function (e) {
      const flag = e.target.closest && e.target.closest('.fb-flag');
      if (flag) { requestOpen(flag.closest('.pcard'), flag); return; }
      if (e.target.closest && e.target.closest('[data-fb-identity-edit]')) {
        needIdentity = true; draw();
        const inp = root.querySelector('.fb-identity input');
        if (inp) inp.focus();
        return;
      }
      if (e.target.closest && e.target.closest('[data-fb-open]')) {
        requestOpen(null, e.target); return;
      }
      if (e.target.closest && e.target.closest('[data-fb-close]')) { close(); }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && open) close();
    });

    /* Focus Not Obscured (WCAG 2.2 AA). The panel steps aside rather than
       hoping it never overlaps the control a keyboard user just reached. */
    document.addEventListener('focusin', function (e) {
      const panel = root.querySelector('.fb-panel');
      if (!panel) return;
      const inside = panel.contains(e.target);
      const box = panel.getBoundingClientRect();
      const t = e.target.getBoundingClientRect ? e.target.getBoundingClientRect() : null;
      const overlaps = t && !(t.right < box.left || t.left > box.right ||
                              t.bottom < box.top || t.top > box.bottom);
      panel.setAttribute('data-fb-yield', (!inside && overlaps) ? 'true' : 'false');
    });

    window.addEventListener('afterprint', function () { counters.printed = true; });

    /* #app is rebuilt in one write on every `change` (W-046), so anything placed
       inside it is destroyed. The observer re-attaches after each render; the
       root above is OUTSIDE #app and is never touched by it. */
    let queued = null;
    function decorateCards() {
      /* W-162 round 2. No flag button on a sample card. */
      if (!layerLive()) return;
      const cards = app.querySelectorAll('section.pcard');
      Array.prototype.forEach.call(cards, function (el) {
        if (el.querySelector('.fb-flag')) return;          /* idempotent */
        /* The accessible name uses the report's own label for the parameter
           where one is reachable, and the parameter id otherwise. It is read
           from the same table the card's heading was built from, never from the
           heading's text: reading the printed words back is the W-051 defect. */
        const f = readCardFacts(el, labelTable());
        /* INTO THE VERDICT COLUMN, NOT ONTO THE END OF THE CARD. The card is a
           three-column grid; a fourth child appended to it becomes a grid item
           of its own, wraps to a new row and stretches the full width -- which
           is what shipped once, and what a reader reasonably read as a broken
           panel under every measurement. .pverdict is an existing grid item
           (the third column), an ordinary block, so a button placed there is
           just the next thing in it -- the same reasoning that used to argue
           for .pident.

           W-107 MOVED IT HERE FROM .pident, and the reason is which column is
           SHORT. .pident carries the label, the acquisition line, the value
           and sometimes a method control -- it is the card's tallest column in
           nearly every state, and appending a 44px-tall button to its bottom
           stretched the whole grid row with it (the developer's own reading of
           a printed card). .pverdict carries only the chip and one small
           ".vfrom" line, so it almost always has slack the button can sit in
           without growing the row at all. */
        const host = el.querySelector('.pverdict') || el;
        host.insertAdjacentHTML('beforeend', cardButtonHtml(f.param, f.paramLabel));
      });
    }
    new MutationObserver(function () {
      if (queued) clearTimeout(queued);
      queued = setTimeout(decorateCards, 50);
    }).observe(app, {childList: true, subtree: true});
    decorateCards();

    /* W-162 round 2. The #app observer above only re-runs decorateCards; the
       pinned tab is drawn by draw(), which it never calls. body[data-mode]
       flips when the reader leaves the sample with "New Report" — watch it,
       redraw the tab, decorate the (fresh) cards, and spend a pending
       ?fb=open the first time the report is live. Kept for the life of the
       layer: the mode can flip back and forth (View Sample). */
    let lastMode = currentMode();
    new MutationObserver(function () {
      const m = currentMode();
      if (m === lastMode) return;
      lastMode = m;
      if (m === 'sample') {
        if (open || needIdentity) close();
        root.innerHTML = '';
        return;
      }
      draw();
      decorateCards();
      maybeAutoOpen();
    }).observe(document.body, {attributes: true, attributeFilter: ['data-mode']});

    /* W-162 round 2. ?fb=open is remembered, not fired on load — see
       maybeAutoOpen(). It resolves now (live report loaded directly, an
       unusual path) or on the first mode flip to live (the normal one). */
    pendingAutoOpen = wantsAutoOpen(location.search);
    maybeAutoOpen();
    }
  }());
}
