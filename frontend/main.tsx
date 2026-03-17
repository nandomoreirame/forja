import "./lib/monaco-workers";
import React from "react";
import ReactDOM from "react-dom/client";
import "@/styles/globals.css";
import "flexlayout-react/style/dark.css";
import "@/themes/flexlayout-theme.css";
import App from "@/App";

// Load fonts asynchronously to avoid blocking initial render
import("@fontsource/geist-sans/400.css");
import("@fontsource/geist-sans/500.css");
import("@fontsource/geist-sans/600.css");
import("@fontsource/geist-sans/700.css");
import("@fontsource-variable/jetbrains-mono/index.css");

function getInitialParams(): {
  projectPath: string | null;
  workspaceId: string | null;
} {
  const params = new URLSearchParams(window.location.search);
  const project = params.get("project") || params.get("path");
  const workspace = params.get("workspace");
  return {
    projectPath: project ? decodeURIComponent(project) : null,
    workspaceId: workspace ? decodeURIComponent(workspace) : null,
  };
}

const { projectPath: initialProjectPath, workspaceId: initialWorkspaceId } =
  getInitialParams();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App
      initialProjectPath={initialProjectPath}
      initialWorkspaceId={initialWorkspaceId}
    />
  </React.StrictMode>,
);
