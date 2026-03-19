import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { TabNameOverlay } from "../tab-name-overlay";
import { useTilingLayoutStore } from "@/stores/tiling-layout";

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  listen: vi.fn(() => () => {}),
  getCurrentWindow: vi.fn(() => ({ label: "main" })),
}));

function createTabSpan(nodeId: string, text: string) {
  const span = document.createElement("span");
  span.setAttribute("data-tab-node-id", nodeId);
  span.textContent = text;
  // Provide a getBoundingClientRect stub
  span.getBoundingClientRect = () => ({
    top: 100,
    left: 200,
    width: 120,
    height: 24,
    right: 320,
    bottom: 124,
    x: 200,
    y: 100,
    toJSON: () => {},
  });
  document.body.appendChild(span);
  return span;
}

describe("TabNameOverlay", () => {
  let span: HTMLElement | null = null;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "requestAnimationFrame", "cancelAnimationFrame"] });
    useTilingLayoutStore.setState({ editingTabId: null });
  });

  afterEach(() => {
    if (span) {
      span.remove();
      span = null;
    }
    vi.useRealTimers();
  });

  it("renders nothing when editingTabId is null", () => {
    const { container } = render(<TabNameOverlay />);
    expect(container.querySelector("input")).toBeNull();
  });

  it("renders input positioned over the tab span when editing", () => {
    span = createTabSpan("tab-1", "My Session");
    useTilingLayoutStore.setState({ editingTabId: "tab-1" });

    render(<TabNameOverlay />);

    const input = screen.getByRole("textbox");
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue("My Session");
    expect(input.style.top).toBe("100px");
    expect(input.style.left).toBe("200px");
  });

  it("focuses and selects input after rAF", () => {
    span = createTabSpan("tab-1", "Session");
    useTilingLayoutStore.setState({ editingTabId: "tab-1" });

    render(<TabNameOverlay />);
    act(() => { vi.advanceTimersByTime(16); });

    const input = screen.getByRole("textbox");
    expect(input).toHaveFocus();
  });

  it("saves on Enter and clears editingTabId", () => {
    span = createTabSpan("tab-1", "Old Name");
    useTilingLayoutStore.setState({ editingTabId: "tab-1" });

    const renameBlock = vi.fn();
    useTilingLayoutStore.setState({ renameBlock });

    render(<TabNameOverlay />);
    act(() => { vi.advanceTimersByTime(16); });

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "New Name" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(renameBlock).toHaveBeenCalledWith("tab-1", "New Name");
    expect(useTilingLayoutStore.getState().editingTabId).toBeNull();
  });

  it("cancels on Escape without saving", () => {
    span = createTabSpan("tab-1", "Name");
    useTilingLayoutStore.setState({ editingTabId: "tab-1" });

    const renameBlock = vi.fn();
    useTilingLayoutStore.setState({ renameBlock });

    render(<TabNameOverlay />);
    act(() => { vi.advanceTimersByTime(16); });

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "Changed" } });
    fireEvent.keyDown(input, { key: "Escape" });

    expect(renameBlock).not.toHaveBeenCalled();
    expect(useTilingLayoutStore.getState().editingTabId).toBeNull();
  });

  it("saves on blur after timeout", () => {
    span = createTabSpan("tab-1", "Old");
    useTilingLayoutStore.setState({ editingTabId: "tab-1" });

    const renameBlock = vi.fn();
    useTilingLayoutStore.setState({ renameBlock });

    render(<TabNameOverlay />);
    act(() => { vi.advanceTimersByTime(16); });

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "Blurred" } });
    input.blur();
    act(() => { vi.advanceTimersByTime(100); });

    expect(renameBlock).toHaveBeenCalledWith("tab-1", "Blurred");
    expect(useTilingLayoutStore.getState().editingTabId).toBeNull();
  });

  it("does not save when value is unchanged", () => {
    span = createTabSpan("tab-1", "Same");
    useTilingLayoutStore.setState({ editingTabId: "tab-1" });

    const renameBlock = vi.fn();
    useTilingLayoutStore.setState({ renameBlock });

    render(<TabNameOverlay />);
    act(() => { vi.advanceTimersByTime(16); });

    const input = screen.getByRole("textbox");
    fireEvent.keyDown(input, { key: "Enter" });

    expect(renameBlock).not.toHaveBeenCalled();
    expect(useTilingLayoutStore.getState().editingTabId).toBeNull();
  });

  it("clears editingTabId when target span is not found", () => {
    // No span in DOM
    useTilingLayoutStore.setState({ editingTabId: "missing-tab" });

    render(<TabNameOverlay />);

    expect(useTilingLayoutStore.getState().editingTabId).toBeNull();
  });
});
