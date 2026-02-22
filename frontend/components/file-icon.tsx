import {
  Folder,
  FolderOpen,
  FileCode,
  FileJson,
  FileText,
  File,
  FileImage,
  FileArchive,
  type LucideIcon,
} from "lucide-react";

interface FileIconProps {
  isDir: boolean;
  extension?: string | null;
  isOpen?: boolean;
  className?: string;
}

const extensionIconMap: Record<string, { icon: LucideIcon; color: string }> = {
  // TypeScript/JavaScript
  ts: { icon: FileCode, color: "text-blue-400" },
  tsx: { icon: FileCode, color: "text-blue-400" },
  js: { icon: FileCode, color: "text-yellow-400" },
  jsx: { icon: FileCode, color: "text-yellow-400" },
  mjs: { icon: FileCode, color: "text-yellow-400" },
  cjs: { icon: FileCode, color: "text-yellow-400" },

  // Config/Data
  json: { icon: FileJson, color: "text-yellow-500" },
  toml: { icon: FileText, color: "text-orange-400" },
  yaml: { icon: FileText, color: "text-red-400" },
  yml: { icon: FileText, color: "text-red-400" },
  xml: { icon: FileText, color: "text-orange-300" },
  csv: { icon: FileText, color: "text-green-400" },

  // Rust
  rs: { icon: FileCode, color: "text-orange-500" },

  // Markdown
  md: { icon: FileText, color: "text-blue-300" },
  mdx: { icon: FileText, color: "text-blue-300" },

  // Web
  html: { icon: FileCode, color: "text-orange-400" },
  css: { icon: FileCode, color: "text-blue-500" },
  scss: { icon: FileCode, color: "text-pink-400" },

  // Images
  png: { icon: FileImage, color: "text-green-400" },
  jpg: { icon: FileImage, color: "text-green-400" },
  jpeg: { icon: FileImage, color: "text-green-400" },
  svg: { icon: FileImage, color: "text-yellow-400" },
  gif: { icon: FileImage, color: "text-green-400" },
  ico: { icon: FileImage, color: "text-green-400" },
  webp: { icon: FileImage, color: "text-green-400" },

  // Archives
  zip: { icon: FileArchive, color: "text-yellow-600" },
  tar: { icon: FileArchive, color: "text-yellow-600" },
  gz: { icon: FileArchive, color: "text-yellow-600" },

  // Shell/Config
  sh: { icon: FileCode, color: "text-green-500" },
  bash: { icon: FileCode, color: "text-green-500" },
  zsh: { icon: FileCode, color: "text-green-500" },
  env: { icon: FileText, color: "text-yellow-600" },

  // Python
  py: { icon: FileCode, color: "text-yellow-300" },

  // Go
  go: { icon: FileCode, color: "text-cyan-400" },

  // Lock files
  lock: { icon: FileText, color: "text-ctp-overlay1" },
};

export function FileIcon({
  isDir,
  extension,
  isOpen = false,
  className = "",
}: FileIconProps) {
  if (isDir) {
    const Icon = isOpen ? FolderOpen : Folder;
    return (
      <Icon
        className={`h-4 w-4 text-ctp-overlay1 ${className}`}
        strokeWidth={1.5}
      />
    );
  }

  const iconConfig = extension
    ? extensionIconMap[extension.toLowerCase()]
    : null;

  if (iconConfig) {
    const { icon: Icon, color } = iconConfig;
    return (
      <Icon
        className={`h-4 w-4 ${color} ${className}`}
        strokeWidth={1.5}
      />
    );
  }

  return (
    <File
      className={`h-4 w-4 text-ctp-overlay1 ${className}`}
      strokeWidth={1.5}
    />
  );
}
