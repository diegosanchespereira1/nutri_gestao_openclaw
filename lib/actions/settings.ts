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
      error: "Não foi possível salvar. Tente novamente.",
    };
  }

  revalidatePath("/", "layout");
  revalidatePath("/definicoes/regiao");
  revalidatePath("/inicio");
  revalidatePath("/visitas");
  return { ok: true, timeZone: timezone };
}

export type UpdateAgendaHoursResult =
  | { ok: true; agendaStartHour: number; agendaEndHour: number }
  | { ok: false; error: string };

export async function updateAgendaHoursAction(
  _prev: UpdateAgendaHoursResult | undefined,
  formData: FormData,
): Promise<UpdateAgendaHoursResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const startRaw = parseInt(String(formData.get("agenda_start_hour") ?? ""), 10);
  const endRaw = parseInt(String(formData.get("agenda_end_hour") ?? ""), 10);

  if (isNaN(startRaw) || startRaw < 0 || startRaw > 12) {
    return { ok: false, error: "Hora de início inválida (0–12)." };
  }
  if (isNaN(endRaw) || endRaw < 12 || endRaw > 23) {
    return { ok: false, error: "Hora de fim inválida (12–23)." };
  }
  if (endRaw <= startRaw) {
    return { ok: false, error: "A hora de fim deve ser posterior à hora de início." };
  }

  const { error } = await supabase.rpc("update_agenda_hours", {
    p_start_hour: startRaw,
    p_end_hour: endRaw,
  });

  if (error) {
    return {
      ok: false,
      error: `Não foi possível salvar (${error.message ?? error.code ?? "desconhecido"}).`,
    };
  }

  revalidatePath("/definicoes/agenda");
  revalidatePath("/visitas");
  return { ok: true, agendaStartHour: startRaw, agendaEndHour: endRaw };
}
