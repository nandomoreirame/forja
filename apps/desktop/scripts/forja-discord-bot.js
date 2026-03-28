#!/usr/bin/env node
import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
} from "discord.js";
import net from "net";
import os from "os";
import path from "path";

const DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN;
if (!DISCORD_TOKEN) {
  console.error("Missing DISCORD_BOT_TOKEN environment variable");
  process.exit(1);
}

const SOCKET_PATH =
  process.platform === "win32"
    ? "\\\\.\\pipe\\forja"
    : path.join(os.tmpdir(), "forja.sock");

/**
 * Send a command to Forja via Unix socket (or named pipe on Windows).
 * Returns the parsed JSON response.
 */
function sendToForja(cmd) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ path: SOCKET_PATH }, () => {
      socket.write(JSON.stringify(cmd) + "\n");
    });

    let buffer = "";

    socket.on("data", (chunk) => {
      buffer += chunk.toString();
      const nl = buffer.indexOf("\n");
      if (nl !== -1) {
        socket.destroy();
        try {
          resolve(JSON.parse(buffer.slice(0, nl)));
        } catch {
          reject(new Error("Invalid response from Forja"));
        }
      }
    });

    socket.on("error", (err) => {
      if (err.code === "ENOENT" || err.code === "ECONNREFUSED") {
        reject(new Error("Forja is not running"));
      } else {
        reject(err);
      }
    });
  });
}

/**
 * Format a list of sessions as a human-readable string for Discord.
 */
function formatSessions(sessions) {
  if (!sessions || !sessions.length) return "No active sessions.";
  return sessions
    .map(
      (s, i) =>
        `**${i + 1}.** \`${s.tabId}\`\n   \u{1F4C2} ${s.projectPath}\n   \u{1F916} ${s.sessionType}`
    )
    .join("\n\n");
}

/**
 * Strip ANSI escape sequences and truncate terminal output to fit Discord's
 * 2000-character message limit. Returns a fenced code block.
 */
function truncateOutput(content) {
  if (!content) return "_Empty buffer_";

  // Strip common ANSI escape sequences
  const clean = content
    .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "")
    .replace(/\x1b\][^\x07]*\x07/g, "");

  const last = clean.slice(-1800);
  return "```\n" + last + "\n```";
}

/**
 * Core command dispatcher — shared between slash-command and message handlers.
 */
async function handleCommand(commandName, args) {
  try {
    switch (commandName) {
      case "ping": {
        const res = await sendToForja({ type: "ping" });
        return `\u2705 Forja is running (v${res.data?.version ?? "unknown"})`;
      }

      case "sessions": {
        const res = await sendToForja({ type: "list-sessions" });
        return formatSessions(res.data ?? []);
      }

      case "output": {
        const tabId = args[0];
        if (!tabId) return "\u274C Usage: `output <tabId>`";
        const res = await sendToForja({ type: "session-output", tabId });
        if (!res.ok) return `\u274C ${res.error}`;
        return truncateOutput(res.data?.content);
      }

      case "send": {
        const tabId = args[0];
        const text = args.slice(1).join(" ");
        if (!tabId || !text) return "\u274C Usage: `send <tabId> <text>`";
        const res = await sendToForja({
          type: "session-input",
          tabId,
          text: text + "\r",
        });
        if (!res.ok) return `\u274C ${res.error}`;
        return `\u2705 Sent to \`${tabId}\`: ${text}`;
      }

      case "projects": {
        const res = await sendToForja({ type: "list-projects" });
        const projects = res.data ?? [];
        if (!projects.length) return "No open projects.";
        return projects
          .map((p, i) => `**${i + 1}.** ${p.name} \u2014 \`${p.path}\``)
          .join("\n");
      }

      case "new-session": {
        const sessionType = args[0];
        if (!sessionType) return "\u274C Usage: `new-session <type>` (claude, codex, gemini, terminal)";
        const res = await sendToForja({ type: "new-session", sessionType, ...(args[1] ? { projectPath: args[1] } : {}) });
        if (!res.ok) return `\u274C ${res.error}`;
        return `\u2705 Started new ${sessionType} session`;
      }

      case "project": {
        const idx = args[0];
        if (!idx || !/^\d+$/.test(idx)) {
          // List projects with index
          const res = await sendToForja({ type: "list-projects" });
          const projects = res.data ?? [];
          if (!projects.length) return "No open projects.";
          return projects
            .map((p, i) => `**${i + 1}.** ${p.name} \u2014 \`${p.path}\``)
            .join("\n");
        }
        const res = await sendToForja({ type: "switch-project", index: parseInt(idx, 10) });
        if (!res.ok) return `\u274C ${res.error}`;
        const { project, sessions } = res.data;
        let reply = `\u2705 Switched to **${project.name}** (\`${project.path}\`)`;
        if (sessions?.length) {
          reply += "\n\n**Sessions:**\n" + sessions
            .map((s, i) => `**${i + 1}.** \`${s.tabId}\` \u2014 ${s.sessionType}`)
            .join("\n");
        } else {
          reply += "\n\nNo active sessions.";
        }
        return reply;
      }

      default:
        return "\u274C Unknown command. Available: `ping`, `sessions`, `output`, `send`, `new-session`, `project`, `projects`";
    }
  } catch (err) {
    return `\u274C ${err.message}`;
  }
}

// ---------------------------------------------------------------------------
// Discord client setup
// ---------------------------------------------------------------------------

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Register global application slash commands once the bot is ready
client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);
  console.log(`Socket path: ${SOCKET_PATH}`);

  const commands = [
    new SlashCommandBuilder()
      .setName("forja-ping")
      .setDescription("Check if Forja is running"),

    new SlashCommandBuilder()
      .setName("forja-sessions")
      .setDescription("List active terminal sessions"),

    new SlashCommandBuilder()
      .setName("forja-output")
      .setDescription("Get the last output from a terminal session")
      .addStringOption((opt) =>
        opt.setName("tabid").setDescription("Tab ID").setRequired(true)
      ),

    new SlashCommandBuilder()
      .setName("forja-send")
      .setDescription("Send input to a terminal session")
      .addStringOption((opt) =>
        opt.setName("tabid").setDescription("Tab ID").setRequired(true)
      )
      .addStringOption((opt) =>
        opt.setName("text").setDescription("Text to send").setRequired(true)
      ),

    new SlashCommandBuilder()
      .setName("forja-projects")
      .setDescription("List open projects"),

    new SlashCommandBuilder()
      .setName("forja-new-session")
      .setDescription("Start a new AI session")
      .addStringOption((opt) =>
        opt
          .setName("type")
          .setDescription("Session type")
          .setRequired(true)
          .addChoices(
            { name: "Claude", value: "claude" },
            { name: "Codex", value: "codex" },
            { name: "Gemini", value: "gemini" },
            { name: "Copilot", value: "gh-copilot" },
            { name: "Terminal", value: "terminal" },
          )
      ),

    new SlashCommandBuilder()
      .setName("forja-project")
      .setDescription("List projects or switch to project N")
      .addIntegerOption((opt) =>
        opt.setName("number").setDescription("Project number to switch to").setRequired(false)
      ),
  ];

  const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);
  try {
    await rest.put(Routes.applicationCommands(client.user.id), {
      body: commands.map((c) => c.toJSON()),
    });
    console.log("Slash commands registered successfully");
  } catch (err) {
    console.error("Failed to register slash commands:", err);
  }
});

// ---------------------------------------------------------------------------
// Slash command handler
// ---------------------------------------------------------------------------

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  await interaction.deferReply();

  // Strip the "forja-" prefix to get the canonical command name
  const name = interaction.commandName.replace("forja-", "");
  const args = [];

  if (name === "output") {
    args.push(interaction.options.getString("tabid"));
  }

  if (name === "send") {
    args.push(interaction.options.getString("tabid"));
    args.push(interaction.options.getString("text"));
  }

  if (name === "new-session") {
    args.push(interaction.options.getString("type"));
  }

  if (name === "project") {
    const num = interaction.options.getInteger("number");
    if (num) args.push(String(num));
  }

  const reply = await handleCommand(name, args);
  await interaction.editReply(reply);
});

// ---------------------------------------------------------------------------
// Message-based command handler  (!forja <command> [args...])
// ---------------------------------------------------------------------------

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith("!forja")) return;

  const parts = message.content.slice("!forja".length).trim().split(/\s+/);
  const commandName = parts[0];
  const args = parts.slice(1);

  if (!commandName) {
    await message.reply(
      "Available commands: `ping`, `sessions`, `output <tabId>`, `send <tabId> <text>`, `new-session <type>`, `projects`"
    );
    return;
  }

  const reply = await handleCommand(commandName, args);
  await message.reply(reply);
});

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

client.login(DISCORD_TOKEN);
