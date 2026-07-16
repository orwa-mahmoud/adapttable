import "@mantine/core/styles.css";
import "./tailwind.css";
import "./styles.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { LiveDemo } from "./LiveDemo";
import { PageShell } from "./PageShell";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PageShell active="demo" root=".">
      {(dark) => <LiveDemo dark={dark} />}
    </PageShell>
  </StrictMode>
);
