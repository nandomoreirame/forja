import { invoke } from "@/lib/ipc";

/**
 * In-flight promise cache keyed by "channel:JSON.stringify(args)".
 * Entries are removed when the promise settles (resolve or reject).
 */
const inFlight = new Map<string, Promise<unknown>>();

/**
 * Deduplicating wrapper around `invoke`.
 *
 * If an identical IPC call (same channel + args) is already in-flight,
 * returns the existing Promise instead of firing a new IPC request.
 * Once the promise settles (either way), the entry is cleared so
 * subsequent calls will start a fresh request.
 *
 * @param channel - The IPC channel name (e.g. "get_git_file_statuses")
 * @param args    - Optional arguments forwarded to invoke
 * @returns       - Promise that resolves/rejects with the IPC result
 */
export function dedupInvoke<T = unknown>(channel: string, args?: unknown): Promise<T> {
  const key = `${channel}:${JSON.stringify(args)}`;

  const existing = inFlight.get(key);
  if (existing) {
    return existing as Promise<T>;
  }

  const promise = invoke<T>(channel, args).finally(() => {
    inFlight.delete(key);
  });

  inFlight.set(key, promise as Promise<unknown>);

  return promise;
}
