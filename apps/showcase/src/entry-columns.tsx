import "./styles.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { ColumnsDemo } from "./ColumnsDemo";
import { PageShell } from "./PageShell";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PageShell active="columns" root="..">
      {(dark) => <ColumnsDemo dark={dark} />}
    </PageShell>
  </StrictMode>
);
