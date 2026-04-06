import Link from "next/link";
import { notFound } from "next/navigation";

import { loadPopWithVersionsAction } from "@/lib/actions/pops";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

function formatCreated(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-PT", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

type Props = { params: Promise<{ popId: string }> };

export default async function PopHistoricoPage({ params }: Props) {
  const { popId } = await params;
  const res = await loadPopWithVersionsAction(popId);
  if (!res.ok) notFound();

  const ordered = [...res.versions].sort(
    (a, b) => b.version_number - a.version_number,
  );

  return (
    <div className="space-y-8">
      <div>
        <Link
          href={`/pops/${popId}/editar`}
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "text-muted-foreground -ml-2 mb-2",
          )}
        >
          ← Editar POP
        </Link>
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">
          Histórico de versões
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">{res.pop.title}</p>
      </div>

      {ordered.length === 0 ? (
        <p className="text-muted-foreground text-sm">Sem versões.</p>
      ) : (
        <div className="space-y-4">
          {ordered.map((v) => (
            <article
              key={v.id}
              className="bg-card ring-foreground/10 rounded-xl p-4 ring-1"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-foreground font-medium">
                  Versão {v.version_number} — {v.title}
                </p>
                <time
                  className="text-muted-foreground text-xs tabular-nums"
                  dateTime={v.created_at}
                >
                  {formatCreated(v.created_at)}
                </time>
              </div>
              <pre className="text-muted-foreground mt-3 max-h-64 overflow-y-auto whitespace-pre-wrap font-sans text-sm">
                {v.body}
              </pre>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
