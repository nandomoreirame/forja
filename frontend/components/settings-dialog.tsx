import { useState, useEffect } from "react";
import {
  ExternalLink,
  FolderSync,
  Keyboard,
  Monitor,
  Palette,
  Settings,
  Terminal,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "./ui/dialog";
import { useUserSettingsStore } from "@/stores/user-settings";
import { useThemeStore } from "@/stores/theme";
import { useFilePreviewStore } from "@/stores/file-preview";
import { usePerformanceStore } from "@/stores/performance";
import { invoke, getVersion } from "@/lib/ipc";
import { cn } from "@/lib/utils";
import { ContextSection } from "./context-settings-section";
import type { UserSettings } from "@/lib/settings-types";

type SettingsSection = "appearance" | "shortcuts" | "sessions" | "context" | "performance";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ─── Sidebar Navigation ──────────────────────────────────────────────────────

interface NavItem {
  id: SettingsSection;
  label: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: "appearance",
    label: "Appearance",
    icon: <Palette className="h-3.5 w-3.5" strokeWidth={1.5} />,
  },
  {
    id: "shortcuts",
    label: "Shortcuts",
    icon: <Keyboard className="h-3.5 w-3.5" strokeWidth={1.5} />,
  },
  {
    id: "sessions",
    label: "Sessions",
    icon: <Terminal className="h-3.5 w-3.5" strokeWidth={1.5} />,
  },
  {
    id: "context",
    label: "Context",
    icon: <FolderSync className="h-3.5 w-3.5" strokeWidth={1.5} />,
  },
  {
    id: "performance",
    label: "Performance",
    icon: <Monitor className="h-3.5 w-3.5" strokeWidth={1.5} />,
  },
];

interface SidebarProps {
  activeSection: SettingsSection;
  onSelect: (section: SettingsSection) => void;
  onOpenSettingsFile: () => void;
  version: string;
}

function Sidebar({ activeSection, onSelect, onOpenSettingsFile, version }: SidebarProps) {
  return (
    <div className="flex w-44 shrink-0 flex-col border-r border-ctp-surface0 bg-overlay-mantle">
      {/* Logo area */}
      <div className="flex items-center gap-2 border-b border-ctp-surface0 px-3 py-3">
        <Settings className="h-4 w-4 text-ctp-mauve" strokeWidth={1.5} />
        <span className="text-sm font-semibold text-ctp-text">Settings</span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 space-y-0.5 p-2" aria-label="Settings sections">
        <p className="mb-1 px-2 text-[10px] font-medium uppercase tracking-wider text-ctp-overlay0">
          Desktop
        </p>
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            role="button"
            aria-label={item.label}
            data-active={activeSection === item.id ? "true" : "false"}
            onClick={() => onSelect(item.id)}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
              activeSection === item.id
                ? "bg-ctp-surface0 text-ctp-text"
                : "text-ctp-subtext0 hover:bg-ctp-surface0 hover:text-ctp-text",
            )}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-ctp-surface0 p-2 space-y-1">
        <button
          role="button"
          aria-label="Open settings.json"
          onClick={onOpenSettingsFile}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-ctp-overlay1 transition-colors hover:bg-ctp-surface0 hover:text-ctp-text"
        >
          <ExternalLink className="h-3 w-3" strokeWidth={1.5} />
          Open settings.json
        </button>
        <div
          data-testid="settings-version-info"
          className="px-2 py-1 text-[10px] text-ctp-overlay0"
        >
          v{version}
        </div>
      </div>
    </div>
  );
}

// ─── VSCode-style Setting Item ───────────────────────────────────────────────

interface SettingItemProps {
  category: string;
  label: string;
  description: string;
  children: React.ReactNode;
}

function SettingItem({ category, label, description, children }: SettingItemProps) {
  return (
    <div className="border-b border-ctp-surface0/50 py-4 last:border-b-0">
      <p className="mb-0.5 text-sm text-ctp-subtext0">
        {category}: <span className="font-semibold text-ctp-text">{label}</span>
      </p>
      <p className="mb-2 text-xs text-ctp-overlay1">{description}</p>
      {children}
    </div>
  );
}

function SectionHeader({ title, icon }: { title: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 pb-3">
      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-ctp-surface0">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-ctp-text">{title}</h3>
    </div>
  );
}

// ─── Inputs ──────────────────────────────────────────────────────────────────

const inputClass =
  "h-7 w-72 rounded-sm border border-ctp-surface1 bg-overlay-mantle px-2 text-sm text-ctp-text placeholder-ctp-overlay0 focus:border-ctp-mauve focus:outline-none";

const numberInputClass =
  "h-7 w-24 rounded-sm border border-ctp-surface1 bg-overlay-mantle px-2 text-sm text-ctp-text focus:border-ctp-mauve focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

// ─── Appearance Section ───────────────────────────────────────────────────────

interface AppearanceSectionProps {
  settings: UserSettings;
  onSave: (settings: UserSettings) => void;
}

function AppearanceSection({ settings, onSave }: AppearanceSectionProps) {
  const [localSettings, setLocalSettings] = useState(settings);
  const [lineHeightText, setLineHeightText] = useState(
    String(settings.editor.lineHeight ?? 1.5),
  );
  const [opacityText, setOpacityText] = useState(
    String(settings.window.opacity),
  );
  const { activeThemeId, setActiveTheme } = useThemeStore();
  const allThemes = useThemeStore.getState().getAllThemes();

  useEffect(() => {
    setLocalSettings(settings);
    setLineHeightText(String(settings.editor.lineHeight ?? 1.5));
    setOpacityText(String(settings.window.opacity));
  }, [settings]);

  function update(partial: Partial<UserSettings>) {
    const updated = { ...localSettings, ...partial };
    setLocalSettings(updated);
    onSave(updated);
  }

  return (
    <div data-testid="settings-section-appearance">
      <SettingItem
        category="Appearance"
        label="Theme"
        description="Color theme for the entire application."
      >
        <select
          value={activeThemeId}
          onChange={(e) => {
            setActiveTheme(e.target.value);
            update({
              theme: { ...localSettings.theme, active: e.target.value },
            });
          }}
          aria-label="Theme"
          className={cn(inputClass, "w-56")}
        >
          {allThemes.map((theme) => (
            <option key={theme.id} value={theme.id}>
              {theme.name} ({theme.type})
            </option>
          ))}
        </select>
      </SettingItem>

      <SettingItem
        category="App"
        label="Font Family"
        description="Font used across the app interface."
      >
        <input
          type="text"
          value={localSettings.app.fontFamily}
          onChange={(e) => update({ app: { ...localSettings.app, fontFamily: e.target.value } })}
          placeholder="Geist Sans, Inter, system-ui"
          aria-label="App font family"
          className={inputClass}
        />
      </SettingItem>

      <SettingItem
        category="App"
        label="Font Size"
        description="App interface font size in pixels."
      >
        <input
          type="number"
          value={localSettings.app.fontSize}
          min={8}
          max={32}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (v >= 8 && v <= 32) update({ app: { ...localSettings.app, fontSize: v } });
          }}
          aria-label="App font size"
          className={numberInputClass}
        />
      </SettingItem>

      <SettingItem
        category="Editor"
        label="Font Family"
        description="Font used in the code editor and preview."
      >
        <input
          type="text"
          value={localSettings.editor.fontFamily}
          onChange={(e) => update({ editor: { ...localSettings.editor, fontFamily: e.target.value } })}
          placeholder="JetBrains Mono, Fira Code, monospace"
          aria-label="Editor font family"
          className={inputClass}
        />
      </SettingItem>

      <SettingItem
        category="Editor"
        label="Font Size"
        description="Editor font size in pixels."
      >
        <input
          type="number"
          value={localSettings.editor.fontSize}
          min={8}
          max={32}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (v >= 8 && v <= 32) update({ editor: { ...localSettings.editor, fontSize: v } });
          }}
          aria-label="Editor font size"
          className={numberInputClass}
        />
      </SettingItem>

      <SettingItem
        category="Editor"
        label="Line Height"
        description="Editor line height multiplier (1.0 to 3.0)."
      >
        <input
          type="text"
          inputMode="decimal"
          value={lineHeightText}
          onChange={(e) => {
            const raw = e.target.value.replace(",", ".");
            if (/^[0-9]*\.?[0-9]*$/.test(raw)) {
              setLineHeightText(raw);
            }
          }}
          onBlur={() => {
            const v = parseFloat(lineHeightText);
            if (!isNaN(v) && v >= 1.0 && v <= 3.0) {
              const rounded = Math.round(v * 10) / 10;
              setLineHeightText(String(rounded));
              update({ editor: { ...localSettings.editor, lineHeight: rounded } });
            } else {
              setLineHeightText(String(localSettings.editor.lineHeight ?? 1.5));
            }
          }}
          aria-label="Editor line height"
          className={numberInputClass}
        />
      </SettingItem>

      <SettingItem
        category="Terminal"
        label="Font Family"
        description="Font used in the integrated terminal."
      >
        <input
          type="text"
          value={localSettings.terminal.fontFamily}
          onChange={(e) => update({ terminal: { ...localSettings.terminal, fontFamily: e.target.value } })}
          placeholder="JetBrains Mono, Fira Code, monospace"
          aria-label="Terminal font family"
          className={inputClass}
        />
      </SettingItem>

      <SettingItem
        category="Terminal"
        label="Font Size"
        description="Terminal font size in pixels."
      >
        <input
          type="number"
          value={localSettings.terminal.fontSize}
          min={8}
          max={32}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (v >= 8 && v <= 32) update({ terminal: { ...localSettings.terminal, fontSize: v } });
          }}
          aria-label="Terminal font size"
          className={numberInputClass}
        />
      </SettingItem>

      <SettingItem
        category="Window"
        label="Opacity"
        description="Background opacity. Value between 0.3 and 1.0."
      >
        <input
          type="number"
          value={opacityText}
          min={0.3}
          max={1}
          step={0.01}
          onChange={(e) => {
            setOpacityText(e.target.value);
            const v = Number(e.target.value);
            if (!Number.isNaN(v) && v >= 0.3 && v <= 1.0) {
              update({ window: { ...localSettings.window, opacity: v } });
            }
          }}
          aria-label="Window opacity"
          className={numberInputClass}
        />
      </SettingItem>

      <SettingItem
        category="Window"
        label="Zoom Level"
        description="Global interface zoom level. Each increment above or below 0 represents 20% larger or smaller."
      >
        <input
          type="number"
          value={localSettings.window.zoomLevel}
          min={-5}
          max={5}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (v >= -5 && v <= 5) update({ window: { ...localSettings.window, zoomLevel: v } });
          }}
          aria-label="Zoom level"
          className={numberInputClass}
        />
      </SettingItem>
    </div>
  );
}

// ─── Shortcuts Section ────────────────────────────────────────────────────────

const isMac = typeof navigator !== "undefined" && navigator.userAgent.includes("Mac");
const mod = isMac ? "\u2318" : "Ctrl";

const SHORTCUTS = [
  { label: "Open Settings", keys: [mod, ","] },
  { label: "New Session", keys: [mod, "Shift", "T"] },
  { label: "Close Tab", keys: [mod, "Shift", "W"] },
  { label: "Close File Preview", keys: [mod, "W"] },
  { label: "Switch Tab 1-9", keys: [mod, "1-9"] },
  { label: "File Search", keys: [mod, "P"] },
  { label: "Command Palette", keys: [mod, "Shift", "P"] },
  { label: "Open Project", keys: [mod, "Shift", "O"] },
  { label: "Toggle Sidebar", keys: [mod, "Shift", "B"] },
  { label: "Toggle Preview", keys: [mod, "E"] },
  { label: "Toggle Terminal", keys: [mod, "J"] },
  { label: "Keyboard Shortcuts", keys: [mod, "?"] },
  { label: "Zoom In (Terminal)", keys: [mod, "Alt", "="] },
  { label: "Zoom Out (Terminal)", keys: [mod, "Alt", "-"] },
  { label: "Reset Zoom (Terminal)", keys: [mod, "Alt", "0"] },
];

function ShortcutsSection() {
  return (
    <div data-testid="settings-section-shortcuts">
      <SectionHeader
        title="Keyboard Shortcuts"
        icon={<Keyboard className="h-3.5 w-3.5 text-ctp-mauve" strokeWidth={1.5} />}
      />
      <div className="divide-y divide-ctp-surface0 rounded-lg border border-ctp-surface0 bg-overlay-mantle">
        {SHORTCUTS.map((shortcut) => (
          <div
            key={shortcut.label}
            className="flex items-center justify-between px-4 py-2.5"
          >
            <span className="text-sm text-ctp-subtext0">{shortcut.label}</span>
            <span className="flex items-center gap-1">
              {shortcut.keys.map((key, i) => (
                <span key={i} className="flex items-center gap-1">
                  {i > 0 && (
                    <span className="text-[11px] text-ctp-surface1">+</span>
                  )}
                  <kbd className="inline-flex min-w-6 items-center justify-center rounded bg-ctp-surface0 px-1.5 py-0.5 font-mono text-[11px] text-ctp-overlay1">
                    {key}
                  </kbd>
                </span>
              ))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Sessions Section ─────────────────────────────────────────────────────────

interface SessionsSectionProps {
  settings: UserSettings;
  onSave: (settings: UserSettings) => void;
}

function SessionsSection({ settings, onSave }: SessionsSectionProps) {
  const [localSessions, setLocalSessions] = useState(settings.sessions);

  useEffect(() => {
    setLocalSessions(settings.sessions);
  }, [settings.sessions]);

  function updateArgs(sessionName: string, argsString: string) {
    const args = argsString
      .split(" ")
      .map((a) => a.trim())
      .filter(Boolean);
    const updated = {
      ...localSessions,
      [sessionName]: { ...localSessions[sessionName], args },
    };
    setLocalSessions(updated);
    onSave({ ...settings, sessions: updated });
  }

  const sessionEntries = Object.entries(localSessions);

  return (
    <div data-testid="settings-section-sessions">
      <SectionHeader
        title="CLI Sessions"
        icon={<Terminal className="h-3.5 w-3.5 text-ctp-mauve" strokeWidth={1.5} />}
      />
      <div className="space-y-3">
        {sessionEntries.map(([name, config]) => (
          <div
            key={name}
            className="rounded-lg border border-ctp-surface0 bg-overlay-mantle p-4"
          >
            <div className="mb-3 flex items-center gap-2">
              <span className="font-mono text-sm font-medium text-ctp-text">
                {name}
              </span>
            </div>
            <div className="space-y-2">
              <div>
                <label
                  htmlFor={`session-args-${name}`}
                  className="mb-1 block text-xs text-ctp-overlay1"
                >
                  Extra arguments
                </label>
                <input
                  id={`session-args-${name}`}
                  type="text"
                  value={(config.args ?? []).join(" ")}
                  onChange={(e) => updateArgs(name, e.target.value)}
                  placeholder="--arg1 --arg2"
                  className="h-7 w-full rounded-md border border-ctp-surface0 bg-overlay-base px-2 font-mono text-xs text-ctp-text placeholder-ctp-overlay0 focus:border-ctp-mauve focus:outline-none"
                />
              </div>
            </div>
          </div>
        ))}
        {sessionEntries.length === 0 && (
          <div className="rounded-lg border border-ctp-surface0 bg-overlay-mantle px-4 py-8 text-center">
            <p className="text-sm text-ctp-overlay1">No sessions configured</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Performance Section ──────────────────────────────────────────────────────

function PerformanceSection({ settings, onSave }: { settings: UserSettings; onSave: (s: UserSettings) => void }) {
  const resolved = usePerformanceStore((s) => s.resolved);

  return (
    <div data-testid="settings-section-performance">
      <SectionHeader
        title="Performance"
        icon={<Monitor className="h-3.5 w-3.5 text-ctp-mauve" strokeWidth={1.5} />}
      />

      <SettingItem
        category="Performance"
        label="Mode"
        description="Controls resource usage. Auto detects your hardware and adjusts accordingly. Lite reduces GPU, metrics, watchers, and hibernates inactive tabs."
      >
        <select
          value={settings.performance.mode}
          onChange={(e) => {
            const mode = e.target.value as "auto" | "full" | "lite";
            onSave({ ...settings, performance: { mode } });
          }}
          aria-label="Performance mode"
          className={cn(inputClass, "w-56")}
        >
          <option value="auto">Auto (detect hardware)</option>
          <option value="full">Full (all features enabled)</option>
          <option value="lite">Lite (reduced resources)</option>
        </select>
      </SettingItem>

      {resolved === "lite" && (
        <div className="mt-3 rounded-md border border-ctp-yellow/20 bg-ctp-yellow/5 p-3">
          <p className="text-xs text-ctp-yellow">
            Lite mode is active. GPU acceleration is disabled, metrics polling is reduced,
            file watchers are shallow, and inactive tabs will be hibernated after 60 seconds.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Main Dialog ──────────────────────────────────────────────────────────────

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>("appearance");
  const [version, setVersion] = useState("...");

  const settings = useUserSettingsStore((s) => s.settings);
  const saveEditorContent = useUserSettingsStore((s) => s.saveEditorContent);
  const setEditorContent = useUserSettingsStore((s) => s.setEditorContent);

  useEffect(() => {
    if (open) {
      getVersion()
        .then(setVersion)
        .catch(() => setVersion("0.0.0"));
    }
  }, [open]);

  async function handleSaveSettings(updated: UserSettings) {
    const content = JSON.stringify(updated, null, 2);
    setEditorContent(content);
    await saveEditorContent();
  }

  async function handleOpenSettingsFile() {
    onOpenChange(false);
    try {
      const settingsPath = await invoke<string>("get_settings_path");
      if (settingsPath) {
        const filePreview = useFilePreviewStore.getState();
        await filePreview.loadFile(settingsPath);
        filePreview.setEditing(true);
      }
    } catch {
      // Fallback: do nothing if path cannot be retrieved
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="h-[80vh] gap-0 overflow-hidden border-ctp-surface0 bg-overlay-base p-0 sm:max-w-[900px]"
      >
        <DialogTitle className="sr-only">Settings</DialogTitle>
        <DialogDescription className="sr-only">
          Forja application settings
        </DialogDescription>

        <div className="flex h-full overflow-hidden">
          {/* Sidebar */}
          <Sidebar
            activeSection={activeSection}
            onSelect={setActiveSection}
            onOpenSettingsFile={handleOpenSettingsFile}
            version={version}
          />

          {/* Content area */}
          <div className="flex min-w-0 flex-1 flex-col">
            {/* Header */}
            <div className="flex h-11 shrink-0 items-center justify-between border-b border-ctp-surface0 px-5">
              <span className="text-sm font-semibold text-ctp-text">
                {NAV_ITEMS.find((i) => i.id === activeSection)?.label ?? "Settings"}
              </span>
              <button
                onClick={() => onOpenChange(false)}
                aria-label="Close"
                className="flex h-7 w-7 items-center justify-center rounded-md text-ctp-overlay1 transition-colors hover:bg-ctp-surface0 hover:text-ctp-text"
              >
                <X className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>

            {/* Section content */}
            <div className="flex-1 overflow-y-auto p-5">
              {activeSection === "appearance" && (
                <AppearanceSection
                  settings={settings}
                  onSave={handleSaveSettings}
                />
              )}
              {activeSection === "shortcuts" && <ShortcutsSection />}
              {activeSection === "sessions" && (
                <SessionsSection
                  settings={settings}
                  onSave={handleSaveSettings}
                />
              )}
              {activeSection === "context" && <ContextSection />}
              {activeSection === "performance" && (
                <PerformanceSection
                  settings={settings}
                  onSave={handleSaveSettings}
                />
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
