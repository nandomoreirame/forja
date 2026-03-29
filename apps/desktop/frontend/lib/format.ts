const UNITS = ["B", "KB", "MB", "GB", "TB"] as const;

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes <= 0) return "0 B";

  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const index = Math.min(i, UNITS.length - 1);
  const value = bytes / Math.pow(k, index);

  return `${value.toFixed(decimals)} ${UNITS[index]}`;
}
