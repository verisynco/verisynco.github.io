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

const V2_RENDER_VERSION = '3.3';   /* W-071: the card states its band and refusal as data */

const _RN = (typeof module !== 'undefined' && module.exports)
  ? (function () {
      const p = require('path');
      const d = require(p.join(__dirname, 'domains.js'));
      const sel = require(p.join(__dirname, 'selection.js'));
      const rep = require(p.join(__dirname, 'report.js'));
      const ven = require(p.join(__dirname, 'vendors.js'));
      const sc = require(p.join(__dirname, 'scope.js'));
      return {DOMAIN_OF: d.DOMAIN_OF, CONTROLLED_DOMAINS: d.CONTROLLED_DOMAINS,
              optionsForDomain: d.optionsForDomain, displayExamples: d.displayExamples,
              PATHS: sel.PATHS, FIELD_STRENGTHS: sel.FIELD_STRENGTHS,
              AGE_GROUPS: sel.AGE_GROUPS, SCOPE_CHOICES: sel.SCOPE_CHOICES,
              INDICATIONS: sel.INDICATIONS,
              defaultTechniques: sel.defaultTechniques,
              PARAMETER_LABELS: rep.PARAMETER_LABELS, PARAMETER_UNITS: rep.PARAMETER_UNITS,
              orderCards: rep.orderCards,
              groupCardsByDomain: rep.groupCardsByDomain,
              CONTEXT_INPUTS: rep.CONTEXT_INPUTS, buildContext: rep.buildContext,
              orderReferences: ven.orderReferences,
              V2_SCOPE_VERSION: sc.V2_SCOPE_VERSION,
              SCOPE_VERSION: require(p.join(__dirname, '..', 'data', 'scope.data.js')).SCOPE_VERSION,
              REFERENCES: require(p.join(__dirname, '..', 'data', 'references.data.js')).REFERENCES};
    })()
  : {DOMAIN_OF: DOMAIN_OF, CONTROLLED_DOMAINS: CONTROLLED_DOMAINS,
     optionsForDomain: optionsForDomain, displayExamples: displayExamples,
     PATHS: PATHS, FIELD_STRENGTHS: FIELD_STRENGTHS, AGE_GROUPS: AGE_GROUPS,
     SCOPE_CHOICES: SCOPE_CHOICES, INDICATIONS: INDICATIONS,
     defaultTechniques: defaultTechniques,
     PARAMETER_LABELS: PARAMETER_LABELS, PARAMETER_UNITS: PARAMETER_UNITS,
     orderCards: orderCards, groupCardsByDomain: groupCardsByDomain,
     CONTEXT_INPUTS: CONTEXT_INPUTS, buildContext: buildContext,
     orderReferences: orderReferences, V2_SCOPE_VERSION: V2_SCOPE_VERSION,
     SCOPE_VERSION: SCOPE_VERSION, REFERENCES: REFERENCES};

/* ─────────────────────────────────────────────────────────────────── LABELS */

const DOMAIN_LABELS = {
  pdff: 'PDFF method', iron: 'Iron method', mre: 'MRE method',
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
   control. The order is V1's; the numbering is counted, not written. */
const DOMAIN_ORDER = ['pdff', 'iron', 'mre', 't1', 'ct1', 'adc'];
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

/* ───────────────────────────────────────────────── WHERE A PARAMETER LANDS
   The mount point is resolved per row by js/scope.js and read here. This table
   is the whole of the renderer's placement logic: a row is drawn in the section
   whose `mount` equals its `mountPoint`, and a section that collects no row is
   not written — nor is the sheet that would hold only empty sections. Adding a
   tier means adding a row here, never a conditional below. */
/* ───────────────────────────────────────────────── WHERE A PARAMETER LANDS
   The mount point is resolved per row by js/scope.js and read here. This table
   is the whole of the renderer's placement logic: a row is drawn in the section
   whose `mount` equals its `mountPoint`, and a section that collects no row is
   not written. Adding a tier means adding a row here, never a conditional below.

   `tag` is the SHORT tier tag printed on the card. The long note is not printed
   beside the card; it goes to the methodology sheet, which prints every time. */
const SECTIONS = [
  /* `grouped` is W-035: the cards on the clinical page are printed under the
     domain heading they belong to. The two tier sections below stay flat --
     they already carry their own title and note, and a second heading level
     inside a short list costs page budget for a grouping the reader can see
     at a glance (developer decision, 2026-08-24). */
  {id: 'clinical', mount: 'page1-inline', tag: null, title: null, note: null,
   grouped: true},
  {id: 'thirdparty', mount: 'page2-thirdparty', tag: 'third-party',
   title: 'Third-party quantification',
   note: 'These measurements are quantified by a product other than the scanner ' +
         'vendor\u2019s own software. The parameter, its ladder and its provenance are ' +
         'the same as the rest of the report; the product that measures it is what ' +
         'differs. This says nothing about regulatory status, which this repository ' +
         'does not record.'},
  {id: 'research', mount: 'page2-research', tag: 'research',
   title: 'Research measurements',
   note: 'This repository records no clinical quantification product for these ' +
         'measurements. They are printed because they were acquired, and whatever ' +
         'is said about them is said with that in mind.'}
];

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
  let html = '<label class="method screen-only">' +
    '<span class="mlabel">Acquisition method</span>' +
    '<select data-domain="' + esc(domain) + '">' +
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
    if (ex.length) html += '<span class="mex">' + esc(ex.join(' \u00b7 ')) + '</span>';
  }
  return html + '</label>';
}

/* ═════════════════════════════════════════════════════════════════ THE FRAME
   V1's page IS the form, so the separate setup panel does not exist: the
   controls live in the report's own rows and are hidden under @media print. */

function masthead(profile) {
  return '<div class="masthead">' +
    '<div><div class="lockup">VERISYNCO \u00b7 <b>VeriLiv</b></div>' +
    '<h1>Liver MRI \u2014 Quantitative Mapping Report</h1>' +
    '<div class="sub">Measurements in, published staging out, every cut-off shown ' +
    'with its source.</div>' +
    '<p class="detail">This report converts quantitative liver MRI measurements into ' +
    'stages drawn from named, peer-reviewed cut-offs. Each parameter is shown against ' +
    'the consensus ladder that stages it and, where one exists, against the publication ' +
    'matched to the stated indication. Where no published cut-off covers a measurement, ' +
    'the report says so instead of printing a number. It is an educational reference ' +
    'tool, not a diagnostic device, and does not replace radiologist interpretation.</p>' +
    /* The badge is the PROFILE's field, not a new string written here. */
    '<span class="badge">' + esc(profile.badge) + '</span></div></div>';
}

/* A CONTROL NEVER DISPLAYS A CHOICE THE MODEL HAS NOT MADE.
   `path` is the one axis whose modelled default is null — W-006 assumes no
   acquisition — and a <select> with no option marked `selected` shows its FIRST
   option regardless. That printed "GEHC SIGNA MR" over a null path: the report
   never built, and picking that same first entry fired no change event, so there
   was no way forward. The old setup panel asked this with radios, where "none
   checked" is representable; a select needs the placeholder to say it.

   Written for every axis rather than for `path`, because the next nullable axis
   would arrive with the same defect and no test would notice. */
function selectCell(label, axis, options, chosen, screenOnly) {
  const unset = chosen === null || chosen === undefined;
  return '<div class="cell' + (screenOnly ? ' screen-only' : '') + '"><label>' +
    esc(label) + '</label><select data-axis="' + esc(axis) + '">' +
    (unset ? '<option value="" selected>Not selected</option>' : '') +
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
function textCell(label, axis, value, placeholder) {
  const unset = value === null || value === undefined || String(value) === '';
  return '<div class="cell"><label>' + esc(label) + '</label>' +
    '<input data-axis="' + esc(axis) + '" value="' +
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
  /* Age does NOT derive the cohort: checked, not recalled — no adult/paediatric
     age boundary exists anywhere in v2/data/ or v2/js/, and writing one would
     put an unsourced boundary into a file that stages patients (§ 11.1). */
  {axis: 'cohort', label: 'Cohort',
   options: () => _RN.AGE_GROUPS.map(
     a => ({value: a, label: a === 'adult' ? 'Adult' : 'Paediatric'}))},
  {axis: 'indication', label: 'Indication',
   options: () => _RN.INDICATIONS.map(
     i => ({value: i, label: INDICATION_LABELS[i]}))}
];

const STUDY_CELLS = [
  {axis: 'fieldStrength', label: 'Field strength',
   options: () => _RN.FIELD_STRENGTHS.map(f => ({value: f, label: f}))},
  {axis: 'path', label: 'Scanner',
   options: () => Object.keys(_RN.PATHS).map(
     k => ({value: k, label: _RN.PATHS[k].label}))}
];

/* A cell with an option list is a <select>; a cell with a placeholder is a text
   box. The distinction is the descriptor's own shape, so a new cell declares
   what it is by what it carries. */
function metaCell(cell, selection) {
  return cell.options
    ? selectCell(cell.label, cell.axis, cell.options(), selection[cell.axis])
    : textCell(cell.label, cell.axis, selection[cell.axis], cell.placeholder);
}

function patientMeta(selection) {
  return '<div class="meta">' +
    IDENTITY_CELLS.map(c => metaCell(c, selection)).join('') +
    '</div>';
}

function studyMeta(selection, profile) {
  /* Each path states its CONSEQUENCE and claims nothing about accuracy. The
     sentence is the PROFILE's field, read here — never a path comparison, which
     is the branch K6 forbids. */
  const consequence = profile && profile.pathNote
    ? '<p class="pathnote screen-only">' + esc(profile.pathNote) + '</p>' : '';
  return '<div class="meta study">' +
    STUDY_CELLS.map(c => metaCell(c, selection)).join('') +
    '</div>' + consequence;
}

/* THE CLINICAL-CONTEXT BLOCK (W-015). Four optional fields beside the
   laboratory grid — same `.lc`/`data-value` shape for the three numeric
   fields, so the existing generic change handler in app.js picks them up with
   no new wiring. `ascites` is tri-state and cannot reuse a number input: "not
   provided" and "absent" are different facts (buildContext, report.js), so it
   renders as a three-option control whose default is unselected. */
function contextBlock(context) {
  if (!context) return '';
  const fields = _RN.CONTEXT_INPUTS.map(f => {
    if (f.type === 'boolean') {
      const v = context[f.key];
      return '<div class="lc"><label>' + esc(f.label) + '</label>' +
        '<select data-value="' + esc(f.key) + '">' +
        '<option value=""' + (v === null ? ' selected' : '') + '>not provided</option>' +
        '<option value="true"' + (v === true ? ' selected' : '') + '>present</option>' +
        '<option value="false"' + (v === false ? ' selected' : '') + '>absent</option>' +
        '</select></div>';
    }
    const value = context[f.key];
    return '<div class="lc"><label>' + esc(f.label) + '</label><div class="r2">' +
      '<input type="number" step="any" data-value="' + esc(f.key) + '" value="' +
      (value === null ? '' : esc(String(value))) + '"><span class="u">' +
      esc(f.unit || '') + '</span></div></div>';
  }).join('');

  return '<div class="labs-head ctx-head"><span class="t">Clinical context (optional)</span></div>' +
    '<div class="labs-grid">' + fields + '</div>';
}

function labsBlock(labs, selection) {
  if (!labs) return '';
  const grid = labs.inputs.map(f =>
    '<div class="lc"><label>' + esc(f.label) + '</label><div class="r2">' +
    '<input type="number" step="any" data-value="' + esc(f.key) + '" value="' +
    (f.value === null ? '' : esc(String(f.value))) + '"><span class="u">' +
    esc(f.unit) + '</span></div></div>').join('');

  return '<section class="labs" id="labs">' +
    '<div class="labs-head"><span class="t">Laboratory (supporting)</span>' +
    '<span class="derived">FIB-4 <b>' +
      (labs.fib4.value === null ? '\u2014' : esc(labs.fib4.value.toFixed(2))) +
    '</b> \u00b7 AST/ALT <b>' +
      (labs.aar.value === null ? '\u2014' : esc(String(labs.aar.value))) +
    '</b></span></div>' +
    '<div class="labs-grid">' + grid + '</div>' +
    /* The provenance prints WITH the value. CAL-0005 is editorial-unsourced and
       flagged formula-origin-not-in-workbook; it is not quietly dropped because
       the number is convenient (§ 4). */
    (labs.fib4.value !== null
      ? '<p class="labs-prov">FIB-4: ' + esc(labs.fib4.expression || '') +
        ' \u00b7 provenance ' + esc(labs.fib4.provenance || 'unrecorded') +
        (labs.fib4.flags.length ? ' \u00b7 ' + esc(labs.fib4.flags.join(', ')) : '') +
        '</p>' : '') +
    (labs.pending ? '<p class="labs-pending">' + esc(labs.pending) + '</p>' : '') +
    contextBlock(_RN.buildContext(selection)) +
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
  const span = axis[1] - axis[0];
  const innerW = RULER_W - RULER_PAD * 2;
  const xOf = v => RULER_PAD + Math.max(0, Math.min(1, (v - axis[0]) / (span || 1))) * innerW;
  /* The full-size bar starts lower and the box ends higher than before W-040:
     the units that carried the drawn tick values are gone with them, and the
     marker chip above the bar grew to hold a label declared at 11 px. */
  const barY = slim ? 3 : 22, barH = slim ? 6 : 13, H = slim ? 14 : 38;

  let s = '';
  for (const z of ruler.zones) {
    const x1 = xOf(z.a), x2 = xOf(z.b), w = x2 - x1;
    s += '<rect class="' + zoneClass(z.sev) + '" x="' + x1.toFixed(1) + '" y="' + barY +
         '" width="' + w.toFixed(1) + '" height="' + barH + '">' +
         '<title>' + esc((z.label || 'unnamed band') + (z.tag ? ' — ' + z.tag : '')) +
         '</title></rect>';
  }
  /* Interior edges only: the outer two are the frame, not published boundaries.
     The tick is the LINE. Its value is printed by tickLine(), in HTML, with the
     boundary's name and its published spread beside it — three things a drawn
     number never carried. */
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
      s += '<path class="mkf" d="M ' + (mx - 4.5).toFixed(1) + ' ' + (barY - 6) + ' L ' +
           (mx + 4.5).toFixed(1) + ' ' + (barY - 6) + ' L ' + mx.toFixed(1) + ' ' +
           (barY - 1.5) + ' Z"/>';
      const label = fmtVal(Number(ruler.value));
      const bw = Math.round(Math.max(30, label.length * 7.4 + 9) * 10) / 10;
      const bx = Math.max(RULER_PAD, Math.min(RULER_W - RULER_PAD - bw, mx - bw / 2));
      s += '<rect class="mkc" x="' + bx.toFixed(1) + '" y="1" width="' + bw +
           '" height="15" rx="3"/>' +
           '<text class="mkt" x="' + (bx + bw / 2).toFixed(1) + '" y="12" ' +
           'text-anchor="middle">' + esc(label) + '</text>';
    }
  }

  /* The screen-reader and greyscale-proof equivalent of the drawing: the same
     bands, in the same order, as words. */
  const spoken = ruler.zones.map(z => (z.label || 'unnamed') + ' ' +
                                 fmtTick(z.a) + ' to ' + fmtTick(z.b)).join(', ');
  return '<svg class="ruler' + (slim ? ' slim' : '') + '" viewBox="0 0 ' + RULER_W + ' ' + H +
         '" role="img" aria-label="' + esc(ruler.scaleLabel + ': ' + spoken) + '">' + s + '</svg>';
}

/* The bands as words, left to right — for EVERY ruler since W-040, not only the
   tight ones. It is the same sequence in the same order as the bar, so a reader
   can map one onto the other without counting, and it is the only place the names
   are now set at a size the reader actually receives. */
function bandLegend(ruler) {
  return '<p class="bands">' + ruler.zones.map(z =>
    '<span class="bd' + (z.sev ? ' bd-' + z.sev : '') + '">' +
    esc(z.label || 'unnamed') + '</span>').join('') + '</p>';
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

/* The boundary values as text, under the ruler. This is what the pre-W-028 table
   printed, and it stays because the drawing cannot carry a pooled spread: a tick
   is one number, and "17 (14–20, three sources)" is four. */
function tickLine(ruler) {
  return ruler.edges.map(e => {
    const spread = (e.n > 1 && e.min !== null && e.max !== null)
      ? ' (' + esc(e.min + '–' + e.max) + ')' : '';
    return '<span class="tk"><b>' + esc(e.boundary) + '</b> ' + esc(String(e.value)) +
           ' ' + esc(e.unit || '') + spread + '</span>';
  }).join('');
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
     the strip is, without a hover and without the methodology sheet in hand. */
  const shortCite = ruler.matchLabel
    ? ruler.matchLabel.split('—')[0].trim() +
      (ruler.scanner ? ' · ' + ruler.scanner.split(',')[0] : '')
    : null;
  const rung = (ruler.missingRungs && ruler.missingRungs.length)
    ? '<span class="norung">no ' + esc(ruler.missingRungs.join(', ')) + '</span>' : '';

  return '<div class="rul rul-' + esc(ruler.role) + '" data-role="' + esc(ruler.role) + '"' +
    (why.length ? ' title="' + esc(why.join('\n')) + '"' : '') + '>' +
    '<div class="rul-head"><span class="rul-scale">' + esc(ruler.scaleLabel) + '</span>' +
    '<span class="rul-role">' +
      esc(ruler.role === 'consensus' ? 'stages this value' : 'named for this indication') +
    '</span></div>' +
    drawnSvg +
    /* Unconditional. The names left the drawing at W-040, so this is not a
       fallback for a narrow bar any more — it is where the bands are named. */
    bandLegend(ruler) +
    '<p class="ticks">' + tickLine(ruler) +
      (shortCite ? ' <span class="cite">' + esc(shortCite) + '</span>' : '') + rung +
    '</p>' +
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
  return '<div class="rulers">' + ordered.map(r => rulerBlock(r, axis)).join('') + '</div>';
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
function valueAreaHtml(row, card, canDerive) {
  const unit = '<span class="unit">' + esc(_RN.PARAMETER_UNITS[row.parameter]) +
               '</span>';
  if (card.valueProvenance === 'derived') {
    return '<div class="pval derived' + (canDerive ? ' can-derive' : '') + '">' +
             '<span class="pderived">' + esc(String(row.value)) + '</span>' + unit +
             '<span class="dbadge">derived</span>' +
             '<label class="povr"><input type="number" step="any" data-value="' +
               esc(row.parameter) + '" value="">' +
               '<span class="ohint">override</span></label>' +
           '</div>';
  }
  return '<label class="pval' + (canDerive ? ' can-derive' : '') +
    '"><input type="number" step="any" data-value="' +
    esc(row.parameter) + '" value="' +
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

function parameterCard(row, card, selection, tag) {
  const controlled = _RN.CONTROLLED_DOMAINS.indexOf(row.domain) !== -1;
  const preset = _RN.defaultTechniques(selection.path);
  const showControl = controlled && !preset[row.domain];

  /* W-071. Two facts the card already prints, stated once more as data so that
     a consumer never has to read the printed sentence back. The band is the
     ladder's own published name and the refusal is the engine's own code -- both
     decided in report.js, neither derived here. Spec § 3.4. */
  const vd = card.verdict;
  const attrs = vd
    ? ' data-band="' + esc(vd.band) + '" data-sev="' + esc(vd.sev) + '"'
    : (card.gapCode ? ' data-reason="' + esc(card.gapCode) + '"' : '');

  return '<section class="pcard" data-param="' + esc(row.parameter) + '"' + attrs + '>' +
    '<div class="pident">' +
      (tag ? '<span class="ptag">' + esc(tag) + '</span>' : '') +
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
      valueAreaHtml(row, card, row.calibration !== null) +
      calibrationLineHtml(card, row.calibration !== null) +
      (showControl ? methodControl(selection, row.domain) : '') +
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
      (card.disagreement ? '<p class="disagree">' + esc(card.disagreement) + '</p>' : '') +
      (card.gap ? '<p class="gap">' + esc(card.gap) + '</p>' : '') +
      rowGapHtml(row) +
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

function sectionHtml(section, pairs, counter, build) {
  if (!pairs.length) return '';
  /* The title stays; the long note does NOT. Each card already carries the short
     tier tag, and the paragraph explaining what the tier means is a reason, not a
     fact — it goes to the methodology sheet, which prints every time (§ 6). */
  return '<section class="psection" id="section-' + esc(section.id) + '">' +
    (section.title ? '<h2>' + esc(section.title) + '</h2>' : '') +
    (section.grouped
      ? _RN.groupCardsByDomain(pairs).map(
          g => domainHeadHtml(g.domain) + g.pairs.map(build).join('')).join('')
      : pairs.map(build).join('')) +
    '</section>';
}

/* ═══════════════════════════════════════════════════════════ SHEET 3 — RECEIPTS */

function acquisitionSummary(profile, selection) {
  const p = _RN.PATHS[selection.path];
  return '<div class="acqsum">' +
    '<span class="badge">' + esc(profile.badge) + '</span>' +
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
  const techs = _RN.CONTROLLED_DOMAINS
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

/* A tier is offered ONLY when selecting it would add a measurement, counted from
   the model's own rows and never from a list written here. Measured 2026-08-23:
   no report parameter resolves to the research tier, so that control would change
   nothing when clicked and is not written. Screen only — the question is not a
   finding, and it adds nothing to the printed page. */
function tierOffer(model, selection) {
  const current = _RN.SCOPE_CHOICES.indexOf(selection.scope);
  const offers = [];
  for (let i = current + 1; i < _RN.SCOPE_CHOICES.length; i++) {
    const tier = _RN.SCOPE_CHOICES[i];
    const adds = model.report.rows.filter(
      r => !r.rendered && r.scope && r.scope.quantification === tier).length;
    if (adds > 0) offers.push({tier: tier, adds: adds});
  }
  if (!offers.length) return '';
  return '<section class="tier-offer screen-only"><h3>Measurements outside the ' +
    'current scope</h3>' +
    offers.map(o => '<label class="tier"><input type="radio" name="scope" value="' +
      esc(o.tier) + '"> ' + esc(SCOPE_LABELS[o.tier]) + ' \u2014 adds ' +
      esc(String(o.adds)) + ' measurement' + (o.adds === 1 ? '' : 's') +
      '</label>').join('') + '</section>';
}

function compositeSection(composite) {
  if (!composite) return '';
  const lines = composite.lines.map(l =>
    '<span class="chip' + (l.met ? ' met' : '') + '"><b>' + esc(l.label) + '</b> ' +
    esc(String(l.value)) + (l.unit ? ' ' + esc(l.unit) : '') +
    '<span class="from">' + esc(l.origin) + '</span>' +
    '<span class="test">' + esc(l.test) + '</span></span>').join('');
  return '<section class="composite"><div class="section-head"><h3>' +
    esc(composite.name) + '</h3><span class="rule"></span></div>' +
    (composite.pending
      ? '<p class="gap">' + esc(composite.pending) + '</p>'
      : '<div class="chips">' + lines + '</div>' + verdictChip(composite.verdict)) +
    '<p class="cnote">' + esc(composite.note) + '</p></section>';
}

/* W-015 split `impression` into `clinical` (this function) and `evidence` (the
   appendix Task 6 renders and gates on approval, per W-030 § 8). This function
   is a minimal adaptation so the page keeps building on the new shape — the
   citation chip and the printed appendix are Task 6's, not this task's. */
function impressionSection(clinical) {
  if (!clinical) return '';
  const c = clinical;
  const flags = c.notAssessed.map(n => n.text).concat(c.abstentions.map(a => a.text));
  return '<section class="impression"><h3>Impression</h3>' +
    '<p>' + esc(c.text) + '</p>' +
    (flags.length
      ? '<ul class="flags">' + flags.map(f => '<li>' + esc(f) + '</li>').join('') +
        '</ul>' : '') +
    '</section>';
}

function reportFooter(model, selection, versions) {
  return '<footer class="reportfoot">' +
    '<div class="disc">Educational reference tool. Verify technical quality and ' +
    'clinical context before reporting. Not a substitute for radiologist ' +
    'interpretation. See the methodology sheet for limitations and references.</div>' +
    '<pre id="ver-line">' + esc(stampText(model, selection, versions)) + '</pre>' +
    '<div id="ack-line">Disclaimer v' + esc(versions.disclaimer) + ' acknowledged ' +
    esc(new Date(versions.ackTs).toLocaleString('en-GB')) + '</div></footer>';
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
  let html = '';
  for (const section of SECTIONS) {
    const pairs = ordered.filter(p => p.row.mountPoint === section.mount);
    html += sectionHtml(section, pairs, counter,
                        p => parameterCard(p.row, p.card, selection, section.tag));
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
function toolbar(view, ready) {
  const sample = !!(view && view.mode === 'sample');
  return '<div class="toolbar screen-only">' +
    '<button type="button" class="tb-print" data-action="print"' +
      (ready ? '' : ' disabled') + '>Print / Save PDF</button>' +
    (ready
      ? ''
      : '<span class="tb-reason">Not ready to print: no acquisition has been ' +
        'selected yet.</span>') +
    (sample
      ? '<span class="tb-note">Sample data is loaded and the fields are locked.</span>' +
        '<button type="button" data-sample="clear">Clear values</button>'
      : '<button type="button" data-sample="load">Load example</button>') +
    '</div>';
}

function renderClinicalSheets(model, profile, selection, versions, view) {
  const sample = !!(view && view.mode === 'sample');
  return '<div class="page" id="clinical"' + (sample ? ' inert' : '') + '>' +
    masthead(profile) +
    patientMeta(selection) +
    studyMeta(selection, profile) +
    labsBlock(model.labs, selection) +
    sectionsHtml(model, selection) +
    tierOffer(model, selection) +
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
   the identity and study cells, and the route says so rather than pretending
   the rest of the sheet exists. */
function entryRoute(model, selection) {
  const route = [];
  for (const c of IDENTITY_CELLS) route.push({attr: 'data-axis', key: c.axis});
  for (const c of STUDY_CELLS) route.push({attr: 'data-axis', key: c.axis});
  if (!model || !model.report) return route;

  /* The laboratory grid and the clinical-context block, each in the order its
     own record list declares — the same lists labsBlock and contextBlock draw
     from, so the route cannot name a field the sheet does not render. */
  if (model.labs && model.labs.inputs) {
    for (const f of model.labs.inputs) route.push({attr: 'data-value', key: f.key});
    for (const f of _RN.CONTEXT_INPUTS) route.push({attr: 'data-value', key: f.key});
  }

  const preset = _RN.defaultTechniques(selection.path);
  for (const row of model.report.rows) {
    if (!row.rendered) continue;
    route.push({attr: 'data-value', key: row.parameter});
    /* The same condition parameterCard uses to decide whether it draws one. A
       second rule here would let the route point at a control that is not on
       the page, which is a dead stop the reader falls out of. */
    if (_RN.CONTROLLED_DOMAINS.indexOf(row.domain) !== -1 && !preset[row.domain]) {
      route.push({attr: 'data-domain', key: row.domain, param: row.parameter});
    }
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

function tableB(profile) {
  return tableHead('A', 'How these numbers were formed') +
    profile.derivation.map(c => '<p>' + esc(c) + '</p>').join('');
}

function tableC(profile, model) {
  /* COUNTED from the rows, never written down: a hard-coded sentence about how
     much of this report rests on a fallback rung stops being true the first time
     a record changes. */
  const counted = [fallbackSentence(model.coverage), gapListSentence(model.cards)]
    .filter(x => x !== null);
  /* The long tier notes live here rather than beside a card — the card carries the
     short tag, and the paragraph explaining what the tier means is a reason. Only
     for tiers that actually collected a row: a note for a section the reader never
     saw describes nothing. */
  const mounted = {};
  for (const row of model.report.rows) if (row.rendered) mounted[row.mountPoint] = true;
  return tableHead('B', 'Limitations and measurement notes') +
    profile.caveats.map(c => '<p>' + esc(c) + '</p>').join('') +
    measurementNotes(model) +
    sourceCaveatsTable(model) +
    withheldTable(model) +
    gapReasonTable(model) +
    counted.map(c => '<p class="counted">' + esc(c) + '</p>').join('') +
    SECTIONS.filter(sc => sc.note && mounted[sc.mount]).map(
      sc => '<p class="snote"><b>' + esc(sc.title) + '.</b> ' +
            esc(sc.note) + '</p>').join('');
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

function tableD(profile, model, indication) {
  const ordered = _RN.orderReferences(_RN.REFERENCES, profile, indication);
  const cites = citationIndex(model.receipts);
  /* ONE LINE PER REFERENCE. The title and the boundaries citing it move to the
     tooltip — forty references still print, every one of them, because the pool is
     never filtered and compressing a row is not dropping it. */
  const rows = ordered.map(r =>
    '<tr class="d-row" title="' + esc(r.title + '\n\nCited by: ' +
      ((cites[r.citation] || []).join(' \u00b7 ') || 'no boundary in this report')) + '">' +
    '<td><span class="rid">' + esc(r.id) + '</span> ' + esc(r.citation) + '</td>' +
    '<td>' + esc(VENDOR_CLASS_LABELS[r.vendorClass] || r.vendorClass) + '</td>' +
    '<td>' + esc(String(r.year)) + '</td>' +
    '<td>' + esc(r.evidenceGrade) + '</td>' +
    '<td>' + (r.pmid ? esc(r.pmid)
                     : 'unresolved (' + esc(r.pmidProvenance) + ')') + '</td>' +
    '</tr>').join('');
  return tableHead('C', 'References') +
    '<p class="refnote">The reference pool is never filtered \u2014 not by vendor and ' +
    'not by indication. Every record this report can cite is printed below; the ' +
    'acquisition path and the indication decide only which is cited first.</p>' +
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
  const rows = evidence.rules.map(r =>
    '<li><b>' + esc(r.effect) + '</b> · ' + esc(r.statement) +
    (r.magnitude ? ' <i>' + esc(r.magnitude) + '</i>' : '') +
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

  return '<section class="evidence"><h3>Impression — the evidence behind it</h3>' +
    '<p class="floor">Evidence floor <b>' + esc(evidence.floor) + '</b> — ' +
    esc(evidence.floorLabel) + '. At this floor the report ' +
    esc(evidence.verb) + ' rather than asserts more strongly.</p>' +
    (rows ? '<h4>Rules that fired</h4><ul class="ev">' + rows + '</ul>' : '') +
    (inherited ? '<h4>Inherited downgrades</h4><ul class="ev">' + inherited + '</ul>' : '') +
    (abst ? '<h4>Rules that abstained</h4><ul class="ev">' + abst + '</ul>' : '') +
    (gaps ? '<h4>Measured, with no published boundary</h4><ul class="ev">' + gaps +
            '</ul>' : '') +
    '</section>';
}

function renderMethodology(model, profile, selection, versions, view) {
  const sample = !!(view && view.mode === 'sample');
  return '<div class="page pagebreak" id="methodology"' + (sample ? ' inert' : '') + '>' +
    '<h2 class="sheet-title">Methodology, limitations and references</h2>' +
    acquisitionSummary(profile, selection) +
    /* "What was measured" is gone: it repeated the identity block of every card the
       reader has just read, and its room is what the remaining tables needed. */
    tableB(profile) + tableC(profile, model) +
    tableD(profile, model, selection.indication) + tableE(model.receipts.census) +
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
                    masthead, patientMeta, studyMeta, labsBlock, tierOffer,
                    compositeSection, impressionSection, evidenceAppendix, reportFooter,
                    notInterpretableHtml, shortCite,
                    tableB, tableC, tableD, tableE, measurementNotes,
                    gapReasonTable,
                    parameterCard, stampText, esc, toolbar, sampleLine,
                    entryRoute, IDENTITY_CELLS, STUDY_CELLS,
                    SECTIONS, SCOPE_LABELS, DOMAIN_LABELS, DOMAIN_TITLES,
                    VENDOR_CLASS_LABELS,
                    V2_RENDER_VERSION};
}
