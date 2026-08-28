import "vitest";

declare module "vitest" {
  interface Assertion<T = unknown> {
    /** Asserts the rendered output has no axe accessibility violations. */
    toHaveNoViolations(): T;
  }
  interface AsymmetricMatchersContaining {
    /** Asserts the rendered output has no axe accessibility violations. */
    toHaveNoViolations(): void;
  }
}
