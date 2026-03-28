import { validateRegistryData } from "./types.js";
import type { RegistryData } from "./types.js";

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface CacheEntry {
  data: RegistryData;
  fetchedAt: number;
}

// In-memory cache keyed by URL
const cache = new Map<string, CacheEntry>();

// Offline fallback — keeps last successful data even after cache clear
const fallbackCache = new Map<string, RegistryData>();

export function clearRegistryCache(): void {
  cache.clear();
}

export function clearFallbackCache(): void {
  fallbackCache.clear();
}

export async function fetchRegistry(url: string): Promise<RegistryData> {
  // Check cache
  const cached = cache.get(url);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Registry fetch failed: ${response.status} ${response.statusText}`);
    }

    const raw = await response.json();
    const result = validateRegistryData(raw);
    if (!result.valid || !result.data) {
      throw new Error(`Invalid registry data: ${result.errors.join(", ")}`);
    }

    const entry: CacheEntry = { data: result.data, fetchedAt: Date.now() };
    cache.set(url, entry);
    fallbackCache.set(url, result.data);

    return result.data;
  } catch (error) {
    // Offline fallback — return last known data if available
    const fallback = fallbackCache.get(url);
    if (fallback) {
      return fallback;
    }
    throw error;
  }
}
