import { FormsModule } from "@angular/forms";
import {
  TuiButton,
  TuiCheckbox,
  TuiDataList,
  TuiDialog,
  TuiDropdown,
  TuiInput,
  TuiPopup,
  TuiTextfield,
} from "@taiga-ui/core";
import { TuiDrawer, TuiSelect, TuiSkeleton, TuiTextarea } from "@taiga-ui/kit";

import { AdaptTaigaLabels } from "./selectLabels";

/** Native Taiga components shared by the adapter's slot implementations. */

export const TAIGA_CONTROLS = [
  AdaptTaigaLabels,
  FormsModule,
  TuiButton,
  TuiCheckbox,
  TuiDataList,
  TuiDropdown,
  TuiPopup,
  TuiDialog,
  TuiInput,
  TuiTextfield,
  TuiSelect,
  TuiDrawer,
  TuiTextarea,
  TuiSkeleton,
] as const;
