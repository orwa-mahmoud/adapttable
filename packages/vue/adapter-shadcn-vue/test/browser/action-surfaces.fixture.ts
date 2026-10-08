import { computed, defineComponent, h, ref } from "vue";

import { ar } from "../../../../shared/i18n/src/locales/ar";
import { DataTable } from "../../src";
import { tableAssistant, type TableAssistantProps } from "../../src/assistant";
import { cellNavigation } from "../../src/cell-navigation";
import { commandPalette } from "../../src/command-palette";
import { contextMenu } from "../../src/context-menu";
import { shadcnButton } from "../../src/controls";
import { sidePanel } from "../../src/side-panel";

const rows = [{ id: "ada", name: "Ada", team: "Core" }];
type Row = (typeof rows)[number];

/** Browser host owns draft, open panels, and every requested action. */
export default defineComponent({
  name: "ShadcnActionSurfacesFixture",
  setup() {
    const dir = ref<"ltr" | "rtl">("ltr");
    const open = ref(false);
    const draft = ref("");
    const result = ref("");
    const rejectedClose = ref(false);
    const closeRequests = ref(0);
    const panel = ref<string | null>("summary");
    const acceptPanelChange = ref(false);
    const panelRequest = ref("");
    const labels = computed(() => (dir.value === "rtl" ? ar : undefined));
    const words = computed(() =>
      dir.value === "rtl"
        ? {
            name: "الاسم",
            team: "الفريق",
            inspect: "فحص الصف",
            unavailable: "غير متاح",
            run: "إنشاء تقرير",
            summary: "الملخص",
            detail: "التفاصيل",
            example: "ابحث عن آدا",
            exampleDescription: "عرض الصف المطابق",
          }
        : {
            name: "Name",
            team: "Team",
            inspect: "Inspect row",
            unavailable: "Unavailable",
            run: "Create report",
            summary: "Summary",
            detail: "Details",
            example: "Find Ada",
            exampleDescription: "Show a matching row",
          }
    );
    const features = computed(() => [
      cellNavigation(),
      contextMenu<Row>({
        items: () => [
          {
            key: "unavailable",
            label: words.value.unavailable,
            disabled: true,
            onSelect: () => {
              result.value = "Unexpected disabled action";
            },
          },
          {
            key: "inspect",
            label: words.value.inspect,
            separatorBefore: true,
            onSelect: () => {
              result.value = "Inspect Ada";
            },
          },
        ],
      }),
      commandPalette({
        button: true,
        commands: [
          {
            key: "report",
            label: words.value.run,
            onSelect: () => {
              result.value = "Report requested";
            },
          },
        ],
      }),
      sidePanel({
        open: panel,
        onOpenChange: (next) => {
          panelRequest.value = next ?? "closed";
          if (acceptPanelChange.value) panel.value = next;
        },
        panels: [
          {
            key: "summary",
            label: words.value.summary,
            content: "Summary body",
          },
          { key: "detail", label: words.value.detail, content: "Details body" },
        ],
      }),
      tableAssistant(),
    ]);
    const assistant = (): TableAssistantProps["assistant"] => ({
      status: "ready",
      messages: [],
      draft: draft.value,
      setDraft: (value) => {
        draft.value = value;
      },
      send: () => {
        result.value = `Sent ${draft.value}`;
      },
      stop: () => {
        result.value = "Stopped";
      },
      suggestions: [
        {
          id: "find",
          title: words.value.example,
          description: words.value.exampleDescription,
        },
      ],
      runSuggestion: () => {
        result.value = "Suggestion requested";
      },
    });
    return () =>
      h("main", { dir: dir.value, class: "mx-auto grid max-w-5xl gap-4 p-4" }, [
        h("div", { class: "flex flex-wrap gap-2" }, [
          shadcnButton({
            attrs: {
              id: "direction-toggle",
              onClick: () => {
                dir.value = dir.value === "ltr" ? "rtl" : "ltr";
              },
            },
            label: "العربية / English",
          }),
          shadcnButton({
            attrs: {
              id: "allow-panel-change",
              "aria-pressed": acceptPanelChange.value,
              onClick: () => {
                acceptPanelChange.value = !acceptPanelChange.value;
              },
            },
            label: "Accept panel changes",
          }),
          shadcnButton({
            attrs: {
              id: "reopen-panel",
              onClick: () => {
                panel.value = "summary";
              },
            },
            label: "Open panel",
          }),
          shadcnButton({
            attrs: { id: "outside-focus" },
            label: "Outside target",
          }),
        ]),
        h(DataTable<Row>, {
          data: rows,
          columns: [
            { key: "name", header: words.value.name },
            { key: "team", header: words.value.team },
          ],
          rowKey: (row) => row.id,
          dir: dir.value,
          labels: labels.value,
          urlSync: false,
          searchable: false,
          features: features.value,
          assistant: {
            assistant: assistant(),
            open: open.value,
            labels: labels.value,
            dir: dir.value,
            presentation: "sheet",
            onOpenChange: (next) => {
              if (next) open.value = true;
              else {
                closeRequests.value++;
                if (rejectedClose.value) open.value = false;
                else rejectedClose.value = true;
              }
            },
          },
        }),
        h("output", { id: "host-result", "aria-live": "polite" }, result.value),
        h("output", { id: "close-requests" }, String(closeRequests.value)),
        h("output", { id: "panel-request" }, panelRequest.value),
      ]);
  },
});
