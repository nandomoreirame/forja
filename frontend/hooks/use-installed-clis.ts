import { useEffect, useState } from "react";
import { invoke } from "@/lib/ipc";
import { CLI_REGISTRY, getAllCliBinaries, type CliDefinition } from "@/lib/cli-registry";

export function useInstalledClis() {
  const [installedClis, setInstalledClis] = useState<CliDefinition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    invoke<Record<string, boolean>>("detect_installed_clis", {
      binaries: getAllCliBinaries(),
    })
      .then((results) => {
        if (cancelled) return;
        const installed = Object.entries(results)
          .filter(([, isInstalled]) => isInstalled)
          .map(([binary]) => {
            const entry = Object.values(CLI_REGISTRY).find((cli) => cli.binary === binary);
            return entry!;
          })
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
