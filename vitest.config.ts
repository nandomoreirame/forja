import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";
import { readFileSync } from "node:fs";

const packageJson = JSON.parse(
  readFileSync(path.resolve(__dirname, "package.json"), "utf-8")
) as { version: string };

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "frontend",
          include: ["frontend/**/*.{test,spec}.{ts,tsx}", "tests/**/*.{test,spec}.{ts,tsx}"],
          environment: "jsdom",
          globals: true,
          setupFiles: ["./tests/setup.ts"],
        },
        resolve: {
          alias: {
            "@": path.resolve(__dirname, "./frontend"),
          },
        },
      },
      {
        extends: true,
        test: {
          name: "electron",
          include: ["electron/__tests__/**/*.test.ts"],
          environment: "node",
          pool: "forks",
          globals: true,
        },
      },
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./frontend"),
    },
  },
});
