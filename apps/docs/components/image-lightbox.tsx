"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface StaticImageData {
  src: string;
  height: number;
  width: number;
  blurDataURL?: string;
}

interface ImageLightboxProps {
  src?: string | StaticImageData;
  alt?: string;
  title?: string;
  className?: string;
}

function resolveImageSrc(src: ImageLightboxProps["src"]): string {
  if (!src) return "";
  if (typeof src === "string") return src;
  if (typeof src === "object" && "src" in src) return src.src;
  return String(src);
}

function LightboxOverlay({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt || "Image preview"}
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        backdropFilter: "blur(8px)",
        cursor: "zoom-out",
        animation: "lightbox-fade-in 150ms ease-out",
      }}
    >
      <button
        onClick={onClose}
        aria-label="Close lightbox"
        style={{
          position: "absolute",
          top: "1rem",
          right: "1rem",
          background: "rgba(255, 255, 255, 0.1)",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          borderRadius: "0.5rem",
          color: "white",
          width: "2.5rem",
          height: "2.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          fontSize: "1.25rem",
          lineHeight: 1,
          transition: "background 150ms",
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)")
        }
      >
        &times;
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "90vw",
          maxHeight: "90vh",
          objectFit: "contain",
          borderRadius: "0.5rem",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          animation: "lightbox-scale-in 150ms ease-out",
          cursor: "default",
        }}
      />
    </div>,
    document.body
  );
}

export function ImageLightbox({ src, alt, title, className }: ImageLightboxProps) {
  const [open, setOpen] = useState(false);
  const resolvedSrc = resolveImageSrc(src);

  const handleOpen = useCallback(() => {
    if (!resolvedSrc) return;
    setOpen(true);
  }, [resolvedSrc]);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  if (!resolvedSrc) return null;

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/no-noninteractive-element-interactions */}
      <img
        src={resolvedSrc}
        alt={alt || ""}
        title={title}
        loading="lazy"
        onClick={handleOpen}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleOpen();
          }
        }}
        role="button"
        tabIndex={0}
        className={`rounded-lg ${className || ""}`}
        style={{
          cursor: "zoom-in",
          maxWidth: "100%",
          height: "auto",
        }}
      />
      {open && <LightboxOverlay src={resolvedSrc} alt={alt || ""} onClose={handleClose} />}
    </>
  );
}
