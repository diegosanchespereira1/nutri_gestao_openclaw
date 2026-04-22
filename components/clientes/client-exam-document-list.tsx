import { deleteClientExamDocumentAction, loadClientExamDocuments } from "@/lib/actions/client-exams";
import { Button } from "@/components/ui/button";

const categoryLabel = {
  previous: "Histórico / exame já realizado",
  scheduled: "Pedido, agendado ou a realizar",
} as const;

export async function ClientExamDocumentList({
  clientId,
}: {
  clientId: string;
}) {
  const rows = await loadClientExamDocuments(clientId);
  if (rows.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-foreground text-sm font-medium">
        Ficheiros de exame carregados
      </h3>
      <ul className="divide-border divide-y rounded-md border bg-white">
        {rows.map((row) => (
          <li
            key={row.id}
            className="flex flex-wrap items-center justify-between gap-3 px-3 py-3 text-sm"
          >
            <div className="min-w-0 flex-1">
              <a
                href={`/api/client-exams/${row.id}`}
                className="text-primary font-medium hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                {row.original_filename}
              </a>
              <p className="text-muted-foreground text-xs">
                {categoryLabel[row.category]}
              </p>
            </div>
            <form action={deleteClientExamDocumentAction}>
              <input type="hidden" name="id" value={row.id} />
              <input type="hidden" name="client_id" value={clientId} />
              <Button
                type="submit"
                variant="outline"
                size="sm"
                className="text-destructive border-destructive/30 hover:bg-destructive/10"
              >
                Remover
              </Button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
