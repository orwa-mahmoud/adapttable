# Website license sources

The website build reads complete license, copyright and NOTICE texts from the
packages represented in emitted browser chunks. It also includes Pagefind's
static search runtime, which Starlight writes after the Vite build.

Some npm packages omit a standalone license. `manifest.json` records reviewed
upstream texts for exact package versions. The build never fetches these files:
CI remains deterministic and offline. A new version without complete terms
fails instead of silently reusing another version's notice.

For each new entry, verify the npm package's declared license, its official
repository and the source revision. Copy the upstream text verbatim; preserve
copyright holders and additional NOTICE files. Record the source URL, and any
version/provenance qualification, in the manifest. A license identifier or URL
alone is not a substitute for the full grant and conditions.

The Pagefind UI supplement records dependencies already bundled by upstream,
which therefore appear as one package in Vite's module graph. Keep these texts
with that exact upstream package version.

Generated `third-party-notices.txt` and `third-party-notices.json` belong to the
build output, not source control. The composed-site check verifies their
content and referenced assets before the Site workflow uploads anything.
