import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Titlebar } from "../titlebar";

vi.mock("@tauri-apps/api/window", () => {
  const appWindow = {
    isMaximized: vi.fn().mockResolvedValue(false),
    onResized: vi.fn().mockResolvedValue(() => {}),
    minimize: vi.fn(),
    maximize: vi.fn(),
    unmaximize: vi.fn(),
    close: vi.fn(),
  };
  return {
    getCurrentWindow: () => appWindow,
  };
});

vi.mock("@tauri-apps/api/app", () => ({
  getName: vi.fn().mockResolvedValue("Forja"),
  getVersion: vi.fn().mockResolvedValue("0.1.0"),
  getTauriVersion: vi.fn().mockResolvedValue("2.5.0"),
}));

vi.mock("@/stores/file-tree", () => ({
  APP_NAME: "Forja for Claude Code",
  useFileTreeStore: () => ({
    isOpen: false,
    tree: null,
    toggleSidebar: vi.fn(),
    openProject: vi.fn(),
  }),
}));

describe("Titlebar", () => {
  it('shows "About" menu item in English', async () => {
    const user = userEvent.setup();
    render(<Titlebar />);

    const menuButton = screen.getByRole("button", { name: "Menu" });
    await user.click(menuButton);

    expect(screen.getByText("About")).toBeInTheDocument();
  });

  it("opens AboutDialog when About is clicked", async () => {
    const user = userEvent.setup();
    render(<Titlebar />);

    const menuButton = screen.getByRole("button", { name: "Menu" });
    await user.click(menuButton);

    const aboutItem = screen.getByText("About");
    await user.click(aboutItem);

    expect(
      await screen.findByRole("dialog")
    ).toBeInTheDocument();
  });
});
