"use server";

import { createClient } from "@/lib/supabase/server";
import type { EstablishmentType } from "@/lib/types/establishments";
import type { PopTemplateRow } from "@/lib/types/pops";

function mapTemplate(row: Record<string, unknown>): PopTemplateRow {
  return {
    id: String(row.id),
    establishment_type: row.establishment_type as EstablishmentType,
    name: String(row.name ?? ""),
    description: row.description != null ? String(row.description) : null,
    body: String(row.body ?? ""),
    position: Number(row.position ?? 0),
  };
}

export async function loadPopTemplatesAction(): Promise<{
  rows: PopTemplateRow[];
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { rows: [] };

  const { data, error } = await supabase
    .from("pop_templates")
    .select("id, establishment_type, name, description, body, position")
    .order("establishment_type", { ascending: true })
    .order("position", { ascending: true })
    .order("name", { ascending: true });

  if (error || !data) return { rows: [] };
  return { rows: data.map((r) => mapTemplate(r as Record<string, unknown>)) };
}

export async function loadPopTemplatesForEstablishmentTypeAction(
  establishmentType: EstablishmentType,
): Promise<{ rows: PopTemplateRow[] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { rows: [] };

  const { data, error } = await supabase
    .from("pop_templates")
    .select("id, establishment_type, name, description, body, position")
    .eq("establishment_type", establishmentType)
    .order("position", { ascending: true })
    .order("name", { ascending: true });

  if (error || !data) return { rows: [] };
  return { rows: data.map((r) => mapTemplate(r as Record<string, unknown>)) };
}
