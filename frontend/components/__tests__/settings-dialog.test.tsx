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
    expect(screen.getByRole("button", { name: "Aparência" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Atalhos" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sessões" })).toBeInTheDocument();
  });

  it("shows Aparencia section by default", async () => {
    const { SettingsDialog } = await import("../settings-dialog");
    render(<SettingsDialog open={true} onOpenChange={() => {}} />);
    expect(screen.getByTestId("settings-section-appearance")).toBeInTheDocument();
  });

  it("navigates to Atalhos section on click", async () => {
    const { SettingsDialog } = await import("../settings-dialog");
    render(<SettingsDialog open={true} onOpenChange={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Atalhos" }));
    expect(screen.getByTestId("settings-section-shortcuts")).toBeInTheDocument();
  });

  it("navigates to Sessoes section on click", async () => {
    const { SettingsDialog } = await import("../settings-dialog");
    render(<SettingsDialog open={true} onOpenChange={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Sessões" }));
    expect(screen.getByTestId("settings-section-sessions")).toBeInTheDocument();
  });

  it("Aparencia section shows font settings", async () => {
    const { SettingsDialog } = await import("../settings-dialog");
    render(<SettingsDialog open={true} onOpenChange={() => {}} />);
    expect(screen.getByLabelText("Fonte da interface")).toBeInTheDocument();
    expect(screen.getByLabelText("Tamanho da fonte da interface")).toBeInTheDocument();
  });

  it("Aparencia section shows window settings", async () => {
    const { SettingsDialog } = await import("../settings-dialog");
    render(<SettingsDialog open={true} onOpenChange={() => {}} />);
    expect(screen.getByLabelText("Opacidade da janela")).toBeInTheDocument();
    expect(screen.getByLabelText("Zoom level")).toBeInTheDocument();
  });

  it("renders 'Abrir settings.json' button", async () => {
    const { SettingsDialog } = await import("../settings-dialog");
    render(<SettingsDialog open={true} onOpenChange={() => {}} />);
    expect(screen.getByRole("button", { name: /Abrir settings\.json/i })).toBeInTheDocument();
  });

  it("calls openSettingsEditor and closes dialog on 'Abrir settings.json' click", async () => {
    const { SettingsDialog } = await import("../settings-dialog");
    const { useUserSettingsStore } = await import("@/stores/user-settings");
    const openEditorSpy = vi
      .spyOn(useUserSettingsStore.getState(), "openSettingsEditor")
      .mockImplementation(() => {});
    const onOpenChange = vi.fn();
    render(<SettingsDialog open={true} onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByRole("button", { name: /Abrir settings\.json/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(openEditorSpy).toHaveBeenCalled();
  });

  it("calls onOpenChange(false) when close button is clicked", async () => {
    const { SettingsDialog } = await import("../settings-dialog");
    const onOpenChange = vi.fn();
    render(<SettingsDialog open={true} onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByRole("button", { name: /fechar/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("Aparencia section shows active nav item highlighted", async () => {
    const { SettingsDialog } = await import("../settings-dialog");
    render(<SettingsDialog open={true} onOpenChange={() => {}} />);
    const appearanceBtn = screen.getByRole("button", { name: "Aparência" });
    expect(appearanceBtn).toHaveAttribute("data-active", "true");
  });

  it("Sessoes section shows session list", async () => {
    const { SettingsDialog } = await import("../settings-dialog");
    render(<SettingsDialog open={true} onOpenChange={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Sessões" }));
    expect(screen.getByTestId("settings-section-sessions")).toBeInTheDocument();
    expect(screen.getByText("claude")).toBeInTheDocument();
  });

  it("shows version info in sidebar footer", async () => {
    const { SettingsDialog } = await import("../settings-dialog");
    render(<SettingsDialog open={true} onOpenChange={() => {}} />);
    expect(screen.getByTestId("settings-version-info")).toBeInTheDocument();
  });
});
