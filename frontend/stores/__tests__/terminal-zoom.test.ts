import { beforeEach, describe, expect, it } from "vitest";
import { useTerminalZoomStore } from "../terminal-zoom";

const DEFAULT_FONT_SIZE = 14;
const MIN_FONT_SIZE = 8;
const MAX_FONT_SIZE = 32;
const ZOOM_STEP = 2;

describe("useTerminalZoomStore", () => {
  beforeEach(() => {
    useTerminalZoomStore.setState({ fontSize: DEFAULT_FONT_SIZE });
  });

  it("starts with default font size of 14", () => {
    const state = useTerminalZoomStore.getState();
    expect(state.fontSize).toBe(DEFAULT_FONT_SIZE);
  });

  it("increases font size by 2 on zoomIn", () => {
    useTerminalZoomStore.getState().zoomIn();

    const state = useTerminalZoomStore.getState();
    expect(state.fontSize).toBe(DEFAULT_FONT_SIZE + ZOOM_STEP);
  });

  it("decreases font size by 2 on zoomOut", () => {
    useTerminalZoomStore.getState().zoomOut();

    const state = useTerminalZoomStore.getState();
    expect(state.fontSize).toBe(DEFAULT_FONT_SIZE - ZOOM_STEP);
  });

  it("resets font size to default on resetZoom", () => {
    useTerminalZoomStore.getState().zoomIn();
    useTerminalZoomStore.getState().zoomIn();
    useTerminalZoomStore.getState().resetZoom();

    const state = useTerminalZoomStore.getState();
    expect(state.fontSize).toBe(DEFAULT_FONT_SIZE);
  });

  it("does not exceed maximum font size", () => {
    useTerminalZoomStore.setState({ fontSize: MAX_FONT_SIZE });

    useTerminalZoomStore.getState().zoomIn();

    const state = useTerminalZoomStore.getState();
    expect(state.fontSize).toBe(MAX_FONT_SIZE);
  });

  it("does not go below minimum font size", () => {
    useTerminalZoomStore.setState({ fontSize: MIN_FONT_SIZE });

    useTerminalZoomStore.getState().zoomOut();

    const state = useTerminalZoomStore.getState();
    expect(state.fontSize).toBe(MIN_FONT_SIZE);
  });

  it("allows multiple sequential zoom-ins", () => {
    useTerminalZoomStore.getState().zoomIn();
    useTerminalZoomStore.getState().zoomIn();
    useTerminalZoomStore.getState().zoomIn();

    const state = useTerminalZoomStore.getState();
    expect(state.fontSize).toBe(DEFAULT_FONT_SIZE + ZOOM_STEP * 3);
  });

  it("allows multiple sequential zoom-outs", () => {
    useTerminalZoomStore.getState().zoomOut();
    useTerminalZoomStore.getState().zoomOut();

    const state = useTerminalZoomStore.getState();
    expect(state.fontSize).toBe(DEFAULT_FONT_SIZE - ZOOM_STEP * 2);
  });
});
