import * as fs from "fs";
import * as path from "path";

const BUFFERS_DIR = "buffers";

export const MAX_BUFFER_SIZE = 512 * 1024; // 512KB per tab

export function getBufferDir(projectPath: string): string {
  return path.join(projectPath, ".forja", BUFFERS_DIR);
}

export function sanitizeTabId(tabId: string): string {
  return tabId.replace(/[^a-zA-Z0-9_-]/g, "_");
}

export function saveBuffer(projectPath: string, tabId: string, content: string): void {
  const dir = getBufferDir(projectPath);
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${sanitizeTabId(tabId)}.buf`);
  fs.writeFileSync(filePath, content, "utf-8");
}

export function loadBuffer(projectPath: string, tabId: string): string | null {
  try {
    const filePath = path.join(getBufferDir(projectPath), `${sanitizeTabId(tabId)}.buf`);
    const content = fs.readFileSync(filePath, "utf-8");
    return content.length > MAX_BUFFER_SIZE ? content.slice(-MAX_BUFFER_SIZE) : content;
  } catch {
    return null;
  }
}

export function deleteBuffer(projectPath: string, tabId: string): void {
  try {
    fs.unlinkSync(path.join(getBufferDir(projectPath), `${sanitizeTabId(tabId)}.buf`));
  } catch {
    // ignore: file may not exist
  }
}

export function cleanStaleBuffers(projectPath: string, activeTabIds: string[]): void {
  try {
    const dir = getBufferDir(projectPath);
    if (!fs.existsSync(dir)) return;
    const activeSet = new Set(activeTabIds.map(sanitizeTabId));
    for (const file of fs.readdirSync(dir)) {
      if (file.endsWith(".buf") && !activeSet.has(file.replace(".buf", ""))) {
        try {
          fs.unlinkSync(path.join(dir, file));
        } catch {
          // ignore individual deletion errors
        }
      }
    }
  } catch {
    // ignore: directory may not exist or be unreadable
  }
}
