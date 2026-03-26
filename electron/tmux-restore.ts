import { listForjaSessions, getTmuxSessionCwd, tabIdFromTmuxSession, killTmuxSession } from "./tmux.js";

export interface OrphanedSession {
  sessionName: string;
  cwd: string | null;
  tabId: string | null;
}

/**
 * Discovers tmux sessions created by Forja that are still running
 * but have no connected Forja app instance.
 */
export async function getOrphanedSessions(): Promise<OrphanedSession[]> {
  const sessionNames = await listForjaSessions();
  if (sessionNames.length === 0) return [];

  const results = await Promise.all(
    sessionNames.map(async (sessionName) => ({
      sessionName,
      cwd: await getTmuxSessionCwd(sessionName),
      tabId: tabIdFromTmuxSession(sessionName),
    })),
  );

  return results;
}

/**
 * Kills tmux sessions that are not referenced by any saved tab state.
 * Called on app startup to clean up sessions from previous runs that
 * were never reattached.
 */
export async function cleanupStaleSessions(
  activeTmuxNames: Set<string>,
): Promise<void> {
  const allSessions = await listForjaSessions();
  const stale = allSessions.filter((name) => !activeTmuxNames.has(name));
  await Promise.all(stale.map((name) => killTmuxSession(name)));
}
