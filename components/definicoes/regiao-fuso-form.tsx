"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";

import {
  type UpdateTimeZoneResult,
  updateTimeZoneAction,
} from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { APP_TIME_ZONE_OPTIONS } from "@/lib/timezones";
import { cn } from "@/lib/utils";

const initial: UpdateTimeZoneResult | undefined = undefined;

export function RegiaoFusoForm({ defaultTimeZone }: { defaultTimeZone: string }) {
  const router = useRouter();
  const [state, formAction] = useActionState(updateTimeZoneAction, initial);
  const [timeZone, setTimeZone] = useState(defaultTimeZone);
  /** Evita que props RSC em cache revertam o select após guardar com sucesso. */
  const lastCommittedTz = useRef<string | null>(null);

  useEffect(() => {
    if (state?.ok === true) {
      lastCommittedTz.current = state.timeZone;
      setTimeZone(state.timeZone);
      router.refresh();
    }
  }, [state, router]);

  useEffect(() => {
    const committed = lastCommittedTz.current;
    if (committed !== null && defaultTimeZone !== committed) {
      return;
    }
    if (committed !== null && defaultTimeZone === committed) {
      lastCommittedTz.current = null;
    }
    setTimeZone(defaultTimeZone);
  }, [defaultTimeZone]);

  return (
    <form action={formAction} className="max-w-lg space-y-4">
      <div className="space-y-2">
        <Label htmlFor="regiao-timezone">Fuso horário</Label>
        <select
          id="regiao-timezone"
          name="timezone"
          required
          value={timeZone}
          onChange={(e) => setTimeZone(e.target.value)}
          className={cn(
            "border-input bg-background ring-offset-background placeholder:text-muted-foreground",
            "focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm",
            "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
          aria-invalid={state?.ok === false}
          aria-describedby={
            state?.ok === false ? "regiao-fuso-err" : "regiao-fuso-hint"
          }
        >
          {APP_TIME_ZONE_OPTIONS.map((group) => (
            <optgroup key={group.group} label={group.group}>
              {group.zones.map((z) => (
                <option key={z.value} value={z.value}>
                  {z.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <p id="regiao-fuso-hint" className="text-muted-foreground text-xs">
          A agenda, «visitas de hoje» e horários na interface usam este fuso.
        </p>
      </div>

      {state?.ok === false ? (
        <p id="regiao-fuso-err" className="text-destructive text-sm" role="alert">
          {state.error}
        </p>
      ) : null}
      {state?.ok === true ? (
        <p className="text-muted-foreground text-sm" role="status">
          Preferência guardada.
        </p>
      ) : null}

      <Button type="submit">Guardar</Button>
    </form>
  );
}
