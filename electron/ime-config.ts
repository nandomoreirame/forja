export interface ImeConfig {
  switches: [string, ...string[]][];
  env: Record<string, string>;
  composeContent?: string;
}

// Cedilla overrides: dead_acute + c/C produces c-cedilla instead of c-acute.
// Placed BEFORE the include so they take priority in first-match-wins parsers.
const CEDILLA_COMPOSE = [
  '<dead_acute> <C> : "\u00C7" Ccedilla # LATIN CAPITAL LETTER C WITH CEDILLA',
  '<dead_acute> <c> : "\u00E7" ccedilla # LATIN SMALL LETTER C WITH CEDILLA',
  'include "/usr/share/X11/locale/en_US.UTF-8/Compose"',
].join("\n");

export function resolveImeConfig(
  platform: string,
  env: Record<string, string | undefined>,
): ImeConfig {
  const config: ImeConfig = { switches: [], env: {} };

  if (platform !== "linux") return config;

  // On Wayland, dead keys are handled by the compositor's XKB compose
  // sequences (e.g. Hyprland kb_variant=intl). Enabling the Wayland
  // text-input protocol (enable-wayland-ime) would allow the IM daemon
  // (fcitx5/ibus) to ALSO compose the character, and Chromium's ozone
  // backend processes both paths -- duplicating every accented character.
  // We therefore skip the flag and rely on XKB compose alone.

  const lang = env.LANG || env.LC_ALL || "";
  if (lang.startsWith("pt_BR")) {
    if (!env.GTK_IM_MODULE) {
      config.env.GTK_IM_MODULE = "cedilla";
    }

    // Chromium on Wayland ignores ~/.XCompose (Electron #29345).
    // We always generate our own compose file with cedilla overrides and
    // set XCOMPOSEFILE so libxkbcommon loads it instead of the default.
    // Even if XCOMPOSEFILE is already set (e.g. via systemd user env
    // pointing to ~/.XCompose), Chromium's Wayland backend won't read it,
    // so we must override with our own file.
    config.composeContent = CEDILLA_COMPOSE;
  }

  return config;
}
