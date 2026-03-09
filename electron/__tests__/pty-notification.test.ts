import { describe, it, expect, vi } from "vitest";
import { buildSessionEndNotification } from "../pty-notifications";

describe("buildSessionEndNotification", () => {
  it("builds notification with project name", () => {
    const notif = buildSessionEndNotification({
      projectPath: "/home/user/my-app",
      sessionType: "claude",
      exitCode: 0,
    });
    expect(notif.title).toContain("my-app");
  });

  it("includes exit code in body when non-zero", () => {
    const notif = buildSessionEndNotification({
      projectPath: "/home/user/my-app",
      sessionType: "claude",
      exitCode: 1,
    });
    expect(notif.body).toContain("1");
  });

  it("shows success wording for exit code 0", () => {
    const notif = buildSessionEndNotification({
      projectPath: "/home/user/my-app",
      sessionType: "claude",
      exitCode: 0,
    });
    expect(notif.body.toLowerCase()).toContain("finished");
  });

  it("capitalizes session type in body", () => {
    const notif = buildSessionEndNotification({
      projectPath: "/home/user/my-app",
      sessionType: "gemini",
      exitCode: 0,
    });
    expect(notif.body).toContain("Gemini");
  });
});
