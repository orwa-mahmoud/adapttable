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

## Angular toolkit supplements

- `@taiga-ui/icons@5.26.0` declares Apache-2.0 but ships only its older Lucide
  ISC license. Keep that shipped file. Its exact Taiga release revision supplies
  the Apache grant; `projects/icons/package.json` at that revision pins
  `lucide-static@1.31.0`, whose full license includes both ISC and the Feather
  MIT grant and identifies the Feather-derived icons. Both supplements are
  copied from immutable upstream revisions recorded in the manifest.
- `@taiga-ui/font-watcher@0.6.0` omits a license file. Its npm metadata identifies
  the exact `taiga-family/utils` revision used for the unmodified Apache grant.

- `@taiga-ui/design-tokens@0.320.0` supplies an Apache-2.0 declaration and a
  `gitHead` in npm metadata, but no repository URL, license text, or NOTICE.
  Its version-scoped fallback is the Apache Software Foundation's unmodified
  Apache-2.0 text. This is not a claim that a project-specific upstream grant
  or copyright notice was located. The manifest records the exact npm metadata
  source and this provenance limit; no attribution from another Taiga package
  is substituted.

The installed-package reader retains original supplier files and appends these
supplements. Never replace Lucide/Feather or font terms with the package-level
license identifier. Recorded upstream texts are not reformatted.

Generated `third-party-notices.txt` and `third-party-notices.json` belong to the
build output, not source control. The composed-site check verifies their
content and referenced assets before the Site workflow uploads anything.
