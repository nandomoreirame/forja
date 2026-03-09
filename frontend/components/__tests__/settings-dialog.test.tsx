import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS } from "@/lib/settings-types";

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn().mockResolvedValue(undefined),
  listen: vi.fn().mockResolvedValue(() => {}),
  getVersion: vi.fn().mockResolvedValue("1.0.0"),
  getName: vi.fn().mockResolvedValue("Forja"),
  getElectronVersion: vi.fn().mockResolvedValue("33.0.0"),
}));

describe("SettingsDialog", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { useUserSettingsStore } = await import("@/stores/user-settings");
    useUserSettingsStore.setState({
      settings: { ...DEFAULT_SETTINGS },
      loaded: true,
      editorOpen: false,
      editorContent: "",
      editorDirty: false,
      editorError: null,
    });
  });

  it("renders dialog when open", async () => {
    const { SettingsDialog } = await import("../settings-dialog");
    render(<SettingsDialog open={true} onOpenChange={() => {}} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("does not render dialog content when closed", async () => {
    const { SettingsDialog } = await import("../settings-dialog");
    const { queryByRole } = render(
      <SettingsDialog open={false} onOpenChange={() => {}} />
    );
    expect(queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders sidebar with navigation sections", async () => {
    const { SettingsDialog } = await import("../settings-dialog");
    render(<SettingsDialog open={true} onOpenChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Appearance" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Shortcuts" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sessions" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Context" })).toBeInTheDocument();
  });

  it("shows Appearance section by default", async () => {
    const { SettingsDialog } = await import("../settings-dialog");
    render(<SettingsDialog open={true} onOpenChange={() => {}} />);
    expect(screen.getByTestId("settings-section-appearance")).toBeInTheDocument();
  });

  it("navigates to Shortcuts section on click", async () => {
    const { SettingsDialog } = await import("../settings-dialog");
    render(<SettingsDialog open={true} onOpenChange={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Shortcuts" }));
    expect(screen.getByTestId("settings-section-shortcuts")).toBeInTheDocument();
  });

  it("navigates to Sessions section on click", async () => {
    const { SettingsDialog } = await import("../settings-dialog");
    render(<SettingsDialog open={true} onOpenChange={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Sessions" }));
    expect(screen.getByTestId("settings-section-sessions")).toBeInTheDocument();
  });

  it("Appearance section shows font settings", async () => {
    const { SettingsDialog } = await import("../settings-dialog");
    render(<SettingsDialog open={true} onOpenChange={() => {}} />);
    expect(screen.getByLabelText("App font family")).toBeInTheDocument();
    expect(screen.getByLabelText("App font size")).toBeInTheDocument();
  });

  it("Appearance section shows window settings", async () => {
    const { SettingsDialog } = await import("../settings-dialog");
    render(<SettingsDialog open={true} onOpenChange={() => {}} />);
    expect(screen.getByLabelText("Window opacity")).toBeInTheDocument();
    expect(screen.getByLabelText("Zoom level")).toBeInTheDocument();
  });

  it("renders 'Open settings.json' button", async () => {
    const { SettingsDialog } = await import("../settings-dialog");
    render(<SettingsDialog open={true} onOpenChange={() => {}} />);
    expect(screen.getByRole("button", { name: /Open settings\.json/i })).toBeInTheDocument();
  });

  it("calls openSettingsEditor and closes dialog on 'Open settings.json' click", async () => {
    const { SettingsDialog } = await import("../settings-dialog");
    const { useUserSettingsStore } = await import("@/stores/user-settings");
    const openEditorSpy = vi
      .spyOn(useUserSettingsStore.getState(), "openSettingsEditor")
      .mockImplementation(() => {});
    const onOpenChange = vi.fn();
    render(<SettingsDialog open={true} onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByRole("button", { name: /Open settings\.json/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(openEditorSpy).toHaveBeenCalled();
  });

  it("calls onOpenChange(false) when close button is clicked", async () => {
    const { SettingsDialog } = await import("../settings-dialog");
    const onOpenChange = vi.fn();
    render(<SettingsDialog open={true} onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("Appearance section shows active nav item highlighted", async () => {
    const { SettingsDialog } = await import("../settings-dialog");
    render(<SettingsDialog open={true} onOpenChange={() => {}} />);
    const appearanceBtn = screen.getByRole("button", { name: "Appearance" });
    expect(appearanceBtn).toHaveAttribute("data-active", "true");
  });

  it("Sessions section shows session list", async () => {
    const { SettingsDialog } = await import("../settings-dialog");
    render(<SettingsDialog open={true} onOpenChange={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Sessions" }));
    expect(screen.getByTestId("settings-section-sessions")).toBeInTheDocument();
    expect(screen.getByText("claude")).toBeInTheDocument();
  });

  it("navigates to Context section on click", async () => {
    const { SettingsDialog } = await import("../settings-dialog");
    render(<SettingsDialog open={true} onOpenChange={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Context" }));
    expect(screen.getByTestId("settings-section-context")).toBeInTheDocument();
  });

  it("shows version info in sidebar footer", async () => {
    const { SettingsDialog } = await import("../settings-dialog");
    render(<SettingsDialog open={true} onOpenChange={() => {}} />);
    expect(screen.getByTestId("settings-version-info")).toBeInTheDocument();
  });
});
