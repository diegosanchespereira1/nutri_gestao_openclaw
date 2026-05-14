"use client";

import { useEffect, useState } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  readChecklistPhotoGpsPreference,
  writeChecklistPhotoGpsPreference,
} from "@/lib/preferences/checklist-photo-gps";

export function ChecklistPhotoGpsForm() {
  const [enabled, setEnabled] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Evita mismatch de hidratação: lê localStorage só após mount no cliente.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- preferência persistida no browser
    setEnabled(readChecklistPhotoGpsPreference());
    setHydrated(true);
  }, []);

  return (
    <div className="max-w-lg space-y-3 rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="space-y-1">
        <p className="text-foreground text-sm font-medium">
          Coordenadas nas fotos de checklist
        </p>
        <p className="text-muted-foreground text-xs leading-relaxed">
          Quando ativado, ao anexar uma foto de evidência o browser pode pedir permissão
          de localização para gravar latitude e longitude no registo. A opção fica
          guardada neste dispositivo e navegador.
        </p>
      </div>
      <div className="flex items-start gap-3">
        <Checkbox
          id="checklist-photo-gps"
          checked={enabled}
          disabled={!hydrated}
          onCheckedChange={(v) => {
            const next = v === true;
            writeChecklistPhotoGpsPreference(next);
            setEnabled(next);
          }}
          className="mt-0.5"
        />
        <div className="min-w-0 flex-1">
          <Label htmlFor="checklist-photo-gps" className="text-sm font-normal leading-snug">
            Pedir localização ao enviar fotos de evidência
          </Label>
        </div>
      </div>
    </div>
  );
}
