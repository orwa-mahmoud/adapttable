// @ts-check
import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";
import sonarjs from "eslint-plugin-sonarjs";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import prettier from "eslint-config-prettier";
import globals from "globals";

// The default export types `.configs` as optional and its `recommended` entry
// as a loose config union, neither of which matches the `defineConfig()`
// parameter type. Guard the access and cast (via `unknown`) to a flat config.
const sonarRecommended = /** @type {import("eslint").Linter.Config} */ (
  /** @type {unknown} */ (sonarjs.configs?.recommended ?? {})
);

export default defineConfig(
  {
    ignores: [
      "**/dist/**",
      "**/build/**",
      "**/coverage/**",
      "**/.turbo/**",
      "**/node_modules/**",
      "reference/**",
      "**/*.config.{js,cjs,mjs}",
      // tsup writes a transient `tsup.config.bundled_<hash>.mjs` while
      // building and deletes it; with lint running alongside build, eslint
      // must never try to read these or it crashes (ENOENT, exit 2).
      "**/*.bundled_*.mjs",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  sonarRecommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      react,
      "react-hooks": reactHooks,
      "jsx-a11y": jsxA11y,
      "simple-import-sort": simpleImportSort,
    },
    // Pinned rather than detected. `detect` reads the installed `react`, and
    // three lint contexts have none — `@adapttable/cli`, `@adapttable/server`
    // and the root `scripts/` — so each printed a warning and fell back to
    // "latest" anyway. The floor of core's peer range is what the rules should
    // hold every package to, and it is the same answer detection gave.
    settings: { react: { version: "18.0.0" } },
    rules: {
      ...react.configs.recommended.rules,
      ...react.configs["jsx-runtime"].rules,
      // Classic Rules of Hooks. The React Compiler runs in the build (and test)
      // and auto-optimizes per component — bailing to our code on the few
      // hand-tuned hot paths it can't beat — so we do NOT enable v7's full
      // compiler rule set (it would flag those intentionally-kept manual memos).
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      // TypeScript props are the contract. This rule still fires on
      // intermediate bindings (`const props = applyTableFeatures(incoming)`).
      "react/prop-types": "off",
      ...jsxA11y.flatConfigs.recommended.rules,
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
  {
    // Root build tooling (lcov path fixer, shared vitest config) lives
    // outside any package's TS project, so the type-aware rules can't
    // resolve it. Lint it with the syntactic rules only.
    files: ["scripts/**/*.{js,mjs,cjs,ts}", "vitest.shared.ts"],
    languageOptions: {
      parserOptions: { projectService: false, project: false },
    },
    rules: tseslint.configs.disableTypeChecked.rules,
  },
  {
    files: [
      "**/*.{test,spec}.{ts,tsx}",
      "**/*.gaps.test.{ts,tsx}",
      "**/test/**",
    ],
    rules: {
      "sonarjs/no-duplicate-string": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      // `act(() => ...)` returns a thenable that tests intentionally don't
      // await in the synchronous fake-timer paths; and adapter methods are
      // passed by reference in test harnesses.
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/unbound-method": "off",
      "sonarjs/no-nested-functions": "off",
      "sonarjs/prefer-read-only-props": "off",
      "react/prop-types": "off",
    },
  },
  prettier
);
