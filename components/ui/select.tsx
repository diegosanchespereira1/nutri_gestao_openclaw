"use client";

import * as React from "react";
import { Select as SelectPrimitive } from "@base-ui/react/select";
import { ChevronDownIcon, ChevronUpIcon, CheckIcon } from "lucide-react";

import { touchMinHeight } from "@/lib/touch-targets"
import { cn } from "@/lib/utils";

import scrollStyles from "./scroll-area.module.css";

function Select(props: SelectPrimitive.Root.Props<string>) {
  return <SelectPrimitive.Root data-slot="select" {...props} />;
}

function SelectTrigger({
  className,
  id,
  children,
  ...props
}: SelectPrimitive.Trigger.Props & { id?: string }) {
  return (
    <SelectPrimitive.Trigger
      id={id}
      data-slot="select-trigger"
      className={cn(
        `border-input bg-background text-foreground placeholder:text-muted-foreground flex h-9 w-full min-w-0 touch-manipulation items-center justify-between gap-2 overflow-hidden rounded-md border px-3 py-1.5 text-base md:text-sm shadow-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${touchMinHeight}`,
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon className="shrink-0">
        <ChevronDownIcon className="h-4 w-4 opacity-50" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

function SelectValue({ placeholder, className, ...props }: SelectPrimitive.Value.Props) {
  return (
    <SelectPrimitive.Value
      data-slot="select-value"
      placeholder={placeholder}
      className={cn("min-w-0 flex-1 truncate text-left", className)}
      {...props}
    />
  );
}

function SelectContent({
  className,
  children,
  collisionPadding = 8,
  ...props
}: SelectPrimitive.Positioner.Props & { className?: string }) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        data-slot="select-positioner"
        className="z-[80]"
        side="bottom"
        align="start"
        sideOffset={4}
        alignItemWithTrigger={false}
        collisionPadding={collisionPadding}
        collisionAvoidance={{ align: "shift" }}
        {...props}
      >
        <SelectPrimitive.Popup
          data-slot="select-content"
          className={cn(
            "border-border bg-popover text-popover-foreground data-ending-style:opacity-0 data-starting-style:opacity-0 w-[var(--anchor-width)] max-w-[var(--available-width)] overflow-hidden rounded-md border p-1 shadow-md duration-100",
            className,
          )}
        >
          <SelectPrimitive.ScrollUpArrow className="flex justify-center py-1">
            <ChevronUpIcon className="h-4 w-4" />
          </SelectPrimitive.ScrollUpArrow>
          <SelectPrimitive.List
            className={cn(scrollStyles.scroll, "max-h-60 overflow-x-hidden overflow-y-auto py-0.5 pr-0.5")}
          >
            {children}
          </SelectPrimitive.List>
          <SelectPrimitive.ScrollDownArrow className="flex justify-center py-1">
            <ChevronDownIcon className="h-4 w-4" />
          </SelectPrimitive.ScrollDownArrow>
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  );
}

function SelectItem({
  className,
  children,
  value,
  ...props
}: SelectPrimitive.Item.Props) {
  return (
    <SelectPrimitive.Item
      value={value}
      data-slot="select-item"
      className={cn(
        `data-highlighted:bg-accent data-highlighted:text-accent-foreground relative flex min-h-9 min-w-0 cursor-default select-none items-start gap-2 rounded-sm py-1.5 pr-2 pl-7 text-sm outline-none data-disabled:pointer-events-none data-disabled:opacity-50 [@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:py-2.5 max-lg:min-h-11 max-lg:py-2.5`,
        className,
      )}
      {...props}
    >
      <span className="absolute top-2.5 left-2 flex h-3.5 w-3.5 items-center justify-center [@media(pointer:coarse)]:top-3.5 max-lg:top-3.5">
        <SelectPrimitive.ItemIndicator>
          <CheckIcon className="h-4 w-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText className="min-w-0 flex-1 break-words whitespace-normal">
        {children}
      </SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };
