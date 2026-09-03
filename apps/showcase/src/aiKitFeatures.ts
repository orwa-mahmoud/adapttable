/**
 * Kit factories for the AI playground — the same entry points a consumer
 * imports, not a copied control set.
 */
import { agentApproval as antdApproval } from "@adapttable/antd";
import {
  batchEditing as antdBatch,
  editHistory as antdHistory,
  editing as antdEditing,
  undoRedoButtons as antdUndo,
} from "@adapttable/antd/editing";
import { filters as antdFilters } from "@adapttable/antd/filters";
import { agentApproval as baseUiApproval } from "@adapttable/base-ui";
import {
  batchEditing as baseUiBatch,
  editHistory as baseUiHistory,
  editing as baseUiEditing,
  undoRedoButtons as baseUiUndo,
} from "@adapttable/base-ui/editing";
import { filters as baseUiFilters } from "@adapttable/base-ui/filters";
import { agentApproval as chakraApproval } from "@adapttable/chakra";
import {
  batchEditing as chakraBatch,
  editHistory as chakraHistory,
  editing as chakraEditing,
  undoRedoButtons as chakraUndo,
} from "@adapttable/chakra/editing";
import { filters as chakraFilters } from "@adapttable/chakra/filters";
import { agentApproval as mantineApproval } from "@adapttable/mantine";
import {
  batchEditing as mantineBatch,
  editHistory as mantineHistory,
  editing as mantineEditing,
  undoRedoButtons as mantineUndo,
} from "@adapttable/mantine/editing";
import { filters as mantineFilters } from "@adapttable/mantine/filters";
import { agentApproval as muiApproval } from "@adapttable/mui";
import {
  batchEditing as muiBatch,
  editHistory as muiHistory,
  editing as muiEditing,
  undoRedoButtons as muiUndo,
} from "@adapttable/mui/editing";
import { filters as muiFilters } from "@adapttable/mui/filters";
import { agentApproval as radixApproval } from "@adapttable/radix";
import {
  batchEditing as radixBatch,
  editHistory as radixHistory,
  editing as radixEditing,
  undoRedoButtons as radixUndo,
} from "@adapttable/radix/editing";
import { filters as radixFilters } from "@adapttable/radix/filters";
import { agentApproval as shadcnApproval } from "@adapttable/shadcn";
import {
  batchEditing as shadcnBatch,
  editHistory as shadcnHistory,
  editing as shadcnEditing,
  undoRedoButtons as shadcnUndo,
} from "@adapttable/shadcn/editing";
import { filters as shadcnFilters } from "@adapttable/shadcn/filters";
import { agentApproval as unstyledApproval } from "@adapttable/unstyled";
import {
  batchEditing as unstyledBatch,
  editHistory as unstyledHistory,
  editing as unstyledEditing,
  undoRedoButtons as unstyledUndo,
} from "@adapttable/unstyled/editing";
import { filters as unstyledFilters } from "@adapttable/unstyled/filters";

export const AI_KIT_FEATURES = {
  mantine: {
    approval: mantineApproval,
    editing: mantineEditing,
    batch: mantineBatch,
    history: mantineHistory,
    undo: mantineUndo,
    filters: mantineFilters,
  },
  mui: {
    approval: muiApproval,
    editing: muiEditing,
    batch: muiBatch,
    history: muiHistory,
    undo: muiUndo,
    filters: muiFilters,
  },
  chakra: {
    approval: chakraApproval,
    editing: chakraEditing,
    batch: chakraBatch,
    history: chakraHistory,
    undo: chakraUndo,
    filters: chakraFilters,
  },
  antd: {
    approval: antdApproval,
    editing: antdEditing,
    batch: antdBatch,
    history: antdHistory,
    undo: antdUndo,
    filters: antdFilters,
  },
  radix: {
    approval: radixApproval,
    editing: radixEditing,
    batch: radixBatch,
    history: radixHistory,
    undo: radixUndo,
    filters: radixFilters,
  },
  "base-ui": {
    approval: baseUiApproval,
    editing: baseUiEditing,
    batch: baseUiBatch,
    history: baseUiHistory,
    undo: baseUiUndo,
    filters: baseUiFilters,
  },
  shadcn: {
    approval: shadcnApproval,
    editing: shadcnEditing,
    batch: shadcnBatch,
    history: shadcnHistory,
    undo: shadcnUndo,
    filters: shadcnFilters,
  },
  tailwind: {
    approval: unstyledApproval,
    editing: unstyledEditing,
    batch: unstyledBatch,
    history: unstyledHistory,
    undo: unstyledUndo,
    filters: unstyledFilters,
  },
} as const;

export type AiKitKey = keyof typeof AI_KIT_FEATURES;
