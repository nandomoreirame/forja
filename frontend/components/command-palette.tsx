import { useAppDialogsStore } from "@/stores/app-dialogs";
import { useCommandPaletteStore } from "@/stores/command-palette";
import { useUserSettingsStore } from "@/stores/user-settings";
import { useFilePreviewStore } from "@/stores/file-preview";
import { useFileTreeStore } from "@/stores/file-tree";
import { useTerminalTabsStore } from "@/stores/terminal-tabs";
import { flattenFileTree } from "@/lib/flatten-file-tree";
import {
  FolderOpen,
  Info,
  Keyboard,
  PanelLeft,
  PanelRight,
  Plus,
  Settings,
} from "lucide-react";
import { useMemo } from "react";
import { FileIcon } from "./file-icon";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "./ui/command";

import { MOD_KEY } from "@/lib/platform";
const mod = MOD_KEY;

export function CommandPalette() {
  const { isOpen, mode, close } = useCommandPaletteStore();
  const { tree, currentPath } = useFileTreeStore();

  const flatFiles = useMemo(() => {
    if (!tree || !currentPath) return [];
    return flattenFileTree(tree.root, currentPath);
  }, [tree, currentPath]);

  const handleFileSelect = (filePath: string) => {
    useFilePreviewStore.getState().loadFile(filePath);
    close();
  };

  const handleCommand = (command: string) => {
    switch (command) {
      case "new-session": {
        const cp = useFileTreeStore.getState().currentPath;
        if (cp) {
          const tabStore = useTerminalTabsStore.getState();
          const id = tabStore.nextTabId();
          tabStore.addTab(id, cp, "claude");
        }
        break;
      }
      case "open-project":
        useFileTreeStore.getState().openProject();
        break;
      case "toggle-sidebar":
        useFileTreeStore.getState().toggleSidebar();
        break;
      case "toggle-file-preview":
        useFilePreviewStore.getState().togglePreview();
        break;
      case "keyboard-shortcuts":
        useAppDialogsStore.getState().setShortcutsOpen(true);
        break;
      case "about":
        useAppDialogsStore.getState().setAboutOpen(true);
        break;
      case "open-settings":
        useUserSettingsStore.getState().openSettingsEditor();
        useFilePreviewStore.getState().openPreview();
        break;
    }
    close();
  };

  return (
    <CommandDialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <CommandInput
        placeholder={mode === "files" ? "Search files..." : "Type a command..."}
      />
      <CommandList>
        <CommandEmpty>
          {mode === "files" ? "No files found." : "No commands found."}
        </CommandEmpty>

        {mode === "files" && (
          <CommandGroup heading="Files">
            {flatFiles.map((file) => (
              <CommandItem
                key={file.path}
                value={file.relativePath}
                onSelect={() => handleFileSelect(file.path)}
              >
                <FileIcon
                  isDir={false}
                  extension={file.extension}
                />
                <span className="truncate">{file.relativePath}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {mode === "commands" && (
          <CommandGroup heading="Commands">
            <CommandItem
              value="New Session"
              onSelect={() => handleCommand("new-session")}
            >
              <Plus className="h-4 w-4" strokeWidth={1.5} />
              New Session
              <CommandShortcut>{mod}+T</CommandShortcut>
            </CommandItem>
            <CommandItem
              value="Open Project"
              onSelect={() => handleCommand("open-project")}
            >
              <FolderOpen className="h-4 w-4" strokeWidth={1.5} />
              Open Project
              <CommandShortcut>{mod}+O</CommandShortcut>
            </CommandItem>
            <CommandItem
              value="Toggle Sidebar"
              onSelect={() => handleCommand("toggle-sidebar")}
            >
              <PanelLeft className="h-4 w-4" strokeWidth={1.5} />
              Toggle Sidebar
              <CommandShortcut>{mod}+B</CommandShortcut>
            </CommandItem>
            <CommandItem
              value="Toggle File Preview"
              onSelect={() => handleCommand("toggle-file-preview")}
            >
              <PanelRight className="h-4 w-4" strokeWidth={1.5} />
              Toggle File Preview
              <CommandShortcut>{mod}+E</CommandShortcut>
            </CommandItem>
            <CommandItem
              value="Keyboard Shortcuts"
              onSelect={() => handleCommand("keyboard-shortcuts")}
            >
              <Keyboard className="h-4 w-4" strokeWidth={1.5} />
              Keyboard Shortcuts
              <CommandShortcut>{mod}+?</CommandShortcut>
            </CommandItem>
            <CommandItem
              value="Open Settings"
              onSelect={() => handleCommand("open-settings")}
            >
              <Settings className="h-4 w-4" strokeWidth={1.5} />
              Open Settings
              <CommandShortcut>{mod}+,</CommandShortcut>
            </CommandItem>
            <CommandItem
              value="About"
              onSelect={() => handleCommand("about")}
            >
              <Info className="h-4 w-4" strokeWidth={1.5} />
              About
            </CommandItem>
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
