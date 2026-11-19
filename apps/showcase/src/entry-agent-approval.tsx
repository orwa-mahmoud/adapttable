import "./kitStyles";
import "./styles.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { SITE_SURFACE } from "../../../scripts/site-events.mjs";
import { AgentApprovalDemo } from "./AgentApprovalDemo";
import { PageShell } from "./PageShell";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PageShell active="agent-approval" root=".." surface={SITE_SURFACE.demoLab}>
      {(dark) => <AgentApprovalDemo dark={dark} />}
    </PageShell>
  </StrictMode>
);
