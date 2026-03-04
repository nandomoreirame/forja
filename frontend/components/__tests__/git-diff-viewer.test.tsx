import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GitDiffViewer } from "../git-diff-viewer";

describe("GitDiffViewer", () => {
  it("renders unified mode lines", () => {
    render(
      <GitDiffViewer
        diff={{
          path: "src/a.ts",
          status: "M",
          patch: "diff --git a/src/a.ts b/src/a.ts\n@@ -1 +1 @@\n-old\n+new",
          truncated: false,
          isBinary: false,
        }}
        mode="unified"
        onModeChange={vi.fn()}
      />,
    );

    expect(screen.getByTestId("git-diff-unified")).toBeInTheDocument();
    expect(screen.getByText("+new")).toBeInTheDocument();
  });

  it("renders split mode and toggles to unified", () => {
    const onModeChange = vi.fn();
    render(
      <GitDiffViewer
        diff={{
          path: "src/a.ts",
          status: "M",
          patch: "diff --git a/src/a.ts b/src/a.ts\n@@ -1 +1 @@\n-old\n+new",
          truncated: false,
          isBinary: false,
        }}
        mode="split"
        onModeChange={onModeChange}
      />,
    );

    expect(screen.getByTestId("git-diff-split")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Unified view" }));
    expect(onModeChange).toHaveBeenCalledWith("unified");
  });
});

