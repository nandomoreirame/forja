import type { IJsonModel } from "flexlayout-react";
import { DEFAULT_LAYOUT } from "./default-layout";

/**
 * Validates that a JSON object looks like a valid flexlayout model.
 * Checks for required top-level structure without importing Model
 * (which would fail if the JSON is invalid).
 */
export function isValidLayoutJson(
  json: unknown,
): json is IJsonModel {
  if (!json || typeof json !== "object") return false;
  const obj = json as Record<string, unknown>;
  if (!obj.layout || typeof obj.layout !== "object") return false;
  const layout = obj.layout as Record<string, unknown>;
  return typeof layout.type === "string" && Array.isArray(layout.children);
}

/**
 * Recursively checks if a layout JSON tree contains at least one
 * tabset that can receive new blocks.
 * Excludes legacy "tabset-sidebar" for backward compatibility with
 * saved layouts from versions that used a fixed sidebar tabset.
 */
function hasUsableTabset(node: Record<string, unknown>): boolean {
  if (node.type === "tabset" && node.id !== "tabset-sidebar") return true;
  const children = node.children as Record<string, unknown>[] | undefined;
  if (Array.isArray(children)) {
    return children.some((child) => hasUsableTabset(child));
  }
  return false;
}

/**
 * Safely parses a persisted layout JSON, falling back to default if invalid.
 * Also rejects layouts with no usable tabset (e.g., all tabs were closed
 * and tabset-main was removed before saving).
 */
export function parseLayoutJson(
  json: unknown,
): IJsonModel {
  if (isValidLayoutJson(json)) {
    const layout = json.layout as Record<string, unknown>;
    if (hasUsableTabset(layout)) {
      return json;
    }
  }
  return DEFAULT_LAYOUT;
}

