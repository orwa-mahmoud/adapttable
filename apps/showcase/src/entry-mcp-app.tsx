import "./kitStyles";
import "./styles.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { McpAppView } from "./McpAppView";

// No PageShell: this view is drawn inside an MCP host's iframe, not browsed to.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <McpAppView />
  </StrictMode>
);
