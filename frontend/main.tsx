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

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
