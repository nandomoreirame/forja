import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { CommandPalette } from "../command-palette";
import { useCommandPaletteStore } from "@/stores/command-palette";

// cmdk calls scrollIntoView which jsdom doesn't implement
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  open: vi.fn(),
}));

const mockFileTreeState = {
  tree: null as ReturnType<typeof import("@/stores/file-tree").useFileTreeStore> extends { tree: infer T } ? T : unknown,
  currentPath: null as string | null,
  toggleSidebar: vi.fn(),
  openProject: vi.fn(),
  selectFile: vi.fn(),
  isOpen: false,
  expandedPaths: new Set<string>(),
  setTree: vi.fn(),
  toggleExpanded: vi.fn(),
  isExpanded: vi.fn(),
  collapseAll: vi.fn(),
};

vi.mock("@/stores/file-tree", () => ({
  APP_NAME: "Forja",
  useFileTreeStore: Object.assign(
    () => mockFileTreeState,
    { getState: () => mockFileTreeState }
  ),
}));

vi.mock("@/stores/file-preview", () => ({
  useFilePreviewStore: Object.assign(() => ({}), {
    getState: () => ({
      loadFile: vi.fn(),
      togglePreview: vi.fn(),
    }),
  }),
}));

vi.mock("@/stores/terminal-tabs", () => ({
  useTerminalTabsStore: Object.assign(() => ({}), {
    getState: () => ({
      addTab: vi.fn(),
      nextTabId: () => "tab-1",
    }),
  }),
}));

vi.mock("@/stores/app-dialogs", () => ({
  useAppDialogsStore: Object.assign(() => ({}), {
    getState: () => ({
      setShortcutsOpen: vi.fn(),
      setAboutOpen: vi.fn(),
    }),
  }),
}));

describe("CommandPalette", () => {
  beforeEach(() => {
    useCommandPaletteStore.setState({ isOpen: false, mode: "files" });
    mockFileTreeState.tree = null;
    mockFileTreeState.currentPath = null;
  });

  it("does not render dialog content when isOpen is false", () => {
    render(<CommandPalette />);
    expect(screen.queryByPlaceholderText("Search files...")).not.toBeInTheDocument();
  });

  it("renders files mode with correct placeholder", () => {
    useCommandPaletteStore.setState({ isOpen: true, mode: "files" });
    render(<CommandPalette />);
    expect(screen.getByPlaceholderText("Search files...")).toBeInTheDocument();
  });

  it("renders commands mode with correct placeholder", () => {
    useCommandPaletteStore.setState({ isOpen: true, mode: "commands" });
    render(<CommandPalette />);
    expect(screen.getByPlaceholderText("Type a command...")).toBeInTheDocument();
  });

  it("lists commands in commands mode", () => {
    useCommandPaletteStore.setState({ isOpen: true, mode: "commands" });
    render(<CommandPalette />);

    expect(screen.getByText("New Session")).toBeInTheDocument();
    expect(screen.getByText("Add Project")).toBeInTheDocument();
    expect(screen.getByText("Toggle Sidebar")).toBeInTheDocument();
    expect(screen.getByText("Toggle File Preview")).toBeInTheDocument();
    expect(screen.getByText("Keyboard Shortcuts")).toBeInTheDocument();
    expect(screen.getByText("About")).toBeInTheDocument();
  });

  it("lists flattened files when tree is available in files mode", () => {
    mockFileTreeState.tree = {
      root: {
        name: "project",
        path: "/home/user/project",
        isDir: true,
        children: [
          {
            name: "README.md",
            path: "/home/user/project/README.md",
            isDir: false,
            extension: "md",
          },
          {
            name: "src",
            path: "/home/user/project/src",
            isDir: true,
            children: [
              {
                name: "index.ts",
                path: "/home/user/project/src/index.ts",
                isDir: false,
                extension: "ts",
              },
            ],
          },
        ],
      },
    };
    mockFileTreeState.currentPath = "/home/user/project";

    useCommandPaletteStore.setState({ isOpen: true, mode: "files" });
    render(<CommandPalette />);

    expect(screen.getByText("README.md")).toBeInTheDocument();
    expect(screen.getByText("src/index.ts")).toBeInTheDocument();
  });

  it("shows shortcut badges on commands", () => {
    useCommandPaletteStore.setState({ isOpen: true, mode: "commands" });
    render(<CommandPalette />);

    const newSessionItem = screen.getByText("New Session").closest("[cmdk-item]") as HTMLElement;
    expect(newSessionItem).toBeInTheDocument();
    expect(within(newSessionItem).getByText(/T$/)).toBeInTheDocument();
  });
});
