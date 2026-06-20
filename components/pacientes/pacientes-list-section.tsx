import Link from "next/link";
import { HeartPulse } from "lucide-react";

import { ClientAvatar } from "@/components/clientes/client-avatar";
import { EmptyState } from "@/components/common/empty-state";
import { buttonVariants } from "@/components/ui/button-variants";
import { loadAllPatientsForOwner } from "@/lib/actions/patients";
import { formatCpfDisplay } from "@/lib/format/br-document";
import { getPatientPhotoSignedUrls } from "@/lib/patients/patient-photo-urls";
import {
  AGE_CATEGORY_LABELS,
  parseAgeCategory,
  patientAgeCategory,
} from "@/lib/pacientes/age-category";
import { getServerContext } from "@/lib/supabase/get-server-user";
import { cn } from "@/lib/utils";

function parseSituacao(raw: string | undefined): "independente" | "all" {
  return raw === "independente" ? "independente" : "all";
}

type Props = {
  searchParams: Record<string, string | string[] | undefined>;
};

export async function PacientesListSection({ searchParams: sp }: Props) {
  const q = typeof sp.q === "string" ? sp.q : "";
  const situacao = parseSituacao(
    typeof sp.situacao === "string" ? sp.situacao : undefined,
  );
  const categoria = parseAgeCategory(
    typeof sp.categoria === "string" ? sp.categoria : undefined,
  );

  const { rows: allRows } = await loadAllPatientsForOwner({
    q,
    independente: situacao === "independente",
  });

  const { supabase } = await getServerContext();
  const photoPaths = allRows
    .map((p) => p.photo_storage_path)
    .filter((path): path is string => Boolean(path));
  const photoUrlMap = await getPatientPhotoSignedUrls(supabase, photoPaths);

  const rows =
    categoria === "all"
      ? allRows
      : allRows.filter((p) => patientAgeCategory(p.birth_date) === categoria);

  const hasFilters = !!(q || situacao !== "all" || categoria !== "all");

  if (rows.length === 0) {
    return hasFilters ? (
      <div className="border-border bg-muted/30 rounded-lg border border-dashed p-8 text-center">
        <p className="text-muted-foreground text-sm">
          Nenhum paciente corresponde aos filtros.
        </p>
      </div>
    ) : (
      <EmptyState
        icon={HeartPulse}
        title="Nenhum paciente ainda"
        description="Adicione pacientes pessoas físicas. Pode associar a um cliente depois, se necessário."
        action={
          <Link href="/pacientes/novo" className={cn(buttonVariants())}>
            Criar paciente
          </Link>
        }
      />
    );
  }

  return (
    <ul
      className="border-border divide-border divide-y overflow-hidden rounded-lg border bg-card shadow-sm"
      aria-label="Lista de pacientes"
    >
      {rows.map((p) => {
        const clientCtx = p.clients?.legal_name;
        const estCtx = p.establishments?.name;
        const contextLabel = estCtx
          ? `${clientCtx} · ${estCtx}`
          : clientCtx ?? null;

        const cpfDisplay = p.document_id ? formatCpfDisplay(p.document_id) : null;
        const birthDisplay = p.birth_date ? String(p.birth_date).slice(0, 10) : null;
        const ageCat = patientAgeCategory(p.birth_date);
        const photoUrl = p.photo_storage_path
          ? (photoUrlMap.get(p.photo_storage_path) ?? null)
          : null;

        return (
          <li key={p.id}>
            <Link
              href={`/pacientes/${p.id}`}
              prefetch
              className="hover:bg-muted/50 focus-visible:ring-ring flex items-start gap-3 px-4 py-3 transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <ClientAvatar
                name={p.full_name}
                imageUrl={photoUrl}
                size="md"
                className="rounded-full"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-foreground font-medium leading-snug">
                    {p.full_name}
                  </span>
                  {!p.client_id ? (
                    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      Independente
                    </span>
                  ) : null}
                  {ageCat ? (
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      {AGE_CATEGORY_LABELS[ageCat]}
                    </span>
                  ) : null}
                </div>
                {contextLabel ? (
                  <p className="text-muted-foreground mt-0.5 text-sm">
                    {contextLabel}
                  </p>
                ) : null}
                <p className="text-muted-foreground mt-1 text-xs">
                  {birthDisplay ? `Nasc.: ${birthDisplay}` : null}
                  {cpfDisplay ? (
                    <span>
                      {birthDisplay ? " · " : ""}
                      CPF: ***.***.***-{cpfDisplay.slice(-2)}
                    </span>
                  ) : null}
                </p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
