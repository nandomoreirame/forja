import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TabsetContextMenu } from "../tabset-context-menu";

describe("TabsetContextMenu", () => {
  it("does not render a tabset menu or Close pane action", () => {
    const { container } = render(
      <TabsetContextMenu
        tabsetId="tabset-1"
        position={{ x: 150, y: 250 }}
        onClose={() => {}}
      />,
    );

    expect(container.firstChild).toBeNull();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(screen.queryByText("Close pane")).not.toBeInTheDocument();
  });
});
