import * as path from "path";
import { Notification } from "electron";

interface SessionEndInfo {
  projectPath: string;
  sessionType: string;
  exitCode: number;
}

interface NotificationData {
  title: string;
  body: string;
}

/**
 * Pure function that builds notification data for a PTY session exit.
 * Testable without Electron.
 */
export function buildSessionEndNotification(info: SessionEndInfo): NotificationData {
  const projectName = path.basename(info.projectPath);
  const sessionName = info.sessionType.charAt(0).toUpperCase() + info.sessionType.slice(1);

  const title = `Session ended — ${projectName}`;
  const body =
    info.exitCode === 0
      ? `${sessionName} finished successfully.`
      : `${sessionName} exited with code ${info.exitCode}.`;

  return { title, body };
}

/**
 * Shows a native system notification when a PTY session ends.
 * Only fires when the main window is NOT focused.
 */
export function showSessionEndNotification(
  info: SessionEndInfo,
  mainWindow: Electron.BrowserWindow | null,
): void {
  // Only notify when window is not focused
  if (mainWindow?.isFocused()) return;

  // Electron Notification API requires app to be ready
  try {
    if (!Notification.isSupported()) return;

    const data = buildSessionEndNotification(info);
    const notification = new Notification({
      title: data.title,
      body: data.body,
      silent: false,
    });

    notification.on("click", () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
        // Emit event to frontend to switch to the project
        mainWindow.webContents.send("project:focus-requested", {
          projectPath: info.projectPath,
        });
      }
    });

    notification.show();
  } catch {
    // Notifications not available (e.g., in test environment)
  }
}
