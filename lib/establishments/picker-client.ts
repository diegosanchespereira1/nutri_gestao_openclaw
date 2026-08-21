import type { EstablishmentAreaOption } from "@/lib/types/establishment-areas";
import type { EstablishmentPickerOption } from "@/lib/types/establishments";

async function readJson<T>(res: Response, fallback: T): Promise<T> {
  if (!res.ok) return fallback;
  try {
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

/** Busca de estabelecimentos sem Server Action (não dispara refresh RSC da página). */
export async function fetchEstablishmentSearch(params: {
  query: string;
  limit?: number;
}): Promise<{ rows: EstablishmentPickerOption[] }> {
  const search = new URLSearchParams({ q: params.query.trim() });
  if (params.limit != null) search.set("limit", String(params.limit));
  const res = await fetch(`/api/establishments/picker?${search.toString()}`, {
    cache: "no-store",
  });
  return readJson(res, { rows: [] });
}

export async function fetchEstablishmentDropdown(params?: {
  limit?: number;
  offset?: number;
}): Promise<{ rows: EstablishmentPickerOption[]; total: number }> {
  const search = new URLSearchParams({ dropdown: "1" });
  if (params?.limit != null) search.set("limit", String(params.limit));
  if (params?.offset != null) search.set("offset", String(params.offset));
  const res = await fetch(`/api/establishments/picker?${search.toString()}`, {
    cache: "no-store",
  });
  return readJson(res, { rows: [], total: 0 });
}

export async function fetchEstablishmentPickerById(
  establishmentId: string,
): Promise<EstablishmentPickerOption | null> {
  const search = new URLSearchParams({ id: establishmentId });
  const res = await fetch(`/api/establishments/picker?${search.toString()}`, {
    cache: "no-store",
  });
  const data = await readJson<{ row: EstablishmentPickerOption | null }>(res, {
    row: null,
  });
  return data.row;
}

export async function fetchEstablishmentAreas(
  establishmentId: string,
): Promise<EstablishmentAreaOption[]> {
  const res = await fetch(
    `/api/establishments/${encodeURIComponent(establishmentId)}/areas`,
    { cache: "no-store" },
  );
  const data = await readJson<{ rows: EstablishmentAreaOption[] }>(res, {
    rows: [],
  });
  return data.rows;
}
