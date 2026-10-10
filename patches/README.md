# Dependency patches

## braces 3.0.3

`micromatch` resolves this package. The published 3.0.3 release is affected by
[GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)
(CVE-2026-93687); no patched npm release was available on 2026-10-11.

The pnpm patch stops brace parsing, expansion and compilation once nesting
passes 100. A caller cannot raise that cap. Ordinary glob patterns are
unchanged. `scripts/braces-depth.test.mjs` resolves through ESLint, so the
guard fails if the patch is missing from the installed graph.

The version remains 3.0.3, so Dependabot may still report the advisory. It is
not dismissed. Replace this patch with a verified upstream release when one
exists.

## sprintf-js 1.0.3

`argparse` resolves this package. The published 1.0.3 release is affected by
[GHSA-hp3w-g68c-fv3c](https://github.com/advisories/GHSA-hp3w-g68c-fv3c)
(CVE-2026-97058); no patched npm release was available on 2026-10-11.

The pnpm patch clamps `e`, `f` and `g` precision to the ECMAScript limit of
100 before `toExponential`, `toFixed` and `toPrecision`. Ordinary precision
is unchanged. `scripts/sprintf-js-precision.test.mjs` resolves through
ESLint, so the clamp fails if the patch is missing.

The version remains 1.0.3, so Dependabot may still report the advisory. It is
not dismissed. Replace this patch with a verified upstream release when one
exists.

## http-cache-semantics 4.2.0

Astro's image/cache tooling resolves this package. The published 4.2.0 release
is affected by [GHSA-ch52-4w7c-c8xp](https://github.com/advisories/GHSA-ch52-4w7c-c8xp)
(CVE-2026-93748); no patched npm release was available on 2026-10-03.

The pnpm patch preserves the package API and serialization format, and prevents
`max-stale`, `stale-if-error`, or `stale-while-revalidate` from bypassing response
reuse restrictions. Shared cookie responses without the existing explicit
opt-ins, shared `proxy-revalidate`, `no-cache`, non-storable responses and Vary
wildcards require validation. Error fallback also checks the current request's
URL, method, Host and cache directives. Ordinary expiration, private caches,
explicit cookie opt-ins and successful conditional validation retain their
existing behavior.

`scripts/http-cache-semantics.test.mjs` resolves through Astro, so the security
regressions fail if the patch is missing from the installed consumer graph.
The generated lockfile records the patch hash; installations must use this
workspace and lockfile to receive the remedy.

This is a local source remediation, not an upstream release. The version remains
4.2.0, so version-only vulnerability scanners and Dependabot may still report
the advisory. It is not dismissed or ignored. Replace this patch with a verified
upstream release when one becomes available, retaining the regression tests.
