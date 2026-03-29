import * as path from "path";
import { execFile } from "child_process";
import { Notification } from "electron";
import { stripAnsi, isNoiseLine, sendDiscordWebhook } from "./discord-notifications.js";
import { getCachedSettings } from "./user-settings.js";

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
 * Strips ANSI escape codes, filters terminal noise,
 * and extracts the last meaningful lines from raw PTY output.
 */
export function extractNotificationSummary(raw: string, maxLength = 200): string {
  if (!raw) return "";

  const cleaned = stripAnsi(raw);

  // Split into lines, filter empty/noise
  const lines = cleaned
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !isNoiseLine(l));
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
 * Shows a native OS notification.
 * On Linux: try notify-send first (reliable on Wayland), Electron as backup.
 * On macOS: use Electron.Notification (works well with native notification center).
 */
function showOsNotification(
  data: NotificationData,
  info: SessionReadyInfo,
  mainWindow: Electron.BrowserWindow | null,
): void {
  if (process.platform === "linux") {
    // notify-send is more reliable on Wayland (Hyprland, Sway, etc.)
    // Fall back to Electron.Notification only if notify-send fails.
    execFile(
      "notify-send",
      ["--app-name=Forja", "--expire-time=5000", data.title, data.body],
      (err) => {
        if (err) {
          console.warn("[pty-notifications] notify-send failed, falling back to Electron:", err.message);
          showNotificationElectron(data, info, mainWindow);
        }
      },
    );
  } else {
    showNotificationElectron(data, info, mainWindow);
  }
}

/**
 * Shows a native notification when an AI session produces new output.
 * OS notification: suppressed when focused on the same project.
 * Discord: ALWAYS sent (never suppressed by focus state).
 */
export function showSessionFinishedNotification(
  info: SessionReadyInfo,
  mainWindow: Electron.BrowserWindow | null,
): void {
  const data = buildSessionFinishedNotification(info);

  // OS notification: suppress only when focused on the same project
  const isFocusedOnSameProject =
    mainWindow?.isFocused() && info.activeProjectPath === info.projectPath;

  if (!isFocusedOnSameProject) {
    showOsNotification(data, info, mainWindow);
  }
}

// --- Discord integration ---

interface DiscordNotifyInfo {
  projectPath: string;
  sessionType: string;
  summary?: string;
}

/**
 * Sends a Discord webhook notification if configured.
 * NEVER suppressed by focus state — Discord always sends.
 */
export async function maybeNotifyDiscord(info: DiscordNotifyInfo): Promise<void> {
  const settings = getCachedSettings();
  const { discordWebhookUrl, discordEnabled } = settings.notifications;

  if (!discordEnabled || !discordWebhookUrl) return;
  if (!info.summary?.trim()) return;

  const projectName = path.basename(info.projectPath);
  const sessionName = info.sessionType.charAt(0).toUpperCase() + info.sessionType.slice(1);
  const title = `Forja — ${projectName} (${sessionName})`;

  await sendDiscordWebhook({
    title,
    content: info.summary,
    webhookUrl: discordWebhookUrl,
  });
}
