"use client";

import { signOutAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LogoutButton({ className }: { className?: string }) {
  return (
    <form action={signOutAction}>
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        className={cn("w-full justify-start", className)}
      >
        Sair
      </Button>
    </form>
  );
}
