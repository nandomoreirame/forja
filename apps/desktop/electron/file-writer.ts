import * as fs from "fs/promises";
import * as path from "path";

const UNIX_FORBIDDEN = ["/etc", "/usr", "/bin", "/sbin", "/var", "/sys", "/proc"];
const WIN_FORBIDDEN = [
  "C:\\Windows",
  "C:\\Program Files",
  "C:\\Program Files (x86)",
  "C:\\ProgramData",
];

export function getForbiddenPrefixes(): string[] {
  return process.platform === "win32" ? WIN_FORBIDDEN : UNIX_FORBIDDEN;
}

export async function writeFile(filePath: string, content: string): Promise<void> {
  const resolved = path.resolve(filePath);
  const normalized = path.normalize(resolved);

  if (normalized !== resolved) {
    throw new Error(`Invalid file path: ${filePath}`);
  }

  for (const prefix of getForbiddenPrefixes()) {
    if (normalized.startsWith(prefix + path.sep) || normalized === prefix) {
      throw new Error(`Cannot write to system path: ${normalized}`);
    }
  }

  await fs.writeFile(normalized, content, "utf-8");
}
