# Monorepo Restructure Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restructure the Forja project into a pnpm workspaces monorepo with 4 apps and shared packages.

**Architecture:** Move the current Electron desktop app into `apps/desktop/`, create a Next.js marketing site in `apps/site/`, a Fumadocs documentation site in `apps/docs/`, and a React Native mobile app in `apps/mobile/`. Extract shared config (TypeScript, Tailwind) and types into `packages/`. The desktop app must continue working identically after the move.

**Tech Stack:** pnpm workspaces, Next.js 15, Fumadocs, React Native (Expo), TypeScript, Tailwind CSS 4

---

## Target Structure

```
forja/
├── apps/
│   ├── desktop/              # @forja/desktop  (current Electron app, moved here)
│   │   ├── electron/
│   │   ├── frontend/
│   │   ├── scripts/
│   │   ├── assets/
│   │   ├── index.html
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   ├── vitest.config.ts
│   │   ├── electron-builder.yml
│   │   ├── components.json
│   │   └── tsconfig.json
│   │
│   ├── site/                 # @forja/site     (Next.js marketing site)
│   │   ├── app/
│   │   ├── public/
│   │   ├── package.json
│   │   ├── next.config.ts
│   │   └── tsconfig.json
│   │
│   ├── docs/                 # @forja/docs     (Fumadocs documentation)
│   │   ├── app/
│   │   ├── content/
│   │   ├── public/
│   │   ├── package.json
│   │   ├── next.config.ts
│   │   └── tsconfig.json
│   │
│   └── mobile/               # @forja/mobile   (forja-remote-control)
│       ├── app/
│       ├── components/
│       ├── package.json
│       ├── app.json
│       └── tsconfig.json
│
├── packages/
│   ├── tsconfig/             # @forja/tsconfig  (shared TS configs)
│   │   ├── base.json
│   │   ├── react.json
│   │   ├── node.json
│   │   ├── nextjs.json
│   │   └── package.json
│   │
│   └── shared/               # @forja/shared    (shared types + constants)
│       ├── src/
│       │   ├── types.ts      # IPC types, session types, project types
│       │   ├── constants.ts  # Socket paths, default ports, version
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
│
├── docs/                     # Planning docs (NOT the docs app)
│   ├── specs/
│   ├── design/
│   ├── plans/
│   ├── sdlc/
│   └── guides/
│
├── pnpm-workspace.yaml
├── package.json              # Root: scripts, devDeps only
├── turbo.json                # Turborepo (optional, for build orchestration)
├── CHANGELOG.md
├── CLAUDE.md
├── README.md
└── LICENSE
```

---

## Phase 1: Root Monorepo Scaffolding

### Task 1: Update root pnpm-workspace.yaml and package.json

**Files:**
- Modify: `pnpm-workspace.yaml`
- Modify: `package.json`

**Step 1: Update pnpm-workspace.yaml**

Replace contents of `pnpm-workspace.yaml`:

```yaml
packages:
  - "apps/*"
  - "packages/*"

onlyBuiltDependencies:
  - electron
  - esbuild
  - node-pty
```

**Step 2: Slim down root package.json**

Replace `package.json` with a root-only config. All app dependencies move to `apps/desktop/package.json` later.

```json
{
  "name": "@forja/monorepo",
  "private": true,
  "version": "1.9.0",
  "scripts": {
    "dev": "pnpm --filter @forja/desktop dev",
    "dev:site": "pnpm --filter @forja/site dev",
    "dev:docs": "pnpm --filter @forja/docs dev",
    "dev:mobile": "pnpm --filter @forja/mobile start",
    "build": "pnpm --filter @forja/desktop build",
    "build:site": "pnpm --filter @forja/site build",
    "build:docs": "pnpm --filter @forja/docs build",
    "build:electron": "pnpm --filter @forja/desktop build:electron",
    "test": "pnpm -r test",
    "test:desktop": "pnpm --filter @forja/desktop test",
    "test:site": "pnpm --filter @forja/site test",
    "lint": "pnpm -r lint",
    "clean": "pnpm -r clean"
  },
  "engines": {
    "node": ">=22",
    "pnpm": ">=9"
  }
}
```

**Step 3: Verify pnpm recognizes workspace**

Run: `pnpm ls --depth 0`
Expected: No errors (empty workspace, no packages yet)

**Step 4: Commit**

```bash
git add pnpm-workspace.yaml package.json
git commit -m "chore: configure pnpm workspaces for monorepo structure"
```

---

## Phase 2: Shared Packages

### Task 2: Create @forja/tsconfig package

**Files:**
- Create: `packages/tsconfig/package.json`
- Create: `packages/tsconfig/base.json`
- Create: `packages/tsconfig/react.json`
- Create: `packages/tsconfig/node.json`
- Create: `packages/tsconfig/nextjs.json`

**Step 1: Create package.json**

```json
{
  "name": "@forja/tsconfig",
  "private": true,
  "version": "0.0.0",
  "files": ["*.json"]
}
```

**Step 2: Create base.json**

Shared strictness rules used by all packages:

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

**Step 3: Create react.json**

For frontend React apps (desktop renderer, site, docs):

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "./base.json",
  "compilerOptions": {
    "target": "ES2021",
    "lib": ["ES2021", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "allowJs": true
  }
}
```

**Step 4: Create node.json**

For Node.js backends (electron main, scripts):

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "./base.json",
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "NodeNext",
    "moduleResolution": "NodeNext"
  }
}
```

**Step 5: Create nextjs.json**

For Next.js apps (site, docs):

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "./react.json",
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowJs": true,
    "incremental": true,
    "plugins": [{ "name": "next" }]
  }
}
```

**Step 6: Commit**

```bash
git add packages/tsconfig/
git commit -m "chore: add @forja/tsconfig shared TypeScript configs"
```

---

### Task 3: Create @forja/shared package

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/src/types.ts`
- Create: `packages/shared/src/constants.ts`

**Step 1: Create package.json**

```json
{
  "name": "@forja/shared",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "exports": {
    ".": {
      "types": "./src/index.ts",
      "default": "./src/index.ts"
    }
  },
  "scripts": {
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "@forja/tsconfig": "workspace:*",
    "typescript": "^5.7.3"
  }
}
```

**Step 2: Create tsconfig.json**

```json
{
  "extends": "@forja/tsconfig/base.json",
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

**Step 3: Create src/types.ts**

Extract types that are shared between desktop, mobile, and site:

```typescript
/** Active PTY session info exposed via External API and WebSocket */
export interface ActiveSession {
  tabId: string;
  projectPath: string;
  sessionType: string;
}

/** Project info returned by list-projects */
export interface ProjectInfo {
  path: string;
  name: string;
}

/** External API command types (Unix socket + WebSocket) */
export type ExternalCommand =
  | { type: "notify"; message: string; projectPath?: string }
  | { type: "open-project"; projectPath: string }
  | { type: "screenshot" }
  | { type: "list-projects" }
  | { type: "ping" }
  | { type: "list-sessions" }
  | { type: "session-output"; tabId: string }
  | { type: "session-input"; tabId: string; text: string }
  | { type: "subscribe"; tabId: string }
  | { type: "unsubscribe"; tabId: string }
  | { type: "new-session"; sessionType: string; projectPath?: string }
  | { type: "switch-project"; index: number };

/** Standard API response */
export type ApiResponse<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

/** WebSocket bridge status */
export interface WsBridgeStatus {
  running: boolean;
  port: number;
  host: string;
  clients: number;
  token: string;
}

/** PTY subscriber event types */
export type PtySubscriberEvent =
  | { event: "data"; tabId: string; data: string }
  | { event: "session-start"; tabId: string; projectPath: string; sessionType: string }
  | { event: "session-exit"; tabId: string; projectPath: string; exitCode: number };
```

**Step 4: Create src/constants.ts**

```typescript
import * as os from "node:os";
import * as path from "node:path";

/** Default WebSocket bridge port */
export const WS_BRIDGE_PORT = 9400;

/** Default WebSocket bridge host */
export const WS_BRIDGE_HOST = "127.0.0.1";

/** Max WebSocket messages per second per client */
export const WS_MAX_MESSAGES_PER_SECOND = 10;

/** Max concurrent WebSocket clients */
export const WS_MAX_CLIENTS = 5;

/** Get the Unix socket / named pipe path for the External API */
export function getSocketPath(): string {
  if (process.platform === "win32") {
    return "\\\\.\\pipe\\forja";
  }
  return path.join(os.tmpdir(), "forja.sock");
}
```

**Step 5: Create src/index.ts**

```typescript
export type {
  ActiveSession,
  ProjectInfo,
  ExternalCommand,
  ApiResponse,
  WsBridgeStatus,
  PtySubscriberEvent,
} from "./types.js";

export {
  WS_BRIDGE_PORT,
  WS_BRIDGE_HOST,
  WS_MAX_MESSAGES_PER_SECOND,
  WS_MAX_CLIENTS,
  getSocketPath,
} from "./constants.js";
```

**Step 6: Commit**

```bash
git add packages/shared/
git commit -m "feat: add @forja/shared package with types and constants"
```

---

## Phase 3: Move Desktop App

### Task 4: Move current app into apps/desktop/

This is the most critical task. The desktop app must work identically after the move.

**Files:**
- Move: `electron/` -> `apps/desktop/electron/`
- Move: `frontend/` -> `apps/desktop/frontend/`
- Move: `scripts/` -> `apps/desktop/scripts/`
- Move: `assets/` -> `apps/desktop/assets/`
- Move: `tests/` -> `apps/desktop/tests/`
- Move: `index.html` -> `apps/desktop/index.html`
- Move: `vite.config.ts` -> `apps/desktop/vite.config.ts`
- Move: `vitest.config.ts` -> `apps/desktop/vitest.config.ts`
- Move: `electron-builder.yml` -> `apps/desktop/electron-builder.yml`
- Move: `components.json` -> `apps/desktop/components.json`
- Move: `tsconfig.json` -> `apps/desktop/tsconfig.json`
- Move: `tsconfig.node.json` -> `apps/desktop/tsconfig.node.json`
- Create: `apps/desktop/package.json`

**Step 1: Create apps/desktop/ directory and move files**

```bash
mkdir -p apps/desktop

# Move app directories
git mv electron apps/desktop/
git mv frontend apps/desktop/
git mv scripts apps/desktop/
git mv assets apps/desktop/
git mv tests apps/desktop/

# Move app config files
git mv index.html apps/desktop/
git mv vite.config.ts apps/desktop/
git mv vitest.config.ts apps/desktop/
git mv electron-builder.yml apps/desktop/
git mv components.json apps/desktop/
git mv tsconfig.json apps/desktop/
git mv tsconfig.node.json apps/desktop/

# Move app-specific dotfiles
git mv .env.example apps/desktop/
```

**Step 2: Create apps/desktop/package.json**

Move ALL dependencies from root package.json into this file. The package name changes from `@forja/app` to `@forja/desktop`:

```json
{
  "name": "@forja/desktop",
  "private": true,
  "version": "1.9.0",
  "type": "module",
  "main": "dist-electron/main.js",
  "sideEffects": ["**/*.css"],
  "scripts": {
    "dev": "concurrently -k \"pnpm dev:vite\" \"pnpm dev:electron\"",
    "dev:vite": "vite",
    "dev:electron": "wait-on tcp:1420 && electron .",
    "build": "tsc -p electron/tsconfig.json && vite build",
    "build:electron": "pnpm build && electron-builder --config electron-builder.yml",
    "preview": "vite preview",
    "test": "vitest run",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "clean": "rm -rf dist dist-electron release"
  },
  "dependencies": {
    "<<< COPY ALL dependencies FROM CURRENT ROOT package.json >>>"
  },
  "devDependencies": {
    "@forja/tsconfig": "workspace:*",
    "@forja/shared": "workspace:*",
    "<<< COPY ALL devDependencies FROM CURRENT ROOT package.json >>>"
  }
}
```

> **IMPORTANT:** Copy the exact dependency versions from the current root `package.json`. Do NOT change any versions. The `dependencies` and `devDependencies` sections should be identical to the current root, plus `@forja/tsconfig` and `@forja/shared` workspace refs.

**Step 3: Update apps/desktop/tsconfig.json**

The `@/*` alias path must be updated since the file moved:

```json
{
  "extends": "@forja/tsconfig/react.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./frontend/*"]
    }
  },
  "include": ["frontend", "tests"],
  "references": [
    { "path": "./tsconfig.node.json" },
    { "path": "./electron/tsconfig.json" }
  ]
}
```

**Step 4: Update apps/desktop/electron/tsconfig.json**

```json
{
  "extends": "@forja/tsconfig/node.json",
  "compilerOptions": {
    "outDir": "../dist-electron",
    "rootDir": ".",
    "composite": false,
    "declaration": false,
    "declarationMap": false
  },
  "include": ["./**/*.ts", "./**/*.cts"],
  "exclude": ["__tests__/**"]
}
```

**Step 5: Update apps/desktop/tsconfig.node.json**

```json
{
  "extends": "@forja/tsconfig/base.json",
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "composite": true,
    "emitDeclarationOnly": true,
    "declaration": true,
    "declarationMap": true
  },
  "include": ["vite.config.ts", "vitest.config.ts"]
}
```

**Step 6: Update apps/desktop/components.json**

The shadcn/ui paths are relative to the app root, so they remain the same (`frontend/styles/globals.css`, `@/components`, etc.). No changes needed.

**Step 7: Update apps/desktop/vite.config.ts**

Update `__dirname` references. The `@/` alias already points to `./frontend` which is correct relative to the new location. Check the `packageJson` import path:

```typescript
// Change this line:
import packageJson from "./package.json" with { type: "json" };
// The rest of the config stays the same since all paths are relative
```

**Step 8: Update apps/desktop/electron-builder.yml**

Paths are relative to the app directory, should remain the same. Verify `files`, `directories`, and `icon` paths still resolve correctly.

**Step 9: Run pnpm install from root**

```bash
cd /home/nandomoreira/dev/projects/forja
pnpm install
```

Expected: Lockfile updates, workspace packages linked.

**Step 10: Run tests**

```bash
cd apps/desktop
pnpm test
```

Expected: All 1498+ tests pass.

**Step 11: Run dev mode**

```bash
pnpm dev
```

Expected: Vite starts on port 1420, Electron launches, app works normally.

**Step 12: Commit**

```bash
git add -A
git commit -m "refactor: move desktop app to apps/desktop/ workspace"
```

---

### Task 5: Update root CLAUDE.md and project references

**Files:**
- Modify: `CLAUDE.md`
- Modify: `apps/desktop/CLAUDE.md` (if the current CLAUDE.md references file paths)

**Step 1: Update CLAUDE.md paths**

All file paths in the CLAUDE.md that reference `electron/`, `frontend/`, `scripts/` etc. must be prefixed with `apps/desktop/`. For example:

- `electron/main.ts` -> `apps/desktop/electron/main.ts`
- `frontend/lib/ipc.ts` -> `apps/desktop/frontend/lib/ipc.ts`
- `pnpm test` -> `pnpm test:desktop` (or `pnpm --filter @forja/desktop test`)

**Step 2: Update build commands section**

```markdown
## Build Commands

### Desktop App (apps/desktop/)
pnpm dev              # Run desktop app (Vite + Electron)
pnpm test:desktop     # Run desktop tests
pnpm build:electron   # Build desktop distributable

### Site (apps/site/)
pnpm dev:site         # Run Next.js marketing site
pnpm build:site       # Build site for production

### Docs (apps/docs/)
pnpm dev:docs         # Run Fumadocs dev server
pnpm build:docs       # Build docs for production

### Mobile (apps/mobile/)
pnpm dev:mobile       # Run Expo dev server

### All
pnpm test             # Run all tests across workspaces
pnpm lint             # Lint all workspaces
```

**Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md paths for monorepo structure"
```

---

## Phase 4: Next.js Marketing Site

### Task 6: Create @forja/site app

**Files:**
- Create: `apps/site/package.json`
- Create: `apps/site/next.config.ts`
- Create: `apps/site/tsconfig.json`
- Create: `apps/site/app/layout.tsx`
- Create: `apps/site/app/page.tsx`
- Create: `apps/site/app/globals.css`
- Create: `apps/site/public/` (move assets from old `site/public/`)
- Delete: `site/` (old static landing page)

**Step 1: Create package.json**

```json
{
  "name": "@forja/site",
  "private": true,
  "version": "1.9.0",
  "scripts": {
    "dev": "next dev --port 3030",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "clean": "rm -rf .next out"
  },
  "dependencies": {
    "next": "^15.3.1",
    "react": "^19.1.0",
    "react-dom": "^19.1.0"
  },
  "devDependencies": {
    "@forja/tsconfig": "workspace:*",
    "@tailwindcss/postcss": "^4.1.4",
    "tailwindcss": "^4.1.4",
    "postcss": "^8.5.3",
    "typescript": "^5.7.3",
    "@types/react": "^19.1.2",
    "@types/react-dom": "^19.1.2"
  }
}
```

**Step 2: Create next.config.ts**

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
};

export default nextConfig;
```

**Step 3: Create tsconfig.json**

```json
{
  "extends": "@forja/tsconfig/nextjs.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

**Step 4: Create postcss.config.mjs**

```javascript
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
```

**Step 5: Create app/globals.css**

```css
@import "tailwindcss";

@theme {
  --font-sans: "Geist Sans", "Inter", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", "Fira Code", monospace;
  --color-brand: #cba6f7;
  --color-brand-hover: #b4befe;
}
```

**Step 6: Create app/layout.tsx**

```tsx
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
```

**Step 7: Create app/page.tsx**

Port the content from `site/public/index.html` into a React component. This is a straightforward HTML-to-JSX conversion of the existing landing page.

```tsx
export default function Home() {
  return (
    <main>
      {/* Port the existing landing page content from site/public/index.html */}
      <h1>Forja</h1>
      <p>Desktop GUI for AI Coding CLIs</p>
      {/* TODO: Full port of landing page sections */}
    </main>
  );
}
```

**Step 8: Move static assets**

```bash
cp site/public/favicon.svg apps/site/public/
cp site/public/favicon.png apps/site/public/
cp site/public/favicon.ico apps/site/public/
```

**Step 9: Remove old site directory**

```bash
git rm -r site/
```

**Step 10: Verify**

```bash
cd apps/site
pnpm install
pnpm dev
```

Expected: Next.js starts on port 3030, landing page renders.

**Step 11: Commit**

```bash
git add apps/site/ -A
git commit -m "feat(site): create Next.js marketing site in apps/site"

git rm -r site/
git commit -m "chore: remove old static landing page"
```

---

## Phase 5: Fumadocs Documentation

### Task 7: Create @forja/docs app

**Files:**
- Create: `apps/docs/package.json`
- Create: `apps/docs/next.config.ts`
- Create: `apps/docs/tsconfig.json`
- Create: `apps/docs/postcss.config.mjs`
- Create: `apps/docs/app/layout.tsx`
- Create: `apps/docs/app/page.tsx`
- Create: `apps/docs/app/docs/[[...slug]]/page.tsx`
- Create: `apps/docs/app/globals.css`
- Create: `apps/docs/lib/source.ts`
- Create: `apps/docs/content/docs/index.mdx`
- Create: `apps/docs/content/docs/meta.json`
- Create: `apps/docs/source.config.ts`

**Step 1: Create package.json**

```json
{
  "name": "@forja/docs",
  "private": true,
  "version": "1.9.0",
  "scripts": {
    "dev": "next dev --port 3031",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "clean": "rm -rf .next .source out"
  },
  "dependencies": {
    "next": "^15.3.1",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "fumadocs-core": "^15.4.4",
    "fumadocs-ui": "^15.4.4",
    "fumadocs-mdx": "^11.5.6"
  },
  "devDependencies": {
    "@forja/tsconfig": "workspace:*",
    "@tailwindcss/postcss": "^4.1.4",
    "tailwindcss": "^4.1.4",
    "postcss": "^8.5.3",
    "typescript": "^5.7.3",
    "@types/react": "^19.1.2",
    "@types/react-dom": "^19.1.2",
    "@types/mdx": "^2.0.13"
  }
}
```

> **NOTE:** Check latest Fumadocs versions at https://fumadocs.vercel.app before installing. The versions above are placeholders.

**Step 2: Create source.config.ts**

```typescript
import { defineConfig, defineDocs } from "fumadocs-mdx/config";

export const docs = defineDocs({
  dir: "content/docs",
});

export default defineConfig({
  mdxOptions: {},
});
```

**Step 3: Create next.config.ts**

```typescript
import { createMDX } from "fumadocs-mdx/next";

const withMDX = createMDX();

export default withMDX({
  reactStrictMode: true,
});
```

**Step 4: Create tsconfig.json**

```json
{
  "extends": "@forja/tsconfig/nextjs.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    "**/*.mdx",
    ".next/types/**/*.ts",
    ".source/**/*.ts"
  ],
  "exclude": ["node_modules"]
}
```

**Step 5: Create postcss.config.mjs**

```javascript
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
```

**Step 6: Create app/globals.css**

```css
@import "tailwindcss";
@import "fumadocs-ui/css/neutral.css";
@import "fumadocs-ui/css/preset.css";
```

**Step 7: Create app/layout.tsx**

```tsx
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
```

**Step 8: Create lib/source.ts**

```typescript
import { docs } from "@/.source";
import { loader } from "fumadocs-core/source";

export const source = loader({
  source: docs.toFumadocsSource(),
  baseUrl: "/docs",
});
```

**Step 9: Create app/page.tsx (home redirect)**

```tsx
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/docs");
}
```

**Step 10: Create app/docs/[[...slug]]/page.tsx**

```tsx
import defaultMdxComponents from "fumadocs-ui/mdx";
import { DocsPage, DocsBody, DocsTitle, DocsDescription } from "fumadocs-ui/page";
import { source } from "@/lib/source";
import { notFound } from "next/navigation";

export default async function Page(props: { params: Promise<{ slug?: string[] }> }) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const MDX = page.data.body;

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <MDX components={{ ...defaultMdxComponents }} />
      </DocsBody>
    </DocsPage>
  );
}

export function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata(props: { params: Promise<{ slug?: string[] }> }) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();
  return { title: page.data.title, description: page.data.description };
}
```

**Step 11: Create app/docs/layout.tsx**

```tsx
import { source } from "@/lib/source";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import type { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      tree={source.pageTree}
      nav={{ title: "Forja Docs" }}
    >
      {children}
    </DocsLayout>
  );
}
```

**Step 12: Create initial content**

`content/docs/index.mdx`:

```mdx
---
title: Getting Started
description: Install and run Forja on your machine.
---

# Getting Started with Forja

Forja is a desktop GUI client for AI coding CLIs like Claude Code, Codex CLI, and Gemini CLI.

## Installation

Download the latest release from [GitHub Releases](https://github.com/nandomoreirame/forja/releases).

## Features

- Hybrid terminal rendering (xterm.js + React markdown)
- Multi-project workspace management
- 14+ built-in editor themes
- External API for programmatic control
- WebSocket bridge for remote access
- Discord bot integration
```

`content/docs/meta.json`:

```json
{
  "title": "Documentation",
  "pages": ["---Getting Started---", "index"]
}
```

**Step 13: Verify**

```bash
cd apps/docs
pnpm install
pnpm dev
```

Expected: Fumadocs starts on port 3031, documentation renders.

**Step 14: Commit**

```bash
git add apps/docs/
git commit -m "feat(docs): create Fumadocs documentation site in apps/docs"
```

---

## Phase 6: Mobile App (forja-remote-control)

### Task 8: Create @forja/mobile app with Expo

**Files:**
- Create: `apps/mobile/package.json`
- Create: `apps/mobile/app.json`
- Create: `apps/mobile/tsconfig.json`
- Create: `apps/mobile/app/_layout.tsx`
- Create: `apps/mobile/app/index.tsx`
- Create: `apps/mobile/app/sessions.tsx`
- Create: `apps/mobile/lib/forja-client.ts`

**Step 1: Create package.json**

```json
{
  "name": "@forja/mobile",
  "private": true,
  "version": "1.9.0",
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start",
    "android": "expo run:android",
    "ios": "expo run:ios",
    "lint": "expo lint",
    "clean": "rm -rf .expo android ios"
  },
  "dependencies": {
    "expo": "~52.0.0",
    "expo-router": "~4.0.0",
    "expo-status-bar": "~2.0.0",
    "react": "^19.0.0",
    "react-native": "~0.76.0",
    "react-native-safe-area-context": "^5.0.0",
    "react-native-screens": "~4.0.0",
    "@forja/shared": "workspace:*"
  },
  "devDependencies": {
    "@forja/tsconfig": "workspace:*",
    "@types/react": "^19.1.2",
    "typescript": "^5.7.3"
  }
}
```

> **NOTE:** Check latest Expo SDK version before installing. Versions above are approximate for Expo SDK 52.

**Step 2: Create app.json**

```json
{
  "expo": {
    "name": "Forja Remote Control",
    "slug": "forja-remote-control",
    "version": "1.9.0",
    "scheme": "forja-remote",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "dark",
    "splash": {
      "backgroundColor": "#1e1e2e"
    },
    "ios": {
      "bundleIdentifier": "dev.forja.remote"
    },
    "android": {
      "package": "dev.forja.remote",
      "adaptiveIcon": {
        "backgroundColor": "#1e1e2e"
      }
    }
  }
}
```

**Step 3: Create tsconfig.json**

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

**Step 4: Create lib/forja-client.ts**

WebSocket client for connecting to Forja's WS bridge:

```typescript
import type { ApiResponse, ActiveSession, WsBridgeStatus } from "@forja/shared";

export class ForjaClient {
  private ws: WebSocket | null = null;
  private token: string;
  private url: string;
  private listeners = new Map<string, Set<(data: unknown) => void>>();

  constructor(host: string, port: number, token: string) {
    this.url = `ws://${host}:${port}`;
    this.token = token;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (e) => reject(e);
      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "pty-event") {
          this.emit("pty-event", data);
        }
      };
      this.ws.onclose = () => this.emit("close", null);
    });
  }

  disconnect(): void {
    this.ws?.close();
    this.ws = null;
  }

  private send(msg: object): Promise<ApiResponse> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error("Not connected"));
        return;
      }
      const handler = (event: MessageEvent) => {
        this.ws?.removeEventListener("message", handler);
        resolve(JSON.parse(event.data));
      };
      this.ws.addEventListener("message", handler);
      this.ws.send(JSON.stringify({ token: this.token, ...msg }));
    });
  }

  ping(): Promise<ApiResponse> {
    return this.send({ type: "ping" });
  }

  listSessions(): Promise<ApiResponse<ActiveSession[]>> {
    return this.send({ type: "list-sessions" });
  }

  getSessionOutput(tabId: string): Promise<ApiResponse<{ tabId: string; content: string }>> {
    return this.send({ type: "session-output", tabId });
  }

  sendInput(tabId: string, text: string): Promise<ApiResponse> {
    return this.send({ type: "session-input", tabId, text });
  }

  subscribe(tabId: string): Promise<ApiResponse> {
    return this.send({ type: "subscribe", tabId });
  }

  unsubscribe(tabId: string): Promise<ApiResponse> {
    return this.send({ type: "unsubscribe", tabId });
  }

  on(event: string, callback: (data: unknown) => void): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(callback);
    return () => this.listeners.get(event)?.delete(callback);
  }

  private emit(event: string, data: unknown): void {
    this.listeners.get(event)?.forEach((cb) => cb(data));
  }
}
```

**Step 5: Create app/_layout.tsx**

```tsx
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#1e1e2e" },
          headerTintColor: "#cdd6f4",
          contentStyle: { backgroundColor: "#1e1e2e" },
        }}
      />
    </>
  );
}
```

**Step 6: Create app/index.tsx (connection screen)**

```tsx
import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";

export default function ConnectScreen() {
  const [host, setHost] = useState("192.168.1.100");
  const [port, setPort] = useState("9400");
  const [token, setToken] = useState("");

  const connect = () => {
    router.push({
      pathname: "/sessions",
      params: { host, port, token },
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Forja Remote Control</Text>
      <Text style={styles.subtitle}>Connect to your Forja instance</Text>

      <TextInput style={styles.input} value={host} onChangeText={setHost} placeholder="Host IP" placeholderTextColor="#585b70" />
      <TextInput style={styles.input} value={port} onChangeText={setPort} placeholder="Port" placeholderTextColor="#585b70" keyboardType="numeric" />
      <TextInput style={styles.input} value={token} onChangeText={setToken} placeholder="Auth Token" placeholderTextColor="#585b70" secureTextEntry />

      <Pressable style={styles.button} onPress={connect}>
        <Text style={styles.buttonText}>Connect</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center", backgroundColor: "#1e1e2e" },
  title: { fontSize: 28, fontWeight: "bold", color: "#cdd6f4", textAlign: "center", marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#a6adc8", textAlign: "center", marginBottom: 32 },
  input: { backgroundColor: "#313244", color: "#cdd6f4", padding: 14, borderRadius: 8, marginBottom: 12, fontSize: 16 },
  button: { backgroundColor: "#cba6f7", padding: 16, borderRadius: 8, alignItems: "center", marginTop: 8 },
  buttonText: { color: "#1e1e2e", fontSize: 16, fontWeight: "600" },
});
```

**Step 7: Create app/sessions.tsx (sessions list)**

```tsx
import { useEffect, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { ForjaClient } from "@/lib/forja-client";
import type { ActiveSession } from "@forja/shared";

export default function SessionsScreen() {
  const { host, port, token } = useLocalSearchParams<{ host: string; port: string; token: string }>();
  const [client, setClient] = useState<ForjaClient | null>(null);
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const forja = new ForjaClient(host, parseInt(port), token);
    forja.connect()
      .then(async () => {
        setClient(forja);
        const res = await forja.listSessions();
        if (res.ok && res.data) setSessions(res.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });

    return () => forja.disconnect();
  }, [host, port, token]);

  if (loading) return <View style={styles.center}><ActivityIndicator color="#cba6f7" size="large" /></View>;
  if (error) return <View style={styles.center}><Text style={styles.error}>{error}</Text></View>;

  return (
    <View style={styles.container}>
      <FlatList
        data={sessions}
        keyExtractor={(item) => item.tabId}
        renderItem={({ item }) => (
          <Pressable style={styles.card}>
            <Text style={styles.sessionType}>{item.sessionType}</Text>
            <Text style={styles.tabId}>{item.tabId}</Text>
            <Text style={styles.path}>{item.projectPath}</Text>
          </Pressable>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No active sessions</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#1e1e2e" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#1e1e2e" },
  error: { color: "#f38ba8", fontSize: 16 },
  empty: { color: "#a6adc8", textAlign: "center", marginTop: 40 },
  card: { backgroundColor: "#313244", padding: 16, borderRadius: 8, marginBottom: 8 },
  sessionType: { color: "#cba6f7", fontSize: 14, fontWeight: "600", textTransform: "uppercase" },
  tabId: { color: "#cdd6f4", fontSize: 12, fontFamily: "monospace", marginTop: 4 },
  path: { color: "#a6adc8", fontSize: 12, marginTop: 2 },
});
```

**Step 8: Create placeholder assets**

```bash
mkdir -p apps/mobile/assets
# Create a simple placeholder icon (can be replaced later)
```

**Step 9: Verify**

```bash
cd apps/mobile
pnpm install
pnpm start
```

Expected: Expo CLI starts, app can be opened in Expo Go or simulator.

**Step 10: Commit**

```bash
git add apps/mobile/
git commit -m "feat(mobile): create forja-remote-control Expo app in apps/mobile"
```

---

## Phase 7: Cleanup and Final Verification

### Task 9: Clean up root and verify all workspaces

**Files:**
- Modify: `pnpm-lock.yaml` (regenerated)
- Delete: stale root config files that were moved

**Step 1: Remove stale files from root**

After the move to `apps/desktop/`, ensure these are no longer at root:
- `vite.config.ts`
- `vitest.config.ts`
- `electron-builder.yml`
- `components.json`
- `tsconfig.node.json`
- `index.html`
- `.env.example`
- `electron/` directory
- `frontend/` directory
- `scripts/` directory
- `tests/` directory
- `assets/` directory

If `git mv` was used correctly in Task 4, these should already be gone.

**Step 2: Verify workspace listing**

```bash
pnpm ls -r --depth 0
```

Expected output should list:
- `@forja/monorepo` (root)
- `@forja/desktop`
- `@forja/site`
- `@forja/docs`
- `@forja/mobile`
- `@forja/tsconfig`
- `@forja/shared`

**Step 3: Run all tests**

```bash
pnpm test
```

Expected: Desktop tests all pass. Site/docs/mobile may not have tests yet.

**Step 4: Verify desktop build**

```bash
pnpm build
```

Expected: Desktop app builds successfully (Vite + TypeScript).

**Step 5: Commit final cleanup**

```bash
git add -A
git commit -m "chore: finalize monorepo structure and clean up root"
```

---

## Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| 1 | Task 1 | Root workspace scaffolding |
| 2 | Tasks 2-3 | Shared packages (@forja/tsconfig, @forja/shared) |
| 3 | Tasks 4-5 | Move desktop app, update docs |
| 4 | Task 6 | Next.js marketing site |
| 5 | Task 7 | Fumadocs documentation site |
| 6 | Task 8 | Expo mobile app (forja-remote-control) |
| 7 | Task 9 | Cleanup and verification |

**Total: 9 tasks across 7 phases**

**Risk notes:**
- Task 4 (move desktop) is the highest-risk task. All 1498+ tests must pass after the move. If anything breaks, the issue will be import paths or config references.
- The `electron-builder.yml` paths are relative to the package root; they should work from `apps/desktop/` without changes.
- The `pnpm-lock.yaml` will be regenerated and will be large. This is expected.
- `@forja/shared` uses TypeScript source exports (no build step). Consumer apps resolve `.ts` files directly via `exports` field. This works with bundler moduleResolution but may need adjustment for Node.js consumers.
