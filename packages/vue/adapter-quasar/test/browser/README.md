# Native Quasar column menu fixture

Run `node --experimental-strip-types test/browser/run.ts` from the package directory and open
`/test/browser/column-menu.html`. This fixture is ready for the existing
GitHub browser route; no browser result is claimed by source tests.

Verify at desktop and narrow mobile widths, in both themes and directions:

- Open Columns with ArrowDown. Its button's `aria-controls` identifies the
  single native dialog, and search receives focus.
- Open Name's actions and the Aggregate select. Escape closes the select,
  then the actions, then Columns. The final focus returns to Columns.
- Reject and accept an Aggregate change using the harness toggle. The
  displayed value follows the host; requests appear below the controls.
- Suspend while either popup is open. Both portals disappear. Reactivate;
  Columns stays closed until another gesture and search remains retained.
- Rename from the table header and column menu. Check empty input errors,
  Escape cancellation, trimmed save, and visible focus return.
- Enter table fullscreen before opening Columns and the select. Both
  popups stay inside fullscreen. Exit and verify normal portal containment.
- Dismiss from Outside focus. No later callback takes that focus back.
- Check one visible popup scroll viewport, anchored geometry, 44px control
  targets, focus indicators, and theme contrast. Direction changes while
  open must retain the same native dialog and selected value.
