# VeriLiv — Quantitative Liver MRI Report

Live: <https://verisynco.github.io/>

A single-patient quantitative liver MRI report. Measurements go in, guideline staging comes
out, and the result prints on paper. Pure HTML, CSS and vanilla JavaScript — no build step,
no dependencies, no network calls: the page runs entirely in the browser and sends nothing
anywhere.

**VeriLiv is an educational reference tool, not a diagnostic device, and does not replace
radiologist interpretation.** The version published here is in development and must not be
used to interpret patient data. It states its own terms before it will open.

## What this repository is

The published site only — the files a browser needs in order to render the report. The
development repository is separate and private: it holds the evidence records' documentation,
the data contract, the literature notes, the change log and the test suites, none of which the
page needs at runtime.

Every clinical value the report prints traces to a named, peer-reviewed source or a consensus
guideline, and a cut-off that cannot be sourced is published as a described gap rather than as
a number.
