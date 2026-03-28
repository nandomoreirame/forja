#!/usr/bin/env node
// scripts/forja-cli.js
import net from "net";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

export const SOCKET_PATH =
  process.platform === "win32"
    ? "\\\\.\\pipe\\forja"
    : path.join(os.tmpdir(), "forja.sock");

export const USAGE = `
Usage: forja <command> [args]

Commands:
  ping                        Check if Forja is running
  notify <message>            Send a notification message
  open-project <path>         Open a project by path
  list-projects               List all open projects
  project [N]                 List projects or switch to project N
  sessions                    List active terminal sessions
  output <tabId>              Get output buffer of a session
  send <tabId> <text>         Send input to a terminal session
  new-session <type> [path]   Start a new session (claude, codex, gemini, terminal)
  screenshot                  Take a screenshot of the Forja window
`.trim();

/**
 * Build the command object from CLI arguments.
 * @param {string} commandName
 * @param {string[]} args
 * @returns {{ type: string } | null}
 */
export function buildCommand(commandName, args) {
  switch (commandName) {
    case "ping":
      return { type: "ping" };

    case "notify":
      return { type: "notify", message: args.join(" ") };

    case "open-project":
      return { type: "open-project", projectPath: args[0] };

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
      if (!args[0]) return null;
      return { type: "session-output", tabId: args[0] };

    case "send":
    case "input":
    case "session-input":
      if (!args[0] || !args[1]) return null;
      return { type: "session-input", tabId: args[0], text: args.slice(1).join(" ") + "\r" };

    case "new-session":
      if (!args[0]) return null;
      return { type: "new-session", sessionType: args[0], ...(args[1] ? { projectPath: args[1] } : {}) };

    case "screenshot":
      return { type: "screenshot" };

    default:
      return null;
  }
}

/**
 * Send a command to Forja via Unix socket and return the response.
 * @param {object} command
 * @param {typeof net} [netModule] - net module (injectable for testing)
 * @returns {Promise<object>}
 */
export function sendCommand(command, netModule) {
  const netToUse = netModule || net;
  return new Promise((resolve, reject) => {
    const client = netToUse.createConnection({ path: SOCKET_PATH }, () => {
      client.write(JSON.stringify(command) + "\n");
    });

    let buffer = "";

    client.on("data", (chunk) => {
      buffer += chunk.toString();
      const newlineIndex = buffer.indexOf("\n");
      if (newlineIndex !== -1) {
        const line = buffer.slice(0, newlineIndex);
        client.destroy();
        try {
          resolve(JSON.parse(line));
        } catch (_err) {
          reject(new Error(`Failed to parse response: ${line}`));
        }
      }
    });

    client.on("error", (err) => {
      const isConnectionRefused =
        err.code === "ENOENT" || err.code === "ECONNREFUSED";
      if (isConnectionRefused) {
        reject(
          Object.assign(new Error("Forja is not running"), {
            isConnectionError: true,
          })
        );
      } else {
        reject(err);
      }
    });
  });
}

/**
 * Main entry point.
 * @param {string[]} argv - process.argv
 * @param {typeof net} [netModule] - injectable net module for testing
 */
export async function main(argv, netModule) {
  const [, , commandName, ...args] = argv;

  if (!commandName) {
    process.stderr.write(USAGE + "\n");
    process.exit(1);
    return;
  }

  const command = buildCommand(commandName, args);

  if (!command) {
    process.stderr.write(`Unknown command: ${commandName}\n\n${USAGE}\n`);
    process.exit(1);
    return;
  }

  try {
    const response = await sendCommand(command, netModule);

    if (response.error) {
      process.stderr.write(`Error: ${response.error}\n`);
      process.exit(1);
      return;
    }

    if (response.data !== undefined && response.data !== null) {
      process.stdout.write(JSON.stringify(response.data, null, 2) + "\n");
    }

    process.exit(0);
  } catch (err) {
    if (err.isConnectionError) {
      process.stderr.write("Forja is not running\n");
    } else {
      process.stderr.write(`Error: ${err.message}\n`);
    }
    process.exit(1);
  }
}

// Run when executed directly (ESM equivalent of require.main === module)
const scriptPath = fileURLToPath(import.meta.url);
const isMain = process.argv[1] === scriptPath;
if (isMain) {
  main(process.argv);
}
