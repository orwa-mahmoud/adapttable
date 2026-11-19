import "./kitStyles";
import "./styles.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { SITE_SURFACE } from "../../../scripts/site-events.mjs";
import { LiveDemo } from "./LiveDemo";
import { PageShell } from "./PageShell";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PageShell active="demo" root="." surface={SITE_SURFACE.demoMain}>
      {(dark) => <LiveDemo dark={dark} />}
    </PageShell>
  </StrictMode>
);
