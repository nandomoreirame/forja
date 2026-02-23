import React from "react";
import ReactDOM from "react-dom/client";
import "@/styles/globals.css";
import App from "@/App";

// Load fonts asynchronously to avoid blocking initial render
import("@fontsource/geist-sans/400.css");
import("@fontsource/geist-sans/500.css");
import("@fontsource/geist-sans/600.css");
import("@fontsource/geist-sans/700.css");
import("@fontsource-variable/jetbrains-mono/index.css");

function getInitialProjectPath(): string | null {
  const params = new URLSearchParams(window.location.search);
  const project = params.get("project");
  return project ? decodeURIComponent(project) : null;
}

const initialProjectPath = getInitialProjectPath();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App initialProjectPath={initialProjectPath} />
  </React.StrictMode>,
);
