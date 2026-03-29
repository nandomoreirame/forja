import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  listen: vi.fn(() => () => {}),
}));

import { MarketplacePluginCard } from "../components/marketplace-plugin-card";
import type { RegistryPlugin, InstallProgress } from "@/lib/plugin-types";

const mockPlugin: RegistryPlugin = {
  name: "my-plugin",
  displayName: "My Awesome Plugin",
  description: "A short description of what this plugin does.",
  author: "john-doe",
  icon: "Puzzle",
  version: "1.2.0",
  downloadUrl: "https://example.com/my-plugin.tar.gz",
  sha256: "",
  tags: ["git", "productivity", "tools"],
  downloads: 1234,
  permissions: ["git.status"],
};

const defaultProps = {
  plugin: mockPlugin,
  installed: false,
  onInstall: vi.fn(),
  onUninstall: vi.fn(),
};

describe("MarketplacePluginCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders plugin display name and description", () => {
    render(<MarketplacePluginCard {...defaultProps} />);
    expect(screen.getByText("My Awesome Plugin")).toBeTruthy();
    expect(screen.getByText("A short description of what this plugin does.")).toBeTruthy();
  });

  it("renders plugin version and author", () => {
    render(<MarketplacePluginCard {...defaultProps} />);
    expect(screen.getByText(/v1\.2\.0/)).toBeTruthy();
    expect(screen.getByText(/john-doe/)).toBeTruthy();
  });

  it("renders plugin tags as badges", () => {
    render(<MarketplacePluginCard {...defaultProps} />);
    expect(screen.getByText("git")).toBeTruthy();
    expect(screen.getByText("productivity")).toBeTruthy();
    expect(screen.getByText("tools")).toBeTruthy();
  });

  it("renders Install button when not installed", () => {
    render(<MarketplacePluginCard {...defaultProps} installed={false} />);
    const button = screen.getByRole("button", { name: /install/i });
    expect(button).toBeTruthy();
  });

  it("renders Uninstall button when installed and up to date", () => {
    render(
      <MarketplacePluginCard
        {...defaultProps}
        installed={true}
        installedVersion="1.2.0"
      />
    );
    const button = screen.getByRole("button", { name: /uninstall/i });
    expect(button).toBeTruthy();
  });

  it("renders Update button when installed with older version", () => {
    render(
      <MarketplacePluginCard
        {...defaultProps}
        installed={true}
        installedVersion="1.0.0"
      />
    );
    const button = screen.getByRole("button", { name: /update/i });
    expect(button).toBeTruthy();
  });

  it("shows spinner and downloading state during download progress", () => {
    const progress: InstallProgress = { stage: "downloading", percent: 42 };
    render(
      <MarketplacePluginCard
        {...defaultProps}
        installProgress={progress}
      />
    );
    expect(screen.getByText(/42%/)).toBeTruthy();
  });

  it("shows verifying state during verification", () => {
    const progress: InstallProgress = { stage: "verifying" };
    render(
      <MarketplacePluginCard
        {...defaultProps}
        installProgress={progress}
      />
    );
    expect(screen.getByText(/verifying/i)).toBeTruthy();
  });

  it("shows extracting state during extraction", () => {
    const progress: InstallProgress = { stage: "extracting" };
    render(
      <MarketplacePluginCard
        {...defaultProps}
        installProgress={progress}
      />
    );
    expect(screen.getByText(/extracting/i)).toBeTruthy();
  });

  it("shows error state with retry button on error", () => {
    const progress: InstallProgress = { stage: "error", message: "Network timeout" };
    render(
      <MarketplacePluginCard
        {...defaultProps}
        installProgress={progress}
      />
    );
    expect(screen.getByText(/network timeout/i)).toBeTruthy();
    const retryButton = screen.getByRole("button", { name: /retry/i });
    expect(retryButton).toBeTruthy();
  });

  it("calls onInstall with plugin name when Install button is clicked", () => {
    const onInstall = vi.fn();
    render(
      <MarketplacePluginCard
        {...defaultProps}
        installed={false}
        onInstall={onInstall}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /install/i }));
    expect(onInstall).toHaveBeenCalledOnce();
    expect(onInstall).toHaveBeenCalledWith("my-plugin");
  });

  it("calls onUninstall with plugin name when Uninstall button is clicked", () => {
    const onUninstall = vi.fn();
    render(
      <MarketplacePluginCard
        {...defaultProps}
        installed={true}
        installedVersion="1.2.0"
        onUninstall={onUninstall}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /uninstall/i }));
    expect(onUninstall).toHaveBeenCalledOnce();
    expect(onUninstall).toHaveBeenCalledWith("my-plugin");
  });

  it("calls onInstall when Update button is clicked", () => {
    const onInstall = vi.fn();
    render(
      <MarketplacePluginCard
        {...defaultProps}
        installed={true}
        installedVersion="1.0.0"
        onInstall={onInstall}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /update/i }));
    expect(onInstall).toHaveBeenCalledOnce();
    expect(onInstall).toHaveBeenCalledWith("my-plugin");
  });

  it("calls onInstall when Retry button is clicked on error", () => {
    const onInstall = vi.fn();
    const progress: InstallProgress = { stage: "error", message: "Failed" };
    render(
      <MarketplacePluginCard
        {...defaultProps}
        installProgress={progress}
        onInstall={onInstall}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(onInstall).toHaveBeenCalledOnce();
    expect(onInstall).toHaveBeenCalledWith("my-plugin");
  });

  it("renders plugin icon using getPluginIcon", () => {
    render(<MarketplacePluginCard {...defaultProps} />);
    // The icon 'Puzzle' is a valid Lucide icon; the svg should be rendered
    const svg = document.querySelector("svg");
    expect(svg).toBeTruthy();
  });

  it("renders download count formatted", () => {
    render(<MarketplacePluginCard {...defaultProps} />);
    expect(screen.getByText(/1\.2k/i)).toBeTruthy();
  });

  it("renders download count as-is for small numbers", () => {
    render(
      <MarketplacePluginCard
        {...defaultProps}
        plugin={{ ...mockPlugin, downloads: 42 }}
      />
    );
    expect(screen.getByText("42")).toBeTruthy();
  });
});
