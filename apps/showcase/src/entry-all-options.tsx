import "./kitStyles";
import "./styles.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { SITE_SURFACE } from "../../../scripts/site-events.mjs";
import { AllOptionsDemo } from "./AllOptionsDemo";
import { PageShell } from "./PageShell";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PageShell active="all-options" root=".." surface={SITE_SURFACE.demoLab}>
      {(dark) => <AllOptionsDemo dark={dark} />}
    </PageShell>
  </StrictMode>
);
