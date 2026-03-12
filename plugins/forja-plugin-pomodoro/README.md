# forja-plugin-pomodoro

A simple Pomodoro timer plugin for [Forja](https://github.com/user/forja).

## Features

- 25/5/15 Pomodoro cycles with configurable durations
- Desktop notifications when sessions complete
- Theme-aware UI (adapts to Forja's active theme)
- Session counter and total focus time tracking

## Installation

Copy this directory to your Forja plugins folder:

    cp -r forja-plugin-pomodoro ~/.config/forja/plugins/

The plugin will appear automatically in Forja's right sidebar.

## Using as Scaffolding

This plugin is designed as a template for creating new Forja plugins.
To create your own plugin:

1. Copy this directory and rename it:

       cp -r forja-plugin-pomodoro my-plugin-name

2. Edit `manifest.json`:
   - `name`: kebab-case unique identifier (e.g. `my-plugin-name`)
   - `displayName`: Human-readable name shown in the sidebar
   - `icon`: Any [Lucide](https://lucide.dev/icons/) icon name
   - `permissions`: Only request what you need (see below)

3. Edit `index.html`, `styles.css`, `app.js` with your plugin UI and logic.

4. Place in `~/.config/forja/plugins/my-plugin-name/`

## Plugin Structure

    my-plugin/
    ├── manifest.json   # Required: plugin metadata and permissions
    ├── index.html      # Required: entry point (set in manifest.entry)
    ├── styles.css      # Optional: styles (linked from index.html)
    ├── app.js          # Optional: logic (linked from index.html)
    └── README.md       # Optional: documentation

## Manifest Schema

    {
      "name": "my-plugin",             // Required: kebab-case
      "version": "1.0.0",              // Required: semver
      "displayName": "My Plugin",      // Required: shown in UI
      "description": "What it does",   // Required
      "author": "Your Name",           // Required
      "icon": "Sparkles",              // Required: Lucide icon name
      "entry": "index.html",           // Required: HTML entry point
      "permissions": ["theme.current"],  // Required: list of permissions
      "minForjaVersion": "1.6.0"       // Optional: minimum Forja version
    }

## Available Permissions

| Permission         | Description                        | Risk     |
|--------------------|------------------------------------|----------|
| `project.active`   | Read active project info           | Low      |
| `theme.current`    | Read current theme colors          | Low      |
| `notifications`    | Show desktop notifications         | Low      |
| `git.status`       | Read git status                    | Low      |
| `git.log`          | Read git commit history            | Low      |
| `git.diff`         | Read file diffs                    | Medium   |
| `fs.read`          | Read project files                 | Medium   |
| `fs.write`         | Write project files                | High     |
| `terminal.output`  | Read terminal output               | High     |
| `terminal.execute` | Execute terminal commands          | Critical |

## Forja Plugin API

All API calls return Promises and require the corresponding permission.

    // Project info
    const project = await forja.project.getActive();

    // Git operations
    const status = await forja.git.status();
    const log = await forja.git.log({ limit: 20 });
    const diff = await forja.git.diff();

    // File system (scoped to project dir)
    const content = await forja.fs.readFile("src/index.ts");
    await forja.fs.writeFile("output.txt", "content");

    // Theme
    const theme = await forja.theme.getCurrent();

    // Notifications
    await forja.notifications.show({ title: "Done!", body: "Task completed" });

    // Terminal
    const output = await forja.terminal.getOutput();
    await forja.terminal.execute("echo hello");

    // Events
    const unsubscribe = forja.on("theme-changed", (theme) => {
      // update UI colors
    });
    // later: unsubscribe()

## Theme Integration (MANDATORY)

Plugins **MUST** use `--forja-*` CSS variables for all colors. Hardcoded color values
or custom color variables are not allowed. Forja's PluginHost injects theme CSS
variables automatically when the plugin loads, and updates them when the user
switches themes.

**Do NOT** define your own `:root` color fallbacks or manually apply theme colors
via JavaScript. The host handles this entirely.

### Available CSS Variables

    /* Backgrounds */
    --forja-bg-base, --forja-bg-mantle, --forja-bg-surface,
    --forja-bg-overlay, --forja-bg-highlight

    /* Text */
    --forja-text, --forja-text-sub, --forja-text-muted

    /* Accent / brand */
    --forja-accent, --forja-accent-hover, --forja-accent-subtle

    /* Semantic status */
    --forja-success, --forja-warning, --forja-error, --forja-info

    /* Terminal palette (for syntax-like highlighting) */
    --forja-red, --forja-green, --forja-yellow, --forja-blue,
    --forja-magenta, --forja-cyan

### Usage Example

    body {
      background: var(--forja-bg-base);
      color: var(--forja-text);
    }
    .accent-button {
      background: var(--forja-accent);
      color: var(--forja-bg-base);
    }
    .accent-button:hover {
      background: var(--forja-accent-hover);
    }

### Listening for Theme Changes (optional)

If your plugin needs to react to theme changes in JavaScript (e.g. update a
canvas or chart), you can listen for the event:

    forja.on("theme-changed", function(theme) {
      // theme.colors.base, theme.colors.accent, etc.
      // CSS variables are already updated at this point
    });

## License

MIT
