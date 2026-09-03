# Security Policy

## Supported versions

Security fixes are applied to the latest release of the current major. We
recommend staying on the latest published version of each `@adapttable/*`
package.

## Reporting a vulnerability

Please **do not open a public issue** for security vulnerabilities.

Instead, report privately via GitHub's
[**Report a vulnerability**](https://github.com/orwa-mahmoud/adapttable/security/advisories/new)
flow (Security → Advisories). If that is unavailable, you can open a regular
issue asking the maintainers to contact you, without disclosing details.

When reporting, please include:

- The affected package(s) and version(s).
- A description of the vulnerability and its impact.
- Steps to reproduce or a proof of concept, if available.

Response targets (acknowledgement, triage, fix windows) are in
[GOVERNANCE.md](./GOVERNANCE.md). Once a fix is ready we will coordinate a
release and credit you in the advisory unless you prefer to remain anonymous.

## Scope

AdaptTable is a client-side React UI library: it renders data you give it and
syncs table state to the URL. It performs no network requests of its own and
ships no styles in the unstyled adapter. The most relevant classes of issue
are therefore around rendering untrusted data (XSS) and URL-state handling.
Reports in those areas are especially welcome.
