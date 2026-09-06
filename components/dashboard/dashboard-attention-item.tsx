import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import { cn } from "@/lib/utils";

type Props = {
  title: string;
  meta: string;
  href: string;
  overdue: boolean;
};

export function DashboardAttentionItem({ title, meta, href, overdue }: Props) {
  return (
    <Link
      href={href}
      className={cn(
        "border-border flex items-start gap-2 rounded-lg border px-2.5 py-2",
        "hover:border-primary/35 hover:bg-background/80",
        "focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        overdue
          ? "border-l-[3px] border-l-destructive bg-red-50/50 dark:bg-red-950/20"
          : "border-l-[3px] border-l-warning bg-amber-50/50 dark:bg-amber-950/20",
      )}
    >
      <AlertTriangle
        className={cn(
          "mt-0.5 size-3.5 shrink-0",
          overdue ? "text-destructive" : "text-amber-600 dark:text-amber-400",
        )}
        aria-hidden
      />
      <span className="min-w-0 flex-1">
        <span className="text-foreground block truncate text-sm leading-5 font-medium">
          {title}
        </span>
        <span className="text-muted-foreground block truncate text-xs leading-4">
          {meta}
        </span>
      </span>
    </Link>
  );
}
