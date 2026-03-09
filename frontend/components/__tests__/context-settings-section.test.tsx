import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockInitHub = vi.fn();
const mockSyncOut = vi.fn();
const mockSyncIn = vi.fn();
const mockListItems = vi.fn();
const mockReadItem = vi.fn();
const mockWriteItem = vi.fn();
const mockDeleteItem = vi.fn();

const mockImportItem = vi.fn();

const mockState = {
  status: null as null | { initialized: boolean; counts: Record<string, number>; lastUpdated: string | null },
  syncSummary: null,
  items: [] as Array<{ type: string; slug: string; path: string; fingerprint: string; lastSyncAt: string | null }>,
  currentItem: null as null | { type: string; slug: string; content: string },
  loading: false,
  error: null as string | null,
  initHub: mockInitHub,
  loadStatus: vi.fn(),
  syncOut: mockSyncOut,
  syncIn: mockSyncIn,
  createSkill: vi.fn(),
  createAgent: vi.fn(),
  listItems: mockListItems,
  readItem: mockReadItem,
  writeItem: mockWriteItem,
  deleteItem: mockDeleteItem,
  importItem: mockImportItem,
};

vi.mock("@/stores/context-hub", () => ({
  useContextHubStore: () => mockState,
}));

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  listen: vi.fn(() => Promise.resolve(() => {})),
}));

import { ContextSection } from "../context-settings-section";

describe("ContextSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.status = null;
    mockState.items = [];
    mockState.currentItem = null;
    mockState.loading = false;
    mockState.error = null;
  });

  it("renders section with data-testid", () => {
    render(<ContextSection />);
    expect(screen.getByTestId("settings-section-context")).toBeDefined();
  });

  it("shows init button", () => {
    render(<ContextSection />);
    expect(screen.getByRole("button", { name: /init/i })).toBeDefined();
  });

  it("shows sync out button", () => {
    render(<ContextSection />);
    expect(screen.getByRole("button", { name: /sync out/i })).toBeDefined();
  });

  it("shows sync in button", () => {
    render(<ContextSection />);
    expect(screen.getByRole("button", { name: /sync in/i })).toBeDefined();
  });

  it("init button calls initHub", () => {
    render(<ContextSection />);
    fireEvent.click(screen.getByRole("button", { name: /init/i }));
    expect(mockInitHub).toHaveBeenCalled();
  });

  it("sync out button calls syncOut", () => {
    render(<ContextSection />);
    fireEvent.click(screen.getByRole("button", { name: /sync out/i }));
    expect(mockSyncOut).toHaveBeenCalled();
  });

  it("sync in button calls syncIn", () => {
    render(<ContextSection />);
    fireEvent.click(screen.getByRole("button", { name: /sync in/i }));
    expect(mockSyncIn).toHaveBeenCalled();
  });

  it("shows empty state when no items", () => {
    mockState.items = [];
    render(<ContextSection />);
    expect(screen.getByText(/no items found/i)).toBeDefined();
  });

  it("displays items grouped by type", () => {
    mockState.items = [
      { type: "skill", slug: "tdd", path: "/p/skills/tdd/SKILL.md", fingerprint: "abc", lastSyncAt: null },
      { type: "skill", slug: "debug", path: "/p/skills/debug/SKILL.md", fingerprint: "def", lastSyncAt: null },
      { type: "agent", slug: "reviewer", path: "/p/agents/reviewer.md", fingerprint: "ghi", lastSyncAt: null },
    ];

    render(<ContextSection />);
    expect(screen.getByText("tdd")).toBeDefined();
    expect(screen.getByText("debug")).toBeDefined();
    expect(screen.getByText("reviewer")).toBeDefined();
  });

  it("clicking item calls readItem", () => {
    mockState.items = [
      { type: "skill", slug: "tdd", path: "/p/skills/tdd/SKILL.md", fingerprint: "abc", lastSyncAt: null },
    ];

    render(<ContextSection />);
    fireEvent.click(screen.getByText("tdd"));
    expect(mockReadItem).toHaveBeenCalledWith("skill", "tdd");
  });

  it("shows item content when currentItem is set", () => {
    mockState.currentItem = {
      type: "skill",
      slug: "tdd",
      content: "# TDD Skill\nTest content here",
    };

    render(<ContextSection />);
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    expect(textarea.value).toBe("# TDD Skill\nTest content here");
  });

  it("shows save button when viewing item", () => {
    mockState.currentItem = {
      type: "skill",
      slug: "tdd",
      content: "# TDD",
    };

    render(<ContextSection />);
    expect(screen.getByRole("button", { name: /save/i })).toBeDefined();
  });

  it("shows error when present", () => {
    mockState.error = "Something went wrong";
    render(<ContextSection />);
    expect(screen.getByText("Something went wrong")).toBeDefined();
  });

  it("shows import button", () => {
    render(<ContextSection />);
    expect(screen.getByRole("button", { name: /import/i })).toBeDefined();
  });

  it("clicking import shows type dropdown", async () => {
    render(<ContextSection />);
    fireEvent.click(screen.getByRole("button", { name: /import/i }));

    await waitFor(() => {
      expect(screen.getByText("Import Skill")).toBeDefined();
      expect(screen.getByText("Import Agent")).toBeDefined();
      expect(screen.getByText("Import Doc")).toBeDefined();
    });
  });
});
