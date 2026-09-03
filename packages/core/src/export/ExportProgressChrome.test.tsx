import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { defaultLabels } from "../labels";
import { ExportProgressChrome } from "./ExportProgressChrome";
import type { ExportProgressState } from "./useExportHandler";

function renderProgress(
  progress: ExportProgressState | null,
  labels: Partial<typeof defaultLabels> = defaultLabels
) {
  return render(
    <ExportProgressChrome
      progress={progress}
      labels={labels}
      slots={{
        Surface: (props) => (
          <div data-testid="surface">
            <span data-testid="status">{props.status}</span>
            <span data-testid="heading">{props.heading}</span>
            <span data-testid="progress-label">{props.progressLabel}</span>
            {props.cancel ? (
              <button type="button" onClick={props.cancel.onAction}>
                {props.cancel.label}
              </button>
            ) : null}
            {props.retry ? (
              <button type="button" onClick={props.retry.onAction}>
                {props.retry.label}
              </button>
            ) : null}
            {props.download ? (
              <a href={props.download.url}>{props.download.label}</a>
            ) : null}
          </div>
        ),
      }}
    />
  );
}

describe("ExportProgressChrome", () => {
  it("renders nothing without progress", () => {
    const { container } = renderProgress(null);
    expect(container).toBeEmptyDOMElement();
  });

  it("maps busy, done, failed and cancelled onto the kit surface", () => {
    const onCancel = vi.fn();
    const onRetry = vi.fn();
    const { rerender } = renderProgress({
      status: "busy",
      value: 40,
      message: "writing",
      error: "",
      downloadUrl: undefined,
      onCancel,
      onRetry: undefined,
    });
    expect(screen.getByTestId("status")).toHaveTextContent("busy");
    expect(screen.getByTestId("heading")).toHaveTextContent(
      defaultLabels.exportStarted ?? "Preparing export"
    );
    expect(screen.getByTestId("progress-label")).toHaveTextContent("40");
    screen
      .getByRole("button", { name: defaultLabels.cancel ?? "Cancel" })
      .click();
    expect(onCancel).toHaveBeenCalledTimes(1);

    rerender(
      <ExportProgressChrome
        progress={{
          status: "done",
          value: 100,
          message: "ready",
          error: "",
          downloadUrl: "https://files.example/export.csv",
          onCancel: undefined,
          onRetry: undefined,
        }}
        labels={defaultLabels}
        slots={{
          Surface: (props) => (
            <div data-testid="surface">
              <span data-testid="heading">{props.heading}</span>
              {props.download ? (
                <a href={props.download.url}>{props.download.label}</a>
              ) : null}
            </div>
          ),
        }}
      />
    );
    expect(screen.getByTestId("heading")).toHaveTextContent(
      defaultLabels.exportDone ?? "Export complete"
    );
    expect(
      screen.getByRole("link", {
        name: defaultLabels.exportDownload ?? "Download export",
      })
    ).toHaveAttribute("href", "https://files.example/export.csv");

    rerender(
      <ExportProgressChrome
        progress={{
          status: "failed",
          value: undefined,
          message: "",
          error: "disk full",
          downloadUrl: undefined,
          onCancel: undefined,
          onRetry,
        }}
        labels={{}}
        slots={{
          Surface: (props) => (
            <div data-testid="surface">
              <span data-testid="heading">{props.heading}</span>
              <span data-testid="progress-label">{props.progressLabel}</span>
              {props.retry ? (
                <button type="button" onClick={props.retry.onAction}>
                  {props.retry.label}
                </button>
              ) : null}
            </div>
          ),
        }}
      />
    );
    expect(screen.getByTestId("heading")).toHaveTextContent("Export failed");
    expect(screen.getByTestId("progress-label")).toHaveTextContent(
      "Preparing export"
    );
    screen.getByRole("button", { name: "Retry" }).click();
    expect(onRetry).toHaveBeenCalledTimes(1);

    rerender(
      <ExportProgressChrome
        progress={{
          status: "cancelled",
          value: undefined,
          message: "",
          error: "",
          downloadUrl: undefined,
          onCancel: undefined,
          onRetry: undefined,
        }}
        labels={{}}
        slots={{
          Surface: (props) => (
            <div data-testid="surface">
              <span data-testid="heading">{props.heading}</span>
            </div>
          ),
        }}
      />
    );
    expect(screen.getByTestId("heading")).toHaveTextContent("Export cancelled");
  });
});
