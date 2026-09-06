/* VeriLiv — THE ACCESS DOOR  (W-165)
 * ===========================================================================
 * A one-screen page that sits between the public landing page and the report.
 * It tells the visitor the preview is by invitation, lets somebody who has one
 * introduce themselves once, and points somebody who has not at a form.
 *
 * WHAT THIS IS NOT, STATED HERE BECAUSE IT DECIDES EVERY LINE BELOW
 *   The site is static and served publicly. Everything in this file runs in the
 *   visitor's own browser, so a person who knows the report's address opens it
 *   without ever seeing this page, and a person who reads the page source can
 *   step around it. This is a COURTESY door: it states the rule, records who
 *   the visitor says they are, and offers a way to ask. It is not access
 *   control, the page never says it is, and access.test.js section G is what
 *   keeps that promise from rotting.
 *
 * WHY IT WRITES THE FEEDBACK LAYER'S OWN RECORD
 *   W-161 gave the trial feedback layer a self-declared name and e-mail, kept
 *   in localStorage so a reporter types them once. The door writes that same
 *   record under that same key, so a visitor who came through here is already
 *   named when they file a defect from a card, and the panel never asks. The
 *   key is restated rather than imported — v2/feedback/feedback.js is not
 *   modified — and the suite proves the two literals agree, so a rename over
 *   there fails a test here instead of silently emptying a column in the form.
 *
 * A REAL LOG, NOT A SILENT ONE (round 3, 2026-09-06)
 *   The first time somebody enters through the door, they are sent on to a
 *   SECOND Tally form (`veri.Liver — check-in`, short code OD2zpM) before the
 *   report opens — a real page, where they press Tally's own Submit button.
 *   That is a navigation the visitor completes, exactly the W-071 pattern the
 *   feedback layer already uses (a URL, never a request this code issues), so
 *   it costs nothing against G4/G5. What it buys: the developer gets an actual
 *   row per first-time visitor, because a real submission happened — not a
 *   client-side log only this browser ever sees. The check-in form's own
 *   "redirect after submission" setting sends the browser on to this door's
 *   forward target once Tally has recorded the row; this file does not
 *   control that redirect, Tally does, and it was proved live (2026-09-06, a
 *   real submission through Edge headless landed on the report's own terms
 *   screen) rather than assumed. A returning visitor — known already — skips
 *   this entirely and goes straight in.
 *
 *   Prefill was tried and dropped: Tally's free plan does not expose a
 *   URL-parameter prefill for an ordinary question (only Share/Embed/Template
 *   links), so passing `?email=…` reached the page and changed nothing —
 *   confirmed by loading the real form with the parameter set and reading
 *   back an empty box, not assumed from Tally's docs. Typing the address
 *   twice (once at the door, once on Tally's own page) is the honest cost of
 *   a real external submission instead of an invented shortcut.
 *
 * RUNTIME CONSTRAINTS (CLAUDE.md § 6)
 *   Plain script, no module syntax, no dependency, no build step, and no
 *   network request of any kind. The invitation link is a navigation the
 *   visitor chooses, not something this page issues. The module.exports tail is
 *   what lets the Node suite load this very file.
 * ===========================================================================
 */

/* Its own namespace. Nothing here shares a version with the report, because
   nothing here can change what the report says. */
const ACCESS_VERSION = '1.2';

/* The literal, and the reason it is a literal, are in the header above. */
const IDENTITY_KEY = 'veriliv.v2.feedback.identity';

/* The invitation-request form, created 2026-09-06. This short code IS the
   contract with Tally: change it and the button quietly points at somebody
   else's form, so the suite pins the literal. Null is still the honest value
   when no form exists — it withdraws the button rather than inventing an
   address, the rule TALLY.surveyFormId follows in the feedback layer. */
const INVITE_REQUEST_FORM_ID = 'zx9qlZ';

/* The check-in form a first-time invited visitor is sent to (round 3). Its
   own "redirect after submission" setting — configured in Tally, not here —
   is what carries the browser on to the report; this code only builds the
   address, it never learns whether the redirect fired. */
const CHECKIN_FORM_ID = 'OD2zpM';

/* Shape limit. Not a rule about people — 254 is the longest address a mail
   system will carry. The door collects e-mail only (round 3): a name added
   nothing a Tally row does not already carry once the visitor is the one
   submitting it. */
const EMAIL_MAX = 254;


/* ═══════════════════════════════════════════════════════════ THE RECORD ══
   The store arrives as an argument so the pure layer is testable from Node,
   and every path degrades to null / false rather than throwing: a private
   window or a storage policy must cost the visitor a re-typed name, never a
   broken page. */
function identityStore(store) {
  try { return store || (typeof localStorage !== 'undefined' ? localStorage : null); }
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

function clearIdentity(store) {
  try {
    const s = identityStore(store);
    if (!s) return false;
    s.removeItem(IDENTITY_KEY);
    return true;
  } catch (e) { return false; }
}


/* ══════════════════════════════════════════════ THE FIELDS, SHAPE ONLY ══
   These answer "could this be an address" and nothing else. A static page has
   no way to learn whether an address exists or belongs to the person typing
   it, and a check that implied otherwise would be the page lying about what
   it knows. */
function emailLooksValid(v) {
  if (typeof v !== 'string') return false;
  const s = v.trim();
  if (!s || s.length > EMAIL_MAX) return false;
  if (/\s/.test(s)) return false;
  const at = s.split('@');
  if (at.length !== 2) return false;
  const local = at[0], domain = at[1];
  if (!local) return false;
  if (domain.indexOf('.') <= 0) return false;
  if (domain.charAt(domain.length - 1) === '.') return false;
  return true;
}


/* ═════════════════════════════════════════ WHICH SCREEN THE DOOR DRAWS ══
   A record counts as a returning visitor once its e-mail still passes the
   shape check — the only field the door collects (round 3). A record from
   before that round may still carry a name; it is returned as-is but nothing
   here requires it. */
function doorState(store) {
  const rec = readIdentity(store);
  if (rec && emailLooksValid(rec.email)) {
    return {known: true, name: rec.name, email: rec.email};
  }
  return {known: false, name: null, email: null};
}


/* ═══════════════════════════════════════════════ WHERE THE DOOR FORWARDS ══
   The report opens with its feedback panel already out (?fb=open), which is
   what the landing page's button used to do directly. Anything else the door
   was given travels on unchanged — an old per-person invitation link (?r=…) is
   still read by the feedback layer, and dropping it here would quietly
   un-tag every submission from an invited reader. */
function entryTarget(search) {
  const pairs = String(search === undefined || search === null ? '' : search)
    .replace(/^\?/, '')
    .split('&')
    .filter(p => p && p.split('=')[0] !== 'fb');
  return '../v2/index.html?fb=open' + (pairs.length ? '&' + pairs.join('&') : '');
}


/* ══════════════════════════════════════════════ THE INVITATION REQUEST ══ */
function inviteRequestUrl(formId) {
  const f = formId === undefined ? INVITE_REQUEST_FORM_ID : formId;
  if (!f || typeof f !== 'string') return null;
  return 'https://tally.so/r/' + f;
}


/* ══════════════════════════════════════════════════ THE CHECK-IN (round 3) ══
   No prefill (see the header note on why) — a bare link to the form. The
   e-mail is not even used to build the URL; it exists as a parameter only so
   a caller cannot pass an invalid address through by accident. */
function checkinUrl(email) {
  if (!emailLooksValid(email)) return null;
  return 'https://tally.so/r/' + CHECKIN_FORM_ID;
}


/* ══════════════════════════════════════════════════════════ THE BROWSER ══
   Everything above is pure. This half runs only in a page, touches the DOM and
   nothing else, and is the only part the Node suite does not execute. */
function mountDoor(doc, loc) {
  const $ = id => doc.getElementById(id);
  const first = $('first-visit');
  const known = $('known-visitor');
  const stamp = $('access-version');
  if (!first || !known) return;
  const target = entryTarget(loc.search);

  if (stamp) stamp.textContent = ACCESS_VERSION;

  const request = $('request-invite');
  const requestNote = $('request-note');
  if (request) {
    const url = inviteRequestUrl();
    if (url) {
      request.setAttribute('href', url);
      if (requestNote) requestNote.hidden = true;
    } else {
      /* No form yet. A button that goes nowhere is worse than no button, so it
         is withdrawn and the note beside it says why. */
      request.hidden = true;
      if (requestNote) requestNote.hidden = false;
    }
  }

  function draw() {
    const state = doorState();
    known.hidden = !state.known;
    first.hidden = state.known;
    if (state.known) {
      const who = $('known-who');
      if (who) who.textContent = state.email;
    }
  }

  /* A real href, not a click handler alone: the returning visitor's control is
     an anchor, so it must survive a middle-click, a right-click and a keyboard
     open-in-new-tab the same way every other link on the page does. A known
     visitor already has a real Tally row from their first visit, so this one
     skips the check-in form and goes straight to the report. */
  const cont = $('continue-known');
  if (cont) cont.setAttribute('href', target);

  const form = $('identity-form');
  if (form) {
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      const mailEl = $('visitor-email');
      const err = $('form-error');
      const mail = mailEl ? mailEl.value.trim() : '';
      if (!emailLooksValid(mail)) {
        if (err) err.textContent = 'Please enter an e-mail address in the usual form.';
        if (mailEl) mailEl.focus();
        return;
      }
      if (err) err.textContent = '';
      writeIdentity({email: mail});
      /* First visit goes through the check-in form (round 3), not straight
         into the report — see the header note above. */
      loc.href = checkinUrl(mail);
    });
  }

  const notYou = $('not-you');
  if (notYou) {
    notYou.addEventListener('click', function (ev) {
      ev.preventDefault();
      clearIdentity();
      draw();
      const mailEl = $('visitor-email');
      if (mailEl) mailEl.focus();
    });
  }

  draw();
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { mountDoor(document, window.location); });
  } else {
    mountDoor(document, window.location);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ACCESS_VERSION, IDENTITY_KEY, INVITE_REQUEST_FORM_ID, CHECKIN_FORM_ID,
    readIdentity, writeIdentity, clearIdentity,
    emailLooksValid, doorState, entryTarget, inviteRequestUrl, checkinUrl
  };
}
