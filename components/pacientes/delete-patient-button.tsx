"use client";

import { deletePatientAction } from "@/lib/actions/patients";
import { Button } from "@/components/ui/button";

export function DeletePatientButton({ patientId }: { patientId: string }) {
  return (
    <form action={deletePatientAction}>
      <input type="hidden" name="id" value={patientId} />
      <Button
        type="submit"
        variant="outline"
        className="text-destructive border-destructive/40 hover:bg-destructive/10"
        onClick={(e) => {
          if (
            !window.confirm(
              "Eliminar este paciente? Esta ação não pode ser anulada.",
            )
          ) {
            e.preventDefault();
          }
        }}
      >
        Eliminar paciente
      </Button>
    </form>
  );
}
