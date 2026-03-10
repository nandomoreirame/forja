import * as path from "path";
import { execFile } from "child_process";
import { Notification } from "electron";

interface SessionReadyInfo {
  projectPath: string;
  sessionType: string;
}

interface NotificationData {
  title: string;
  body: string;
}

/**
 * Pure function that builds notification data for a session-ready event.
 */
export function buildSessionReadyNotification(info: SessionReadyInfo): NotificationData {
  const projectName = path.basename(info.projectPath);
  const sessionName = info.sessionType.charAt(0).toUpperCase() + info.sessionType.slice(1);

  return {
    title: `Forja — ${projectName}`,
    body: `${sessionName} is ready for input.`,
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
): void {
  try {
    if (!Notification.isSupported()) return;

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
  } catch (err) {
    console.warn("[pty-notifications] Electron notification failed:", err);
  }
}

/**
 * Shows a native notification when an AI session transitions to ready.
 * Only fires when the main window is NOT focused.
 */
export function showSessionReadyNotification(
  info: SessionReadyInfo,
  mainWindow: Electron.BrowserWindow | null,
): void {
  if (mainWindow?.isFocused()) return;

  const data = buildSessionReadyNotification(info);

  if (process.platform === "linux") {
    showNotificationLinux(data);
  } else {
    showNotificationElectron(data, info, mainWindow);
  }
}
