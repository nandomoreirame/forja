import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TabsetEmptyState } from "../tabset-empty-state";

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  listen: vi.fn(() => () => {}),
}));

const mockOpen = vi.fn();
vi.mock("@/stores/command-palette", () => ({
  useCommandPaletteStore: { getState: () => ({ open: mockOpen }) },
}));

const mockAddBlock = vi.fn();
const mockHasBlock = vi.fn(() => false);
vi.mock("@/stores/tiling-layout", () => ({
  useTilingLayoutStore: { getState: () => ({ addBlock: mockAddBlock, hasBlock: mockHasBlock }) },
}));

vi.mock("@/stores/file-tree", () => ({
  useFileTreeStore: { getState: () => ({ tree: { root: { name: "project" } } }) },
}));

describe("TabsetEmptyState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Forja branding", () => {
    render(<TabsetEmptyState />);

    expect(screen.getByText("Forja")).toBeInTheDocument();
    expect(screen.getByText("A dedicated desktop client for vibe coders")).toBeInTheDocument();
  });

  it("renders keyboard shortcuts", () => {
    render(<TabsetEmptyState />);

    expect(screen.getByText("Quick open")).toBeInTheDocument();
    expect(screen.getByText("Command palette")).toBeInTheDocument();
  });

  it("renders action buttons", () => {
    render(<TabsetEmptyState />);

    expect(screen.getByText("New Session")).toBeInTheDocument();
    expect(screen.getByText("Open Files")).toBeInTheDocument();
    expect(screen.getByText("Browser")).toBeInTheDocument();
  });

  it("opens command palette with sessions filter on New Session click", () => {
    render(<TabsetEmptyState />);

    fireEvent.click(screen.getByText("New Session"));
    expect(mockOpen).toHaveBeenCalledWith("sessions");
  });

  it("adds file-tree block on Open Files click when not already present", () => {
    mockHasBlock.mockReturnValue(false);
    render(<TabsetEmptyState />);

    fireEvent.click(screen.getByText("Open Files"));
    expect(mockAddBlock).toHaveBeenCalledWith(
      { type: "file-tree", projectName: "project" },
      undefined,
      "tab-file-tree",
    );
  });

  it("does not add file-tree block when already present", () => {
    mockHasBlock.mockReturnValue(true);
    render(<TabsetEmptyState />);

    fireEvent.click(screen.getByText("Open Files"));
    expect(mockAddBlock).not.toHaveBeenCalled();
  });

  it("adds browser block on Browser click", () => {
    render(<TabsetEmptyState />);

    fireEvent.click(screen.getByText("Browser"));
    expect(mockAddBlock).toHaveBeenCalledWith(
      expect.objectContaining({ type: "browser", url: "https://github.com/nandomoreirame/forja" }),
      undefined,
      expect.stringContaining("browser-"),
    );
  });
});
