import { notFound, redirect } from "next/navigation";

import { TechnicalRecipePdfViewer } from "@/components/technical-sheets/technical-recipe-pdf-viewer";
import { loadTechnicalRecipeById } from "@/lib/actions/technical-recipes";
import { buildLoginRedirectPath } from "@/lib/auth/safe-next-path";
import { buildTechnicalRecipePdfFilename } from "@/lib/pdf/technical-recipe-pdf-filename";
import { createClient } from "@/lib/supabase/server";

export default async function FichaTecnicaPdfPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(
      buildLoginRedirectPath(`/ficha-tecnica/${id}/pdf`, {
        reason: "session_expired",
      }),
    );
  }

  const { recipe } = await loadTechnicalRecipeById(id);
  if (!recipe) notFound();

  const suggestedFilename = buildTechnicalRecipePdfFilename({
    recipeName: recipe.name,
    updatedAtIso: recipe.updated_at,
  });

  return (
    <TechnicalRecipePdfViewer
      recipeId={id}
      recipeName={recipe.name}
      suggestedFilename={suggestedFilename}
    />
  );
}
