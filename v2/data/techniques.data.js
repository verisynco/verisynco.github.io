/* VeriLiv V2 — MEASUREMENT TECHNIQUE VOCABULARY (W-003 example set)
 * ---------------------------------------------------------------------------
 * Measurement technique is a FIRST-CLASS field, not a note. The same physical
 * quantity measured a different way is not the same number, so every reference
 * and every cut-off carries a technique id from this table.
 *
 * `group` is the averaging-compatibility class. The (later) averaging engine may
 * pool cut-offs ONLY within one group. Cross-group pooling is forbidden by
 * construction — see v2/data/SCHEMA.md section 4.
 *
 * Loaded as a plain <script> (no ES modules — they fail under file://) and also
 * require()-able by the Node test suite, exactly like v1/js/thresholds.js.
 * ---------------------------------------------------------------------------
 */

const TECHNIQUE_GROUPS = {
  /* ---- PDFF ---------------------------------------------------------- */
  'pdff-quantitative': {
    parameter: 'pdff',
    label: 'Confounder-corrected quantitative PDFF',
    poolable: true,
    rationale: 'MRS and confounder-corrected CSE-MRI agree to within ~1-2% absolute PDFF ' +
               'across vendors and field strengths (QIBA meta-analysis, Ref#16). Treated ' +
               'as one averaging group.'
  },
  'pdff-uncorrected-fsf': {
    parameter: 'pdff',
    label: 'Uncorrected fat signal fraction (not PDFF)',
    poolable: false,
    rationale: 'Two-point Dixon fat fraction is not confounder-corrected (no T2* decay, no ' +
               'multi-peak spectral model, no noise-bias correction). Different quantity; ' +
               'never pooled with PDFF.'
  },

  /* ---- Iron ---------------------------------------------------------- */
  'iron-r2star': {
    parameter: 'iron',
    label: 'R2*/T2* multi-echo gradient echo',
    poolable: true,
    rationale: 'R2* = 1000/T2*, so R2*-reported and T2*-reported studies are the same ' +
               'measurement. The LIC calibration SLOPE is field-strength specific — pool ' +
               'only within one fieldStrength.'
  },
  'iron-r2-spin-echo': {
    parameter: 'iron',
    label: 'R2 spin-echo relaxometry (FerriScan)',
    poolable: true,
    rationale: 'The St Pierre R2->LIC calibration is a DIFFERENT curve from any R2* slope. ' +
               'FerriScan LIC and R2*-derived LIC are not interchangeable at the number ' +
               'level even though both report mg Fe/g dw.'
  },
  'iron-sir': {
    parameter: 'iron',
    label: 'Signal-intensity-ratio (Gandon)',
    poolable: false,
    rationale: 'Semi-quantitative, saturates above ~15 mg/g dw. Not poolable with relaxometry.'
  },

  /* ---- T1 ------------------------------------------------------------ */
  'ct1-proprietary': {
    parameter: 't1',
    label: 'Iron-corrected T1 (cT1, LiverMultiScan)',
    poolable: true,
    rationale: 'Proprietary Perspectum pipeline, standardised ACROSS field strengths by ' +
               'construction — hence one threshold at 1.5T and 3T. Not comparable with ' +
               'native T1 from any sequence.'
  },

  /* ---- T2 -------------------------------------------------------------- */
  't2-relaxometry': {
    parameter: 't2',
    label: 'Liver T2 relaxometry',
    poolable: false,
    rationale: 'T2 is NOT T2*. iron-r2star / iron-t2star-gre measure a different quantity, ' +
               'and conflating them is exactly the error W-020 found in the workbook ' +
               '(LITERATURE.md § 1): Ref#18 is cited for T2 but measured T2*. Within T2 ' +
               'itself, SE, GRASE and T2-prep give systematically different liver values ' +
               '(different refocusing trains, different stimulated-echo contributions), and ' +
               'the workbook names all three in one cell — so nothing is poolable until a ' +
               'row names ONE of them.'
  },
  't1-ir-bssfp': {
    parameter: 't1',
    label: 'Inversion-recovery bSSFP mapping (MOLLI, shMOLLI)',
    poolable: true,
    rationale: 'MOLLI/shMOLLI systematically UNDERESTIMATE T1 (magnetisation transfer, ' +
               'incomplete recovery). Internally consistent, but not poolable with ' +
               'saturation-recovery or SPGR values.'
  },
  't1-saturation-recovery': {
    parameter: 't1',
    label: 'Saturation-recovery / IR-SE mapping (SASHA, IR-SE)',
    poolable: true,
    rationale: 'Accuracy-optimised; reads systematically HIGHER than MOLLI for the same ' +
               'tissue. Separate group.'
  },
  't1-spgr-vfa': {
    parameter: 't1',
    label: 'SPGR variable-flip-angle mapping (GE StarMap)',
    poolable: true,
    rationale: 'B1+-sensitive, especially at 3T. Separate group from bSSFP-based mapping.'
  },

  /* ---- MRE ----------------------------------------------------------- */
  'mre-60hz-stiffness': {
    parameter: 'mre',
    label: '60 Hz shear stiffness (kPa)',
    poolable: true,
    rationale: 'LI-RADS/SAR 2024 (Ref#39) treats 60 Hz stiffness as field-strength ' +
               'independent and harmonised across 2D-GRE, 2D-SE-EPI and 3D acquisitions. ' +
               'This is the one place where a wide pool is defensible.'
  },
  'mre-40hz-stiffness': {
    parameter: 'mre',
    label: '40 Hz shear stiffness (kPa)',
    poolable: false,
    rationale: '40 Hz drivers yield stiffness ~15-25% LOWER than 60 Hz. Applying 60 Hz ' +
               'cut-offs to 40 Hz data is a staging error, not a rounding error.'
  },
  'mre-shear-wave-speed': {
    parameter: 'mre',
    label: 'Multi-frequency / tomoelastography shear wave speed (m/s)',
    poolable: true,
    rationale: 'Different unit entirely. Never unit-converted into kPa for comparison.'
  },

  /* ---- Diffusion ----------------------------------------------------- */
  'dwi-adc-monoexp': {
    parameter: 'adc',
    label: 'Mono-exponential ADC',
    poolable: false,
    rationale: 'ADC is strongly b-value dependent; pooling would require identical b-value ' +
               'sets. Marked non-poolable so the engine must fall back to exact matching.'
  },
  'ivim-biexp': {
    parameter: 'ivim',
    label: 'Bi-exponential IVIM (D, D*, f)',
    poolable: false,
    rationale: 'Fit-model and b-value-distribution dependent; D* in particular is barely ' +
               'reproducible across sites.'
  }
};

const TECHNIQUES = {
  /* PDFF */
  'pdff-mrs':             {group: 'pdff-quantitative',      label: 'Single-voxel 1H-MRS (STEAM/PRESS)',                       vendorExamples: ['Siemens HISTO', 'Siemens LiverLab', 'research STEAM'],
                           methodLabel: 'Single-voxel proton MR spectroscopy'},
  'pdff-cse-mri':         {group: 'pdff-quantitative',      label: 'Confounder-corrected chemical-shift-encoded MRI',         vendorExamples: ['GE IDEAL-IQ', 'Philips mDIXON Quant', 'Siemens q-Dixon / LiverLab'],
                           methodLabel: 'Confounder-corrected chemical-shift-encoded MRI, multi-echo'},
  'pdff-two-point-dixon': {group: 'pdff-uncorrected-fsf',   label: 'Two-point Dixon fat signal fraction',                     vendorExamples: ['GE LAVA-Flex', 'Siemens VIBE-Dixon'],
                           methodLabel: 'Two-point Dixon fat signal fraction (not confounder-corrected)'},
  /* Iron */
  'iron-r2star-gre':      {group: 'iron-r2star',            label: 'Multi-echo GRE R2* mapping',                              vendorExamples: ['GE IDEAL-IQ R2*', 'in-house multi-echo GRE'],
                           methodLabel: 'Multi-echo gradient-echo R2* mapping'},
  'iron-t2star-gre':      {group: 'iron-r2star',            label: 'Multi-echo GRE T2* mapping (reported as T2*)',            vendorExamples: ['GE multi-echo GRE', 'Siemens Sonata multi-echo GRE'],
                           methodLabel: 'Multi-echo gradient-echo T2* mapping'},
  'iron-r2-ferriscan':    {group: 'iron-r2-spin-echo',      label: 'Spin-echo R2 relaxometry, St Pierre calibration',         vendorExamples: ['FerriScan (Resonance Health)'],
                           methodLabel: 'Spin-echo R2 relaxometry, St Pierre calibration'},
  'iron-sir-gandon':      {group: 'iron-sir',               label: 'Signal-intensity-ratio method',                           vendorExamples: ['Gandon / Rennes protocol'],
                           methodLabel: 'Signal-intensity-ratio method'},
  /* T1 */
  'ct1-lms-molli':        {group: 'ct1-proprietary',        label: 'cT1 = MOLLI T1 iron-corrected by T2* (LiverMultiScan)',   vendorExamples: ['Perspectum LiverMultiScan'],
                           methodLabel: 'Iron-corrected T1 (cT1) from MOLLI T1 and T2*, proprietary quantification'},
  't1-molli':             {group: 't1-ir-bssfp',            label: 'MOLLI native T1',                                         vendorExamples: ['Siemens MyoMaps MOLLI', 'Philips MOLLI'],
                           methodLabel: 'MOLLI inversion-recovery native T1 mapping'},
  't1-shmolli':           {group: 't1-ir-bssfp',            label: 'shMOLLI native T1',                                       vendorExamples: ['Siemens shMOLLI (WIP)'],
                           methodLabel: 'shMOLLI inversion-recovery native T1 mapping'},
  't1-sasha':             {group: 't1-saturation-recovery', label: 'SASHA saturation-recovery T1',                            vendorExamples: ['Siemens SASHA (WIP)'],
                           methodLabel: 'Saturation-recovery native T1 mapping'},
  't1-ir-se':             {group: 't1-saturation-recovery', label: 'Inversion-recovery spin-echo T1 (reference method)',      vendorExamples: ['research IR-SE'],
                           methodLabel: 'Inversion-recovery spin-echo T1 (reference method)'},
  't1-starmap':           {group: 't1-spgr-vfa',            label: 'GE StarMap variable-flip-angle T1',                       vendorExamples: ['GE StarMap'],
                           methodLabel: 'SPGR variable-flip-angle T1 mapping'},
  /* MRE */
  'mre-2d-gre-60hz':      {group: 'mre-60hz-stiffness',     label: '2D GRE MRE, 60 Hz driver',                                vendorExamples: ['GE MR-Touch (Resoundant)'],
                           methodLabel: '2D gradient-echo MR elastography, 60 Hz driver'},
  'mre-2d-se-epi-60hz':   {group: 'mre-60hz-stiffness',     label: '2D SE-EPI MRE, 60 Hz driver',                             vendorExamples: ['GE MR-Touch SE-EPI', 'Siemens MRE SE-EPI'],
                           methodLabel: '2D spin-echo EPI MR elastography, 60 Hz driver'},
  'mre-3d-60hz':          {group: 'mre-60hz-stiffness',     label: '3D MRE, 60 Hz driver',                                    vendorExamples: ['GE 3D MRE (research)'],
                           methodLabel: '3D MR elastography, 60 Hz driver'},
  'mre-2d-gre-40hz':      {group: 'mre-40hz-stiffness',     label: '2D GRE MRE, 40 Hz driver',                                vendorExamples: ['legacy 40 Hz drivers'],
                           methodLabel: '2D gradient-echo MR elastography, 40 Hz driver'},
  'mre-tomoelastography': {group: 'mre-shear-wave-speed',   label: 'Multi-frequency tomoelastography',                        vendorExamples: ['Charite tomoelastography'],
                           methodLabel: 'Multi-frequency tomoelastography shear wave speed'},
  /* T2 — the three the T1_T2!F12 method cell names, none resolved to that row */
  't2-se':                {group: 't2-relaxometry',      label: 'Multi-echo spin-echo T2',                                 vendorExamples: ['any SE / CPMG'],
                           methodLabel: 'Multi-echo spin-echo T2 mapping'},
  't2-grase':             {group: 't2-relaxometry',      label: 'GRASE T2 mapping',                                        vendorExamples: ['any GRASE'],
                           methodLabel: 'GRASE T2 mapping'},
  't2-prep':              {group: 't2-relaxometry',      label: 'T2-prepared bSSFP T2 mapping',                            vendorExamples: ['any T2-prep'],
                           methodLabel: 'T2-prepared bSSFP T2 mapping'},
  /* Diffusion */
  'dwi-adc':              {group: 'dwi-adc-monoexp',        label: 'Mono-exponential ADC',                                    vendorExamples: ['any DWI'],
                           methodLabel: 'Mono-exponential ADC from diffusion-weighted imaging'},
  'ivim':                 {group: 'ivim-biexp',             label: 'Bi-exponential IVIM fit',                                 vendorExamples: ['any multi-b DWI'],
                           methodLabel: 'Bi-exponential IVIM fit from multi-b diffusion-weighted imaging'},
  /* Sentinel — composite scores and clinical rules have no single technique */
  'not-applicable':       {group: null,                     label: 'Technique not applicable (composite score, clinical rule)', vendorExamples: [],
                           methodLabel: 'Not an imaging measurement (composite score or clinical rule)'}
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {TECHNIQUES, TECHNIQUE_GROUPS};
}
