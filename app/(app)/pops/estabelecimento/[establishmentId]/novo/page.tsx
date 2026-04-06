import Link from "next/link";
import { notFound } from "next/navigation";

import { loadEstablishmentsForOwner } from "@/lib/actions/establishments";
import { loadPopTemplatesForEstablishmentTypeAction } from "@/lib/actions/pop-templates";
import { PopNovoClient } from "@/components/pops/pop-novo-client";
import { buttonVariants } from "@/components/ui/button-variants";
import { establishmentTypeLabel } from "@/lib/constants/establishment-types";
import { establishmentClientLabel } from "@/lib/utils/establishment-client-label";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ establishmentId: string }> };

export default async function PopNovoPage({ params }: Props) {
  const { establishmentId } = await params;
  const { rows: establishments } = await loadEstablishmentsForOwner();
  const est = establishments.find((e) => e.id === establishmentId);
  if (!est) notFound();

  const { rows: templates } =
    await loadPopTemplatesForEstablishmentTypeAction(est.establishment_type);

  return (
    <div className="space-y-8">
      <div>
        <Link
          href={`/pops/estabelecimento/${establishmentId}`}
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "text-muted-foreground -ml-2 mb-2",
          )}
        >
          ← POPs deste estabelecimento
        </Link>
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">
          Novo POP
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {est.name} · {establishmentClientLabel(est)} ·{" "}
          {establishmentTypeLabel[est.establishment_type]}
        </p>
      </div>

      <PopNovoClient establishmentId={establishmentId} templates={templates} />
    </div>
  );
}
