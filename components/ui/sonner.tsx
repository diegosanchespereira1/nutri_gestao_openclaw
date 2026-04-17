"use client";

import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      position="top-center"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "group border-border bg-background text-foreground shadow-lg",
          title: "text-foreground font-medium",
          description: "text-muted-foreground text-sm",
          actionButton:
            "!bg-primary !text-primary-foreground font-medium",
        },
      }}
    />
  );
}
