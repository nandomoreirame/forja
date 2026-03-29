const extensionMap: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  json: "json",
  jsonc: "json",
  py: "python",
  rb: "ruby",
  rs: "rust",
  go: "go",
  java: "java",
  kt: "kotlin",
  scala: "scala",
  swift: "swift",
  c: "c",
  cpp: "cpp",
  h: "c",
  hpp: "cpp",
  cs: "csharp",
  php: "php",
  html: "html",
  htm: "html",
  css: "css",
  scss: "scss",
  sass: "scss",
  less: "less",
  xml: "xml",
  svg: "xml",
  yaml: "yaml",
  yml: "yaml",
  toml: "toml",
  md: "markdown",
  mdx: "markdown",
  sql: "sql",
  graphql: "graphql",
  gql: "graphql",
  sh: "shell",
  bash: "shell",
  zsh: "shell",
  fish: "shell",
  dockerfile: "dockerfile",
  makefile: "makefile",
  vue: "html",
  svelte: "html",
  lua: "lua",
  r: "r",
  dart: "dart",
  zig: "zig",
  ini: "ini",
  conf: "ini",
  env: "ini",
};

export function detectLanguage(filename: string): string {
  const lower = filename.toLowerCase();
  const basename = lower.split("/").pop() || lower;

  if (basename === "dockerfile" || basename.startsWith("dockerfile.")) {
    return "dockerfile";
  }
  if (basename === "makefile" || basename === "gnumakefile") {
    return "makefile";
  }

  const ext = basename.split(".").pop() || "";
  return extensionMap[ext] || "plaintext";
}
