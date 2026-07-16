import "@mantine/core/styles.css";
import "./tailwind.css";
import "./styles.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { PageShell } from "./PageShell";
import { ScaleSection } from "./ScaleSection";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PageShell active="scale" root="..">
      {(dark) => <ScaleSection dark={dark} />}
    </PageShell>
  </StrictMode>
);
