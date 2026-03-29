/**
 * Discord webhook notification system for Forja.
 *
 * Sends formatted markdown messages to Discord when AI sessions
 * produce output (Claude, Codex, Gemini, cursor-agent, etc.).
 */

/** Strip ALL terminal escape sequences from raw PTY output. */
export function stripAnsi(raw: string): string {
  let cleaned = raw;
  // OSC sequences: ESC ] ... BEL or ESC ] ... ST (hyperlinks, window titles)
  cleaned = cleaned.replace(/\x1b\][\s\S]*?(?:\x07|\x1b\\)/g, "");
  // DCS sequences: ESC P ... ST
  cleaned = cleaned.replace(/\x1bP[\s\S]*?(?:\x1b\\)/g, "");
  // APC sequences: ESC _ ... ST
  cleaned = cleaned.replace(/\x1b_[\s\S]*?(?:\x1b\\)/g, "");
  // CSI sequences: ESC [ (params) (intermediate) (final)
  // Params include digits, semicolons, and private mode chars (?>=!)
  // This catches \x1b[?2026h, \x1b[?25l, \x1b[38;5;123m, etc.
  cleaned = cleaned.replace(/\x1b\[[\x20-\x3f]*[\x40-\x7e]/g, "");
  // SS2/SS3 sequences
  cleaned = cleaned.replace(/\x1b[NO].?/g, "");
  // Remaining 2-byte escape sequences (ESC + single char)
  cleaned = cleaned.replace(/\x1b[\x20-\x7e]/g, "");
  // Stray ESC bytes
  cleaned = cleaned.replace(/\x1b/g, "");
  // Control characters (except newline and tab)
  cleaned = cleaned.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, "");
  // Carriage returns: in terminals, \r moves cursor to line start and
  // subsequent text overwrites. Keep only the last segment after \r per line.
  cleaned = cleaned.replace(/^.*\r(?!\n)/gm, "");
  // Collapse multiple spaces
  cleaned = cleaned.replace(/ {2,}/g, " ");
  return cleaned;
}

// Lines made entirely of box-drawing / decorative characters
const BOX_DRAWING_RE = /^[\s─│┌┐└┘├┤┬┴┼━┃╋═╔╗╚╝╠╣╦╩╬▀▄█▌▐░▒▓―—–╭╮╯╰]+$/;

// Full-line status bar patterns (very specific to avoid false positives)
// Claude Code: [Opus 4.6 (1M context)] project git:(branch) | Ctx 5% | ...tokens
const CLAUDE_STATUS_RE = /^\[(?:Opus|Sonnet|Haiku|Claude)\s*[\d.]+/i;
// Codex: gpt-X.X ... · NN% left · ~/path
const CODEX_STATUS_RE = /^gpt-[\d.]+\s.*\d+%\s*left/i;
// Permission/mode line: ▸ ▸ bypass permissions on (shift+tab to cycle)
const PERMISSION_LINE_RE = /^[▸▹›❯►>]+\s*[▸▹›❯►>]*\s*bypass\s*permissions?\s*on/i;
// CLI idle prompt patterns (input fields, status footers)
const CLI_PROMPT_RE =
  /^(?:Type your message|Type @|[*>❯$]\s*Type\s|YOLO\s+Ctrl\+Y|\?\s*for shortcuts$|Describe a task|Plan,\s*search,\s*build)/i;
// CLI chrome: workspace/directory/branch/sandbox/model info lines
const CLI_CHROME_RE =
  /^(?:workspace\s*\(\/?\w+\)|sandbox\s|no sandbox\b|\/model\b|shift\+tab\s+switch\s+mode|\/\s*commands\s*·)/i;
// CLI startup banners and version lines
const CLI_BANNER_RE =
  /^(?:GitHub Copilot\s+v|Gemini CLI\s+v|Cursor Agent\s+v|Signed in with|Plan:\s+|Tip:\s+\/|Environment Loaded:|Failed to load|No copilot instructions|OpenAI Codex\s*\(v)/i;
// Codex CLI thinking/reasoning lines (internal reasoning, not the response)
const CODEX_THINKING_RE =
  /^(?:>_|>\s+|model:|directory:|Tip:\s+New\s+\d)/i;
// Gemini skill/file count lines
const GEMINI_CHROME_RE =
  /^\d+\s+(?:GEMINI\.md|skills?|files?)\b/i;

/** Returns true if a line is terminal UI noise rather than meaningful content. */
export function isNoiseLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return true;
  // Very short fragments (cursor save/restore leftovers like "sc", "4", "g")
  if (trimmed.length <= 2) return true;
  // Lines made entirely of box-drawing / decorative characters
  if (BOX_DRAWING_RE.test(trimmed)) return true;
  // Specific status bar lines (full-line match, not word match)
  if (CLAUDE_STATUS_RE.test(trimmed)) return true;
  if (CODEX_STATUS_RE.test(trimmed)) return true;
  if (PERMISSION_LINE_RE.test(trimmed)) return true;
  // CLI idle prompt patterns
  if (CLI_PROMPT_RE.test(trimmed)) return true;
  // CLI chrome lines (workspace, sandbox, model info)
  if (CLI_CHROME_RE.test(trimmed)) return true;
  // CLI startup banners and version lines
  if (CLI_BANNER_RE.test(trimmed)) return true;
  // Codex thinking/reasoning metadata
  if (CODEX_THINKING_RE.test(trimmed)) return true;
  // Gemini skill/file count lines
  if (GEMINI_CHROME_RE.test(trimmed)) return true;
  // Lines dominated by progress bar characters (>50% of the line)
  const noiseChars = (trimmed.match(/[█░▓▒▏▎▍▌▋▊▉]/g) || []).length;
  if (noiseChars > 0 && noiseChars > trimmed.length * 0.5) return true;
  return false;
}

/**
 * Remove typing echo lines (progressive prefixes from keystroke-by-keystroke echo).
 * e.g., "me", "me e", "me ex", "me exp" → keeps only "me exp"
 */
export function deduplicateTypingEcho(lines: string[]): string[] {
  if (lines.length <= 1) return lines;
  const result: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const current = lines[i].trim();
    const next = i + 1 < lines.length ? lines[i + 1].trim() : null;
    // Skip if the next line starts with the current line (typing echo)
    if (next && next.startsWith(current) && current.length > 0) continue;
    result.push(lines[i]);
  }
  return result;
}

/** Strip ANSI, filter noise lines, remove typing echo, return clean text. */
export function cleanPtyOutput(raw: string): string {
  const stripped = stripAnsi(raw);
  const lines = stripped.split("\n");
  const meaningful = lines.filter((line) => !isNoiseLine(line));
  const deduped = deduplicateTypingEcho(meaningful);
  return deduped.join("\n");
}

/** Collapse 3+ consecutive blank lines into a single blank line. */
export function collapseBlankLines(text: string): string {
  return text.replace(/\n{3,}/g, "\n\n");
}

/**
 * Extract trailing question lines from the end of text.
 * Scans backwards, collecting lines that contain '?' and
 * continuation lines (starting with -, *, >, or space).
 */
export function extractTrailingQuestion(text: string): string {
  const lines = text.split("\n");

  // Strip trailing blank lines
  while (lines.length > 0 && !lines[lines.length - 1].trim()) lines.pop();
  if (lines.length === 0) return "";

  // Collect trailing block: walk backwards, collecting continuation lines
  // (starting with -, *, >, space) and the question line (containing ?)
  const collected: string[] = [];

  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (!line.trim()) break;
    if (line.includes("?") || /^[-*> ]/.test(line)) {
      collected.unshift(line);
      // If we found the question, stop
      if (line.includes("?")) break;
    } else {
      break;
    }
  }

  // Only return if a question was actually found
  if (collected.length > 0 && collected[0].includes("?")) {
    return collected.join("\n");
  }

  return "";
}

/**
 * Summarize text to fit within Discord's character limit.
 * Uses head+tail strategy (70%/25%) with separator, and
 * highlights trailing questions in a blockquote.
 */
export function summarizeForDiscord(text: string, maxLen: number): string {
  const cleaned = collapseBlankLines(text);
  const question = extractTrailingQuestion(cleaned);

  if (cleaned.length <= maxLen) return cleaned;

  // Remove question from body to avoid duplication
  let body = cleaned;
  if (question) {
    const qLines = question.split("\n").length;
    const bodyLines = body.split("\n");
    while (bodyLines.length > 0 && !bodyLines[bodyLines.length - 1].trim()) bodyLines.pop();
    bodyLines.splice(-qLines, qLines);
    while (bodyLines.length > 0 && !bodyLines[bodyLines.length - 1].trim()) bodyLines.pop();
    body = bodyLines.join("\n");
  }

  const questionBlock = question ? `\n\n> **Pergunta:**\n> ${question}` : "";
  const bodyMax = Math.max(maxLen - questionBlock.length, 150);

  const headLen = Math.floor(bodyMax * 0.7);
  const tailLen = Math.floor(bodyMax * 0.25);
  const separator = "\n\n> *... conteúdo resumido ...*\n\n";

  const headRaw = body.slice(0, headLen);
  const lastNl = headRaw.lastIndexOf("\n");
  const head = lastNl > 0 ? headRaw.slice(0, lastNl) : headRaw;

  const tailRaw = body.slice(-tailLen);
  const firstNl = tailRaw.indexOf("\n");
  const tail = firstNl >= 0 ? tailRaw.slice(firstNl + 1) : tailRaw;

  return `${head}${separator}${tail}${questionBlock}`;
}

/** Discord message limit is 2000 chars; we use 1900 to leave room for formatting overhead. */
const DISCORD_MAX_LENGTH = 1900;

interface DiscordNotificationOptions {
  title: string;
  content: string;
  webhookUrl: string;
}

function isValidDiscordWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname === "discord.com" &&
      parsed.pathname.startsWith("/api/webhooks/")
    );
  } catch {
    return false;
  }
}

/**
 * Send a formatted markdown message to a Discord webhook.
 * Always truncates/summarizes to fit within Discord's 2000 char limit.
 * Returns true if sent successfully, false otherwise.
 */
export async function sendDiscordWebhook(
  options: DiscordNotificationOptions,
): Promise<boolean> {
  const { title, content, webhookUrl } = options;
  if (!webhookUrl) return false;
  if (!isValidDiscordWebhookUrl(webhookUrl)) return false;

  const overhead = title.length + 6; // **title**\n\n
  const available = Math.max(DISCORD_MAX_LENGTH - overhead, 200);
  const cleaned = cleanPtyOutput(content);
  if (!cleaned.trim()) return false;
  const body = summarizeForDiscord(cleaned, available);
  if (!body.trim()) return false;
  const message = `**${title}**\n\n${body}`;

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: message }),
    });
    return response.ok;
  } catch (err) {
    console.warn("[discord-notifications] Webhook failed:", err);
    return false;
  }
}
