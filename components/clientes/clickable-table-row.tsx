"use client";

import { useRouter } from "next/navigation";

import { TableRow } from "@/components/ui/table";
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
      onClick={() => router.push(href)}
      className={cn("cursor-pointer", className)}
      {...props}
    >
      {children}
    </TableRow>
  );
}
