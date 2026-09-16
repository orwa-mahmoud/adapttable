# Changesets

This folder is managed by [changesets](https://github.com/changesets/changesets).
Run `pnpm changeset` to record a version bump + changelog entry for your change.
The release workflow consumes these to version and publish the `@adapttable/*`
packages.

Published `@adapttable/*` runtime dependencies are exact versions (not
`workspace:^`). `bumpVersionsWithWorkspaceProtocolOnly` stays off so Changesets
advances those exact pins whenever a sibling package is released; the exact
range shape is preserved in the published manifest.
