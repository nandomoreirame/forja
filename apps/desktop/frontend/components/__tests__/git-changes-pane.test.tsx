import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GitChangesPane } from "../git-changes-pane";
import { useGitDiffStore } from "@/stores/git-diff";
import { useFilePreviewStore } from "@/stores/file-preview";

describe("GitChangesPane", () => {
  beforeEach(() => {
    useGitDiffStore.getState().reset();
    useFilePreviewStore.setState({
      isOpen: false,
      currentFile: null,
      content: null,
      isLoading: false,
      error: null,
    });
  });

  it("renders grouped changes by project and counters", () => {
    useGitDiffStore.setState({
      changedFilesByProject: {
        "/repo-a": [{ path: "src/a.ts", status: "M", staged: false, unstaged: true }],
      },
      projectCountersByPath: {
        "/repo-a": { modified: 1, added: 0, deleted: 0, untracked: 0, total: 1 },
      },
    });

    render(<GitChangesPane projectPaths={["/repo-a"]} />);

    expect(screen.getByTestId("git-changes-pane")).toBeInTheDocument();
    expect(screen.getByText("Changes")).toBeInTheDocument();
    expect(screen.queryByText("src/a.ts")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /expand changes/i }));
    expect(screen.getByText("repo-a")).toBeInTheDocument();
    expect(screen.getByText("M:1 A:0 D:0 U:0")).toBeInTheDocument();
    expect(screen.getByText("src/a.ts")).toBeInTheDocument();
  });

  it("opens preview and selects changed file on click", async () => {
    const selectSpy = vi.spyOn(useGitDiffStore.getState(), "selectChangedFile");
    useGitDiffStore.setState({
      changedFilesByProject: {
        "/repo-a": [{ path: "src/a.ts", status: "M", staged: false, unstaged: true }],
      },
      projectCountersByPath: {
        "/repo-a": { modified: 1, added: 0, deleted: 0, untracked: 0, total: 1 },
      },
    });

    render(<GitChangesPane projectPaths={["/repo-a"]} />);
    fireEvent.click(screen.getByRole("button", { name: /expand changes/i }));
    fireEvent.click(screen.getByRole("button", { name: /src\/a.ts/i }));

    expect(useFilePreviewStore.getState().isOpen).toBe(true);
    expect(selectSpy).toHaveBeenCalledWith("/repo-a", "src/a.ts");
  });
});
