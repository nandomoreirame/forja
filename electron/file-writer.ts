import * as fs from "fs/promises";
import * as path from "path";

const FORBIDDEN_PREFIXES = ["/etc", "/usr", "/bin", "/sbin", "/var", "/sys", "/proc"];

export async function writeFile(filePath: string, content: string): Promise<void> {
  const resolved = path.resolve(filePath);
  const normalized = path.normalize(resolved);

  if (normalized !== resolved) {
    throw new Error(`Invalid file path: ${filePath}`);
  }

  for (const prefix of FORBIDDEN_PREFIXES) {
    if (normalized.startsWith(prefix + "/") || normalized === prefix) {
      throw new Error(`Cannot write to system path: ${normalized}`);
    }
  }

  await fs.writeFile(normalized, content, "utf-8");
}
