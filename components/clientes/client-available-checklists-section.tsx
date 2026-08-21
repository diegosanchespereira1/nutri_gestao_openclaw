import { ClientAvailableChecklistsList } from "@/components/clientes/client-available-checklists-list";
import { loadChecklistsAvailableForClient } from "@/lib/checklists/load-client-available-checklists";

type Props = {
  clientId: string;
};

export async function ClientAvailableChecklistsSection({ clientId }: Props) {
  const { establishment, items } =
    await loadChecklistsAvailableForClient(clientId);

  return (
    <ClientAvailableChecklistsList
      clientId={clientId}
      establishment={establishment}
      items={items}
    />
  );
}
