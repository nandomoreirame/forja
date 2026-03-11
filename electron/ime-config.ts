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

  if (env.WAYLAND_DISPLAY) {
    config.switches.push(["enable-wayland-ime"]);
  }

  const lang = env.LANG || env.LC_ALL || "";
  if (lang.startsWith("pt_BR") && !env.GTK_IM_MODULE) {
    config.env.GTK_IM_MODULE = "cedilla";
  }

  return config;
}
