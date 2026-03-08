import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mockSyncOut = vi.fn();
const mockState = {
  status: null as null | {
    initialized: boolean;
    counts: Record<string, number>;
    lastUpdated: string | null;
  },
  syncSummary: null,
  loading: false,
  error: null as string | null,
  syncOut: mockSyncOut,
  syncIn: vi.fn(),
  loadStatus: vi.fn(),
  initHub: vi.fn(),
  createSkill: vi.fn(),
  createAgent: vi.fn(),
};

vi.mock("@/stores/context-hub", () => ({
  useContextHubStore: () => mockState,
}));

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  listen: vi.fn(() => Promise.resolve(() => {})),
}));

import { ContextSyncStatus } from "../context-sync-status";

describe("ContextSyncStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.status = null;
    mockState.syncSummary = null;
    mockState.loading = false;
    mockState.error = null;
    mockState.syncOut = mockSyncOut;
  });

  it("renders nothing when status is null", () => {
    const { container } = render(<ContextSyncStatus projectPath="/project" />);
    expect(container.querySelector("[data-testid='context-sync-status']")).toBeNull();
  });

  it("renders up-to-date indicator when initialized with items", () => {
    mockState.status = {
      initialized: true,
      counts: { skill: 1, agent: 0, doc: 0, plan: 0 },
      lastUpdated: "2026-01-01T00:00:00Z",
    };

    render(<ContextSyncStatus projectPath="/project" />);

    const indicator = screen.getByTestId("context-sync-status");
    expect(indicator).toBeDefined();
    expect(indicator.getAttribute("aria-label")).toContain("Context hub");
  });

  it("shows loading state", () => {
    mockState.status = {
      initialized: true,
      counts: { skill: 0, agent: 0, doc: 0, plan: 0 },
      lastUpdated: null,
    };
    mockState.loading = true;

    render(<ContextSyncStatus projectPath="/project" />);

    const indicator = screen.getByTestId("context-sync-status");
    expect(indicator.getAttribute("aria-label")).toContain("Syncing");
  });

  it("shows error state", () => {
    mockState.status = {
      initialized: true,
      counts: { skill: 0, agent: 0, doc: 0, plan: 0 },
      lastUpdated: null,
    };
    mockState.error = "sync failed";

    render(<ContextSyncStatus projectPath="/project" />);

    const indicator = screen.getByTestId("context-sync-status");
    expect(indicator.getAttribute("aria-label")).toContain("error");
  });

  it("triggers syncOut on click", () => {
    mockState.status = {
      initialized: true,
      counts: { skill: 1, agent: 0, doc: 0, plan: 0 },
      lastUpdated: "2026-01-01T00:00:00Z",
    };

    render(<ContextSyncStatus projectPath="/project" />);

    const button = screen.getByTestId("context-sync-status");
    fireEvent.click(button);
    expect(mockSyncOut).toHaveBeenCalledWith("/project");
  });

  it("shows item counts in aria-label", () => {
    mockState.status = {
      initialized: true,
      counts: { skill: 3, agent: 2, doc: 1, plan: 0 },
      lastUpdated: "2026-01-01T00:00:00Z",
    };

    render(<ContextSyncStatus projectPath="/project" />);

    const indicator = screen.getByTestId("context-sync-status");
    const label = indicator.getAttribute("aria-label") ?? "";
    expect(label).toContain("3 skills");
    expect(label).toContain("2 agents");
  });
});
