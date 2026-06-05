"use client";

import { useRouter } from "next/navigation";

import { TableRow } from "@/components/ui/table";
import { pushWithLoading } from "@/lib/navigation-pending";
import { cn } from "@/lib/utils";

export function ClickableTableRow({
  href,
  className,
  children,
  ...props
}: React.ComponentProps<"tr"> & { href: string }) {
  const router = useRouter();
  return (
    <TableRow
      onClick={() => pushWithLoading(router, href)}
      className={cn("cursor-pointer", className)}
      {...props}
    >
      {children}
    </TableRow>
  );
}
