# Visual regression baselines

Chromium screenshots of the v3 showcase UI. Firefox and WebKit are not
in this project — rasterisation differs too much to share one baseline.

## Layout

```
e2e/visual/baselines/<platform>/<name>.png
```

`<platform>` is Playwright's OS id (`darwin`, `linux`, `win32`). Fonts
and sub-pixel hinting differ, so a macOS capture will not match CI
Ubuntu. The nightly workflow runs on `ubuntu-latest` and compares the
`linux` tree.

Names encode the matrix:

| Name                        | What it is                            |
| --------------------------- | ------------------------------------- |
| `<kit>-desktop-light-ltr`   | Columns page, desktop, light, LTR     |
| `<kit>-desktop-dark-ltr`    | Columns page, desktop, dark, LTR      |
| `<kit>-desktop-light-rtl`   | RTL page, desktop, light              |
| `<kit>-mobile-light-ltr`    | Mobile-cards page at Pixel 5          |
| `<kit>-overlay-filters`     | Open filters popover on `/filtering/` |
| `<kit>-overlay-column-menu` | Open column menu on `/columns/`       |

`<kit>` is a showcase key: `mantine`, `mui`, `chakra`, `antd`, `radix`,
`base-ui`, `shadcn`, `tailwind` (the unstyled adapter).

## Update baselines

From the repo root, after the showcase can build:

```bash
# This OS only (darwin on this machine, linux in CI)
pnpm test:e2e:visual -- --update-snapshots

# One snapshot
pnpm test:e2e:visual -- e2e/visual/v3-ui.spec.ts -g "mantine columns light" --update-snapshots
```

Linux baselines that match the nightly runner:

```bash
# Playwright's official image, same browser build CI uses. It runs on a
# copy of the tree: the install inside the container writes Linux binaries
# into node_modules, which must not replace the host's.
rsync -a --delete --exclude node_modules --exclude .turbo --exclude dist \
  ./ /tmp/adapttable-linux/
docker run --rm -e CI=1 -e COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
  -v /tmp/adapttable-linux:/work -w /work \
  mcr.microsoft.com/playwright:v1.62.1-noble \
  bash -lc 'corepack enable && pnpm install --frozen-lockfile && pnpm exec playwright test --project=chromium-visual --update-snapshots'
cp /tmp/adapttable-linux/e2e/visual/baselines/linux/*.png \
  e2e/visual/baselines/linux/
```

Commit the PNG files that changed. Do not hand-edit pixels.

## Review a diff

A failed run writes the actual, expected and diff images under
`test-results/`. That folder is gitignored. Open the HTML report
(`playwright-report/`) or the three PNGs next to the failing spec.
