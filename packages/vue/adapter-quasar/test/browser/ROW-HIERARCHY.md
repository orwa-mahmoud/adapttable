# Row and hierarchy browser acceptance

Run this fixture only through the authorized browser CI route. No local
Chromium run was performed for this source packet.

```sh
node --experimental-strip-types test/browser/run-row-hierarchy.ts --build
playwright test --config test/browser/row-hierarchy.playwright.config.ts
```

The two viewport variants exercise genuine Quasar controls: RTL tree keyboard
expansion, disclosure focus, menu opening and Escape return, host action requests,
and scrolling a real 150-row virtual window with a pinned summary. The browser
screenshots record the desktop and mobile surfaces. The client unit tests cover
controlled rejection, lazy host updates, KeepAlive and asynchronous retirement;
Node SSR and hydration have separate fixtures.
