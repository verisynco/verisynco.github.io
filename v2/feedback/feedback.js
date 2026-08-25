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

const FEEDBACK_VERSION = '1.0';

/* A token names a clinician to the developer's own list and to nothing else.
   The page never asks for a name or an address, and none travels. */
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

/* THE LAYER'S FIRST STATEMENT IS A REFUSAL, and it names which condition failed
   rather than returning a bare false: a trial link that quietly does nothing is
   indistinguishable from a broken one, and the reason is what tells the
   developer which of the three to fix. */
function activationState(env) {
  const e = env || {};
  const localhost = e.hostname === 'localhost' || e.hostname === '127.0.0.1';
  const secure = e.protocol === 'https:' || (e.protocol === 'http:' && localhost);
  if (!secure) return {active: false, reason: 'not-https'};
  if (readInvite(e.search) === null) return {active: false, reason: 'no-invite'};
  if ((e.bodyClasses || []).indexOf('gate-accepted') === -1) {
    return {active: false, reason: 'terms-not-accepted'};
  }
  return {active: true, reason: 'ok'};
}

/* ══════════════════════════════════════════════════ THE ALLOW-LIST (§ 4.1)
   Twelve names, and `buildPayload` writes each one explicitly. This is
   deliberately NOT a deny-list: written the other way, a field added next month
   leaves the browser without anyone deciding that it should, and no assertion
   in the suite would see it.

   The names are also the contract with Tally: form XxPG6Y carries twelve hidden
   fields named exactly these, verified on 2026-08-25 by a submission that
   populated all twelve columns. A rename here empties a column there, silently
   — nothing errors, the clinician's comment still arrives, and the context it
   was about is simply gone. */
const PAYLOAD_FIELDS = Object.freeze([
  'invite', 'path', 'fieldStrength', 'cohort', 'techniques', 'versions',
  'param', 'band', 'sev', 'reason', 'view', 'viewportWidth'
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
    band:          card.band === undefined ? null : card.band,
    sev:           card.sev === undefined ? null : card.sev,
    reason:        card.reason === undefined ? null : card.reason,
    view:          c.view || null,
    viewportWidth: c.viewportWidth === undefined ? null : c.viewportWidth
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
  'What this sends: your invite code, the acquisition you selected, the band ' +
  'your reading fell in, and what you write. It never sends the measurements ' +
  'you typed, the accession number, the study date or the age.';

function cardButtonHtml(param, label) {
  return '<button type="button" class="fb-flag" data-fb-param="' + esc(param) + '"' +
         ' aria-label="Report a problem with ' + esc(label) + '">Report</button>';
}

function readCardFacts(el) {
  const d = (el && el.dataset) || {};
  return {
    param:  d.param === undefined ? null : d.param,
    band:   d.band === undefined ? null : d.band,
    sev:    d.sev === undefined ? null : d.sev,
    reason: d.reason === undefined ? null : d.reason
  };
}

/* A CLOSED PANEL HOLDS NO FRAME. The third party is not contacted because the
   page was opened; it is contacted because the clinician asked to report
   something. */
function panelHtml(state) {
  const st = state || {};
  const tab = '<button type="button" class="fb-tab" data-fb-open' +
              ' aria-label="Report a problem with this report">Feedback</button>';
  if (!st.open || !st.src) return '<div class="fb-root">' + tab + '</div>';
  return '<div class="fb-root">' + tab +
    '<div class="fb-panel" role="dialog" aria-label="Report a problem"' +
    ' data-fb-yield="false">' +
      '<div class="fb-head">' +
        '<p class="fb-title">Report a problem' +
          (st.param ? ' — ' + esc(st.param) : '') + '</p>' +
        '<button type="button" class="fb-close" data-fb-close' +
        ' aria-label="Close the feedback panel">Close</button>' +
      '</div>' +
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
  module.exports = {readInvite, activationState, buildPayload, PAYLOAD_FIELDS,
                    TALLY, payloadToQuery, formUrl,
                    cardButtonHtml, readCardFacts, panelHtml, NOTICE,
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
    const state = activationState({
      protocol: location.protocol,
      hostname: location.hostname,
      search: location.search,
      bodyClasses: Array.prototype.slice.call(document.body.classList)
    });
    /* THE WHOLE LAYER, UNDER file://, IS THIS BRANCH NOT TAKEN. */
    if (!state.active) return;

    const invite = readInvite(location.search);
    const app = document.getElementById('app');
    if (!app) return;

    const root = document.createElement('div');
    document.body.appendChild(root);

    let open = false, openParam = null, lastOpener = null;

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

    function srcFor(cardEl) {
      const facts = cardEl ? readCardFacts(cardEl)
                           : {param: null, band: null, sev: null, reason: null};
      return formUrl(buildPayload({
        invite: invite,
        selection: selectionFacts(),
        card: facts,
        view: document.body.getAttribute('data-mode') === 'sample' ? 'sample' : 'live',
        viewportWidth: window.innerWidth,
        versions: versions()
      }));
    }

    let pendingSrc = null;
    function draw() {
      root.innerHTML = panelHtml({open: open, param: openParam, src: pendingSrc});
    }

    function openFor(cardEl, opener) {
      pendingSrc = srcFor(cardEl);
      openParam = cardEl ? readCardFacts(cardEl).param : null;
      open = true;
      lastOpener = opener || null;
      counters.submissions += 1;
      draw();
      const frame = root.querySelector('.fb-frame');
      if (frame) frame.focus();
    }

    function close() {
      open = false; pendingSrc = null; openParam = null;
      draw();
      if (lastOpener && document.contains(lastOpener)) lastOpener.focus();
      lastOpener = null;
    }

    draw();

    document.addEventListener('click', function (e) {
      const flag = e.target.closest && e.target.closest('.fb-flag');
      if (flag) { openFor(flag.closest('.pcard'), flag); return; }
      if (e.target.closest && e.target.closest('[data-fb-open]')) {
        openFor(null, e.target); return;
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
      const cards = app.querySelectorAll('section.pcard');
      Array.prototype.forEach.call(cards, function (el) {
        if (el.querySelector('.fb-flag')) return;          /* idempotent */
        const f = readCardFacts(el);
        /* The accessible name uses the report's own label for the parameter
           where one is reachable, and the parameter id otherwise. It is read
           from the same table the card's heading was built from, never from the
           heading's text: reading the printed words back is the W-051 defect. */
        const labels = (typeof PARAMETER_LABELS === 'object' && PARAMETER_LABELS) || {};
        el.insertAdjacentHTML('beforeend',
          cardButtonHtml(f.param, labels[f.param] || f.param));
      });
    }
    new MutationObserver(function () {
      if (queued) clearTimeout(queued);
      queued = setTimeout(decorateCards, 50);
    }).observe(app, {childList: true, subtree: true});
    decorateCards();
  }());
}
