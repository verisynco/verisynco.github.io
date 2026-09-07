/* VeriLiv — THE ACCESS DOOR  (W-165, rebuilt W-166)
 * ===========================================================================
 * A one-screen page that sits between the public landing page and the report.
 * A visitor types the e-mail their invitation was sent to; if that address is
 * on a short in-page list, the door continues to the report, and otherwise it
 * shows a way to ask.
 *
 * WHAT THIS IS, STATED HERE BECAUSE IT DECIDES EVERY LINE BELOW
 *   The site is static and served publicly. Everything in this file runs in the
 *   visitor's own browser, and the report keeps its own public address. So the
 *   list gates THIS PAGE, not the report: a person who knows the report's
 *   address opens it without seeing this page, and a person who reads the
 *   source can step around it. This is a COURTESY door with a real check on
 *   the front — it is not access control, the page never says it is, and
 *   access.test.js section G is what keeps that promise from rotting.
 *
 * W-166 — WHY TALLY IS GONE
 *   The W-165 door sent the visitor to a third-party form, asked for the
 *   e-mail a second time there, and accepted any address. The
 *   developer's decision (2026-09-07): drop Tally entirely, check the typed
 *   address against an in-page allow-list, stay on verisyn.co. This reverses
 *   the W-165 rejection of a client-side allow-list; journal/completed/W-166.md
 *   records the decision and the two limits that still hold (the report stays
 *   public; the list holds hashes, not addresses).
 *
 * WHY IT WRITES THE FEEDBACK LAYER'S OWN RECORD
 *   W-161 gave the trial feedback layer a self-declared e-mail, kept in
 *   localStorage so a reporter types it once. The door writes that same record
 *   under that same key, so a visitor who came through here is already named
 *   when they file a defect from a card, and the panel never asks. The key is
 *   restated rather than imported — v2/feedback/feedback.js is not modified —
 *   and the suite proves the two literals agree.
 *
 * RUNTIME CONSTRAINTS (CLAUDE.md § 6)
 *   Plain script, no module syntax, no dependency, no build step, and no
 *   network request of any kind. crypto.subtle is a local digest, not a
 *   request. The module.exports tail is what lets the Node suite load this
 *   very file.
 * ===========================================================================
 */

/* Its own namespace. Nothing here shares a version with the report, because
   nothing here can change what the report says. */
const ACCESS_VERSION = '2.0';

/* The literal, and the reason it is a literal, are in the header above. */
const IDENTITY_KEY = 'veriliv.v2.feedback.identity';

/* Shape limit. Not a rule about people — 254 is the longest address a mail
   system will carry. */
const EMAIL_MAX = 254;

/* THE ALLOW-LIST. SHA-256 hex of each invited address, normalised the way
   `hashEmail` normalises: String(email).trim().toLowerCase(), and nothing
   else (no gmail dot/plus folding). Only hashes live here — the plain
   addresses are never committed, so a public repo does not publish the
   invitee list, and there are no identifying comments beside the hashes for
   the same reason. An empty list denies everyone.

   To manage the list: keep the plain addresses one per line in the
   gitignored file access/allowlist.txt, then run
     node access/tools/hash-allowlist.js
   which rewrites the array below from that file. Commit access.js; never
   commit allowlist.txt. Reproduce a single hash:
     node -e "const c=require('crypto');console.log(c.createHash('sha256').update(process.argv[1].trim().toLowerCase()).digest('hex'))" 'someone@example.org'
*/
const ALLOWED_HASHES = [
  '1a3c91e16248fc39210026f36743b517070e25c61fd0c5d482dc157ba0867944',
  '4d860a4f97988d35cef2f16e779d7ae6e46b19049957358402e33077fb70da71',
  'f7ba8dba273a301f7f5cbb3529aef903821640a7d9ba65b2457fe6120bca9453'
];


/* ═══════════════════════════════════════════════════════════ THE RECORD ══
   The store arrives as an argument so the pure layer is testable from Node,
   and every path degrades to null / false rather than throwing: a private
   window or a storage policy must cost the visitor a re-typed address, never
   a broken page. */
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


/* ══════════════════════════════════════════════ THE FIELD, SHAPE ONLY ══
   This answers "could this be an address" and nothing else. A static page has
   no way to learn whether an address exists or belongs to the person typing
   it. */
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


/* ═══════════════════════════════════════════════════ THE HASH AND THE GATE ══
   SHA-256 of the normalised address. In a browser this is crypto.subtle (a
   local digest, asynchronous); under Node it is the crypto module. Both paths
   return a Promise so the caller is the same. When neither is available the
   promise REJECTS, and the browser half shows an honest "this preview needs a
   current browser" message rather than silently letting everybody through. */
function toHex(buf) {
  const b = new Uint8Array(buf);
  let out = '';
  for (let i = 0; i < b.length; i++) out += b[i].toString(16).padStart(2, '0');
  return out;
}

function hashEmail(email) {
  const norm = String(email == null ? '' : email).trim().toLowerCase();
  try {
    if (typeof require === 'function') {
      const nodeCrypto = require('crypto');
      if (nodeCrypto && nodeCrypto.createHash) {
        return Promise.resolve(nodeCrypto.createHash('sha256').update(norm).digest('hex'));
      }
    }
  } catch (e) { /* not a Node context — fall through to WebCrypto */ }
  if (typeof crypto !== 'undefined' && crypto.subtle && typeof TextEncoder !== 'undefined') {
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(norm)).then(toHex);
  }
  return Promise.reject(new Error('no SHA-256 available'));
}

/* True iff the address passes the shape check AND its hash is on the list.
   `hashes` is an argument so the suite does not depend on whether the shipped
   ALLOWED_HASHES has been populated yet; the browser calls it with one. */
function isAllowed(email, hashes) {
  const list = hashes || ALLOWED_HASHES;
  if (!emailLooksValid(email)) return Promise.resolve(false);
  return hashEmail(email).then(h => list.indexOf(h) !== -1);
}


/* ═════════════════════════════════════════ WHICH SCREEN THE DOOR DRAWS ══
   Async and list-aware (W-166): a returning visitor is "known" only while
   their stored e-mail still passes the shape check AND its hash is still on
   the list. Taking someone off the list locks them out on their next visit —
   the state is re-derived every time, never trusted from a stored flag. A
   record from before the name field was dropped still works; its name is
   carried but not required. */
function doorState(store, hashes) {
  const rec = readIdentity(store);
  if (!rec || !emailLooksValid(rec.email)) {
    return Promise.resolve({known: false, name: null, email: null});
  }
  return isAllowed(rec.email, hashes).then(function (ok) {
    return ok
      ? {known: true, name: rec.name, email: rec.email}
      : {known: false, name: null, email: null};
  }).catch(function () {
    return {known: false, name: null, email: null};
  });
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

  function draw() {
    return doorState().then(function (state) {
      known.hidden = !state.known;
      first.hidden = state.known;
      if (state.known) {
        const who = $('known-who');
        if (who) who.textContent = state.email;
      }
    }).catch(function () { /* keep the first-visit panel showing */ });
  }

  /* A real href, not a click handler alone: the returning visitor's control is
     an anchor, so it must survive a middle-click, a right-click and a keyboard
     open-in-new-tab the same way every other link on the page does. */
  const cont = $('continue-known');
  if (cont) cont.setAttribute('href', target);

  const form = $('identity-form');
  if (form) {
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      const mailEl = $('visitor-email');
      const err = $('form-error');
      const notList = $('not-on-list');
      const mail = mailEl ? mailEl.value.trim() : '';
      if (notList) notList.hidden = true;
      if (!emailLooksValid(mail)) {
        if (err) err.textContent = 'Please enter an e-mail address in the usual form.';
        if (mailEl) mailEl.focus();
        return;
      }
      if (err) err.textContent = '';
      isAllowed(mail).then(function (ok) {
        if (ok) {
          writeIdentity({email: mail});
          loc.href = target;
        } else if (notList) {
          notList.hidden = false;
        }
      }).catch(function () {
        if (err) err.textContent =
          'This preview needs a current browser opened from its web address.';
      });
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
    ACCESS_VERSION, IDENTITY_KEY, ALLOWED_HASHES,
    readIdentity, writeIdentity, clearIdentity,
    emailLooksValid, hashEmail, isAllowed, doorState, entryTarget
  };
}
