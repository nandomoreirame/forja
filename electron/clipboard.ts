import { clipboard } from "electron";
import * as fs from "node:fs/promises";
import * as path from "node:path";

export async function saveClipboardImage(
  targetDir: string,
  filename?: string
): Promise<string | null> {
  const image = clipboard.readImage();
  if (image.isEmpty()) return null;

  const name = filename || `screenshot-${Date.now()}.png`;
  const filePath = path.join(targetDir, name);
  const buffer = image.toPNG();
  await fs.writeFile(filePath, buffer);
  return filePath;
}
