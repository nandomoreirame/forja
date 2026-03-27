import { useEffect, useMemo, useRef, useState } from "react";
import { Search, RotateCw, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMarketplaceStore } from "@/stores/marketplace";
import { usePluginsStore } from "@/stores/plugins";
import { MarketplacePluginCard } from "./marketplace-plugin-card";
import type { RegistryPlugin } from "@/lib/plugin-types";

export function MarketplacePane() {
  const registry = useMarketplaceStore((s) => s.registry);
  const loading = useMarketplaceStore((s) => s.loading);
  const error = useMarketplaceStore((s) => s.error);
  const searchQuery = useMarketplaceStore((s) => s.searchQuery);
  const activeTag = useMarketplaceStore((s) => s.activeTag);
  const installProgress = useMarketplaceStore((s) => s.installProgress);
  const fetchRegistry = useMarketplaceStore((s) => s.fetchRegistry);
  const setSearchQuery = useMarketplaceStore((s) => s.setSearchQuery);
  const setActiveTag = useMarketplaceStore((s) => s.setActiveTag);
  const installPlugin = useMarketplaceStore((s) => s.installPlugin);
  const uninstallPlugin = useMarketplaceStore((s) => s.uninstallPlugin);
  const getFilteredPlugins = useMarketplaceStore((s) => s.getFilteredPlugins);
  const getAllTags = useMarketplaceStore((s) => s.getAllTags);

  const installedPlugins = usePluginsStore((s) => s.plugins);

  // Local search input state with debounce
  const [inputValue, setInputValue] = useState(searchQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-fetch on mount
  useEffect(() => {
    fetchRegistry();
  }, [fetchRegistry]);

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setInputValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchQuery(value);
    }, 300);
  }

  function handleTagClick(tag: string | null) {
    if (tag === null) {
      setActiveTag(null);
      return;
    }
    if (tag === activeTag) {
      setActiveTag(null);
    } else {
      setActiveTag(tag);
    }
  }

  const installedNames = new Set(installedPlugins.map((p) => p.manifest.name));
  const filteredPlugins = getFilteredPlugins();
  const installedFiltered = filteredPlugins.filter((p) => installedNames.has(p.name));
  const availableFiltered = filteredPlugins.filter((p) => !installedNames.has(p.name));

  // Local-only plugins: installed on filesystem but not in the registry
  const localOnlyPlugins = useMemo(() => {
    const registryAllNames = new Set(
      (registry?.plugins ?? []).map((p) => p.name)
    );
    const q = searchQuery.toLowerCase().trim();

    return installedPlugins
      .filter((p) => !registryAllNames.has(p.manifest.name))
      .filter((p) => {
        // Apply search filter
        if (q) {
          const m = p.manifest;
          const matchesSearch =
            m.name.toLowerCase().includes(q) ||
            m.displayName.toLowerCase().includes(q) ||
            m.description.toLowerCase().includes(q) ||
            (m.tags ?? []).some((t) => t.toLowerCase().includes(q));
          if (!matchesSearch) return false;
        }
        // Apply tag filter
        if (activeTag) {
          if (!(p.manifest.tags ?? []).includes(activeTag)) return false;
        }
        return true;
      })
      .map(
        (p): RegistryPlugin => ({
          name: p.manifest.name,
          displayName: p.manifest.displayName,
          description: p.manifest.description,
          author: p.manifest.author,
          icon: p.manifest.icon,
          version: p.manifest.version,
          downloadUrl: "",
          sha256: "",
          tags: p.manifest.tags ?? [],
          downloads: 0,
          scope: p.manifest.scope,
          minForjaVersion: p.manifest.minForjaVersion,
          permissions: p.manifest.permissions,
        })
      );
  }, [installedPlugins, registry, searchQuery, activeTag]);

  // Collect tags from both registry and local plugins
  const tags = useMemo(() => {
    const tagSet = new Set<string>();
    for (const tag of getAllTags()) {
      tagSet.add(tag);
    }
    for (const p of installedPlugins) {
      for (const tag of p.manifest.tags ?? []) {
        tagSet.add(tag);
      }
    }
    return [...tagSet].sort();
  }, [getAllTags, installedPlugins]);

  const totalInstalled = installedFiltered.length + localOnlyPlugins.length;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Pane header */}
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-ctp-surface0 px-3">
        <span className="text-app-sm font-semibold text-ctp-text">Marketplace</span>
        <button
          type="button"
          aria-label="Refresh marketplace"
          onClick={() => fetchRegistry()}
          className="flex h-6 w-6 items-center justify-center rounded text-ctp-overlay1 transition-colors hover:bg-ctp-surface0 hover:text-ctp-text"
        >
          <RotateCw className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
      </div>

      {/* Search input */}
      <div className="shrink-0 border-b border-ctp-surface0 px-3 py-2">
        <div className="flex items-center gap-2 rounded-md border border-ctp-surface1 bg-ctp-mantle px-2 py-1">
          <Search className="h-3.5 w-3.5 shrink-0 text-ctp-overlay1" strokeWidth={1.5} />
          <input
            type="text"
            placeholder="Search plugins..."
            value={inputValue}
            onChange={handleSearchChange}
            className="flex-1 bg-transparent text-app-sm text-ctp-text placeholder:text-ctp-overlay0 outline-none"
          />
        </div>
      </div>

      {/* Tag filter chips */}
      {tags.length > 0 && (
        <div className="shrink-0 border-b border-ctp-surface0 px-3 py-1.5">
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
            {/* All chip */}
            <button
              type="button"
              onClick={() => handleTagClick(null)}
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-app-xs transition-colors",
                activeTag === null
                  ? "bg-ctp-mauve text-ctp-base"
                  : "bg-ctp-surface0 text-ctp-subtext0 hover:bg-ctp-surface1"
              )}
            >
              All
            </button>
            {tags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => handleTagClick(tag)}
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-app-xs transition-colors",
                  activeTag === tag
                    ? "bg-ctp-mauve text-ctp-base"
                    : "bg-ctp-surface0 text-ctp-subtext0 hover:bg-ctp-surface1"
                )}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {/* Loading state */}
        {loading && (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-ctp-overlay1" strokeWidth={1.5} />
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center gap-3 px-4 py-10 text-center">
            <AlertCircle className="h-8 w-8 text-ctp-red" strokeWidth={1.5} />
            <p className="text-app-sm text-ctp-subtext0">{error}</p>
            <button
              type="button"
              onClick={() => fetchRegistry()}
              className="rounded-md border border-ctp-surface1 bg-ctp-mantle px-3 py-1.5 text-app-sm text-ctp-subtext0 transition-colors hover:bg-ctp-surface0 hover:text-ctp-text"
            >
              Retry
            </button>
          </div>
        )}

        {/* Plugin list */}
        {!loading && !error && registry && (
          <>
            {/* Empty state */}
            {filteredPlugins.length === 0 && localOnlyPlugins.length === 0 && (
              <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
                <p className="text-app-sm text-ctp-overlay1">No plugins found</p>
              </div>
            )}

            {/* Installed section */}
            {totalInstalled > 0 && (
              <div className="px-3 pb-2 pt-3">
                <p className="mb-2 text-app-sm font-semibold uppercase tracking-wide text-ctp-overlay1">
                  Installed ({totalInstalled})
                </p>
                <div className="flex flex-col gap-2">
                  {installedFiltered.map((plugin) => {
                    const installedPlugin = installedPlugins.find(
                      (p) => p.manifest.name === plugin.name
                    );
                    return (
                      <MarketplacePluginCard
                        key={plugin.name}
                        plugin={plugin}
                        installed={true}
                        installedVersion={installedPlugin?.manifest.version}
                        installProgress={installProgress[plugin.name]}
                        onInstall={installPlugin}
                        onUninstall={uninstallPlugin}
                      />
                    );
                  })}
                  {localOnlyPlugins.map((plugin) => (
                    <MarketplacePluginCard
                      key={plugin.name}
                      plugin={plugin}
                      installed={true}
                      installedVersion={plugin.version}
                      isLocal={true}
                      onInstall={installPlugin}
                      onUninstall={uninstallPlugin}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Available section */}
            {availableFiltered.length > 0 && (
              <div className="px-3 pb-3 pt-3">
                <p className="mb-2 text-app-sm font-semibold uppercase tracking-wide text-ctp-overlay1">
                  Available ({availableFiltered.length})
                </p>
                <div className="flex flex-col gap-2">
                  {availableFiltered.map((plugin) => (
                    <MarketplacePluginCard
                      key={plugin.name}
                      plugin={plugin}
                      installed={false}
                      installProgress={installProgress[plugin.name]}
                      onInstall={installPlugin}
                      onUninstall={uninstallPlugin}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
