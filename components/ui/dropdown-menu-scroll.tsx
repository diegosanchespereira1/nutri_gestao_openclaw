"use client";

import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

import styles from "./dropdown-menu-scroll.module.css";

export function DropdownMenuScroll({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return <div className={cn(styles.scroll, className)} {...props} />;
}
