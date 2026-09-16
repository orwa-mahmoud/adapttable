# Changesets

This folder is managed by [changesets](https://github.com/changesets/changesets).
Run `pnpm changeset` to record a version bump + changelog entry for your change.
The release workflow consumes these to version and publish the `@adapttable/*`
packages.

Published `@adapttable/*` runtime dependencies are exact versions (not
`workspace:^`). Changesets will not rewrite those pins to a major caret:
`bumpVersionsWithWorkspaceProtocolOnly` is on, and the pins are not
workspace protocol. A later release that needs a new sibling version
lists that version in the same release.
