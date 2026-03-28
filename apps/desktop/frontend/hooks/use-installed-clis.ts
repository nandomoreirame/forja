import { useEffect, useState } from "react";
import { invoke } from "@/lib/ipc";
import { CLI_REGISTRY, getAllCliIds, type CliDefinition } from "@/lib/cli-registry";

export function useInstalledClis() {
  const [installedClis, setInstalledClis] = useState<CliDefinition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    invoke<Record<string, boolean>>("detect_installed_clis", {
      cliIds: getAllCliIds(),
    })
      .then((results) => {
        if (cancelled) return;
        // Use getAllCliIds() order (canonical display order) instead of Object.entries
        const installed = getAllCliIds()
          .filter((cliId) => results[cliId])
          .map((cliId) => CLI_REGISTRY[cliId])
          .filter(Boolean);
        setInstalledClis(installed);
      })
      .catch(() => {
        if (!cancelled) setInstalledClis([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { installedClis, loading };
}
