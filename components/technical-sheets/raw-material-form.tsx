"use client";

import { useEffect, useState, useActionState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  saveRawMaterialAction,
  createRawMaterialInlineAction,
} from "@/lib/actions/raw-materials";
import type { RawMaterialRow } from "@/lib/types/raw-materials";
import type { ClientRow } from "@/lib/types/clients";
import type { EstablishmentWithClientNames } from "@/lib/types/establishments";
import { establishmentClientLabel } from "@/lib/utils/establishment-client-label";
import {
  RECIPE_LINE_UNIT_LABELS,
  RECIPE_LINE_UNITS,
} from "@/lib/constants/recipe-line-units";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Props = {
  material?: RawMaterialRow | null;
  pjClients?: ClientRow[];
  establishments?: EstablishmentWithClientNames[];
  /** Pré-seleciona o âmbito inicial (ex.: mesmo cliente/estabelecimento da
   * receita que abriu o painel). Só usado na criação, não afeta edição. */
  defaultClientId?: string;
  defaultEstablishmentId?: string;
  /**
   * Quando fornecido, o formulário entra em modo "inline": não usa
   * `saveRawMaterialAction` (que sempre navega via `redirect()`), envia por
   * `createRawMaterialInlineAction` (nunca navega) e chama este callback com
   * a linha criada em vez de redirecionar para /materias-primas. Usado pelo
   * painel de criação rápida aberto de dentro do formulário de receita, para
   * não perder o que o usuário já digitou lá.
   */
  onCreated?: (row: RawMaterialRow) => void;
  /** Só relevante em modo inline — chamado ao clicar "Cancelar". */
  onCancel?: () => void;
};

function pjClientLabel(c: ClientRow): string {
  const t = c.trade_name?.trim();
  return t && t.length > 0 ? t : c.legal_name;
}

const selectClassName = cn(
  "border-input bg-background h-9 w-full rounded-lg border px-2.5 text-sm",
  "outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50",
);

export function RawMaterialForm({
  material,
  pjClients = [],
  establishments = [],
  defaultClientId,
  defaultEstablishmentId,
  onCreated,
  onCancel,
}: Props) {
  const isEdit = Boolean(material);
  const inline = Boolean(onCreated);
  // Âmbito já definido (não é mais legado) — não é mais editável por aqui,
  // mesma regra usada em receitas: uma vez escopada, a matéria-prima não muda
  // de cliente/estabelecimento por este formulário.
  const scopeLocked = isEdit && Boolean(material?.client_id);

  const [scope, setScope] = useState<"estabelecimento" | "repositorio">(() => {
    if (material?.contexto === "REPOSITORIO") return "repositorio";
    if (material?.contexto === "ESTABELECIMENTO") return "estabelecimento";
    if (defaultEstablishmentId) return "estabelecimento";
    if (defaultClientId) return "repositorio";
    return establishments.length > 0 ? "estabelecimento" : "repositorio";
  });
  const [establishmentId, setEstablishmentId] = useState(
    () =>
      material?.establishment_id ??
      defaultEstablishmentId ??
      establishments[0]?.id ??
      "",
  );
  const [clientId, setClientId] = useState(
    () => material?.client_id ?? defaultClientId ?? pjClients[0]?.id ?? "",
  );

  const [inlineState, inlineFormAction, inlinePending] = useActionState(
    createRawMaterialInlineAction,
    undefined,
  );

  useEffect(() => {
    if (!inlineState) return;
    if (inlineState.ok) {
      toast.success(`"${inlineState.row.name}" cadastrada com sucesso.`);
      onCreated?.(inlineState.row);
    } else {
      toast.error(inlineState.error);
    }
    // onCreated não entra nas deps: só deve disparar quando o resultado do
    // useActionState muda, não a cada re-render do painel pai.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inlineState]);

  if (!scopeLocked && establishments.length === 0 && pjClients.length === 0) {
    return (
      <div className="border-border bg-muted/30 max-w-lg space-y-3 rounded-xl border p-5">
        <p className="text-foreground text-sm font-medium">
          Nenhum cliente PJ cadastrado ainda
        </p>
        <p className="text-muted-foreground text-sm">
          Toda matéria-prima precisa pertencer a um cliente — crie um cliente
          PJ (e, se quiser, um estabelecimento) antes de cadastrar itens.
        </p>
        <Link href="/clientes/novo" className={cn(buttonVariants())}>
          Novo cliente
        </Link>
      </div>
    );
  }

  return (
    <form
      action={inline ? inlineFormAction : saveRawMaterialAction}
      // Este painel é renderizado dentro do <form> da receita via portal
      // (Sheet). Portais só mudam onde o DOM fica — o evento sintético do
      // React ainda sobe pela árvore de componentes, então sem isto o
      // submit daqui também disparava o onSubmit do formulário da receita
      // (tentando salvar a receita ao clicar em "Registar matéria-prima").
      onSubmit={(e) => e.stopPropagation()}
      className={cn(!inline && "max-w-lg", "space-y-5")}
    >
      {isEdit && material ? (
        <input type="hidden" name="id" value={material.id} />
      ) : null}

      <fieldset
        disabled={inline && inlinePending}
        className="contents disabled:opacity-70"
      >
      {scopeLocked ? (
        <div className="space-y-1">
          <Label>Onde fica esta matéria-prima?</Label>
          <p className="text-foreground text-sm">
            {material?.establishment_id
              ? (() => {
                  const est = establishments.find(
                    (e) => e.id === material.establishment_id,
                  );
                  return est
                    ? `${establishmentClientLabel(est)} — ${est.name}`
                    : "Estabelecimento específico";
                })()
              : (() => {
                  const c = pjClients.find((c) => c.id === material?.client_id);
                  return c
                    ? `Repositório de ${pjClientLabel(c)} (todos os estabelecimentos deste cliente)`
                    : "Repositório do cliente";
                })()}
          </p>
        </div>
      ) : (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">
            Onde fica esta matéria-prima?
          </legend>
          {establishments.length > 0 && pjClients.length > 0 ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <label className="border-input bg-background text-foreground flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm shadow-xs has-[:checked]:ring-ring has-[:checked]:ring-2">
                <input
                  type="radio"
                  name="rm-scope"
                  className="accent-primary"
                  checked={scope === "estabelecimento"}
                  onChange={() => {
                    setScope("estabelecimento");
                    setEstablishmentId((prev) =>
                      prev.trim().length > 0 ? prev : (establishments[0]?.id ?? ""),
                    );
                  }}
                />
                Estabelecimento
              </label>
              <label className="border-input bg-background text-foreground flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm shadow-xs has-[:checked]:ring-ring has-[:checked]:ring-2">
                <input
                  type="radio"
                  name="rm-scope"
                  className="accent-primary"
                  checked={scope === "repositorio"}
                  onChange={() => {
                    setScope("repositorio");
                    setClientId((prev) =>
                      prev.trim().length > 0 ? prev : (pjClients[0]?.id ?? ""),
                    );
                  }}
                />
                Usar em todos os estabelecimentos deste cliente
              </label>
            </div>
          ) : null}

          {scope === "estabelecimento" && establishments.length > 0 ? (
            <>
              <select
                id="rm-establishment"
                name="establishment_id"
                className={selectClassName}
                value={establishmentId}
                onChange={(e) => setEstablishmentId(e.target.value)}
                required
              >
                {establishments.map((est) => (
                  <option key={est.id} value={est.id}>
                    {establishmentClientLabel(est)} — {est.name}
                  </option>
                ))}
              </select>
              <p className="text-muted-foreground text-xs">
                Fica disponível só neste estabelecimento.
              </p>
            </>
          ) : (
            <>
              <select
                id="rm-client"
                name="client_id"
                className={selectClassName}
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                required
              >
                {pjClients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {pjClientLabel(c)}
                  </option>
                ))}
              </select>
              <p className="text-muted-foreground text-xs">
                Fica disponível em todos os estabelecimentos de{" "}
                {(() => {
                  const c = pjClients.find((c) => c.id === clientId);
                  return c ? pjClientLabel(c) : "—";
                })()}{" "}
                — nunca em outros clientes.
              </p>
            </>
          )}
        </fieldset>
      )}

      <div className="space-y-2">
        <Label htmlFor="rm-name">Nome da matéria-prima</Label>
        <Input
          id="rm-name"
          name="name"
          required
          maxLength={300}
          defaultValue={material?.name ?? ""}
          placeholder="Ex.: Azeite extra virgem"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="rm-price-unit">Unidade do preço</Label>
          <select
            id="rm-price-unit"
            name="price_unit"
            required
            className={selectClassName}
            defaultValue={material?.price_unit ?? "kg"}
          >
            {RECIPE_LINE_UNITS.map((u) => (
              <option key={u} value={u}>
                {RECIPE_LINE_UNIT_LABELS[u]}
              </option>
            ))}
          </select>
          <p className="text-muted-foreground text-xs">
            O valor abaixo é o preço por esta unidade (ex.: R$ por kg).
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="rm-price">Preço (R$)</Label>
          <Input
            id="rm-price"
            name="unit_price_brl"
            type="text"
            inputMode="decimal"
            required
            defaultValue={
              material != null ? String(material.unit_price_brl) : ""
            }
            placeholder="0,00"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="rm-notes">Notas (opcional)</Label>
        <textarea
          id="rm-notes"
          name="notes"
          rows={3}
          maxLength={2000}
          defaultValue={material?.notes ?? ""}
          className={cn(
            "border-input bg-background w-full rounded-lg border px-2.5 py-2 text-sm",
            "outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50",
          )}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={inline && inlinePending}>
          {inline && inlinePending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              Salvando…
            </>
          ) : isEdit ? (
            "Salvar alterações"
          ) : (
            "Registar matéria-prima"
          )}
        </Button>
        {inline ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        ) : (
          <Link
            href="/materias-primas"
            className={buttonVariants({ variant: "outline" })}
          >
            Cancelar
          </Link>
        )}
        {inline && inlinePending ? (
          <span className="text-muted-foreground text-xs" role="status">
            Registando matéria-prima…
          </span>
        ) : null}
      </div>
      </fieldset>
    </form>
  );
}
