import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Forja - Desktop GUI for AI Coding CLIs",
  description: "A desktop GUI client for Vibe Coders and AI coding CLIs like Claude Code, Codex, and Gemini CLI.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#1e1e2e] text-[#cdd6f4] antialiased">
        {children}
      </body>
    </html>
  );
}
