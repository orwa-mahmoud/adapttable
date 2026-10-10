import type {
  ContextMenuSurfaceProps,
  ManagedCommandPaletteSurfaceProps,
  RowMoveMenuSlotProps,
  RowReorderControlSlots,
} from "@adapttable/vue/adapter";
import { mount } from "@vue/test-utils";
import {
  defineComponent,
  h,
  KeepAlive,
  nextTick,
  shallowRef,
  type VNode,
} from "vue";
import { createVuetify } from "vuetify";
import { VDialog } from "vuetify/components/VDialog";
import { VMenu } from "vuetify/components/VMenu";
import { aliases, mdi } from "vuetify/iconsets/mdi-svg";

import { VuetifyCommandSurface } from "../src/actions/VuetifyCommandSurface";
import { VuetifyContextSurface } from "../src/actions/VuetifyContextSurface";
import VuetifyFilterDrawer from "../src/filters/VuetifyFilterDrawer.vue";
import VuetifyFilterPopover from "../src/filters/VuetifyFilterPopover.vue";
import { vuetifyReorderSlots } from "../src/reorder/controls";
import { VuetifyMoveMenu } from "../src/reorder/VuetifyMoveMenu";

const wrappers: ReturnType<typeof mount>[] = [];
function render(content: () => VNode) {
  const wrapper = mount(
    defineComponent(() => content),
    {
      attachTo: document.body,
      global: {
        plugins: [
          createVuetify({
            ssr: true,
            icons: { defaultSet: "mdi", aliases, sets: { mdi } },
          }),
        ],
      },
    }
  );
  wrappers.push(wrapper);
  return wrapper;
}
afterEach(async () => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  await nextTick();
  document.body.replaceChildren();
});
const part = (name: string) => `[data-adapttable-part="${name}"]`;

it.each([false, true])(
  "admits native dismissal only for open filter owners, drawer=%s",
  async (drawer) => {
    const open = shallowRef(true);
    const close = vi.fn();
    const wrapper = render(() =>
      h(drawer ? VuetifyFilterDrawer : VuetifyFilterPopover, {
        open: open.value,
        anchor: null,
        label: "Filters",
        dir: "ltr",
        children: h("p", "Fields"),
        onClose: close,
      })
    );
    await nextTick();
    const overlay = drawer
      ? wrapper.getComponent(VDialog)
      : wrapper.getComponent(VMenu);
    overlay.vm.$emit("update:modelValue", true);
    await nextTick();
    expect(close).not.toHaveBeenCalled();
    overlay.vm.$emit("update:modelValue", false);
    await nextTick();
    expect(close).toHaveBeenCalledExactlyOnceWith("outside");
    open.value = false;
    await nextTick();
    overlay.vm.$emit("update:modelValue", false);
    await nextTick();
    expect(close).toHaveBeenCalledTimes(1);
  }
);

it("retires queued filter dismissal after owner or anchor replacement", async () => {
  const first = vi.fn();
  const second = vi.fn();
  const close = shallowRef(first);
  const anchor = shallowRef<HTMLElement | null>(null);
  const wrapper = render(() =>
    h(VuetifyFilterPopover, {
      open: true,
      anchor: anchor.value,
      label: "Filters",
      dir: "ltr",
      children: h("p", "Fields"),
      onClose: close.value,
    })
  );
  await nextTick();
  const overlay = wrapper.getComponent(VMenu);
  close.value = second;
  overlay.vm.$emit("update:modelValue", false);
  await nextTick();
  expect(first).not.toHaveBeenCalled();
  expect(second).not.toHaveBeenCalled();
  const replacement = document.createElement("button");
  document.body.append(replacement);
  anchor.value = replacement;
  overlay.vm.$emit("update:modelValue", false);
  await nextTick();
  expect(second).not.toHaveBeenCalled();
});

it("ignores a retained context-menu dismissal after the control owner changes", async () => {
  const anchor = document.createElement("button");
  document.body.append(anchor);
  const first = vi.fn();
  const second = vi.fn();
  const control = shallowRef<ContextMenuSurfaceProps>({
    at: { x: 0, y: 0 },
    anchorRef: { current: anchor },
    label: "Actions",
    children: h("button", "Action"),
    onClose: first,
  });
  const wrapper = render(() =>
    h(VuetifyContextSurface, { control: control.value, dir: "rtl" })
  );
  await nextTick();
  const overlay = wrapper.getComponent(VMenu);
  const retained = overlay.vm.$.vnode.props?.["onUpdate:modelValue"];
  const entered = overlay.vm.$.vnode.props?.onAfterEnter;
  if (typeof retained !== "function" || typeof entered !== "function")
    throw new Error("Missing native menu callbacks");
  retained(true);
  expect(first).not.toHaveBeenCalled();
  retained(false);
  expect(first).toHaveBeenCalledOnce();
  entered();
  control.value = { ...control.value, onClose: second };
  await nextTick();
  retained(false);
  entered();
  expect(first).toHaveBeenCalledOnce();
  expect(second).not.toHaveBeenCalled();
  wrapper.getComponent(VMenu).vm.$emit("update:modelValue", false);
  expect(second).toHaveBeenCalledOnce();
});

it("cancels queued command focus and dismissal when its lifetime retires", async () => {
  const opener = document.createElement("button");
  document.body.append(opener);
  opener.focus();
  let current = true;
  const close = vi.fn();
  const control: ManagedCommandPaletteSurfaceProps = {
    open: true,
    label: "Commands",
    children: h("input", { role: "combobox" }),
    onClose: close,
    isCurrent: () => current,
    getOpener: () => opener,
  };
  const wrapper = render(() =>
    h(VuetifyCommandSurface, { control, dir: "ltr" })
  );
  await nextTick();
  const dialog = wrapper.getComponent(VDialog);
  dialog.vm.$emit("update:modelValue", true);
  expect(close).not.toHaveBeenCalled();
  dialog.vm.$emit("update:modelValue", false);
  expect(close).toHaveBeenCalledOnce();
  dialog.vm.$emit("afterEnter");
  current = false;
  opener.focus();
  await nextTick();
  dialog.vm.$emit("update:modelValue", false);
  expect(close).toHaveBeenCalledOnce();
  expect(document.activeElement).toBe(opener);
});

it("does not move newer outside focus when a command dialog finishes entering", async () => {
  const opener = document.createElement("button");
  const outside = document.createElement("button");
  document.body.append(opener, outside);
  opener.focus();
  const control: ManagedCommandPaletteSurfaceProps = {
    open: true,
    label: "Commands",
    children: h("input", { role: "combobox" }),
    onClose: vi.fn(),
    isCurrent: () => true,
    getOpener: () => opener,
  };
  const wrapper = render(() =>
    h(VuetifyCommandSurface, { control, dir: "ltr" })
  );
  await nextTick();
  outside.focus();
  wrapper.getComponent(VDialog).vm.$emit("afterEnter");
  await nextTick();
  expect(document.activeElement).toBe(outside);
});

it("guards retained native move-confirmation callbacks and resumes with fresh controls", async () => {
  const cancel = vi.fn();
  const confirm = vi.fn();
  const shown = shallowRef(true);
  const pending = {
    title: "Move record",
    description: "Move into Cloud",
    cancelLabel: "Cancel",
    confirmLabel: "Move",
    onCancel: cancel,
    onConfirm: confirm,
  };
  const control = shallowRef<RowMoveMenuSlotProps>({
    label: "Move",
    items: [],
    confirmation: pending,
  });
  const Menu = defineComponent(
    () => () => h(VuetifyMoveMenu, { control: control.value })
  );
  const wrapper = render(() =>
    h(KeepAlive, null, { default: () => (shown.value ? h(Menu) : null) })
  );
  await nextTick();
  const dialog = wrapper.getComponent(VDialog);
  const update = dialog.vm.$.vnode.props?.["onUpdate:modelValue"];
  const button = document.querySelector<HTMLButtonElement>(
    part("row-move-confirm")
  );
  expect(button).not.toBeNull();
  if (typeof update !== "function")
    throw new Error("Missing native confirmation callback");
  update(true);
  expect(cancel).not.toHaveBeenCalled();
  update(false);
  expect(cancel).toHaveBeenCalledOnce();
  control.value = { ...control.value, confirmation: { ...pending } };
  await nextTick();
  update(false);
  expect(cancel).toHaveBeenCalledOnce();
  shown.value = false;
  await nextTick();
  button?.click();
  update(false);
  expect(confirm).not.toHaveBeenCalled();
  expect(cancel).toHaveBeenCalledOnce();
  shown.value = true;
  await nextTick();
  document.querySelector<HTMLButtonElement>(part("row-move-confirm"))?.click();
  expect(confirm).toHaveBeenCalledOnce();
});

it("forwards real row-drag data and skips composing or already-handled keys", () => {
  type Handle = Parameters<RowReorderControlSlots["Handle"]>[0];
  const drag = vi.fn<Handle["dragProps"]["onDragStart"]>();
  const end = vi.fn();
  const key = vi.fn<Handle["onKeyDown"]>();
  const dataTransfer = {
    setData: vi.fn(),
    getData: vi.fn(),
    effectAllowed: "all",
  };
  const wrapper = render(() =>
    h("div", [
      vuetifyReorderSlots.Handle({
        label: "Move row",
        pressed: false,
        dragging: true,
        disabled: false,
        dragProps: { draggable: true, onDragStart: drag, onDragEnd: end },
        onKeyDown: key,
      }),
    ])
  );
  const button = wrapper.get("button").element;
  button.dispatchEvent(new MouseEvent("dragstart", { bubbles: true }));
  expect(drag).not.toHaveBeenCalled();
  const event = new MouseEvent("dragstart", {
    bubbles: true,
    cancelable: true,
    clientY: 20,
  });
  Object.defineProperty(event, "dataTransfer", { value: dataTransfer });
  button.dispatchEvent(event);
  expect(drag).toHaveBeenCalledOnce();
  const args = drag.mock.calls[0]?.[0];
  if (!args) throw new Error("Missing drag-start request");
  expect(args.currentTarget).toBe(button);
  expect(args.dataTransfer).toBe(dataTransfer);
  args.preventDefault();
  expect(event.defaultPrevented).toBe(true);
  button.dispatchEvent(new Event("dragend"));
  expect(end).toHaveBeenCalledOnce();
  button.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Enter", isComposing: true })
  );
  const prevented = new KeyboardEvent("keydown", {
    key: "Enter",
    cancelable: true,
  });
  prevented.preventDefault();
  button.dispatchEvent(prevented);
  expect(key).not.toHaveBeenCalled();
  const accepted = new KeyboardEvent("keydown", {
    key: "ArrowDown",
    cancelable: true,
  });
  button.dispatchEvent(accepted);
  expect(key).toHaveBeenCalledOnce();
  key.mock.calls[0]?.[0].preventDefault();
  expect(accepted.defaultPrevented).toBe(true);
});
