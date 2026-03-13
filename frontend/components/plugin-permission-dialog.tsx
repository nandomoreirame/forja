import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { usePluginsStore } from "@/stores/plugins";
import { PERMISSION_INFO } from "@/lib/plugin-types";
import type { PluginPermission, PermissionRisk } from "@/lib/plugin-types";
import { Shield, ShieldAlert, ShieldX, Info } from "lucide-react";
import { cn } from "@/lib/utils";

const RISK_STYLES: Record<
  PermissionRisk,
  { color: string; icon: typeof Shield }
> = {
  low: { color: "text-ctp-green", icon: Shield },
  medium: { color: "text-ctp-yellow", icon: Shield },
  high: { color: "text-ctp-peach", icon: ShieldAlert },
  critical: { color: "text-ctp-red", icon: ShieldX },
};

export function PluginPermissionDialog() {
  const permissionPrompt = usePluginsStore((s) => s.permissionPrompt);
  const grantPermissions = usePluginsStore((s) => s.grantPermissions);
  const denyPermissions = usePluginsStore((s) => s.denyPermissions);
  const dismissPermissionPrompt = usePluginsStore(
    (s) => s.dismissPermissionPrompt
  );

  if (!permissionPrompt) return null;

  const { pluginName, permissions } = permissionPrompt;
  const hasHighRisk = permissions.some((p) => {
    const info = PERMISSION_INFO[p as PluginPermission];
    return info?.risk === "high" || info?.risk === "critical";
  });

  const handleAllow = () => {
    void grantPermissions(pluginName, permissions as PluginPermission[]);
  };

  const handleDeny = () => {
    void denyPermissions(pluginName, permissions as PluginPermission[]);
  };

  return (
    <Dialog
      open={!!permissionPrompt}
      onOpenChange={(open) => {
        if (!open) dismissPermissionPrompt();
      }}
    >
      <DialogContent
        className="bg-overlay-base border-ctp-surface0 sm:max-w-md"
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle className="text-ctp-text">
            Plugin permissions
          </DialogTitle>
          <DialogDescription className="text-ctp-subtext0">
            <span className="font-medium text-ctp-text">{pluginName}</span>{" "}
            is requesting the following permissions:
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 py-2">
          {permissions.map((perm) => {
            const info = PERMISSION_INFO[perm as PluginPermission];
            if (!info) return null;
            const riskStyle = RISK_STYLES[info.risk];
            const RiskIcon = riskStyle.icon;

            return (
              <div
                key={perm}
                className="flex items-start gap-3 rounded-md border border-ctp-surface0 bg-overlay-mantle px-3 py-2"
                data-testid={`permission-${perm}`}
              >
                <RiskIcon
                  className={cn("mt-0.5 h-4 w-4 shrink-0", riskStyle.color)}
                  strokeWidth={1.5}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ctp-text">
                    {info.label}
                  </p>
                  <p className="text-xs text-ctp-subtext0">
                    {info.description}
                  </p>
                </div>
                <span
                  className={cn(
                    "mt-0.5 text-[10px] uppercase tracking-wider font-medium",
                    riskStyle.color
                  )}
                >
                  {info.risk}
                </span>
              </div>
            );
          })}
        </div>

        {hasHighRisk && (
          <div className="flex items-start gap-2 rounded-md border border-ctp-peach/30 bg-ctp-peach/5 px-3 py-2">
            <Info
              className="mt-0.5 h-4 w-4 shrink-0 text-ctp-peach"
              strokeWidth={1.5}
            />
            <p className="text-xs text-ctp-subtext1">
              This plugin requests elevated permissions. Only grant if you trust
              the source.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDeny}
            className="border-ctp-surface1 bg-ctp-surface0 text-ctp-text hover:bg-ctp-surface1"
            data-testid="deny-permissions"
          >
            Deny
          </Button>
          <Button
            size="sm"
            onClick={handleAllow}
            className="bg-ctp-mauve text-ctp-base hover:bg-ctp-mauve/80"
            data-testid="allow-permissions"
          >
            Allow
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
