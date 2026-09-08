import { cn } from "@/lib/utils";

export function ComingSoonBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "ml-auto shrink-0 rounded px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide",
        className,
      )}
    >
      Em breve
    </span>
  );
}
