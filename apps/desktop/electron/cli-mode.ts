/**
 * CLI mode handler for the Forja binary.
 *
 * When `forja <command>` is invoked from a terminal, this module handles the
 * command via the Unix socket (same as the root scripts/forja-cli.js) and exits without
 * launching the Electron GUI.
 *
 * Returns `true` if CLI mode was activated (caller should skip GUI startup).
 */
import * as net from "net";
import * as os from "os";
import * as path from "path";
import { spawn } from "child_process";

const CLI_COMMANDS = new Set([
  "ping",
  "notify",
  "open-project",
  "open",
  "project",
  "list-projects",
  "sessions",
  "list-sessions",
  "session-output",
  "session-input",
  "output",
  "send",
  "input",
  "screenshot",
  "new-session",
  "cli-help",
]);

const USAGE = `
Forja CLI — control a running Forja instance

Usage: forja <command> [args]

Commands:
  ping                          Check if Forja is running
  notify <message>              Send a notification message
  open <path>                   Open a project by path
  project [N]                   List projects or switch to project N
  sessions                      List active terminal sessions
  output <tabId>                Get output buffer of a session
  send <tabId> <text>           Send input to a terminal session
  new-session <type> [path]     Start a new session (claude, codex, gemini, terminal)
  screenshot                    Take a screenshot of the Forja window

Run 'forja' without arguments to launch the GUI.
`.trim();

function getSocketPath(): string {
  if (process.platform === "win32") {
    return "\\\\.\\pipe\\forja";
  }
  return path.join(os.tmpdir(), "forja.sock");
}

function buildCommand(
  name: string,
  args: string[]
): Record<string, unknown> | null {
  switch (name) {
    case "ping":
      return { type: "ping" };
    case "notify":
      return { type: "notify", message: args.join(" ") };
    case "open":
    case "open-project": {
      if (!args[0]) return null;
      // Resolve relative/tilde paths to absolute
      let projectPath = args[0];
      if (projectPath.startsWith("~")) {
        projectPath = path.join(os.homedir(), projectPath.slice(1));
      } else if (!path.isAbsolute(projectPath)) {
        projectPath = path.resolve(projectPath);
      }
      return { type: "open-project", projectPath };
    }
    case "project":
      if (args[0] && /^\d+$/.test(args[0])) {
        return { type: "switch-project", index: parseInt(args[0], 10) };
      }
      return { type: "list-projects" };
    case "list-projects":
      return { type: "list-projects" };
    case "sessions":
    case "list-sessions":
      return { type: "list-sessions" };
    case "output":
    case "session-output":
      return args[0] ? { type: "session-output", tabId: args[0] } : null;
    case "send":
    case "input":
    case "session-input":
      return args[0] && args[1]
        ? { type: "session-input", tabId: args[0], text: args.slice(1).join(" ") + "\r" }
        : null;
    case "new-session":
      return args[0]
        ? { type: "new-session", sessionType: args[0], ...(args[1] ? { projectPath: args[1] } : {}) }
        : null;
    case "screenshot":
      return { type: "screenshot" };
    case "cli-help":
      return null; // handled separately
    default:
      return null;
  }
}

function sendCommand(cmd: Record<string, unknown>): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const client = net.createConnection({ path: getSocketPath() }, () => {
      client.write(JSON.stringify(cmd) + "\n");
    });
    let buffer = "";
    client.on("data", (chunk) => {
      buffer += chunk.toString();
      const nl = buffer.indexOf("\n");
      if (nl !== -1) {
        client.destroy();
        try {
          resolve(JSON.parse(buffer.slice(0, nl)));
        } catch {
          reject(new Error(`Failed to parse response: ${buffer.slice(0, nl)}`));
        }
      }
    });
    client.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "ENOENT" || err.code === "ECONNREFUSED") {
        reject(new Error("Forja is not running. Start the GUI first."));
      } else {
        reject(err);
      }
    });
  });
}

/**
 * Check if CLI mode should be activated based on process.argv.
 * Returns true if we handled it (caller should process.exit).
 */
export async function tryCliMode(): Promise<boolean> {
  // Special case: --help or help (check before filtering)
  if (process.argv.includes("--help") || process.argv.includes("help")) {
    process.stdout.write(USAGE + "\n");
    process.exit(0);
    return true;
  }

  // Electron passes various internal args (--type=, --no-sandbox, etc.)
  // Filter to find actual user CLI commands.
  // In packaged mode: argv = [electron-binary, command, ...args]
  // In dev mode: argv = [electron, main.js, command, ...args]
  const rawArgs = process.argv.slice(1).filter(
    (a) => !a.startsWith("--") && !a.endsWith(".js") && !a.endsWith(".ts")
  );

  let commandName = rawArgs[0];
  if (!commandName) return false;

  // If the first arg looks like a path, treat as `open <path>`
  if (commandName.startsWith("/") || commandName.startsWith("~") || commandName.startsWith("./") || commandName.startsWith("../")) {
    rawArgs.unshift("open");
    commandName = "open";
  }

  if (commandName === "cli-help") {
    process.stdout.write(USAGE + "\n");
    process.exit(0);
    return true;
  }

  if (!CLI_COMMANDS.has(commandName)) return false;

  // We're in CLI mode
  const args = rawArgs.slice(1);

  const cmd = buildCommand(commandName, args);
  if (!cmd) {
    process.stderr.write(`Invalid arguments for '${commandName}'\n\n${USAGE}\n`);
    process.exit(1);
    return true;
  }

  try {
    const response = await sendCommand(cmd);
    if ((response as { error?: string }).error) {
      process.stderr.write(`Error: ${(response as { error: string }).error}\n`);
      process.exit(1);
    } else {
      const data = (response as { data?: unknown }).data;
      if (data !== undefined && data !== null) {
        process.stdout.write(JSON.stringify(data, null, 2) + "\n");
      }
      process.exit(0);
    }
  } catch {
    // For open/open-project: if Forja isn't running, launch the GUI detached
    // with the project path, then exit this CLI process immediately.
    if (commandName === "open" || commandName === "open-project") {
      const projectPath = (cmd as { projectPath?: string }).projectPath;
      if (projectPath) {
        const binary = process.argv[0];
        const child = spawn(binary, [projectPath], {
          detached: true,
          stdio: "ignore",
        });
        child.unref();
        process.stdout.write(`Opening Forja with project: ${projectPath}\n`);
        process.exit(0);
        return true;
      }
    }
    process.stderr.write("Forja is not running. Start the GUI first.\n");
    process.exit(1);
  }

  return true;
}
