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

export function satisfiesMinVersion(current: string, required: string): boolean {
  const [cMaj, cMin, cPat] = current.split(".").map(Number);
  const [rMaj, rMin, rPat] = required.split(".").map(Number);

  if (cMaj !== rMaj) return cMaj > rMaj;
  if (cMin !== rMin) return cMin > rMin;
  return cPat >= rPat;
}
