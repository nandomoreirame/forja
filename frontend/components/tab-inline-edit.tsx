import { useTilingLayoutStore } from "@/stores/tiling-layout";
import { InlineEdit } from "@/components/inline-edit";

interface TabInlineEditProps {
  nodeId: string;
  value: string;
  onSave: (newValue: string) => void;
  className?: string;
}

/**
 * Wrapper around InlineEdit that subscribes to the tiling-layout store for
 * editing state.  This keeps editing re-renders isolated to this component
 * so that the parent TilingLayout (and therefore FlexLayout's Layout class
 * component) does NOT re-render when editing starts/stops.
 */
export function TabInlineEdit({ nodeId, value, onSave, className }: TabInlineEditProps) {
  const isEditing = useTilingLayoutStore((s) => s.editingTabId === nodeId);
  const setEditingTabId = useTilingLayoutStore((s) => s.setEditingTabId);

  return (
    <InlineEdit
      value={value}
      isEditing={isEditing}
      onEditingChange={(editing) => setEditingTabId(editing ? nodeId : null)}
      onSave={onSave}
      className={className}
    />
  );
}
