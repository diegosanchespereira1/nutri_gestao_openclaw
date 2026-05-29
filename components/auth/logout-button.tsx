"use client";

import { useTransition } from "react";

import { signOutAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LogoutButton({ className }: { className?: string }) {
  const [pending, startTransition] = useTransition();

  function handleLogout() {
    startTransition(async () => {
      await signOutAction();
      window.location.replace(
        `/login?reason=signed_out&t=${Date.now()}`,
      );
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={handleLogout}
      className={cn("w-full justify-start text-foreground", className)}
    >
      {pending ? "A sair…" : "Sair"}
    </Button>
  );
}
