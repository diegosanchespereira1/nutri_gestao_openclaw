"use client";

import { useCallback, useEffect, useState, useTransition } from "react";

import {
  createTacoReferenceFoodAdminAction,
  deleteTacoReferenceFoodAdminAction,
  listTacoReferenceFoodsAdminAction,
  updateTacoReferenceFoodAdminAction,
} from "@/lib/actions/taco-reference-foods-admin";
import type { TacoReferenceFoodRow } from "@/lib/types/taco-reference-foods";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const PAGE_SIZE = 50;

function emptyForm() {
  return {
    taco_code: "",
    name: "",
    kcal_per_100g: "0",
    protein_g_per_100g: "0",
    carb_g_per_100g: "0",
    lipid_g_per_100g: "0",
    fiber_g_per_100g: "0",
  };
}

export function TacoCatalogAdmin() {
  const [pending, startTransition] = useTransition();
  const [rows, setRows] = useState<TacoReferenceFoodRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [listError, setListError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TacoReferenceFoodRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback((p: number, q: string) => {
    void listTacoReferenceFoodsAdminAction({ page: p, query: q }).then((res) => {
      if (!res.ok) {
        setListError(res.error);
        return;
      }
      setListError(null);
      setRows(res.rows);
      setTotal(res.total);
      setPage(res.page);
    });
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(query), 320);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    load(1, debouncedQ);
  }, [debouncedQ, load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setFormError(null);
    setDialogOpen(true);
  }

  function openEdit(row: TacoReferenceFoodRow) {
    setEditing(row);
    setForm({
      taco_code: row.taco_code,
      name: row.name,
      kcal_per_100g: String(row.kcal_per_100g),
      protein_g_per_100g: String(row.protein_g_per_100g),
      carb_g_per_100g: String(row.carb_g_per_100g),
      lipid_g_per_100g: String(row.lipid_g_per_100g),
      fiber_g_per_100g: String(row.fiber_g_per_100g),
    });
    setFormError(null);
    setDialogOpen(true);
  }

  function submitForm() {
    setFormError(null);
    const payload = {
      taco_code: form.taco_code,
      name: form.name,
      kcal_per_100g: form.kcal_per_100g,
      protein_g_per_100g: form.protein_g_per_100g,
      carb_g_per_100g: form.carb_g_per_100g,
      lipid_g_per_100g: form.lipid_g_per_100g,
      fiber_g_per_100g: form.fiber_g_per_100g,
    };
    startTransition(async () => {
      const res = editing
        ? await updateTacoReferenceFoodAdminAction({
            id: editing.id,
            ...payload,
          })
        : await createTacoReferenceFoodAdminAction(payload);
      if (!res.ok) {
        setFormError(res.error);
        return;
      }
      setDialogOpen(false);
      load(page, debouncedQ);
    });
  }

  function onDelete(row: TacoReferenceFoodRow) {
    if (
      !window.confirm(
        `Eliminar «${row.name}»? Receitas que usam este TACO perdem a ligação (campo fica vazio).`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      const res = await deleteTacoReferenceFoodAdminAction(row.id);
      if (!res.ok) {
        window.alert(res.error);
        return;
      }
      load(page, debouncedQ);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-md flex-1 space-y-2">
          <Label htmlFor="taco-search">Pesquisar (nome ou código)</Label>
          <Input
            id="taco-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Mínimo 2 caracteres para filtrar na base"
            autoComplete="off"
          />
        </div>
        <Button type="button" onClick={openCreate} disabled={pending}>
          Novo alimento
        </Button>
      </div>

      {listError ? (
        <p className="text-destructive text-sm" role="alert">
          {listError}
        </p>
      ) : null}

      <div className="text-muted-foreground text-sm">
        {total} registo(s) — página {page} de {totalPages}
      </div>

      <div className="border-border overflow-x-auto rounded-xl border bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-border border-b bg-primary/10 dark:bg-primary/15">
            <tr>
              <th className="text-foreground px-3 py-2 text-left font-bold">
                Código
              </th>
              <th className="text-foreground px-3 py-2 text-left font-bold">
                Nome
              </th>
              <th className="text-foreground px-3 py-2 text-left font-bold">
                kcal/100g
              </th>
              <th className="text-foreground px-3 py-2 text-right font-bold">
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                className="border-b border-foreground/5 last:border-0"
              >
                <td className="text-muted-foreground px-3 py-2 font-mono text-xs">
                  {r.taco_code}
                </td>
                <td className="text-foreground px-3 py-2 font-medium">
                  {r.name}
                </td>
                <td className="text-muted-foreground px-3 py-2 tabular-nums">
                  {r.kcal_per_100g}
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={pending}
                      onClick={() => openEdit(r)}
                    >
                      Editar
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      disabled={pending}
                      onClick={() => onDelete(r)}
                    >
                      Eliminar
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending || page <= 1}
          onClick={() => load(page - 1, debouncedQ)}
        >
          Anterior
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending || page >= totalPages}
          onClick={() => load(page + 1, debouncedQ)}
        >
          Seguinte
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg sm:max-w-xl" showCloseButton>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar alimento TACO" : "Novo alimento TACO"}
            </DialogTitle>
            <DialogDescription>
              Valores nutricionais por 100 g. O código deve ser único.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-1">
              <Label htmlFor="taco_code">Código</Label>
              <Input
                id="taco_code"
                value={form.taco_code}
                onChange={(e) =>
                  setForm((f) => ({ ...f, taco_code: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="taco_name">Nome</Label>
              <Input
                id="taco_name"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="kcal">kcal / 100g</Label>
              <Input
                id="kcal"
                inputMode="decimal"
                value={form.kcal_per_100g}
                onChange={(e) =>
                  setForm((f) => ({ ...f, kcal_per_100g: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prot">Proteína (g)</Label>
              <Input
                id="prot"
                inputMode="decimal"
                value={form.protein_g_per_100g}
                onChange={(e) =>
                  setForm((f) => ({ ...f, protein_g_per_100g: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="carb">H. carbono (g)</Label>
              <Input
                id="carb"
                inputMode="decimal"
                value={form.carb_g_per_100g}
                onChange={(e) =>
                  setForm((f) => ({ ...f, carb_g_per_100g: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lip">Lípidos (g)</Label>
              <Input
                id="lip"
                inputMode="decimal"
                value={form.lipid_g_per_100g}
                onChange={(e) =>
                  setForm((f) => ({ ...f, lipid_g_per_100g: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="fib">Fibra (g)</Label>
              <Input
                id="fib"
                inputMode="decimal"
                value={form.fiber_g_per_100g}
                onChange={(e) =>
                  setForm((f) => ({ ...f, fiber_g_per_100g: e.target.value }))
                }
              />
            </div>
          </div>
          {formError ? (
            <p className="text-destructive text-sm">{formError}</p>
          ) : null}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={submitForm}
              disabled={pending}
            >
              Guardar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
