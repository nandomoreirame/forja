import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { AppMetrics } from "@/hooks/use-app-metrics";

const mockUseAppMetrics = vi.fn<() => {
  current: AppMetrics | null;
  rssHistory: number[];
  cpuHistory: number[];
  historyVersion: number;
}>();

vi.mock("@/hooks/use-app-metrics", () => ({
  useAppMetrics: () => mockUseAppMetrics(),
}));

describe("DevMetrics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not render when metrics is null", async () => {
    mockUseAppMetrics.mockReturnValue({
      current: null,
      rssHistory: [],
      cpuHistory: [],
      historyVersion: 0,
    });

    const { DevMetrics } = await import("../dev-metrics");
    const { container } = render(<DevMetrics />);

    expect(container.innerHTML).toBe("");
  });

  it("renders DEV badge", async () => {
    mockUseAppMetrics.mockReturnValue({
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

    const { DevMetrics } = await import("../dev-metrics");
    render(<DevMetrics />);

    expect(screen.getByText("DEV")).toBeInTheDocument();
  });

  it("renders RSS formatted in MB", async () => {
    mockUseAppMetrics.mockReturnValue({
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

    const { DevMetrics } = await import("../dev-metrics");
    render(<DevMetrics />);

    expect(screen.getByText("150MB")).toBeInTheDocument();
  });

  it("renders heap used/total formatted in MB", async () => {
    mockUseAppMetrics.mockReturnValue({
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

    const { DevMetrics } = await import("../dev-metrics");
    render(<DevMetrics />);

    expect(screen.getByText("98/128MB")).toBeInTheDocument();
  });

  it("renders CPU percentage", async () => {
    mockUseAppMetrics.mockReturnValue({
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

    const { DevMetrics } = await import("../dev-metrics");
    render(<DevMetrics />);

    expect(screen.getByText("13%")).toBeInTheDocument();
  });

  it("applies peach color classes for the separator", async () => {
    mockUseAppMetrics.mockReturnValue({
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

    const { DevMetrics } = await import("../dev-metrics");
    const { container } = render(<DevMetrics />);

    const separator = container.querySelector(".border-ctp-peach");
    expect(separator).toBeInTheDocument();
  });

  it("uses red color when heap usage exceeds 85%", async () => {
    mockUseAppMetrics.mockReturnValue({
      current: {
        total_rss: 150 * 1024 * 1024,
        heap_used: 110 * 1024 * 1024,  // 110/128 = 86%
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

    const { DevMetrics } = await import("../dev-metrics");
    const { container } = render(<DevMetrics />);

    const redElement = container.querySelector(".text-ctp-red");
    expect(redElement).toBeInTheDocument();
  });

  it("uses red color when CPU exceeds 50%", async () => {
    mockUseAppMetrics.mockReturnValue({
      current: {
        total_rss: 150 * 1024 * 1024,
        heap_used: 50 * 1024 * 1024,
        heap_total: 128 * 1024 * 1024,
        total_cpu_percent: 55.0,
        main_cpu_percent: 30.0,
        renderer_cpu_percent: 25.0,
        process_count: 3,
      },
      rssHistory: [150 * 1024 * 1024],
      cpuHistory: [55.0],
      historyVersion: 1,
    });

    const { DevMetrics } = await import("../dev-metrics");
    const { container } = render(<DevMetrics />);

    // Find the CPU section with red color
    const redElements = container.querySelectorAll(".text-ctp-red");
    expect(redElements.length).toBeGreaterThan(0);
  });
});
