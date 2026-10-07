# Native Quasar export acceptance

From the Quasar package, run `node --experimental-strip-types test/browser/run-export.ts`
and open `/test/browser/export.html` in the authorized browser CI environment.
Use `mobile=1`, `dir=rtl`, and `dark=1` query options for each presentation.
Build the fixture with `node --experimental-strip-types test/browser/run-export.ts --build`.

Use Tab and Enter/Space to start Export CSV. The trigger becomes busy and
disabled, QSpinner appears, and the inline native progress card reports 42%.
Cancel aborts the job. A late Complete export must not create a download.
Dismiss returns focus to this table's export trigger.

Start another export and choose Fail export. Check the announced error, native
Retry button, renewed progress, Complete export, download link, and Dismiss.
Suspend through Show table while busy, complete the old job, and reactivate.
The retired job must not add a download. Verify layout, direction, wrapping,
focus visibility, contrast, and 44px control targets at narrow mobile width.

Source and packed jsdom tests do not constitute real-browser acceptance.
