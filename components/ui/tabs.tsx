"use client";

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";

import { touchMinHeight } from "@/lib/touch-targets";
import { cn } from "@/lib/utils";

function Tabs({ className, ...props }: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-1", className)}
      {...props}
    />
  );
}

function TabsList({ className, ...props }: TabsPrimitive.List.Props) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "inline-flex min-h-10 flex-wrap items-center gap-1 rounded-lg border border-border bg-muted/70 p-1 shadow-inner",
        className,
      )}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        `ring-offset-background focus-visible:ring-ring inline-flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium whitespace-nowrap transition-[color,background-color,border-color,box-shadow] ${touchMinHeight}`,
        "border-border/80 bg-card text-foreground/80 shadow-xs",
        "hover:border-primary/45 hover:bg-primary/18 hover:text-foreground",
        "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
        "disabled:pointer-events-none disabled:opacity-50",
        "aria-selected:border-primary aria-selected:bg-primary aria-selected:text-primary-foreground aria-selected:shadow-sm",
        "aria-selected:hover:border-primary aria-selected:hover:bg-primary aria-selected:hover:text-primary-foreground",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      keepMounted
      className={cn(
        "ring-offset-background focus-visible:ring-ring mt-4 rounded-xl border border-foreground/10 bg-card/40 p-4 shadow-xs focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
        className,
      )}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
