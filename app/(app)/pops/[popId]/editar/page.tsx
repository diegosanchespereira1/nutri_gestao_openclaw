import Link from "next/link";
import { notFound } from "next/navigation";

import { loadPopWithVersionsAction } from "@/lib/actions/pops";
import { PopEditForm } from "@/components/pops/pop-edit-form";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ popId: string }> };

export default async function PopEditarPage({ params }: Props) {
  const { popId } = await params;
  const res = await loadPopWithVersionsAction(popId);
  if (!res.ok || !res.latest) notFound();

  return (
    <div className="space-y-8">
      <div>
        <Link
          href={`/pops/estabelecimento/${res.pop.establishment_id}`}
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "text-muted-foreground -ml-2 mb-2",
          )}
        >
          ← Lista de POPs
        </Link>
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">
          Editar POP
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">{res.pop.title}</p>
      </div>

      <PopEditForm
        popId={popId}
        establishmentId={res.pop.establishment_id}
        initialTitle={res.latest.title}
        initialBody={res.latest.body}
        currentVersionNumber={res.latest.version_number}
      />
    </div>
  );
}
