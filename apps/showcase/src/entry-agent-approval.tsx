import "./kitStyles";
import "./styles.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { AgentApprovalDemo } from "./AgentApprovalDemo";
import { PageShell } from "./PageShell";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PageShell active="agent-approval" root="..">
      {(dark) => <AgentApprovalDemo dark={dark} />}
    </PageShell>
  </StrictMode>
);
