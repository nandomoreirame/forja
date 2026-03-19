const focusCallbacks = new Map<string, () => void>();

export const paneFocusRegistry = {
  register(nodeId: string, focusFn: () => void): void {
    focusCallbacks.set(nodeId, focusFn);
  },

  unregister(nodeId: string): void {
    focusCallbacks.delete(nodeId);
  },

  focus(nodeId: string): boolean {
    const fn = focusCallbacks.get(nodeId);
    if (fn) {
      fn();
      return true;
    }
    return false;
  },

  clear(): void {
    focusCallbacks.clear();
  },
};
