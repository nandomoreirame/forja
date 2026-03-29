import type { Metadata } from "next";
import { RootProvider } from "fumadocs-ui/provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Forja Documentation",
  description: "Documentation for the Forja desktop GUI client for AI coding CLIs.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
