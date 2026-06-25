import { Badge } from "@/components/ui/badge";
import type { TenantCapabilityItem } from "@/lib/admin/tenant-capabilities";
import { cn } from "@/lib/utils";

type Props = {
  modules: TenantCapabilityItem[];
  features: TenantCapabilityItem[];
  className?: string;
};

function CapabilityGroup({
  title,
  items,
  emptyLabel,
}: {
  title: string;
  items: TenantCapabilityItem[];
  emptyLabel: string;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide">
        {title}
      </p>
      {items.length === 0 ? (
        <p className="text-muted-foreground text-xs">{emptyLabel}</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item) => (
            <Badge
              key={item.key}
              variant={item.overridden ? "default" : "secondary"}
              className={cn(
                "text-[11px] font-normal",
                item.overridden && "ring-1 ring-primary/30",
              )}
              title={
                item.overridden
                  ? `${item.label} — valor definido por override (não segue só o plano)`
                  : item.label
              }
            >
              {item.label}
              {item.overridden ? " *" : null}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export function TenantCapabilitiesBadges({
  modules,
  features,
  className,
}: Props) {
  const hasOverrides = features.some((feature) => feature.overridden);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="grid gap-3 sm:grid-cols-2">
        <CapabilityGroup
          title="Módulos"
          items={modules}
          emptyLabel="Nenhum módulo ativo"
        />
        <CapabilityGroup
          title="Features do plano"
          items={features}
          emptyLabel="Nenhuma feature ativa"
        />
      </div>
      {hasOverrides ? (
        <p className="text-muted-foreground text-[11px]">
          * Feature com override manual (prevalece sobre o plano base).
        </p>
      ) : null}
    </div>
  );
}
