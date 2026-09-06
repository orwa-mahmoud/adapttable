import "@testing-library/jest-dom/vitest";
import { configure } from "@testing-library/react";

// Testing Library waits one second for an element to appear or disappear.
// That default assumes an idle machine; these suites run ten workers deep and
// a kit's own exit animation can outlast it under that load — a scheduling
// deadline expiring, not a component failing to close.
configure({ asyncUtilTimeout: 5000 });
