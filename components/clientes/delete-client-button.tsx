"use client";

import { deleteClientAction } from "@/lib/actions/clients";
import { Button } from "@/components/ui/button";

export function DeleteClientButton({ clientId }: { clientId: string }) {
  return (
    <form action={deleteClientAction}>
      <input type="hidden" name="id" value={clientId} />
      <Button
        type="submit"
        variant="outline"
        className="text-destructive border-destructive/40 hover:bg-destructive/10"
        onClick={(e) => {
          if (
            !window.confirm(
              "Eliminar este cliente? Esta ação não pode ser anulada.",
            )
          ) {
            e.preventDefault();
          }
        }}
      >
        Eliminar cliente
      </Button>
    </form>
  );
}
