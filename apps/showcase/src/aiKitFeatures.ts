/**
 * Kit factories for the AI playground — the same entry points a consumer
 * imports, not a copied control set.
 */
import { agentApproval as antdApproval } from "@adapttable/antd";
import { TableAssistant as antdAssistant } from "@adapttable/antd/assistant";
import { columnMenu as antdColumnMenu } from "@adapttable/antd/column-menu";
import {
  batchEditing as antdBatch,
  editHistory as antdHistory,
  editing as antdEditing,
  rowEditing as antdRow,
  undoRedoButtons as antdUndo,
} from "@adapttable/antd/editing";
import { filters as antdFilters } from "@adapttable/antd/filters";
import { groupingPanel as antdGrouping } from "@adapttable/antd/grouping-panel";
import { rowPinning as antdRowPinning } from "@adapttable/antd/row-pinning";
import { agentApproval as baseUiApproval } from "@adapttable/base-ui";
import { TableAssistant as baseUiAssistant } from "@adapttable/base-ui/assistant";
import { columnMenu as baseUiColumnMenu } from "@adapttable/base-ui/column-menu";
import {
  batchEditing as baseUiBatch,
  editHistory as baseUiHistory,
  editing as baseUiEditing,
  rowEditing as baseUiRow,
  undoRedoButtons as baseUiUndo,
} from "@adapttable/base-ui/editing";
import { filters as baseUiFilters } from "@adapttable/base-ui/filters";
import { groupingPanel as baseUiGrouping } from "@adapttable/base-ui/grouping-panel";
import { rowPinning as baseUiRowPinning } from "@adapttable/base-ui/row-pinning";
import { agentApproval as chakraApproval } from "@adapttable/chakra";
import { TableAssistant as chakraAssistant } from "@adapttable/chakra/assistant";
import { columnMenu as chakraColumnMenu } from "@adapttable/chakra/column-menu";
import {
  batchEditing as chakraBatch,
  editHistory as chakraHistory,
  editing as chakraEditing,
  rowEditing as chakraRow,
  undoRedoButtons as chakraUndo,
} from "@adapttable/chakra/editing";
import { filters as chakraFilters } from "@adapttable/chakra/filters";
import { groupingPanel as chakraGrouping } from "@adapttable/chakra/grouping-panel";
import { rowPinning as chakraRowPinning } from "@adapttable/chakra/row-pinning";
import { agentApproval as mantineApproval } from "@adapttable/mantine";
import { TableAssistant as mantineAssistant } from "@adapttable/mantine/assistant";
import { columnMenu as mantineColumnMenu } from "@adapttable/mantine/column-menu";
import {
  batchEditing as mantineBatch,
  editHistory as mantineHistory,
  editing as mantineEditing,
  rowEditing as mantineRow,
  undoRedoButtons as mantineUndo,
} from "@adapttable/mantine/editing";
import { filters as mantineFilters } from "@adapttable/mantine/filters";
import { groupingPanel as mantineGrouping } from "@adapttable/mantine/grouping-panel";
import { rowPinning as mantineRowPinning } from "@adapttable/mantine/row-pinning";
import { agentApproval as muiApproval } from "@adapttable/mui";
import { TableAssistant as muiAssistant } from "@adapttable/mui/assistant";
import { columnMenu as muiColumnMenu } from "@adapttable/mui/column-menu";
import {
  batchEditing as muiBatch,
  editHistory as muiHistory,
  editing as muiEditing,
  rowEditing as muiRow,
  undoRedoButtons as muiUndo,
} from "@adapttable/mui/editing";
import { filters as muiFilters } from "@adapttable/mui/filters";
import { groupingPanel as muiGrouping } from "@adapttable/mui/grouping-panel";
import { rowPinning as muiRowPinning } from "@adapttable/mui/row-pinning";
import { agentApproval as radixApproval } from "@adapttable/radix";
import { TableAssistant as radixAssistant } from "@adapttable/radix/assistant";
import { columnMenu as radixColumnMenu } from "@adapttable/radix/column-menu";
import {
  batchEditing as radixBatch,
  editHistory as radixHistory,
  editing as radixEditing,
  rowEditing as radixRow,
  undoRedoButtons as radixUndo,
} from "@adapttable/radix/editing";
import { filters as radixFilters } from "@adapttable/radix/filters";
import { groupingPanel as radixGrouping } from "@adapttable/radix/grouping-panel";
import { rowPinning as radixRowPinning } from "@adapttable/radix/row-pinning";
import { agentApproval as shadcnApproval } from "@adapttable/shadcn";
import { TableAssistant as shadcnAssistant } from "@adapttable/shadcn/assistant";
import { columnMenu as shadcnColumnMenu } from "@adapttable/shadcn/column-menu";
import {
  batchEditing as shadcnBatch,
  editHistory as shadcnHistory,
  editing as shadcnEditing,
  rowEditing as shadcnRow,
  undoRedoButtons as shadcnUndo,
} from "@adapttable/shadcn/editing";
import { filters as shadcnFilters } from "@adapttable/shadcn/filters";
import { groupingPanel as shadcnGrouping } from "@adapttable/shadcn/grouping-panel";
import { rowPinning as shadcnRowPinning } from "@adapttable/shadcn/row-pinning";
import { agentApproval as unstyledApproval } from "@adapttable/unstyled";
import { TableAssistant as unstyledAssistant } from "@adapttable/unstyled/assistant";
import { columnMenu as unstyledColumnMenu } from "@adapttable/unstyled/column-menu";
import {
  batchEditing as unstyledBatch,
  editHistory as unstyledHistory,
  editing as unstyledEditing,
  rowEditing as unstyledRow,
  undoRedoButtons as unstyledUndo,
} from "@adapttable/unstyled/editing";
import { filters as unstyledFilters } from "@adapttable/unstyled/filters";
import { groupingPanel as unstyledGrouping } from "@adapttable/unstyled/grouping-panel";
import { rowPinning as unstyledRowPinning } from "@adapttable/unstyled/row-pinning";

export const AI_KIT_FEATURES = {
  mantine: {
    approval: mantineApproval,
    editing: mantineEditing,
    rowEditing: mantineRow,
    batch: mantineBatch,
    history: mantineHistory,
    undo: mantineUndo,
    filters: mantineFilters,
    Assistant: mantineAssistant,
    grouping: mantineGrouping,
    rowPinning: mantineRowPinning,
    columnMenu: mantineColumnMenu,
  },
  mui: {
    approval: muiApproval,
    editing: muiEditing,
    rowEditing: muiRow,
    batch: muiBatch,
    history: muiHistory,
    undo: muiUndo,
    filters: muiFilters,
    Assistant: muiAssistant,
    grouping: muiGrouping,
    rowPinning: muiRowPinning,
    columnMenu: muiColumnMenu,
  },
  chakra: {
    approval: chakraApproval,
    editing: chakraEditing,
    rowEditing: chakraRow,
    batch: chakraBatch,
    history: chakraHistory,
    undo: chakraUndo,
    filters: chakraFilters,
    Assistant: chakraAssistant,
    grouping: chakraGrouping,
    rowPinning: chakraRowPinning,
    columnMenu: chakraColumnMenu,
  },
  antd: {
    approval: antdApproval,
    editing: antdEditing,
    rowEditing: antdRow,
    batch: antdBatch,
    history: antdHistory,
    undo: antdUndo,
    filters: antdFilters,
    Assistant: antdAssistant,
    grouping: antdGrouping,
    rowPinning: antdRowPinning,
    columnMenu: antdColumnMenu,
  },
  radix: {
    approval: radixApproval,
    editing: radixEditing,
    rowEditing: radixRow,
    batch: radixBatch,
    history: radixHistory,
    undo: radixUndo,
    filters: radixFilters,
    Assistant: radixAssistant,
    grouping: radixGrouping,
    rowPinning: radixRowPinning,
    columnMenu: radixColumnMenu,
  },
  "base-ui": {
    approval: baseUiApproval,
    editing: baseUiEditing,
    rowEditing: baseUiRow,
    batch: baseUiBatch,
    history: baseUiHistory,
    undo: baseUiUndo,
    filters: baseUiFilters,
    Assistant: baseUiAssistant,
    grouping: baseUiGrouping,
    rowPinning: baseUiRowPinning,
    columnMenu: baseUiColumnMenu,
  },
  shadcn: {
    approval: shadcnApproval,
    editing: shadcnEditing,
    rowEditing: shadcnRow,
    batch: shadcnBatch,
    history: shadcnHistory,
    undo: shadcnUndo,
    filters: shadcnFilters,
    Assistant: shadcnAssistant,
    grouping: shadcnGrouping,
    rowPinning: shadcnRowPinning,
    columnMenu: shadcnColumnMenu,
  },
  tailwind: {
    approval: unstyledApproval,
    editing: unstyledEditing,
    rowEditing: unstyledRow,
    batch: unstyledBatch,
    history: unstyledHistory,
    undo: unstyledUndo,
    filters: unstyledFilters,
    Assistant: unstyledAssistant,
    grouping: unstyledGrouping,
    rowPinning: unstyledRowPinning,
    columnMenu: unstyledColumnMenu,
  },
} as const;

export type AiKitKey = keyof typeof AI_KIT_FEATURES;
