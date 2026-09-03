# Governance

## Maintainers and release ownership

| Role                       | Who                                              | Responsibility                                                                     |
| -------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------- |
| Maintainer / release owner | [@orwa-mahmoud](https://github.com/orwa-mahmoud) | Product direction, merges to `main`, version PRs, npm publish, security advisories |

Pull requests that change `.github/workflows/release.yml`, `.changeset/`,
`SECURITY.md` or this file are routed to the release owner via
`.github/CODEOWNERS`.

## Release path

1. Merging a PR with a changeset opens (or updates) the **Version Packages**
   PR through the `Release` workflow's version job.
2. Merging that Version Packages PR leaves unpublished package versions on
   `main`. The publish job then runs `pnpm release:gated` and authenticates to
   npm with **GitHub OIDC trusted publishing** — no `NPM_TOKEN` /
   `NODE_AUTH_TOKEN` is used.
3. Provenance attestations are generated automatically when trusted publishing
   is configured for each package on npmjs.com.

### Owner steps before the first OIDC publish

These cannot be automated from the repository:

1. On npmjs.com, for every published `@adapttable/*` package, add a trusted
   publisher: GitHub → `orwa-mahmoud` / `adapttable`, workflow filename
   `release.yml`, no environment.
2. Keep organization 2FA enforced.
3. Add a second trusted owner on the npm org/account.
4. Keep an offline recovery note for the npm account (not in this repository).

Until those are done, the publish job will fail with an authentication error —
that is expected and safer than a long-lived write token.

## Security response targets

| Step                                                                         | Target                                            |
| ---------------------------------------------------------------------------- | ------------------------------------------------- |
| Initial acknowledgement of a private advisory                                | within **72 hours**                               |
| Triage (affected / not affected, severity)                                   | within **7 days** of acknowledgement              |
| Fix or mitigation for a confirmed high/critical issue in a supported release | within **30 days**, coordinated with the reporter |

See [SECURITY.md](./SECURITY.md) for how to report.
