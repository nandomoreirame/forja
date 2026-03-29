import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ImageViewer } from "../image-viewer";

const FAKE_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk";

describe("ImageViewer", () => {
  it("renders an img element with correct data URI src", () => {
    render(
      <ImageViewer content={FAKE_BASE64} filename="photo.png" />
    );
    const img = screen.getByRole("img");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute(
      "src",
      `data:image/png;base64,${FAKE_BASE64}`
    );
  });

  it("uses correct MIME type based on file extension", () => {
    render(
      <ImageViewer content={FAKE_BASE64} filename="photo.jpg" />
    );
    const img = screen.getByRole("img");
    expect(img.getAttribute("src")).toMatch(/^data:image\/jpeg;base64,/);
  });

  it("renders SVG with correct MIME type", () => {
    render(
      <ImageViewer content={FAKE_BASE64} filename="icon.svg" />
    );
    const img = screen.getByRole("img");
    expect(img.getAttribute("src")).toMatch(/^data:image\/svg\+xml;base64,/);
  });

  it("sets alt text from filename", () => {
    render(
      <ImageViewer content={FAKE_BASE64} filename="screenshot.png" />
    );
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("alt", "screenshot.png");
  });

  it("shows error state when image fails to load", () => {
    render(
      <ImageViewer content="invalid-base64" filename="broken.png" />
    );
    const img = screen.getByRole("img");
    fireEvent.error(img);
    expect(screen.getByText("Failed to load image")).toBeInTheDocument();
  });

  it("applies max-width and max-height to prevent overflow", () => {
    render(
      <ImageViewer content={FAKE_BASE64} filename="large.png" />
    );
    const img = screen.getByRole("img");
    expect(img.className).toMatch(/max-w-full/);
    expect(img.className).toMatch(/max-h-full/);
  });
});
