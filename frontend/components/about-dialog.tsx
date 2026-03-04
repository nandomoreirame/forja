import {
  Anvil,
  ArrowLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "./ui/dialog";

type AboutView = "home" | "details" | "credits" | "legal";

interface AboutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

async function openExternal(url: string) {
  try {
    const { openUrl } = await import("@/lib/ipc");
    await openUrl(url);
  } catch {
    window.open(url, "_blank");
  }
}

interface SubViewHeaderProps {
  title: string;
  onBack: () => void;
}

function SubViewHeader({ title, onBack }: SubViewHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b border-ctp-surface0 px-3 py-2.5">
      <button
        onClick={onBack}
        aria-label="Back"
        className="flex h-8 w-8 items-center justify-center rounded-md text-ctp-overlay1 transition-colors hover:bg-ctp-surface0 hover:text-ctp-text"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
      </button>
      <span className="text-sm font-medium text-ctp-text">{title}</span>
      <DialogClose asChild>
        <button
          aria-label="Close"
          className="flex h-8 w-8 items-center justify-center rounded-md text-ctp-overlay1 transition-colors hover:bg-ctp-surface0 hover:text-ctp-text"
        >
          <span className="text-lg leading-none">&times;</span>
        </button>
      </DialogClose>
    </div>
  );
}

interface MenuItemProps {
  label: string;
  icon: "chevron" | "external";
  onClick: () => void;
}

function MenuItem({ label, icon, onClick }: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between px-4 py-3 text-sm text-ctp-text transition-colors hover:bg-ctp-surface1"
    >
      <span>{label}</span>
      {icon === "external" ? (
        <ExternalLink className="h-3.5 w-3.5 text-ctp-overlay1" strokeWidth={1.5} />
      ) : (
        <ChevronRight className="h-3.5 w-3.5 text-ctp-overlay1" strokeWidth={1.5} />
      )}
    </button>
  );
}

interface InfoRowProps {
  label: string;
  value: string;
}

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <span className="text-sm text-ctp-subtext0">{label}</span>
      <span className="font-mono text-sm text-ctp-text">{value}</span>
    </div>
  );
}

interface AppInfo {
  name: string;
  version: string;
  electronVersion: string;
  os: string;
  platform: string;
}

function HomeView({
  appInfo,
  onNavigate,
}: {
  appInfo: AppInfo;
  onNavigate: (view: AboutView) => void;
}) {
  return (
    <div className="flex flex-col items-center px-5 py-6">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-ctp-mauve/15">
        <Anvil className="h-10 w-10 text-ctp-mauve" strokeWidth={1.5} />
      </div>

      <h2 className="mt-4 text-xl font-semibold text-ctp-text">
        {appInfo.name}
      </h2>
      <p className="mt-1 text-sm text-ctp-overlay1">
        A dedicated desktop client for vibe coders
      </p>

      <span className="mt-3 rounded-full bg-ctp-surface0 px-3 py-1 font-mono text-xs text-ctp-subtext0">
        {__APP_VERSION__}
      </span>

      <div className="mt-6 w-full space-y-2">
        <div className="overflow-hidden rounded-lg bg-ctp-surface0">
          <MenuItem
            label="Details"
            icon="chevron"
            onClick={() => onNavigate("details")}
          />
        </div>

        <div className="overflow-hidden rounded-lg bg-ctp-surface0">
          <MenuItem
            label="Send feedback"
            icon="external"
            onClick={() =>
              openExternal("https://github.com/nandomoreirame/forja/issues")
            }
          />
        </div>

        <div className="divide-y divide-ctp-base/30 overflow-hidden rounded-lg bg-ctp-surface0">
          <MenuItem
            label="Credits"
            icon="chevron"
            onClick={() => onNavigate("credits")}
          />
          <MenuItem
            label="Legal info"
            icon="chevron"
            onClick={() => onNavigate("legal")}
          />
        </div>
      </div>
    </div>
  );
}

function DetailsView({
  appInfo,
  onBack,
}: {
  appInfo: AppInfo;
  onBack: () => void;
}) {
  return (
    <>
      <SubViewHeader title="Details" onBack={onBack} />
      <div className="px-5 py-4">
        <div className="divide-y divide-ctp-base/30 overflow-hidden rounded-lg bg-ctp-surface0">
          <InfoRow label="Version" value={__APP_VERSION__} />
          <InfoRow label="Electron Version" value={appInfo.electronVersion || "N/A"} />
          <InfoRow label="OS" value={appInfo.os || "Unknown"} />
          <InfoRow label="Platform" value={appInfo.platform || "Unknown"} />
        </div>
      </div>
    </>
  );
}

function CreditsView({ onBack }: { onBack: () => void }) {
  return (
    <>
      <SubViewHeader title="Credits" onBack={onBack} />
      <div className="space-y-4 px-5 py-4">
        <div>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-ctp-overlay0">
            Created by
          </h3>
          <div className="overflow-hidden rounded-lg bg-ctp-surface0">
            <button
              onClick={() =>
                openExternal("https://github.com/nandomoreirame")
              }
              className="flex w-full items-center justify-between px-4 py-3 text-sm text-ctp-text transition-colors hover:bg-ctp-surface1"
            >
              <span>Fernando Moreira</span>
              <ExternalLink
                className="h-3.5 w-3.5 text-ctp-overlay1"
                strokeWidth={1.5}
              />
            </button>
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-ctp-overlay0">
            Built with
          </h3>
          <div className="divide-y divide-ctp-base/30 overflow-hidden rounded-lg bg-ctp-surface0">
            {["Electron", "React", "TypeScript", "xterm.js"].map((tech) => (
              <div
                key={tech}
                className="px-4 py-2.5 text-sm text-ctp-subtext0"
              >
                {tech}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function LegalView({ onBack }: { onBack: () => void }) {
  return (
    <>
      <SubViewHeader title="Legal info" onBack={onBack} />
      <div className="space-y-2 px-5 py-4">
        <div className="overflow-hidden rounded-lg bg-ctp-surface0 px-4 py-3">
          <p className="text-sm text-ctp-subtext0">
            Copyright 2025-2026 Fernando Moreira
          </p>
        </div>

        <div className="overflow-hidden rounded-lg bg-ctp-surface0">
          <button
            onClick={() =>
              openExternal(
                "https://github.com/nandomoreirame/forja/blob/main/LICENSE"
              )
            }
            className="flex w-full items-center justify-between px-4 py-3 text-sm text-ctp-text transition-colors hover:bg-ctp-surface1"
          >
            <span>MIT License</span>
            <ExternalLink
              className="h-3.5 w-3.5 text-ctp-overlay1"
              strokeWidth={1.5}
            />
          </button>
        </div>

        <div className="overflow-hidden rounded-lg bg-ctp-surface0 px-4 py-3">
          <p className="text-xs leading-relaxed text-ctp-overlay1">
            This software is provided &quot;as is&quot;, without warranty of any
            kind, express or implied.
          </p>
        </div>
      </div>
    </>
  );
}

export function AboutDialog({ open, onOpenChange }: AboutDialogProps) {
  const [view, setView] = useState<AboutView>("home");
  const [appInfo, setAppInfo] = useState<AppInfo>({
    name: "Forja",
    version: "0.1.0",
    electronVersion: "",
    os: "",
    platform: "",
  });

  useEffect(() => {
    async function loadInfo() {
      try {
        const { getName, getVersion, getElectronVersion } = await import(
          "@/lib/ipc"
        );
        const [name, version, electronVersion] = await Promise.all([
          getName(),
          getVersion(),
          getElectronVersion(),
        ]);
        const displayName = name === "Electron" ? "Forja" : name;

        const os = navigator.platform;
        const platform = navigator.userAgent;
        setAppInfo({
          name: displayName,
          version,
          electronVersion,
          os,
          platform,
        });
      } catch {
        setAppInfo((prev) => ({
          ...prev,
          os: navigator.platform,
          platform: navigator.userAgent,
        }));
      }
    }
    if (open) {
      setView("home");
      loadInfo();
    }
  }, [open]);

  const goHome = () => setView("home");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-105 gap-0 overflow-hidden border-ctp-surface0 bg-ctp-base p-0"
      >
        <DialogTitle className="sr-only">About Forja</DialogTitle>
        <DialogDescription className="sr-only">
          Application information and credits
        </DialogDescription>

        {view === "home" && (
          <HomeView appInfo={appInfo} onNavigate={setView} />
        )}
        {view === "details" && (
          <DetailsView appInfo={appInfo} onBack={goHome} />
        )}
        {view === "credits" && <CreditsView onBack={goHome} />}
        {view === "legal" && <LegalView onBack={goHome} />}
      </DialogContent>
    </Dialog>
  );
}
