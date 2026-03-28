import { useState, useRef, useEffect } from "react";
import { FolderSync, Download, Upload, FolderPlus, Save, FileUp } from "lucide-react";
import { useContextHubStore } from "@/stores/context-hub";
import { open } from "@/lib/ipc";
import { cn } from "@/lib/utils";

export function ContextSection() {
  const {
    items,
    currentItem,
    loading,
    error,
    initHub,
    syncOut,
    syncIn,
    readItem,
    writeItem,
    importItem,
    listItems,
  } = useContextHubStore();

  const [editContent, setEditContent] = useState<string | null>(null);
  const [importMenuOpen, setImportMenuOpen] = useState(false);
  const importRef = useRef<HTMLDivElement>(null);

  const displayContent = editContent ?? currentItem?.content ?? "";

  function handleItemClick(type: string, slug: string) {
    setEditContent(null);
    readItem(type, slug);
  }

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (importRef.current && !importRef.current.contains(e.target as Node)) {
        setImportMenuOpen(false);
      }
    }
    if (importMenuOpen) {
      document.addEventListener("mousedown", onClickOutside);
      return () => document.removeEventListener("mousedown", onClickOutside);
    }
  }, [importMenuOpen]);

  async function handleImport(type: string) {
    setImportMenuOpen(false);
    const result = await open({
      title: `Import ${type}`,
      filters: [{ name: "Markdown", extensions: ["md"] }],
      multiple: true,
    });
    if (!result) return;
    const paths = Array.isArray(result) ? result : [result];
    for (const filePath of paths) {
      await importItem(type, filePath);
    }
    await listItems();
  }

  async function handleSave() {
    if (!currentItem) return;
    await writeItem(currentItem.type, currentItem.slug, editContent ?? currentItem.content);
    setEditContent(null);
  }

  // Group items by type
  const grouped: Record<string, typeof items> = {};
  for (const item of items) {
    if (!grouped[item.type]) grouped[item.type] = [];
    grouped[item.type].push(item);
  }

  const typeLabels: Record<string, string> = {
    skill: "Skills",
    agent: "Agents",
    doc: "Docs",
  };

  return (
    <div data-testid="settings-section-context">
      {/* Header */}
      <div className="flex items-center gap-2 pb-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-ctp-surface0">
          <FolderSync className="h-3.5 w-3.5 text-ctp-mauve" strokeWidth={1.5} />
        </div>
        <h3 className="text-app font-semibold text-ctp-text">Context Hub</h3>
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex items-center gap-2">
        <button
          type="button"
          aria-label="Init"
          onClick={() => initHub()}
          disabled={loading}
          className={cn(
            "flex items-center gap-1.5 rounded-md border border-ctp-surface0 px-3 py-1.5 text-app-sm text-ctp-subtext0 transition-colors hover:bg-ctp-surface0 hover:text-ctp-text",
            loading && "opacity-50",
          )}
        >
          <FolderPlus className="h-3 w-3" strokeWidth={1.5} />
          Init
        </button>
        <button
          type="button"
          aria-label="Sync Out"
          onClick={() => syncOut()}
          disabled={loading}
          className={cn(
            "flex items-center gap-1.5 rounded-md border border-ctp-surface0 px-3 py-1.5 text-app-sm text-ctp-subtext0 transition-colors hover:bg-ctp-surface0 hover:text-ctp-text",
            loading && "opacity-50",
          )}
        >
          <Upload className="h-3 w-3" strokeWidth={1.5} />
          Sync Out
        </button>
        <button
          type="button"
          aria-label="Sync In"
          onClick={() => syncIn()}
          disabled={loading}
          className={cn(
            "flex items-center gap-1.5 rounded-md border border-ctp-surface0 px-3 py-1.5 text-app-sm text-ctp-subtext0 transition-colors hover:bg-ctp-surface0 hover:text-ctp-text",
            loading && "opacity-50",
          )}
        >
          <Download className="h-3 w-3" strokeWidth={1.5} />
          Sync In
        </button>
        <div ref={importRef} className="relative">
          <button
            type="button"
            aria-label="Import"
            onClick={() => setImportMenuOpen((v) => !v)}
            disabled={loading}
            className={cn(
              "flex items-center gap-1.5 rounded-md border border-ctp-surface0 px-3 py-1.5 text-app-sm text-ctp-subtext0 transition-colors hover:bg-ctp-surface0 hover:text-ctp-text",
              loading && "opacity-50",
            )}
          >
            <FileUp className="h-3 w-3" strokeWidth={1.5} />
            Import
          </button>
          {importMenuOpen && (
            <div className="absolute left-0 top-full z-10 mt-1 w-40 rounded-md border border-ctp-surface0 bg-overlay-base py-1 shadow-lg">
              {(["skill", "agent", "doc"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleImport(type)}
                  className="flex w-full items-center px-3 py-1.5 text-app-sm text-ctp-subtext0 transition-colors hover:bg-ctp-surface0 hover:text-ctp-text"
                >
                  Import {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-3 rounded-md border border-ctp-red/30 bg-ctp-red/10 px-3 py-2 text-app-sm text-ctp-red">
          {error}
        </div>
      )}

      <div className="flex gap-4">
        {/* Item list */}
        <div className="w-48 shrink-0">
          {items.length === 0 ? (
            <p className="py-4 text-center text-app text-ctp-overlay1">No items found</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(grouped).map(([type, typeItems]) => (
                <div key={type}>
                  <p className="mb-1 px-1 text-app-xs font-medium uppercase tracking-wider text-ctp-overlay0">
                    {typeLabels[type] ?? type}
                  </p>
                  <div className="space-y-0.5">
                    {typeItems.map((item) => (
                      <button
                        key={`${item.type}-${item.slug}`}
                        type="button"
                        onClick={() => handleItemClick(item.type, item.slug)}
                        className={cn(
                          "flex w-full items-center rounded-md px-2 py-1 text-app transition-colors",
                          currentItem?.type === item.type && currentItem?.slug === item.slug
                            ? "bg-ctp-surface0 text-ctp-text"
                            : "text-ctp-subtext0 hover:bg-ctp-surface0/50 hover:text-ctp-text",
                        )}
                      >
                        {item.slug}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Item viewer/editor */}
        {currentItem && (
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-app-sm text-ctp-overlay1">
                {currentItem.type}/{currentItem.slug}
              </p>
              <button
                type="button"
                aria-label="Save"
                onClick={handleSave}
                disabled={loading}
                className="flex items-center gap-1.5 rounded-md bg-ctp-mauve px-3 py-1 text-app-sm text-ctp-base transition-colors hover:bg-ctp-mauve/90 disabled:opacity-50"
              >
                <Save className="h-3 w-3" strokeWidth={1.5} />
                Save
              </button>
            </div>
            <textarea
              value={displayContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="min-h-[300px] w-full resize-y rounded-md border border-ctp-surface0 bg-overlay-mantle p-3 font-mono text-app-sm text-ctp-text placeholder-ctp-overlay0 outline-none focus:border-ctp-mauve"
            />
          </div>
        )}
      </div>
    </div>
  );
}
