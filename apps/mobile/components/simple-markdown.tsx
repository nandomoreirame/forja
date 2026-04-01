import { Text, View, StyleSheet, Platform } from "react-native";

const MONO_FONT = Platform.OS === "ios" ? "Menlo" : "monospace";

// Catppuccin Mocha palette
const CTP = {
  text: "#cdd6f4",
  subtext: "#a6adc8",
  overlay: "#6c7086",
  surface: "#313244",
  base: "#1e1e2e",
  mantle: "#181825",
  crust: "#11111b",
  green: "#a6e3a1",
  mauve: "#cba6f7",
  blue: "#89b4fa",
  rosewater: "#f5e0dc",
  peach: "#fab387",
  yellow: "#f9e2af",
  red: "#f38ba8",
};

interface SimpleMarkdownProps {
  content: string;
  style?: object;
}

type Block =
  | { kind: "code"; lang: string; text: string }
  | { kind: "heading"; level: 1 | 2 | 3; text: string }
  | { kind: "list-item"; depth: number; text: string }
  | { kind: "rule" }
  | { kind: "paragraph"; text: string };

/** Split content into top-level blocks. */
function parseBlocks(content: string): Block[] {
  const blocks: Block[] = [];
  const lines = content.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.trimStart().startsWith("```")) {
      const lang = line.trimStart().slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      blocks.push({ kind: "code", lang, text: codeLines.join("\n") });
      continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,3})\s+(.*)/);
    if (headingMatch) {
      const level = Math.min(headingMatch[1].length, 3) as 1 | 2 | 3;
      blocks.push({ kind: "heading", level, text: headingMatch[2].trim() });
      i++;
      continue;
    }

    // Horizontal rule
    if (/^[-*_]{3,}\s*$/.test(line.trim())) {
      blocks.push({ kind: "rule" });
      i++;
      continue;
    }

    // List item (unordered or ordered)
    const listMatch = line.match(/^(\s*)[-*+]\s+(.*)/) ?? line.match(/^(\s*)\d+\.\s+(.*)/);
    if (listMatch) {
      const depth = Math.floor(listMatch[1].length / 2);
      blocks.push({ kind: "list-item", depth, text: listMatch[2].trim() });
      i++;
      continue;
    }

    // Blank line — skip (separates paragraphs)
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Paragraph — accumulate consecutive non-special lines
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].trimStart().startsWith("```") &&
      !lines[i].match(/^#{1,3}\s/) &&
      !lines[i].match(/^[-*+]\s/) &&
      !lines[i].match(/^\d+\.\s/) &&
      !/^[-*_]{3,}\s*$/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      blocks.push({ kind: "paragraph", text: paraLines.join("\n") });
    }
  }

  return blocks;
}

/**
 * Render inline styles: **bold**, `code`, _italic_, plain text.
 * Returns an array of <Text> spans.
 */
function renderInline(text: string, baseStyle: object): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  // Pattern: **bold**, `code`, _italic_, or plain
  const re = /(\*\*(.+?)\*\*|`([^`]+)`|_(.+?)_)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = re.exec(text)) !== null) {
    // Plain text before this match
    if (match.index > lastIndex) {
      parts.push(
        <Text key={key++} style={baseStyle}>
          {text.slice(lastIndex, match.index)}
        </Text>
      );
    }

    if (match[0].startsWith("**")) {
      parts.push(
        <Text key={key++} style={[baseStyle, styles.bold]}>
          {match[2]}
        </Text>
      );
    } else if (match[0].startsWith("`")) {
      parts.push(
        <Text key={key++} style={[styles.inlineCode]}>
          {match[3]}
        </Text>
      );
    } else if (match[0].startsWith("_")) {
      parts.push(
        <Text key={key++} style={[baseStyle, styles.italic]}>
          {match[4]}
        </Text>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Remaining plain text
  if (lastIndex < text.length) {
    parts.push(
      <Text key={key++} style={baseStyle}>
        {text.slice(lastIndex)}
      </Text>
    );
  }

  return parts.length > 0 ? parts : [<Text key={0} style={baseStyle}>{text}</Text>];
}

export function SimpleMarkdown({ content, style }: SimpleMarkdownProps) {
  const blocks = parseBlocks(content);

  return (
    <View style={style}>
      {blocks.map((block, idx) => {
        switch (block.kind) {
          case "code":
            return (
              <View key={idx} style={styles.codeBlock}>
                {block.lang ? (
                  <Text style={styles.codeLang}>{block.lang}</Text>
                ) : null}
                <Text style={styles.codeText} selectable>
                  {block.text}
                </Text>
              </View>
            );

          case "heading": {
            const headingStyle =
              block.level === 1
                ? styles.h1
                : block.level === 2
                ? styles.h2
                : styles.h3;
            return (
              <Text key={idx} style={headingStyle} selectable>
                {block.text}
              </Text>
            );
          }

          case "list-item":
            return (
              <View
                key={idx}
                style={[styles.listItem, { paddingLeft: 12 + block.depth * 16 }]}
              >
                <Text style={styles.listBullet}>•</Text>
                <Text style={styles.listText} selectable>
                  {renderInline(block.text, styles.listText)}
                </Text>
              </View>
            );

          case "rule":
            return <View key={idx} style={styles.rule} />;

          case "paragraph":
          default:
            return (
              <Text key={idx} style={styles.paragraph} selectable>
                {renderInline(block.text, styles.paragraph)}
              </Text>
            );
        }
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  // Headings
  h1: {
    fontSize: 20,
    fontWeight: "700",
    color: CTP.mauve,
    marginTop: 16,
    marginBottom: 6,
    lineHeight: 28,
  },
  h2: {
    fontSize: 17,
    fontWeight: "700",
    color: CTP.mauve,
    marginTop: 14,
    marginBottom: 4,
    lineHeight: 24,
  },
  h3: {
    fontSize: 15,
    fontWeight: "600",
    color: CTP.mauve,
    marginTop: 10,
    marginBottom: 4,
    lineHeight: 22,
  },

  // Paragraph
  paragraph: {
    fontSize: 14,
    lineHeight: 22,
    color: CTP.text,
    marginBottom: 8,
    fontFamily: MONO_FONT,
  },

  // Code block
  codeBlock: {
    backgroundColor: CTP.base,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    marginTop: 4,
    borderWidth: 1,
    borderColor: CTP.surface,
  },
  codeLang: {
    fontSize: 10,
    color: CTP.overlay,
    fontFamily: MONO_FONT,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  codeText: {
    fontFamily: MONO_FONT,
    fontSize: 12,
    lineHeight: 18,
    color: CTP.green,
  },

  // Inline code
  inlineCode: {
    fontFamily: MONO_FONT,
    fontSize: 13,
    color: CTP.green,
    backgroundColor: CTP.base,
    borderRadius: 4,
    paddingHorizontal: 4,
  },

  // Inline styles
  bold: {
    fontWeight: "700",
    color: CTP.rosewater,
  },
  italic: {
    fontStyle: "italic",
  },

  // List
  listItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 4,
    gap: 6,
  },
  listBullet: {
    color: CTP.mauve,
    fontSize: 14,
    lineHeight: 22,
  },
  listText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
    color: CTP.text,
    fontFamily: MONO_FONT,
  },

  // Horizontal rule
  rule: {
    height: 1,
    backgroundColor: CTP.surface,
    marginVertical: 12,
  },
});
