import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Statusbar } from "../statusbar";
import * as useSystemMetricsModule from "@/hooks/use-system-metrics";
import * as useAppMetricsModule from "@/hooks/use-app-metrics";

// Mock the useSystemMetrics hook
vi.mock("@/hooks/use-system-metrics");

// Mock the useAppMetrics hook
vi.mock("@/hooks/use-app-metrics");

// Mock IPC layer used by GitSection and FileInfoSection
vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn().mockResolvedValue({
    isGitRepo: false,
    branch: null,
    fileStatus: null,
    changedFiles: 0,
  }),
  listen: vi.fn().mockResolvedValue(() => {}),
  getCurrentWindow: () => ({ label: "main" }),
  isDev: vi.fn().mockResolvedValue(false),
}));

const mockMetrics = {
  cpu_usage: 45.5,
  memory_used: 8 * 1024 * 1024 * 1024, // 8GB
  memory_total: 16 * 1024 * 1024 * 1024, // 16GB
  swap_used: 1 * 1024 * 1024 * 1024, // 1GB
  swap_total: 4 * 1024 * 1024 * 1024, // 4GB
  disk_used: 250 * 1024 * 1024 * 1024, // 250GB
  disk_total: 500 * 1024 * 1024 * 1024, // 500GB
  network_rx_rate: 1024 * 1024 * 2.5, // 2.5MB/s
  network_tx_rate: 1024 * 512, // 512kB/s
};

describe("Statusbar with HoverCard", () => {
  beforeEach(() => {
    vi.mocked(useSystemMetricsModule.useSystemMetrics).mockReturnValue({
      current: mockMetrics,
      cpuHistory: [30, 35, 40, 45],
      rxHistory: [1024, 2048, 3072],
      txHistory: [512, 768, 1024],
      historyVersion: 0,
    });
    vi.mocked(useAppMetricsModule.useAppMetrics).mockReturnValue({
      current: null,
      rssHistory: [],
      cpuHistory: [],
      historyVersion: 0,
    });
  });

  it("renders system metrics in the status bar", () => {
    render(<Statusbar />);

    // Check for basic metric displays
    expect(screen.getByText("8GB")).toBeInTheDocument(); // Memory
    expect(screen.getByText("46%")).toBeInTheDocument(); // CPU (rounded)
    expect(screen.getByText("1GB")).toBeInTheDocument(); // Swap
    expect(screen.getByText("250GB")).toBeInTheDocument(); // Disk
  });

  it("shows detailed CPU info on hover", async () => {
    const user = userEvent.setup();
    render(<Statusbar />);

    // Find CPU metric container and hover over it
    const cpuMetric = screen.getByLabelText("CPU usage details");
    expect(cpuMetric).toBeInTheDocument();

    if (cpuMetric) {
      await user.hover(cpuMetric);

      // Wait for hover card to appear
      await waitFor(() => {
        expect(screen.getByText(/CPU Usage/i)).toBeInTheDocument();
      });

      // Check for detailed info
      expect(screen.getByText(/45\.5%/)).toBeInTheDocument();
    }
  });

  it("shows detailed memory info on hover", async () => {
    const user = userEvent.setup();
    render(<Statusbar />);

    // Find memory metric container
    const memoryMetric = screen.getByLabelText("Memory usage details");
    expect(memoryMetric).toBeInTheDocument();

    if (memoryMetric) {
      await user.hover(memoryMetric);

      // Wait for hover card to appear
      await waitFor(() => {
        expect(screen.getByText(/Memory/i)).toBeInTheDocument();
      });

      // Check for detailed info (used/total and percentage)
      expect(screen.getByText(/8\.0 GB/)).toBeInTheDocument();
      expect(screen.getByText(/16\.0 GB/)).toBeInTheDocument();
      expect(screen.getByText(/50%/)).toBeInTheDocument();
    }
  });

  it("shows detailed swap info on hover", async () => {
    const user = userEvent.setup();
    render(<Statusbar />);

    // Find swap metric container
    const swapMetric = screen.getByLabelText("Swap usage details");
    expect(swapMetric).toBeInTheDocument();

    if (swapMetric) {
      await user.hover(swapMetric);

      await waitFor(() => {
        expect(screen.getByText(/Swap/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/1\.0 GB/)).toBeInTheDocument();
      expect(screen.getByText(/4\.0 GB/)).toBeInTheDocument();
      expect(screen.getByText(/25%/)).toBeInTheDocument();
    }
  });

  it("shows detailed disk info on hover", async () => {
    const user = userEvent.setup();
    render(<Statusbar />);

    // Find disk metric container
    const diskMetric = screen.getByLabelText("Disk usage details");
    expect(diskMetric).toBeInTheDocument();

    if (diskMetric) {
      await user.hover(diskMetric);

      await waitFor(() => {
        expect(screen.getByText(/^Disk$/i)).toBeInTheDocument();
      });

      // Used and Free are both 250.0 GB (50% of 500GB)
      expect(screen.getAllByText(/250\.0 GB/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/500\.0 GB/)).toBeInTheDocument();
      expect(screen.getByText(/50%/)).toBeInTheDocument();
    }
  });

  it("opens hover cards upward (side=top)", async () => {
    const user = userEvent.setup();
    render(<Statusbar />);

    const cpuMetric = screen.getByLabelText("CPU usage details");

    if (cpuMetric) {
      await user.hover(cpuMetric);

      await waitFor(() => {
        const hoverCardContent = document.querySelector('[data-slot="hover-card-content"]');
        expect(hoverCardContent).toHaveAttribute("data-side", "top");
      });
    }
  });

  it("hides swap metric when swap_total is 0", () => {
    vi.mocked(useSystemMetricsModule.useSystemMetrics).mockReturnValue({
      current: {
        ...mockMetrics,
        swap_total: 0,
        swap_used: 0,
      },
      cpuHistory: [30, 35, 40, 45],
      rxHistory: [1024, 2048, 3072],
      txHistory: [512, 768, 1024],
      historyVersion: 0,
    });

    render(<Statusbar />);

    // Swap should not appear
    expect(screen.queryByText(/1GB/)).not.toBeInTheDocument();
  });

  it("displays loading state when metrics are null", () => {
    vi.mocked(useSystemMetricsModule.useSystemMetrics).mockReturnValue({
      current: null,
      cpuHistory: [],
      rxHistory: [],
      txHistory: [],
      historyVersion: 0,
    });

    render(<Statusbar />);

    expect(screen.getByText(/Loading metrics/i)).toBeInTheDocument();
  });

  it("renders DevMetrics when isDev is true and app metrics are available", async () => {
    const { isDev } = await import("@/lib/ipc");
    vi.mocked(isDev).mockResolvedValue(true);

    vi.mocked(useAppMetricsModule.useAppMetrics).mockReturnValue({
      current: {
        total_rss: 150 * 1024 * 1024,
        heap_used: 98 * 1024 * 1024,
        heap_total: 128 * 1024 * 1024,
        total_cpu_percent: 12.5,
        main_cpu_percent: 5.0,
        renderer_cpu_percent: 7.5,
        process_count: 3,
      },
      rssHistory: [150 * 1024 * 1024],
      cpuHistory: [12.5],
      historyVersion: 1,
    });

    render(<Statusbar />);

    await waitFor(() => {
      expect(screen.getByText("DEV")).toBeInTheDocument();
    });
  });

  it("does not render DevMetrics when isDev is false", async () => {
    const { isDev } = await import("@/lib/ipc");
    vi.mocked(isDev).mockResolvedValue(false);

    vi.mocked(useAppMetricsModule.useAppMetrics).mockReturnValue({
      current: {
        total_rss: 150 * 1024 * 1024,
        heap_used: 98 * 1024 * 1024,
        heap_total: 128 * 1024 * 1024,
        total_cpu_percent: 12.5,
        main_cpu_percent: 5.0,
        renderer_cpu_percent: 7.5,
        process_count: 3,
      },
      rssHistory: [150 * 1024 * 1024],
      cpuHistory: [12.5],
      historyVersion: 1,
    });

    render(<Statusbar />);

    expect(screen.queryByText("DEV")).not.toBeInTheDocument();
  });
});
