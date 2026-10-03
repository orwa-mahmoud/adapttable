# Angular ngx-bootstrap adapter

`@adapttable/ngx-bootstrap` is a private `0.0.0` workspace preview. It is not
published or advertised as a registry-installable package.

## Setup

Use Angular 22, ngx-bootstrap **22.0.0**, and RxJS 7.4 or newer within v7.
ngx-bootstrap 22 requires zoneless Angular; do not load zone.js in this entry.
Load `@adapttable/ngx-bootstrap/styles.css` once in the kit-specific entry.
The adapter compiles Bootstrap **5.3.8** into a host-scoped stylesheet and
ships its MIT license. Do not add global Bootstrap CSS or its JavaScript bundle.
No Angular localize initializer or Popper dependency is required by this kit.

```ts
import "@adapttable/ngx-bootstrap/styles.css";
import { AdaptDataTable } from "@adapttable/ngx-bootstrap";
import { filters } from "@adapttable/ngx-bootstrap/filters";
import { editing } from "@adapttable/ngx-bootstrap/editing";
```

Use the same Angular table inputs and Chrome slot contracts as the Angular
binding. Every feature entry uses this adapter's components. The optional
`/assistant` entry supplies native-styled chat, shortcut and approval controls.
The isolated showcase module is `src/angular/kits/ngxBootstrap.ts`.

## Native presentation and accessibility

Bootstrap form controls and tables use semantic HTML with upstream Bootstrap
classes, because ngx-bootstrap does not define separate input, button, checkbox
or table components. Dropdowns, popovers, pagination, collapse and modal sheets
use real ngx-bootstrap directives and components. There are no cross-kit imports.
Filter popovers have no backdrop; modal drawers have a kit-scoped backdrop,
Escape dismissal, Tab containment and trigger-focus restoration.

The adapter host is `.adapttable-ngx-bootstrap`; `theme="dark"` and
`theme="light"` set its Bootstrap color mode. Native overlays stay beneath this
boundary. Standalone controls need a matching wrapper and `data-bs-theme`.
Public `data-adapttable-part` names and `classNames` remain the structural
contract; native-widget implementation hooks use `data-ngx-bootstrap-part`.

Mobile cards retain selection, editing, row actions, details, tree expansion and
reordering. `dir="rtl"` changes reading order and logical drawer placement.
Localized labels are supplied by the Angular binding. Hosts own all row writes.

## Verification

The package includes native overlay/control fixtures, the feature-conformance
suite, server-rendering and hydration tests, and CSS isolation/license checks.
Final acceptance requires the integrated Angular compiler, tests and browser
checks for mobile, RTL, keyboard focus, portal placement and kit switching.
This preview's source preparation is not a claim that those gates have passed.
