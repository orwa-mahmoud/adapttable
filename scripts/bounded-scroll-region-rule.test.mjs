import assert from "node:assert/strict";
import { resolve } from "node:path";
import { describe, it } from "node:test";

import { ESLint, Linter } from "eslint";
import jsxA11y from "eslint-plugin-jsx-a11y";

const ROOT = resolve(import.meta.dirname, "..");
const TABINDEX_RULE = "jsx-a11y/no-noninteractive-tabindex";
const REGION_RULE = "adapttable/bounded-scroll-region";
const LIST_STYLE = "{listStyle}";
const KITS = [
  "unstyled",
  "antd",
  "base-ui",
  "chakra",
  "mantine",
  "mui",
  "radix",
];
const mobileFile = (kit) =>
  `packages/react/adapter-${kit}/src/components/MobileCards.tsx`;

// Resolve the real repository config without overrides, including its exact
// file matching and rule options. Synthetic JSX exercises only the two rules
// under test in a separate Linter; no configured rule is disabled.
const eslint = new ESLint({ cwd: ROOT });
const linter = new Linter({ cwd: ROOT });

async function messages(source, filePath = mobileFile("unstyled")) {
  const config = await eslint.calculateConfigForFile(filePath);
  assert.ok(config, `Missing repository configuration for ${filePath}`);
  assert.ok(config.rules[TABINDEX_RULE], "Missing upstream tabindex rule");
  const rules = {};
  const plugins = {};
  for (const ruleName of [TABINDEX_RULE, REGION_RULE]) {
    if (!Object.hasOwn(config.rules, ruleName)) continue;
    const [pluginName, name] = ruleName.split("/");
    const plugin = config.plugins[pluginName];
    assert.ok(
      plugin?.rules?.[name],
      `Missing rule implementation: ${ruleName}`
    );
    plugins[pluginName] = plugin;
    rules[ruleName] = config.rules[ruleName];
  }
  const result = linter.verify(
    source,
    {
      files: ["**/*.tsx"],
      languageOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        parserOptions: { ecmaFeatures: { jsx: true } },
      },
      plugins,
      rules,
    },
    { filename: resolve(ROOT, filePath) }
  );
  for (const message of result) {
    assert.ok(!message.fatal, JSON.stringify(message));
    assert.ok(Object.hasOwn(rules, message.ruleId), JSON.stringify(message));
  }
  return result;
}

const helperRegion = (attributes = {}, { tag = "div", spread = "" } = {}) => {
  const props = {
    role: '"region"',
    "aria-label": '{table.getTableProps()["aria-label"]}',
    tabIndex: "{maxHeight == null ? undefined : 0}",
    style: "{mobileCardListStyle(maxHeight)}",
    ...attributes,
  };
  const rendered = Object.entries(props)
    .filter(([, value]) => value !== null)
    .map(([key, value]) => `${key}=${value}`)
    .join(" ");
  return `const cards = <${tag} ${rendered} ${spread} />;`;
};

const styleRegion = helperRegion({
  "aria-label": "{tableLabel}",
  tabIndex: "{listStyle?.maxHeight == null ? undefined : 0}",
  style: LIST_STYLE,
});

describe("the mobile-card region allowance", () => {
  for (const kit of KITS) {
    it(`accepts the named, height-guarded ${kit} wrapper`, async () => {
      const source = kit === "antd" ? styleRegion : helperRegion();
      assert.deepEqual(await messages(source, mobileFile(kit)), []);
    });

    it(`preserves existing tabindex options in ${kit}`, async () => {
      const config = await eslint.calculateConfigForFile(mobileFile(kit));
      const original = jsxA11y.flatConfigs.recommended.rules[TABINDEX_RULE][1];
      assert.deepEqual(config.rules[TABINDEX_RULE], [
        2,
        { ...original, roles: [...original.roles, "region"] },
      ]);
      assert.deepEqual(config.rules[REGION_RULE], [2]);
    });
  }

  it("preserves the existing tabpanel allowance", async () => {
    assert.deepEqual(
      await messages('<div role="tabpanel" tabIndex={0} />;'),
      []
    );
  });

  it("accepts a nonempty literal accessible name", async () => {
    assert.deepEqual(
      await messages(helperRegion({ "aria-label": '"Orders"' })),
      []
    );
  });

  it("accepts an explicit labelledby name", async () => {
    assert.deepEqual(
      await messages(
        helperRegion({ "aria-label": null, "aria-labelledby": '"table-name"' })
      ),
      []
    );
  });
});

describe("the companion guard rejects unsafe region allowances", () => {
  const cases = [
    ["no name", { "aria-label": null }],
    ["an empty name", { "aria-label": '""' }],
    ["a whitespace name", { "aria-label": '"  "' }],
    ["an empty expression name", { "aria-label": '{""}' }],
    ["an undefined name", { "aria-label": "{undefined}" }],
    ["a null name", { "aria-label": "{null}" }],
    ["a boolean name", { "aria-label": "{false}" }],
    [
      "a conditional missing name",
      { "aria-label": '{named ? "Rows" : undefined}' },
    ],
    ["a static tabindex", { tabIndex: "{0}" }],
    ["a string tabindex", { tabIndex: '"0"' }],
    ["an arbitrary condition", { tabIndex: "{enabled ? 0 : undefined}" }],
    ["a truthy height guard", { tabIndex: "{maxHeight ? 0 : undefined}" }],
    [
      "an undefined-only guard",
      { tabIndex: "{maxHeight === undefined ? undefined : 0}" },
    ],
    ["an inverted guard", { tabIndex: "{maxHeight == null ? 0 : undefined}" }],
    ["a missing tabindex", { tabIndex: null }],
    ["a missing style", { style: null }],
    ["a different height", { style: "{mobileCardListStyle(otherHeight)}" }],
    ["a constant height", { style: "{mobileCardListStyle(400)}" }],
    ["an unrelated style helper", { style: "{otherStyle(maxHeight)}" }],
    ["a heightless style", { style: '{{ overflowY: "auto" }}' }],
    ["an unrelated style object", { style: LIST_STYLE }],
    [
      "a different style's height",
      {
        tabIndex: "{otherStyle?.maxHeight == null ? undefined : 0}",
        style: LIST_STYLE,
      },
    ],
    [
      "a different style property",
      {
        tabIndex: "{listStyle?.width == null ? undefined : 0}",
        style: LIST_STYLE,
      },
    ],
    [
      "a constant height comparison",
      {
        tabIndex: "{400 == null ? undefined : 0}",
        style: "{mobileCardListStyle(400)}",
      },
    ],
  ];
  for (const [name, attributes] of cases) {
    it(`rejects ${name}`, async () => {
      const errors = await messages(helperRegion(attributes));
      assert.ok(errors.some((message) => message.ruleId === REGION_RULE));
    });
  }

  it("rejects a region substituted for the native list", async () => {
    const errors = await messages(helperRegion({}, { tag: "ul" }));
    assert.ok(errors.some((message) => message.messageId === "wrapper"));
  });

  it("rejects hidden or overridden wrapper props", async () => {
    const errors = await messages(helperRegion({}, { spread: "{...props}" }));
    assert.ok(errors.some((message) => message.ruleId === REGION_RULE));
  });

  it("still rejects an ordinary focusable ul with the upstream rule", async () => {
    for (const kit of KITS) {
      const errors = await messages("<ul tabIndex={0} />;", mobileFile(kit));
      assert.ok(errors.some((message) => message.ruleId === TABINDEX_RULE));
    }
  });
});

describe("the allowance is restricted to the seven exact source files", () => {
  const outsideFiles = [
    "packages/react/adapter-unstyled/src/components/Other.tsx",
    "packages/react/adapter-unstyled/src/components/MobileCards.test.tsx",
    "packages/react/adapter-unstyled/src/nested/components/MobileCards.tsx",
    "packages/react/adapter-shadcn/src/components/MobileCards.tsx",
    "packages/react/adapter-bootstrap/src/components/MobileCards.tsx",
    "packages/react/react/src/components/MobileCards.tsx",
    "apps/showcase/src/components/MobileCards.tsx",
  ];
  for (const file of outsideFiles) {
    it(`keeps the upstream rule unchanged for ${file}`, async () => {
      const config = await eslint.calculateConfigForFile(file);
      const original = jsxA11y.flatConfigs.recommended.rules[TABINDEX_RULE][1];
      assert.deepEqual(config.rules[TABINDEX_RULE], [2, original]);
      assert.equal(config.rules[REGION_RULE], undefined);
      const errors = await messages(helperRegion({ tabIndex: "{0}" }), file);
      assert.ok(errors.some((message) => message.ruleId === TABINDEX_RULE));
    });
  }
});
