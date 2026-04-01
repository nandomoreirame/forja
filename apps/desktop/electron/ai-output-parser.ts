/**
 * ai-output-parser.ts
 *
 * Parses rendered screen text from AI CLI sessions (Claude Code, Gemini CLI, etc.)
 * and strips TUI chrome: status bars, box drawing characters, spinners, permission
 * prompts, and input prompt lines.
 *
 * For terminal sessions the text is returned unmodified.
 */

export interface ParsedOutput {
  /** The extracted AI response content, cleaned of TUI chrome */
  content: string;
  /** Whether any TUI chrome was detected and filtered */
  hadChrome: boolean;
}

// ─── Box drawing characters ───────────────────────────────────────────────────

const BOX_DRAWING_RE =
  /[╭╰╮╯│─┌┐└┘├┤┬┴┼]/;

// ─── Status bar patterns ──────────────────────────────────────────────────────

// "Ctx 45%" or "Ctx ████ 12%" — context usage indicator
const CTX_PERCENT_RE = /Ctx\s+[\w%█▓░\s]*\d+%/;

// Model identifier combined with version/context info on the same line.
// Matches when a known model name appears alongside something that looks like
// version info, token counts, or context size markers.
// We intentionally avoid removing lines that mention a model in passing (e.g.,
// "I'm using Claude to help you") by requiring an accompanying technical token.
const MODEL_STATUS_RE =
  /\b(Opus|Sonnet|Haiku|Claude|Gemini|GPT)\b.{0,60}([\d]+[kKmMbB]?\s*(tokens?|context|ctx)|v[\d.]+|@[\w.-]+)/i;

// "1234 tokens" or "tokens: 123"
const TOKEN_COUNT_RE = /\b\d[\d,]*\s+tokens?\b|\btokens?\s*[:=]\s*\d/i;

// "current: 1.2.3  stable: 1.2.3" — version info line
const VERSION_INFO_RE = /current:\s*\S+\s+stable:\s*\S+/i;

// "(1M context)" or "(200k context)"
const CONTEXT_PAREN_RE = /\(\s*[\d]+[kKmMbB]\s+context\)/i;

// ─── Permission / mode bar patterns ──────────────────────────────────────────

const BYPASS_PERMISSIONS_RE = /bypass\s+permissions/i;
const SHIFT_TAB_CYCLE_RE = /shift\+tab.{0,30}cycle/i;
const AUTO_ACCEPT_RE = /auto-accept/i;
const EFFORT_RE = /\/effort/;

// ─── Spinner characters ───────────────────────────────────────────────────────

// Lines consisting ONLY of spinner / progress characters (and optional whitespace)
const SPINNER_ONLY_RE = /^[\s⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏●◉○◌⣾⣽⣻⢿⡿⣟⣯⣷]+$/u;

// ─── Input prompt lines ───────────────────────────────────────────────────────

// Lines that start with a prompt symbol followed by whitespace or end of string
const INPUT_PROMPT_RE = /^[❯>$]\s/;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns true if `line` is TUI chrome that should be removed from AI output.
 */
function isChromeLine(line: string): boolean {
  const trimmed = line.trim();

  // Empty lines are handled separately (consecutive blank collapse)
  if (trimmed === "") return false;

  // 1. Box drawing characters
  if (BOX_DRAWING_RE.test(trimmed)) return true;

  // 2. Status bar patterns
  if (CTX_PERCENT_RE.test(trimmed)) return true;
  if (MODEL_STATUS_RE.test(trimmed)) return true;
  if (TOKEN_COUNT_RE.test(trimmed)) return true;
  if (VERSION_INFO_RE.test(trimmed)) return true;
  if (CONTEXT_PAREN_RE.test(trimmed)) return true;

  // 3. Permission / mode bars
  if (BYPASS_PERMISSIONS_RE.test(trimmed)) return true;
  if (SHIFT_TAB_CYCLE_RE.test(trimmed)) return true;
  if (AUTO_ACCEPT_RE.test(trimmed)) return true;
  if (EFFORT_RE.test(trimmed)) return true;

  // 4. Spinner-only lines
  if (SPINNER_ONLY_RE.test(trimmed)) return true;

  // 5. Input prompt lines (❯, >, $)
  if (INPUT_PROMPT_RE.test(line)) return true;

  return false;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Parse rendered screen text from an AI CLI session.
 * Removes TUI chrome (status bars, box drawing, spinners, prompts).
 * For non-AI sessions (terminal), returns the text unmodified.
 */
export function parseAiOutput(screenText: string, sessionType: string): ParsedOutput {
  // Terminal sessions: pass through unchanged
  if (sessionType === "terminal") {
    return { content: screenText, hadChrome: false };
  }

  // Empty input: nothing to strip
  if (screenText === "") {
    return { content: "", hadChrome: false };
  }

  const lines = screenText.split("\n");
  const filtered: string[] = [];
  let hadChrome = false;
  let consecutiveBlanks = 0;

  for (const line of lines) {
    const isEmpty = line.trim() === "";

    if (isEmpty) {
      consecutiveBlanks++;
      // Collapse 3+ consecutive blank lines into 1
      if (consecutiveBlanks <= 2) {
        filtered.push(line);
      } else {
        hadChrome = true; // excess blanks count as chrome
      }
      continue;
    }

    consecutiveBlanks = 0;

    if (isChromeLine(line)) {
      hadChrome = true;
    } else {
      filtered.push(line);
    }
  }

  // Trim leading and trailing blank lines
  let start = 0;
  while (start < filtered.length && filtered[start].trim() === "") {
    hadChrome = true;
    start++;
  }

  let end = filtered.length - 1;
  while (end >= start && filtered[end].trim() === "") {
    hadChrome = true;
    end--;
  }

  const content = filtered.slice(start, end + 1).join("\n");

  return { content, hadChrome };
}
