"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { ALLOWED_APP_TIME_ZONES } from "@/lib/timezones";

export type UpdateTimeZoneResult =
  | { ok: true; timeZone: string }
  | { ok: false; error: string };

export async function updateTimeZoneAction(
  _prev: UpdateTimeZoneResult | undefined,
  formData: FormData,
): Promise<UpdateTimeZoneResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const timezone = String(formData.get("timezone") ?? "").trim();
  if (!ALLOWED_APP_TIME_ZONES.has(timezone)) {
    return { ok: false, error: "Selecione uma região válida na lista." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      timezone,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  if (error) {
    return {
      ok: false,
      error: "Não foi possível guardar. Tente novamente.",
    };
  }

  revalidatePath("/", "layout");
  revalidatePath("/definicoes/regiao");
  revalidatePath("/inicio");
  revalidatePath("/visitas");
  return { ok: true, timeZone: timezone };
}
