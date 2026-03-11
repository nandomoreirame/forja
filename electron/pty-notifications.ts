import * as path from "path";
import { execFile } from "child_process";
import { Notification } from "electron";

interface SessionReadyInfo {
  projectPath: string;
  sessionType: string;
  activeProjectPath: string | null;
}

interface NotificationData {
  title: string;
  body: string;
}

/**
 * Pure function that builds notification data for a completed session.
 */
export function buildSessionFinishedNotification(info: SessionReadyInfo): NotificationData {
  const projectName = path.basename(info.projectPath);
  const sessionName = info.sessionType.charAt(0).toUpperCase() + info.sessionType.slice(1);

  return {
    title: `Forja — ${projectName}`,
    body: `${sessionName} finished with new output.`,
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
