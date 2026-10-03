import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(
  new URL("../packages/angular/adapter-taiga-ui/", import.meta.url)
);
function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    if (["node_modules", "dist", "coverage", ".turbo"].includes(entry.name))
      return [];
    return entry.isDirectory() ? files(file) : [file];
  });
}
const sources = files(root).filter(
  (file) => /\.(ts|html)$/.test(file) && !file.includes(".test.")
);
const read = (file) => readFileSync(file, "utf8");

test("every clickable native host uses a Taiga component", () => {
  for (const file of sources) {
    const source = read(file);
    for (const match of source.matchAll(/<(button|input|textarea)\b[^>]*>/g)) {
      assert.match(
        match[0],
        /\btui(?:Button|Option|Checkbox|Input|Select|Textarea)\b/,
        `${file}: ${match[0]}`
      );
    }
    assert.doesNotMatch(source, /<(select|summary|details|dialog)\b/, file);
  }
});

test("interactive Taiga checkboxes participate in standalone Angular forms", () => {
  for (const file of sources) {
    for (const match of read(file).matchAll(
      /<input\b[^>]*\btuiCheckbox\b[^>]*>/g
    )) {
      assert.match(match[0], /\[ngModel\]=/, `${file}: ${match[0]}`);
      assert.match(
        match[0],
        /\[ngModelOptions\]="\{ standalone: true \}"/,
        `${file}: ${match[0]}`
      );
    }
  }
});

test("kit imports only its Angular binding and its own feature entries", () => {
  for (const file of sources) {
    for (const match of read(file).matchAll(
      /from\s+["'](@adapttable\/[^"']+)["']/g
    )) {
      assert.match(
        match[1],
        /^@adapttable\/(angular|taiga-ui)(\/|$)/,
        `${file}: ${match[1]}`
      );
    }
  }
});

test("secondary feature entries match the Angular reference kit", () => {
  const entries = (dir) =>
    readdirSync(dir, { withFileTypes: true })
      .filter(
        (entry) =>
          entry.isDirectory() &&
          !["src", "node_modules", "dist", "coverage", ".turbo"].includes(
            entry.name
          )
      )
      .map((entry) => entry.name)
      .sort();
  assert.deepEqual(
    entries(root),
    entries(path.join(root, "../adapter-angular-unstyled"))
  );
});

test("overlays and scoped themes belong to Taiga", () => {
  assert.match(
    read(path.join(root, "src/components/filterPopover.ts")),
    /\[tuiDropdown\]/
  );
  assert.match(
    read(path.join(root, "src/components/filterPanel.ts")),
    /<tui-drawer/
  );
  assert.match(
    read(path.join(root, "src/components/filterPanel.ts")),
    /\[overlay\]="true"/
  );
  const styles = read(path.join(root, "src/taigaRoot.less"));
  assert.match(styles, /\[data-adapttable-taiga-root\]/);
  assert.match(styles, /\.taiga-ui-theme\(\)/);
  assert.doesNotMatch(
    styles,
    /taiga-ui-global|taiga-ui-theme\.less|:root\s*\{/
  );
});

test("release package is public with compatible native peers", () => {
  const manifest = JSON.parse(read(path.join(root, "package.json")));
  assert.notEqual(manifest.private, true);
  assert.equal(manifest.publishConfig?.access, "public");
  // Changesets owns the initial bump and subsequent release versions.
  assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
  assert.equal(manifest.peerDependencies["@taiga-ui/core"], "5.26.0");
  assert.equal(manifest.peerDependencies["@taiga-ui/kit"], "5.26.0");
});
