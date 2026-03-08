import { useState, useEffect } from "react";
import {
  ExternalLink,
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
import { useFilePreviewStore } from "@/stores/file-preview";
import { getVersion } from "@/lib/ipc";
import { cn } from "@/lib/utils";
import type { UserSettings } from "@/lib/settings-types";

type SettingsSection = "appearance" | "shortcuts" | "sessions";

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
    label: "Aparência",
    icon: <Palette className="h-3.5 w-3.5" strokeWidth={1.5} />,
  },
  {
    id: "shortcuts",
    label: "Atalhos",
    icon: <Keyboard className="h-3.5 w-3.5" strokeWidth={1.5} />,
  },
  {
    id: "sessions",
    label: "Sessões",
    icon: <Terminal className="h-3.5 w-3.5" strokeWidth={1.5} />,
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
    <div className="flex w-44 shrink-0 flex-col border-r border-ctp-surface0 bg-ctp-mantle">
      {/* Logo area */}
      <div className="flex items-center gap-2 border-b border-ctp-surface0 px-3 py-3">
        <Settings className="h-4 w-4 text-ctp-mauve" strokeWidth={1.5} />
        <span className="text-sm font-semibold text-ctp-text">Configurações</span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 space-y-0.5 p-2" aria-label="Seções de configuração">
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
                : "text-ctp-subtext0 hover:bg-ctp-surface0/50 hover:text-ctp-text",
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
          aria-label="Abrir settings.json"
          onClick={onOpenSettingsFile}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-ctp-overlay1 transition-colors hover:bg-ctp-surface0 hover:text-ctp-text"
        >
          <ExternalLink className="h-3 w-3" strokeWidth={1.5} />
          Abrir settings.json
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

// ─── Inputs ──────────────────────────────────────────────────────────────────

const inputClass =
  "h-7 w-72 rounded-sm border border-ctp-surface1 bg-ctp-mantle px-2 text-sm text-ctp-text placeholder-ctp-overlay0 focus:border-ctp-mauve focus:outline-none";

const numberInputClass =
  "h-7 w-24 rounded-sm border border-ctp-surface1 bg-ctp-mantle px-2 text-sm text-ctp-text focus:border-ctp-mauve focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

// ─── Appearance Section ───────────────────────────────────────────────────────

interface AppearanceSectionProps {
  settings: UserSettings;
  onSave: (settings: UserSettings) => void;
}

function AppearanceSection({ settings, onSave }: AppearanceSectionProps) {
  const [localSettings, setLocalSettings] = useState(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  function update(partial: Partial<UserSettings>) {
    const updated = { ...localSettings, ...partial };
    setLocalSettings(updated);
    onSave(updated);
  }

  return (
    <div data-testid="settings-section-appearance">
      <SettingItem
        category="App"
        label="Font Family"
        description="Fonte usada nos elementos da interface."
      >
        <input
          type="text"
          value={localSettings.app.fontFamily}
          onChange={(e) => update({ app: { ...localSettings.app, fontFamily: e.target.value } })}
          placeholder="Geist Sans, Inter, system-ui"
          aria-label="Fonte da interface"
          className={inputClass}
        />
      </SettingItem>

      <SettingItem
        category="App"
        label="Font Size"
        description="Tamanho da fonte da interface em pixels."
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
          aria-label="Tamanho da fonte da interface"
          className={numberInputClass}
        />
      </SettingItem>

      <SettingItem
        category="Editor"
        label="Font Family"
        description="Fonte usada no editor de código e preview."
      >
        <input
          type="text"
          value={localSettings.editor.fontFamily}
          onChange={(e) => update({ editor: { ...localSettings.editor, fontFamily: e.target.value } })}
          placeholder="JetBrains Mono, Fira Code, monospace"
          aria-label="Fonte do editor"
          className={inputClass}
        />
      </SettingItem>

      <SettingItem
        category="Editor"
        label="Font Size"
        description="Tamanho da fonte do editor em pixels."
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
          aria-label="Tamanho da fonte do editor"
          className={numberInputClass}
        />
      </SettingItem>

      <SettingItem
        category="Terminal"
        label="Font Family"
        description="Fonte usada no terminal integrado."
      >
        <input
          type="text"
          value={localSettings.terminal.fontFamily}
          onChange={(e) => update({ terminal: { ...localSettings.terminal, fontFamily: e.target.value } })}
          placeholder="JetBrains Mono, Fira Code, monospace"
          aria-label="Fonte do terminal"
          className={inputClass}
        />
      </SettingItem>

      <SettingItem
        category="Terminal"
        label="Font Size"
        description="Tamanho da fonte do terminal em pixels."
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
          aria-label="Tamanho da fonte do terminal"
          className={numberInputClass}
        />
      </SettingItem>

      <SettingItem
        category="Window"
        label="Opacity"
        description="Opacidade da janela principal. Valor entre 30 e 100."
      >
        <input
          type="number"
          value={Math.round(localSettings.window.opacity * 100)}
          min={30}
          max={100}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (v >= 30 && v <= 100) update({ window: { ...localSettings.window, opacity: v / 100 } });
          }}
          aria-label="Opacidade da janela"
          className={numberInputClass}
        />
      </SettingItem>

      <SettingItem
        category="Window"
        label="Zoom Level"
        description="Nível de zoom global da interface. Cada incremento acima de 0 ou abaixo representa 20% maior ou menor."
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
  { label: "Abrir Configurações", keys: [mod, ","] },
  { label: "Nova Sessão", keys: [mod, "T"] },
  { label: "Fechar Aba", keys: [mod, "W"] },
  { label: "Busca de Arquivo", keys: [mod, "P"] },
  { label: "Paleta de Comandos", keys: [mod, "Shift", "P"] },
  { label: "Abrir Projeto", keys: [mod, "O"] },
  { label: "Toggle Sidebar", keys: [mod, "B"] },
  { label: "Toggle Preview", keys: [mod, "E"] },
  { label: "Toggle Terminal", keys: [mod, "J"] },
  { label: "Atalhos de Teclado", keys: [mod, "?"] },
  { label: "Zoom In (Terminal)", keys: [mod, "Alt", "="] },
  { label: "Zoom Out (Terminal)", keys: [mod, "Alt", "-"] },
  { label: "Reset Zoom (Terminal)", keys: [mod, "Alt", "0"] },
];

function ShortcutsSection() {
  return (
    <div data-testid="settings-section-shortcuts">
      <SectionHeader
        title="Atalhos de Teclado"
        icon={<Keyboard className="h-3.5 w-3.5 text-ctp-mauve" strokeWidth={1.5} />}
      />
      <div className="divide-y divide-ctp-surface0 rounded-lg border border-ctp-surface0 bg-ctp-mantle">
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
        title="Sessões de CLI"
        icon={<Terminal className="h-3.5 w-3.5 text-ctp-mauve" strokeWidth={1.5} />}
      />
      <div className="space-y-3">
        {sessionEntries.map(([name, config]) => (
          <div
            key={name}
            className="rounded-lg border border-ctp-surface0 bg-ctp-mantle p-4"
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
                  Argumentos extras
                </label>
                <input
                  id={`session-args-${name}`}
                  type="text"
                  value={(config.args ?? []).join(" ")}
                  onChange={(e) => updateArgs(name, e.target.value)}
                  placeholder="--arg1 --arg2"
                  className="h-7 w-full rounded-md border border-ctp-surface0 bg-ctp-base px-2 font-mono text-xs text-ctp-text placeholder-ctp-overlay0 focus:border-ctp-mauve focus:outline-none"
                />
              </div>
            </div>
          </div>
        ))}
        {sessionEntries.length === 0 && (
          <div className="rounded-lg border border-ctp-surface0 bg-ctp-mantle px-4 py-8 text-center">
            <p className="text-sm text-ctp-overlay1">Nenhuma sessão configurada</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Dialog ──────────────────────────────────────────────────────────────

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>("appearance");
  const [version, setVersion] = useState("...");

  const settings = useUserSettingsStore((s) => s.settings);
  const openSettingsEditor = useUserSettingsStore((s) => s.openSettingsEditor);
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

  function handleOpenSettingsFile() {
    onOpenChange(false);
    useFilePreviewStore.getState().openPreview();
    openSettingsEditor();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="h-[80vh] gap-0 overflow-hidden border-ctp-surface0 bg-ctp-base p-0 sm:max-w-[900px]"
      >
        <DialogTitle className="sr-only">Configurações</DialogTitle>
        <DialogDescription className="sr-only">
          Configurações do aplicativo Forja
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
                {NAV_ITEMS.find((i) => i.id === activeSection)?.label ?? "Configurações"}
              </span>
              <button
                onClick={() => onOpenChange(false)}
                aria-label="Fechar"
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
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
