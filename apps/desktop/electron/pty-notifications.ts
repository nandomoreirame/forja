import * as path from "path";
import { execFile } from "child_process";
import { Notification } from "electron";

interface SessionReadyInfo {
  projectPath: string;
  sessionType: string;
  activeProjectPath: string | null;
  summary?: string;
}

interface NotificationData {
  title: string;
  body: string;
}

/**
 * Strips ANSI escape codes, OSC sequences, collapses whitespace,
 * and extracts the last meaningful lines from raw PTY output.
 */
export function extractNotificationSummary(raw: string, maxLength = 200): string {
  if (!raw) return "";

  // Strip OSC sequences (hyperlinks, window titles, etc.)
  let cleaned = raw.replace(/\x1b\][\s\S]*?(?:\x07|\x1b\\)/g, "");
  // Strip CSI sequences (colors, cursor movement, etc.)
  cleaned = cleaned.replace(/\x1b\[[0-9;]*[A-Za-z]/g, "");
  // Strip any remaining escape sequences
  cleaned = cleaned.replace(/\x1b[^[\]].?/g, "");
  // Collapse multiple spaces
  cleaned = cleaned.replace(/ {2,}/g, " ");

  // Split into lines, filter empty/whitespace-only
  const lines = cleaned.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return "";

  // Take last few meaningful lines, join with space
  const tail = lines.slice(-5);
  let result = tail.join(" ");

  if (result.length > maxLength) {
    result = result.slice(0, maxLength - 3) + "...";
  }

  return result;
}

/**
 * Pure function that builds notification data for a completed session.
 */
export function buildSessionFinishedNotification(info: SessionReadyInfo): NotificationData {
  const projectName = path.basename(info.projectPath);
  const sessionName = info.sessionType.charAt(0).toUpperCase() + info.sessionType.slice(1);

  const body = info.summary?.trim()
    ? info.summary
    : `${sessionName} finished with new output.`;

  return {
    title: `Forja — ${projectName}`,
    body,
  };
}

function showNotificationLinux(data: NotificationData): void {
  execFile(
    "notify-send",
    ["--app-name=Forja", "--expire-time=5000", data.title, data.body],
    (err) => {
      if (err) {
        console.warn("[pty-notifications] notify-send failed:", err);
      }
    },
  );
}

function showNotificationElectron(
  data: NotificationData,
  info: SessionReadyInfo,
  mainWindow: Electron.BrowserWindow | null,
): boolean {
  try {
    if (!Notification.isSupported()) return false;

    const notification = new Notification({
      title: data.title,
      body: data.body,
      silent: false,
    });

    notification.on("click", () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
        mainWindow.webContents.send("project:focus-requested", {
          projectPath: info.projectPath,
        });
      }
    });

    notification.show();
    return true;
  } catch (err) {
    console.warn("[pty-notifications] Electron notification failed:", err);
    return false;
  }
}

/**
 * Shows a native notification when an AI session finishes with new output.
 * Suppresses notifications only when the app is focused on the same project.
 */
export function showSessionFinishedNotification(
  info: SessionReadyInfo,
  mainWindow: Electron.BrowserWindow | null,
): void {
  if (mainWindow?.isFocused() && info.activeProjectPath === info.projectPath) return;

  const data = buildSessionFinishedNotification(info);

  if (process.platform === "linux") {
    if (!showNotificationElectron(data, info, mainWindow)) {
      showNotificationLinux(data);
    }
  } else {
    showNotificationElectron(data, info, mainWindow);
  }
}
