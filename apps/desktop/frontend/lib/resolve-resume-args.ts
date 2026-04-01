import { invoke } from "@/lib/ipc";
import { CLI_REGISTRY, type SessionType, type CliId } from "@/lib/cli-registry";

interface ResolveResumeInput {
  sessionType: SessionType;
  cliSessionId: string | undefined;
  projectPath: string;
}

interface ResolveResumeResult {
  args: string[];
  /** Whether the stored cliSessionId was confirmed valid on disk. */
  sessionIdValid: boolean;
}

/**
 * Resolves resume arguments for a restored session.
 *
 * For CLIs with resumeIdType === "id" (Claude, Codex, Cursor):
 * validates the stored cliSessionId against the CLI's session index.
 * If the ID no longer exists (e.g., after /rename), returns bare
 * ["--resume"] so the CLI shows its built-in session picker.
 *
 * Returns undefined when no resume is possible.
 */
export async function resolveResumeArgs(
  input: ResolveResumeInput,
): Promise<ResolveResumeResult | undefined> {
  const { sessionType, cliSessionId, projectPath } = input;

  if (sessionType === "terminal") return undefined;
  if (!cliSessionId) return undefined;

  const def = CLI_REGISTRY[sessionType as CliId];
  if (!def?.resumeFlag) return undefined;

  // CLIs that always pass "latest" don't need validation
  if (def.resumeIdType === "latest") {
    return {
      args: buildResumeArgs(def.resumeFlag, "latest"),
      sessionIdValid: true,
    };
  }

  // Validate the stored session ID still exists on disk
  let isValid: boolean;
  try {
    isValid = await invoke<boolean>("validate_cli_session", {
      cliId: sessionType,
      projectPath,
      sessionId: cliSessionId,
    });
  } catch {
    // IPC failure: assume stale, fall back to bare --resume
    isValid = false;
  }

  if (isValid) {
    return {
      args: buildResumeArgs(def.resumeFlag, cliSessionId),
      sessionIdValid: true,
    };
  }

  // Session ID is stale — return bare --resume for the CLI's session picker
  return {
    args: [def.resumeFlag.replace(/=$/, "")],
    sessionIdValid: false,
  };
}

function buildResumeArgs(resumeFlag: string, value: string): string[] {
  if (resumeFlag.endsWith("=")) {
    return [`${resumeFlag}${value}`];
  }
  return [resumeFlag, value];
}
