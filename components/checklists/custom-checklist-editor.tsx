import {
  addCustomItemAction,
  addCustomSectionAction,
  type CustomEditSection,
} from "@/lib/actions/checklist-custom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  customTemplateId: string;
  templateName: string;
  sections: CustomEditSection[];
};

const fieldClass =
  "border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[72px] w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none";

export function CustomChecklistEditor({
  customTemplateId,
  templateName,
  sections,
}: Props) {
  return (
    <div className="space-y-8">
      <p className="text-foreground text-lg font-medium">{templateName}</p>
      <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">
        No preenchimento, cada critério deste modelo usa as opções padrão de
        avaliação: <span className="text-foreground font-medium">Conforme</span>
        ,{" "}
        <span className="text-foreground font-medium">Não conforme</span> e{" "}
        <span className="text-foreground font-medium">Não aplicável</span>.
      </p>

      {sections.map((sec) => (
        <section
          key={sec.id}
          className="border-border rounded-xl border bg-background p-4 shadow-xs"
        >
          <h2 className="text-foreground text-base font-semibold">{sec.title}</h2>
          <ul className="border-border mt-3 divide-y rounded-lg border">
            {sec.items.map((it) => (
              <li
                key={it.id}
                className="flex flex-wrap items-start justify-between gap-2 px-3 py-2 text-sm"
              >
                <span className="text-foreground min-w-0 flex-1">
                  {it.description}
                </span>
                <span className="flex shrink-0 flex-wrap gap-2">
                  {it.peso !== 1 && (
                    <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
                      Peso {it.peso}
                    </span>
                  )}
                  {it.is_required ? (
                    <span className="bg-primary/15 text-primary rounded-md px-2 py-0.5 text-xs font-medium">
                      Obrigatório
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-xs">
                      Opcional
                    </span>
                  )}
                  {it.is_user_extra ? (
                    <span className="bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-xs">
                      Extra
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-xs">Base</span>
                  )}
                </span>
              </li>
            ))}
          </ul>

          <form action={addCustomItemAction} className="mt-4 space-y-3 border-t pt-4">
            <input type="hidden" name="custom_template_id" value={customTemplateId} />
            <input type="hidden" name="custom_section_id" value={sec.id} />
            <p className="text-muted-foreground text-xs font-medium">
              Novo item nesta seção
            </p>
            <div className="space-y-2">
              <Label htmlFor={`desc-${sec.id}`}>Descrição</Label>
              <textarea
                id={`desc-${sec.id}`}
                name="description"
                required
                rows={2}
                className={fieldClass}
                placeholder="Texto do critério ou campo extra"
              />
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" name="is_required" className="h-4 w-4" />
                Marcar como obrigatório no preenchimento
              </label>
              <div className="flex items-center gap-2">
                <Label
                  htmlFor={`peso-${sec.id}`}
                  className="text-sm whitespace-nowrap"
                >
                  Peso
                </Label>
                <Input
                  id={`peso-${sec.id}`}
                  name="peso"
                  type="number"
                  min="0.01"
                  step="0.01"
                  defaultValue="1"
                  className="h-8 w-20 text-sm"
                  aria-describedby={`peso-hint-${sec.id}`}
                />
                <span
                  id={`peso-hint-${sec.id}`}
                  className="text-muted-foreground text-xs"
                >
                  (padrão 1)
                </span>
              </div>
              <Button type="submit" size="sm">
                Adicionar item
              </Button>
            </div>
          </form>
        </section>
      ))}

      <section className="border-border rounded-xl border border-dashed p-4">
        <h2 className="text-foreground text-base font-semibold">
          Nova seção
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Seções vazias podem receber apenas itens seus (úteis para requisitos
          internos do cliente).
        </p>
        <form action={addCustomSectionAction} className="mt-4 flex flex-wrap gap-3">
          <input type="hidden" name="custom_template_id" value={customTemplateId} />
          <div className="flex min-w-[200px] flex-1 flex-col gap-2">
            <Label htmlFor="new-section-title">Título da seção</Label>
            <Input
              id="new-section-title"
              name="title"
              required
              placeholder="Ex.: Controle interno"
            />
          </div>
          <div className="flex items-end">
            <Button type="submit">Adicionar seção</Button>
          </div>
        </form>
      </section>
    </div>
  );
}
