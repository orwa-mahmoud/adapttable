import {
  type TableLabels,
  useSavedViews,
  type UseSavedViewsOptions,
} from "@adapttable/core";
import {
  Box,
  Button,
  Divider,
  IconButton,
  Popover,
  Stack,
  TextField,
} from "@mui/material";
import { useState } from "react";

/** The label strings the saved-views menu renders. */
export type SavedViewsLabels = Pick<
  Required<TableLabels>,
  "savedViews" | "saveView" | "viewName" | "deleteView"
>;

/** Props for the saved-views menu. */
export interface SavedViewsMenuProps {
  /** Storage + URL backend wiring, forwarded to core's `useSavedViews`. */
  options: UseSavedViewsOptions;
  /** Resolved table labels (trigger, save row, delete action). */
  labels: SavedViewsLabels;
}

/**
 * MUI saved-views menu: a toolbar button opening a popover that lists the
 * saved views — click applies one to the table, the trailing × deletes it —
 * above a save row that captures the table's CURRENT URL state (search,
 * sort, page, filters, column layout) under a typed name.
 */
export function SavedViewsMenu({
  options,
  labels,
}: Readonly<SavedViewsMenuProps>) {
  const { views, save, apply, remove } = useSavedViews(options);
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const [name, setName] = useState("");
  const trimmed = name.trim();
  return (
    <>
      <Button
        size="small"
        variant="outlined"
        aria-expanded={anchor !== null}
        aria-haspopup="true"
        onClick={(e) => setAnchor(e.currentTarget)}
      >
        {labels.savedViews}
      </Button>
      <Popover
        anchorEl={anchor}
        open={anchor !== null}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <Box sx={{ p: 0.75, minWidth: 250 }}>
          {views.map((view) => (
            <Stack
              key={view.name}
              direction="row"
              spacing={0.5}
              sx={{ alignItems: "center" }}
            >
              <Button
                size="small"
                fullWidth
                sx={{ justifyContent: "flex-start" }}
                onClick={() => {
                  apply(view.name);
                  setAnchor(null);
                }}
              >
                {view.name}
              </Button>
              <IconButton
                size="small"
                aria-label={`${labels.deleteView}: ${view.name}`}
                onClick={() => remove(view.name)}
              >
                ×
              </IconButton>
            </Stack>
          ))}
          <Divider sx={{ my: 0.5 }} />
          <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
            <TextField
              size="small"
              value={name}
              placeholder={labels.viewName}
              slotProps={{ htmlInput: { "aria-label": labels.viewName } }}
              onChange={(e) => setName(e.target.value)}
            />
            <Button
              size="small"
              variant="contained"
              disabled={trimmed === ""}
              onClick={() => {
                save(trimmed);
                setName("");
              }}
            >
              {labels.saveView}
            </Button>
          </Stack>
        </Box>
      </Popover>
    </>
  );
}
