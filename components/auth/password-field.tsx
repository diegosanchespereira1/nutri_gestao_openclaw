"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type PasswordFieldProps = Omit<
  React.ComponentProps<typeof Input>,
  "type"
>;

export function PasswordField({ className, ...props }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        type={visible ? "text" : "password"}
        className={cn("pr-9", className)}
        {...props}
      />
      <div className="absolute inset-y-0 right-0 flex items-center pr-0.5">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:text-foreground"
          onClick={() => setVisible((v) => !v)}
          aria-label={
            visible ? "Ocultar palavra-passe" : "Mostrar palavra-passe"
          }
          aria-pressed={visible}
        >
          {visible ? (
            <EyeOff className="size-4" aria-hidden />
          ) : (
            <Eye className="size-4" aria-hidden />
          )}
        </Button>
      </div>
    </div>
  );
}
