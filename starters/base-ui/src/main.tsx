import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";

// Base UI is unstyled; `@adapttable/base-ui` side-effect-imports its chrome
// CSS. No kit provider wrap is required.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
