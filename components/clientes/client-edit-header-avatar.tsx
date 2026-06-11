import { ClientAvatar } from "@/components/clientes/client-avatar";
import type { ClientEditShell } from "@/lib/clientes/normalize-client-row";

/**
 * Avatar do cabeçalho da edição de cliente.
 * A URL assinada do Storage deve ser resolvida na página (um único pedido).
 */
export function ClientEditHeaderAvatar({
  row,
  imageUrl,
}: {
  row: ClientEditShell;
  imageUrl: string | null;
}) {
  return (
    <ClientAvatar
      name={row.legal_name}
      imageUrl={imageUrl}
      size="lg"
      className="shrink-0"
    />
  );
}

export function ClientEditHeaderAvatarFallback({ row }: { row: ClientEditShell }) {
  return (
    <ClientAvatar
      name={row.legal_name}
      imageUrl={null}
      size="lg"
      className="shrink-0"
    />
  );
}
