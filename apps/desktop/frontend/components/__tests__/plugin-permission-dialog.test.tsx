import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  listen: vi.fn(() => Promise.resolve(() => {})),
}));

const mockGrantPermissions = vi.fn(() => Promise.resolve());
const mockDenyPermissions = vi.fn(() => Promise.resolve());
const mockDismissPermissionPrompt = vi.fn();

let mockPermissionPrompt: { pluginName: string; permissions: string[] } | null = null;

vi.mock("@/stores/plugins", () => ({
  usePluginsStore: Object.assign(
    (selector?: (s: unknown) => unknown) => {
      const state = {
        permissionPrompt: mockPermissionPrompt,
        grantPermissions: mockGrantPermissions,
        denyPermissions: mockDenyPermissions,
        dismissPermissionPrompt: mockDismissPermissionPrompt,
      };
      return selector ? selector(state) : state;
    },
    {
      getState: () => ({
        permissionPrompt: mockPermissionPrompt,
        grantPermissions: mockGrantPermissions,
        denyPermissions: mockDenyPermissions,
        dismissPermissionPrompt: mockDismissPermissionPrompt,
      }),
      setState: vi.fn(),
      subscribe: vi.fn(() => () => {}),
    }
  ),
}));

describe("PluginPermissionDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPermissionPrompt = null;
  });

  it("renders nothing when no permission prompt exists", async () => {
    const { PluginPermissionDialog } = await import("../plugin-permission-dialog");
    const { container } = render(<PluginPermissionDialog />);
    expect(container.innerHTML).toBe("");
  });

  it("renders dialog when permission prompt is set", async () => {
    mockPermissionPrompt = {
      pluginName: "test-plugin",
      permissions: ["project.active", "theme.current"],
    };
    const { PluginPermissionDialog } = await import("../plugin-permission-dialog");
    render(<PluginPermissionDialog />);
    expect(screen.getByText("Plugin permissions")).toBeTruthy();
    expect(screen.getByText("test-plugin")).toBeTruthy();
  });

  it("lists all requested permissions", async () => {
    mockPermissionPrompt = {
      pluginName: "test-plugin",
      permissions: ["project.active", "git.status", "notifications"],
    };
    const { PluginPermissionDialog } = await import("../plugin-permission-dialog");
    render(<PluginPermissionDialog />);
    expect(screen.getByTestId("permission-project.active")).toBeTruthy();
    expect(screen.getByTestId("permission-git.status")).toBeTruthy();
    expect(screen.getByTestId("permission-notifications")).toBeTruthy();
  });

  it("calls grantPermissions when Allow is clicked", async () => {
    mockPermissionPrompt = {
      pluginName: "test-plugin",
      permissions: ["project.active"],
    };
    const { PluginPermissionDialog } = await import("../plugin-permission-dialog");
    render(<PluginPermissionDialog />);
    fireEvent.click(screen.getByTestId("allow-permissions"));
    expect(mockGrantPermissions).toHaveBeenCalledWith("test-plugin", ["project.active"]);
  });

  it("calls denyPermissions when Deny is clicked", async () => {
    mockPermissionPrompt = {
      pluginName: "test-plugin",
      permissions: ["project.active"],
    };
    const { PluginPermissionDialog } = await import("../plugin-permission-dialog");
    render(<PluginPermissionDialog />);
    fireEvent.click(screen.getByTestId("deny-permissions"));
    expect(mockDenyPermissions).toHaveBeenCalledWith("test-plugin", ["project.active"]);
  });

  it("shows warning for high-risk permissions", async () => {
    mockPermissionPrompt = {
      pluginName: "test-plugin",
      permissions: ["fs.write", "terminal.execute"],
    };
    const { PluginPermissionDialog } = await import("../plugin-permission-dialog");
    render(<PluginPermissionDialog />);
    expect(screen.getByText(/elevated permissions/i)).toBeTruthy();
  });
});
