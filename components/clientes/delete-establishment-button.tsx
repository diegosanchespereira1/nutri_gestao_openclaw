"use client";

import { deleteEstablishmentAction } from "@/lib/actions/establishments";
import { Button } from "@/components/ui/button";

export function DeleteEstablishmentButton({
  establishmentId,
  clientId,
}: {
  establishmentId: string;
  clientId: string;
}) {
  return (
    <form action={deleteEstablishmentAction}>
      <input type="hidden" name="id" value={establishmentId} />
      <input type="hidden" name="client_id" value={clientId} />
      <Button
        type="submit"
        variant="outline"
        className="text-destructive border-destructive/40 hover:bg-destructive/10"
        onClick={(e) => {
          if (
            !window.confirm(
              "Eliminar este estabelecimento? Esta ação não pode ser anulada.",
            )
          ) {
            e.preventDefault();
          }
        }}
      >
        Eliminar estabelecimento
      </Button>
    </form>
  );
}
