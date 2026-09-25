import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { render, type RenderResult } from "@testing-library/react";
import type { ReactElement } from "react";

/** Render a component tree wrapped in a default v3 `ChakraProvider`. */
export function renderChakra(ui: ReactElement): RenderResult {
  return render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>);
}
