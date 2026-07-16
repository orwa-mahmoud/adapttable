import "./styles.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { PageShell } from "./PageShell";
import { RtlSection } from "./RtlSection";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PageShell active="rtl" root="..">
      {(dark) => <RtlSection dark={dark} />}
    </PageShell>
  </StrictMode>
);
