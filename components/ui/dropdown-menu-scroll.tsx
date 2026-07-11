import type { ComponentPropsWithoutRef } from "react";

import { ScrollArea } from "./scroll-area";
import { cn } from "@/lib/utils";

export function DropdownMenuScroll({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return <ScrollArea className={cn("overflow-y-auto", className)} {...props} />;
}
