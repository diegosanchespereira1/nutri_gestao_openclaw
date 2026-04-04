"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ThemeShowcase() {
  /** Alinhado ao layout: `<html class="… theme-nutri-teal">` no primeiro paint. */
  const [isRefA, setIsRefA] = useState(false);

  const applyTeal = () => {
    const html = document.documentElement;
    html.classList.remove("theme-nutri-ref-a");
    html.classList.add("theme-nutri-teal");
    setIsRefA(false);
  };

  const applyRefA = () => {
    const html = document.documentElement;
    html.classList.remove("theme-nutri-teal");
    html.classList.add("theme-nutri-ref-a");
    setIsRefA(true);
  };

  return (
    <Card className="w-full max-w-md text-left">
      <CardHeader>
        <CardTitle>UI base (shadcn)</CardTitle>
        <CardDescription>
          Tema por defeito: Teal. Use Ref-A só para comparar com a referência
          stakeholder.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant={!isRefA ? "default" : "outline"} onClick={applyTeal}>
            Tema Teal
          </Button>
          <Button type="button" variant={isRefA ? "default" : "outline"} onClick={applyRefA}>
            Tema Ref-A (demo)
          </Button>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="demo-email">Email</Label>
          <Input id="demo-email" type="email" placeholder="profissional@exemplo.pt" />
        </div>
        <Button type="button" variant="secondary">
          Ação secundária
        </Button>
      </CardContent>
      <CardFooter className="text-muted-foreground text-xs">
        Tokens em <code className="rounded bg-muted px-1">app/styles/theme-nutri-*.css</code>
      </CardFooter>
    </Card>
  );
}
