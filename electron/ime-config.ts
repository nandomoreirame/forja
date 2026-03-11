export interface ImeConfig {
  switches: [string, ...string[]][];
  env: Record<string, string>;
}

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
  // backend processes both paths — duplicating every accented character.
  // We therefore skip the flag and rely on XKB compose alone.

  const lang = env.LANG || env.LC_ALL || "";
  if (lang.startsWith("pt_BR") && !env.GTK_IM_MODULE) {
    config.env.GTK_IM_MODULE = "cedilla";
  }

  return config;
}
