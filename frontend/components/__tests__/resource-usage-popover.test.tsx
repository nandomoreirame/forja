import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const mockUseAppMetrics = vi.fn();

vi.mock("@/hooks/use-app-metrics", () => ({
  useAppMetrics: () => mockUseAppMetrics(),
}));

vi.mock("@/lib/ipc", () => ({
  listen: vi.fn(() => Promise.resolve(() => {})),
}));

describe("ResourceUsagePopover", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when metrics are not available", async () => {
    mockUseAppMetrics.mockReturnValue({
      current: null,
      rssHistory: [],
      cpuHistory: [],
      historyVersion: 0,
    });

    const { ResourceUsagePopover } = await import("../resource-usage-popover");
    const { container } = render(<ResourceUsagePopover />);

    expect(container.firstChild).toBeNull();
  });

  it("renders the trigger button with formatted CPU and memory", async () => {
    mockUseAppMetrics.mockReturnValue({
      current: {
        total_rss: 966.5 * 1024 * 1024,
        main_rss: 200 * 1024 * 1024,
        renderer_rss: 766.5 * 1024 * 1024,
        heap_used: 100 * 1024 * 1024,
        heap_total: 200 * 1024 * 1024,
        total_cpu_percent: 12.5,
        main_cpu_percent: 5.0,
        renderer_cpu_percent: 7.5,
        process_count: 3,
      },
      rssHistory: [],
      cpuHistory: [],
      historyVersion: 1,
    });

    const { ResourceUsagePopover } = await import("../resource-usage-popover");
    render(<ResourceUsagePopover />);

    expect(screen.getByText("12.5%")).toBeInTheDocument();
    expect(screen.getByText("966.5 MB")).toBeInTheDocument();
  });

  it("has an accessible trigger button", async () => {
    mockUseAppMetrics.mockReturnValue({
      current: {
        total_rss: 500 * 1024 * 1024,
        main_rss: 200 * 1024 * 1024,
        renderer_rss: 300 * 1024 * 1024,
        heap_used: 100 * 1024 * 1024,
        heap_total: 200 * 1024 * 1024,
        total_cpu_percent: 5.0,
        main_cpu_percent: 2.0,
        renderer_cpu_percent: 3.0,
        process_count: 2,
      },
      rssHistory: [],
      cpuHistory: [],
      historyVersion: 1,
    });

    const { ResourceUsagePopover } = await import("../resource-usage-popover");
    render(<ResourceUsagePopover />);

    expect(screen.getByRole("button", { name: /resource usage/i })).toBeInTheDocument();
  });

  it("displays memory icon in trigger", async () => {
    mockUseAppMetrics.mockReturnValue({
      current: {
        total_rss: 500 * 1024 * 1024,
        main_rss: 200 * 1024 * 1024,
        renderer_rss: 300 * 1024 * 1024,
        heap_used: 100 * 1024 * 1024,
        heap_total: 200 * 1024 * 1024,
        total_cpu_percent: 5.0,
        main_cpu_percent: 2.0,
        renderer_cpu_percent: 3.0,
        process_count: 2,
      },
      rssHistory: [],
      cpuHistory: [],
      historyVersion: 1,
    });

    const { ResourceUsagePopover } = await import("../resource-usage-popover");
    render(<ResourceUsagePopover />);

    const button = screen.getByRole("button", { name: /resource usage/i });
    expect(button.querySelector("svg")).toBeTruthy();
  });
});
