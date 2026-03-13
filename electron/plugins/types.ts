export type PluginPermission =
  | "project.active"
  | "git.status"
  | "git.log"
  | "git.diff"
  | "fs.read"
  | "fs.write"
  | "terminal.output"
  | "terminal.execute"
  | "theme.current"
  | "notifications";

export const VALID_PERMISSIONS: readonly PluginPermission[] = [
  "project.active",
  "git.status",
  "git.log",
  "git.diff",
  "fs.read",
  "fs.write",
  "terminal.output",
  "terminal.execute",
  "theme.current",
  "notifications",
] as const;

export interface PluginManifest {
  name: string;
  version: string;
  displayName: string;
  description: string;
  author: string;
  icon: string;
  entry: string;
  permissions: PluginPermission[];
  minForjaVersion?: string;
}

export interface LoadedPlugin {
  manifest: PluginManifest;
  path: string;
  entryUrl: string;
  enabled: boolean;
}

export interface PluginPermissionGrant {
  pluginName: string;
  grantedPermissions: PluginPermission[];
  deniedPermissions: PluginPermission[];
  grantedAt: string;
}

const KEBAB_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SEMVER_RE = /^\d+\.\d+\.\d+$/;

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  manifest?: PluginManifest;
}

export function validateManifest(raw: unknown): ValidationResult {
  const errors: string[] = [];

  if (!raw || typeof raw !== "object") {
    return { valid: false, errors: ["Manifest must be a JSON object"] };
  }

  const obj = raw as Record<string, unknown>;

  const requiredStrings = [
    "name",
    "version",
    "displayName",
    "description",
    "author",
    "icon",
    "entry",
  ];

  for (const field of requiredStrings) {
    if (typeof obj[field] !== "string" || (obj[field] as string).trim() === "") {
      errors.push(`Missing or invalid field: "${field}"`);
    }
  }

  if (typeof obj.name === "string" && !KEBAB_RE.test(obj.name)) {
    errors.push(`Name must be kebab-case: "${obj.name}"`);
  }

  if (typeof obj.version === "string" && !SEMVER_RE.test(obj.version)) {
    errors.push(`Version must be semver (x.y.z): "${obj.version}"`);
  }

  if (!Array.isArray(obj.permissions)) {
    errors.push('Missing or invalid field: "permissions"');
  } else {
    for (const p of obj.permissions) {
      if (!VALID_PERMISSIONS.includes(p as PluginPermission)) {
        errors.push(`Invalid permission: "${p}"`);
      }
    }
  }

  if (
    obj.minForjaVersion !== undefined &&
    (typeof obj.minForjaVersion !== "string" || !SEMVER_RE.test(obj.minForjaVersion))
  ) {
    errors.push(`Invalid minForjaVersion: "${obj.minForjaVersion}"`);
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, errors: [], manifest: obj as unknown as PluginManifest };
}

export interface RegistryPlugin {
  name: string;
  displayName: string;
  description: string;
  author: string;
  icon: string;
  version: string;
  downloadUrl: string;
  sha256: string;
  tags: string[];
  downloads: number;
  minForjaVersion?: string;
  permissions: PluginPermission[];
}

export interface RegistryData {
  version: number;
  plugins: RegistryPlugin[];
}

export type InstallProgress =
  | { stage: "downloading"; percent: number }
  | { stage: "verifying" }
  | { stage: "extracting" }
  | { stage: "done" }
  | { stage: "error"; message: string };

export interface RegistryValidationResult {
  valid: boolean;
  errors: string[];
  data?: RegistryData;
}

export function validateRegistryData(raw: unknown): RegistryValidationResult {
  const errors: string[] = [];

  if (!raw || typeof raw !== "object") {
    return { valid: false, errors: ["Registry data must be a JSON object"] };
  }

  const obj = raw as Record<string, unknown>;

  if (typeof obj.version !== "number") {
    errors.push('Missing or invalid field: "version"');
  }

  if (!Array.isArray(obj.plugins)) {
    errors.push('Missing or invalid field: "plugins"');
    return { valid: false, errors };
  }

  for (let i = 0; i < obj.plugins.length; i++) {
    const plugin = obj.plugins[i] as Record<string, unknown>;
    const prefix = `plugins[${i}]`;

    const requiredStrings = [
      "name",
      "displayName",
      "description",
      "author",
      "icon",
      "version",
      "downloadUrl",
    ];
    for (const field of requiredStrings) {
      if (typeof plugin[field] !== "string" || (plugin[field] as string).trim() === "") {
        errors.push(`${prefix}: Missing or invalid field: "${field}"`);
      }
    }

    // Validate name format (kebab-case)
    if (typeof plugin.name === "string" && !KEBAB_RE.test(plugin.name)) {
      errors.push(`${prefix}: Name must be kebab-case: "${plugin.name}"`);
    }

    // Validate version format (semver)
    if (typeof plugin.version === "string" && !SEMVER_RE.test(plugin.version)) {
      errors.push(`${prefix}: Version must be semver (x.y.z): "${plugin.version}"`);
    }

    // sha256 is optional (empty string allowed for development)
    if (plugin.sha256 !== undefined && typeof plugin.sha256 !== "string") {
      errors.push(`${prefix}: sha256 must be a string`);
    }

    if (!Array.isArray(plugin.tags)) {
      errors.push(`${prefix}: Missing or invalid field: "tags"`);
    }

    if (typeof plugin.downloads !== "number") {
      errors.push(`${prefix}: Missing or invalid field: "downloads"`);
    }

    if (!Array.isArray(plugin.permissions)) {
      errors.push(`${prefix}: Missing or invalid field: "permissions"`);
    } else {
      for (const p of plugin.permissions) {
        if (!VALID_PERMISSIONS.includes(p as PluginPermission)) {
          errors.push(`${prefix}: Invalid permission: "${p}"`);
        }
      }
    }

    if (
      plugin.minForjaVersion !== undefined &&
      (typeof plugin.minForjaVersion !== "string" || !SEMVER_RE.test(plugin.minForjaVersion))
    ) {
      errors.push(`${prefix}: Invalid minForjaVersion: "${plugin.minForjaVersion}"`);
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, errors: [], data: obj as unknown as RegistryData };
}

export function satisfiesMinVersion(current: string, required: string): boolean {
  const [cMaj, cMin, cPat] = current.split(".").map(Number);
  const [rMaj, rMin, rPat] = required.split(".").map(Number);

  if (cMaj !== rMaj) return cMaj > rMaj;
  if (cMin !== rMin) return cMin > rMin;
  return cPat >= rPat;
}
