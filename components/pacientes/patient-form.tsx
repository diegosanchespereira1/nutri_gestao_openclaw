"use client";

import Link from "next/link";
import { useActionState, useEffect, useState, type ReactNode } from "react";

import { ReturnToHiddenField } from "@/components/navigation/return-to-hidden-field";
import {
  PatientPhotoField,
  type PatientPhotoFieldChange,
} from "@/components/pacientes/patient-photo-field";

import {
  type PatientFormResult,
  createPatientAction,
  updatePatientAction,
} from "@/lib/actions/patients";
import type { TeamMemberSelectOption } from "@/lib/actions/team-members";
import type { PatientSex } from "@/lib/types/patients";
import type { ClientRow } from "@/lib/types/clients";
import type { ClientSchoolGradeOption } from "@/lib/types/school-grades";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const initial: PatientFormResult | undefined = undefined;

const sexOptions: { value: PatientSex; label: string }[] = [
  { value: "female", label: "Feminino" },
  { value: "male", label: "Masculino" },
  { value: "other", label: "Outro" },
];

const NONE_SELECT = "__none__";

const selectClass =
  "border-input bg-card appearance-none touch-manipulation flex h-9 min-h-11 w-full min-w-0 rounded-md border px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/50";

const textareaClass =
  "border-input bg-card appearance-none placeholder:text-muted-foreground flex min-h-[88px] w-full resize-y rounded-md border px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50";

function Field({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn("min-w-0 space-y-1.5", className)}>{children}</div>;
}

function SchoolGradeSelect({
  id,
  value,
  grades,
  onChange,
}: {
  id: string;
  value: string;
  grades: ClientSchoolGradeOption[];
  onChange: (next: string) => void;
}) {
  const selected = value || NONE_SELECT;
  return (
    <Select
      value={selected}
      onValueChange={(next) => {
        onChange(!next || next === NONE_SELECT ? "" : next);
      }}
    >
      <SelectTrigger
        id={id}
        className={cn("w-full", !value && "text-muted-foreground")}
      >
        <SelectValue placeholder="Opcional">
          {(current) => {
            if (!current || current === NONE_SELECT) return "Opcional";
            return grades.find((g) => g.id === current)?.name ?? "Opcional";
          }}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE_SELECT}>Opcional</SelectItem>
        {grades.map((g) => (
          <SelectItem key={g.id} value={g.id}>
            {g.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function SectionShell({
  useCards,
  title,
  description,
  children,
}: {
  useCards: boolean;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  if (!useCards) {
    return (
      <section className="space-y-3">
        <div className="space-y-0.5">
          <h2 className="text-foreground text-sm font-semibold">{title}</h2>
          {description ? (
            <p className="text-muted-foreground text-xs">{description}</p>
          ) : null}
        </div>
        {children}
      </section>
    );
  }

  return (
    <Card className="overflow-visible border border-border ring-0">
      <CardHeader className="border-b border-border">
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="pt-4">{children}</CardContent>
    </Card>
  );
}

export function PatientForm({
  mode,
  patientId,
  /** Quando fornecido, o cliente fica fixo (contexto de cliente/estabelecimento).
   *  Quando omitido, o formulário oferece seletor de cliente (opcional). */
  clientId,
  establishmentId,
  /** Estabelecimentos do cliente PJ — quando fornecido exibe seletor visível (edit). */
  establishments,
  /** Mapa clientId → estabelecimentos (usado no selector de cliente em create). */
  establishmentsByClient,
  /** Lista de clientes PJ disponíveis para o seletor (só relevante em create sem clientId fixo). */
  clients,
  /** Séries da escola já fixa (edit, ou create dentro do contexto de um cliente). */
  schoolGrades,
  /** Mapa clientId → séries (usado no selector de cliente em create sem clientId fixo). */
  schoolGradesByClient,
  teamMembers = [],
  defaultPhotoUrl = null,
  cancelHref,
  surface,
  defaults,
}: {
  mode: "create" | "edit";
  patientId?: string;
  clientId?: string | null;
  establishmentId?: string | null;
  establishments?: { id: string; name: string }[];
  establishmentsByClient?: Record<string, { id: string; name: string }[]>;
  clients?: Pick<ClientRow, "id" | "legal_name" | "trade_name">[];
  schoolGrades?: ClientSchoolGradeOption[];
  schoolGradesByClient?: Record<string, ClientSchoolGradeOption[]>;
  teamMembers?: TeamMemberSelectOption[];
  defaultPhotoUrl?: string | null;
  cancelHref?: string;
  /** `cards` em páginas de criação; `plain` quando o formulário já vive dentro de um card. */
  surface?: "cards" | "plain";
  defaults: {
    full_name: string;
    birth_date: string;
    document_id: string;
    sex: PatientSex | null;
    phone: string;
    email: string;
    notes: string;
    responsible_team_member_id: string | null;
    school_grade_id?: string | null;
  };
}) {
  const action =
    mode === "create" ? createPatientAction : updatePatientAction;
  const useCards = surface ? surface === "cards" : mode === "create";

  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);

  const [state, formAction] = useActionState(
    async (prev: PatientFormResult | undefined, formData: FormData) => {
      if (removePhoto) {
        formData.set("remove_photo", "1");
      } else if (pendingPhoto) {
        formData.set("photo", pendingPhoto);
      }
      return action(prev, formData);
    },
    initial,
  );

  const sexDefault = defaults.sex ?? "";
  const [sex, setSex] = useState<string>(sexDefault);
  const [fullNameValue, setFullNameValue] = useState(defaults.full_name);
  const [responsibleId, setResponsibleId] = useState(
    defaults.responsible_team_member_id ?? "",
  );

  function handlePhotoChange({ file, remove }: PatientPhotoFieldChange) {
    setPendingPhoto(file);
    setRemovePhoto(remove);
  }

  useEffect(() => {
    if (state?.ok !== true) return;
    // Limpa a seleção de foto pendente após salvar com sucesso.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPendingPhoto(null);
    setRemovePhoto(false);
  }, [state]);

  // Para o seletor de cliente no modo "independente"
  const showClientSelector = mode === "create" && clientId == null;
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedClientEstId, setSelectedClientEstId] = useState<string>("");

  // Estabelecimentos disponíveis para o cliente selecionado no selector
  const clientEstablishments =
    establishmentsByClient && selectedClientId
      ? (establishmentsByClient[selectedClientId] ?? [])
      : [];
  const showClientEstSelector = clientEstablishments.length > 0;

  // Seletor de estabelecimento — usado quando o cliente é PJ (edit mode)
  const showEstablishmentSelector =
    establishments != null && establishments.length > 0;
  const [selectedEstId, setSelectedEstId] = useState<string>(
    establishmentId ?? "",
  );

  // Seletor de série — cliente fixo (edit, ou create dentro do contexto de um cliente-escola)
  const showSchoolGradeSelector = schoolGrades != null && schoolGrades.length > 0;
  const [selectedGradeId, setSelectedGradeId] = useState<string>(
    defaults.school_grade_id ?? "",
  );
  const showFixedSchoolGrade =
    showSchoolGradeSelector && !showEstablishmentSelector;

  // Séries disponíveis para o cliente selecionado no selector de cliente (create sem clientId fixo)
  const clientGrades =
    schoolGradesByClient && selectedClientId
      ? (schoolGradesByClient[selectedClientId] ?? [])
      : [];
  const showClientGradeSelector = clientGrades.length > 0;
  const [selectedClientGradeId, setSelectedClientGradeId] = useState<string>("");

  return (
    <form action={formAction} onReset={(e) => e.preventDefault()} className="space-y-4">
      <ReturnToHiddenField />
      {/* Campos ocultos de contexto */}
      {clientId ? (
        <input type="hidden" name="client_id" value={clientId} />
      ) : showClientSelector ? (
        // Seletor visível — o valor seleccionado vai como client_id
        <input type="hidden" name="client_id" value={selectedClientId} />
      ) : null}
      {showEstablishmentSelector ? (
        <input type="hidden" name="establishment_id" value={selectedEstId} />
      ) : showClientEstSelector ? (
        <input type="hidden" name="establishment_id" value={selectedClientEstId} />
      ) : establishmentId ? (
        <input type="hidden" name="establishment_id" value={establishmentId} />
      ) : (
        <input type="hidden" name="establishment_id" value="" />
      )}
      {showSchoolGradeSelector ? (
        <input type="hidden" name="school_grade_id" value={selectedGradeId} />
      ) : showClientGradeSelector ? (
        <input type="hidden" name="school_grade_id" value={selectedClientGradeId} />
      ) : (
        <input type="hidden" name="school_grade_id" value="" />
      )}
      {mode === "edit" && patientId ? (
        <input type="hidden" name="id" value={patientId} />
      ) : null}

      <SectionShell
        useCards={useCards}
        title="Quem é o paciente"
        description="Nome e nascimento são obrigatórios. Foto, sexo, série e CPF podem ficar para depois."
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <PatientPhotoField
            patientName={fullNameValue}
            defaultPhotoUrl={defaultPhotoUrl}
            onChange={handlePhotoChange}
            compact
            className="lg:shrink-0"
          />

          <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Field className="sm:col-span-2 xl:col-span-4">
              <Label htmlFor="patient-name">
                Nome completo{" "}
                <span aria-hidden="true" className="text-destructive">
                  *
                </span>
              </Label>
              <Input
                id="patient-name"
                name="full_name"
                required
                value={fullNameValue}
                onChange={(event) => setFullNameValue(event.target.value)}
                autoComplete="name"
                placeholder="Nome como no documento ou na lista da escola"
                aria-invalid={
                  state?.ok === false &&
                  state.error === "Indique o nome do paciente."
                }
                aria-describedby={
                  state?.ok === false ? "patient-form-err" : undefined
                }
              />
            </Field>

            <Field>
              <Label htmlFor="patient-birth">
                Nascimento{" "}
                <span aria-hidden="true" className="text-destructive">
                  *
                </span>
              </Label>
              <Input
                id="patient-birth"
                name="birth_date"
                type="date"
                required
                defaultValue={defaults.birth_date}
              />
            </Field>

            <Field>
              <Label htmlFor="patient-sex">Sexo</Label>
              <select
                id="patient-sex"
                name="sex"
                value={sex}
                onChange={(e) => setSex(e.target.value)}
                className={cn(selectClass, sex === "" && "text-muted-foreground")}
              >
                <option value="">Opcional</option>
                {sexOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>

            {showFixedSchoolGrade ? (
              <Field>
                <Label htmlFor="patient-grade">Série / turma</Label>
                <SchoolGradeSelect
                  id="patient-grade"
                  value={selectedGradeId}
                  grades={schoolGrades!}
                  onChange={setSelectedGradeId}
                />
              </Field>
            ) : null}

            <Field>
              <Label htmlFor="patient-doc">CPF</Label>
              <Input
                id="patient-doc"
                name="document_id"
                defaultValue={defaults.document_id}
                inputMode="numeric"
                autoComplete="off"
                placeholder="Opcional"
                className="font-mono"
              />
            </Field>
          </div>
        </div>
      </SectionShell>

      {showClientSelector && clients && clients.length > 0 ? (
        <SectionShell
          useCards={useCards}
          title="Associação"
          description="Opcional. Pode ligar o paciente a um cliente agora ou depois."
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <Field>
              <Label htmlFor="patient-client">Cliente</Label>
              <select
                id="patient-client"
                value={selectedClientId}
                onChange={(e) => {
                  setSelectedClientId(e.target.value);
                  setSelectedClientEstId("");
                  setSelectedClientGradeId("");
                }}
                className={cn(
                  selectClass,
                  selectedClientId === "" && "text-muted-foreground",
                )}
              >
                <option value="">Particular (sem cliente)</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.legal_name}
                    {c.trade_name ? ` · ${c.trade_name}` : ""}
                  </option>
                ))}
              </select>
            </Field>

            {showClientEstSelector ? (
              <Field>
                <Label htmlFor="patient-client-est">
                  Estabelecimento{" "}
                  <span aria-hidden="true" className="text-destructive">
                    *
                  </span>
                </Label>
                <select
                  id="patient-client-est"
                  value={selectedClientEstId}
                  onChange={(e) => setSelectedClientEstId(e.target.value)}
                  className={cn(
                    selectClass,
                    selectedClientEstId === "" && "text-muted-foreground",
                  )}
                  required
                >
                  <option value="">Selecione</option>
                  {clientEstablishments.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}

            {showClientGradeSelector ? (
              <Field>
                <Label htmlFor="patient-client-grade">Série / turma</Label>
                <SchoolGradeSelect
                  id="patient-client-grade"
                  value={selectedClientGradeId}
                  grades={clientGrades}
                  onChange={setSelectedClientGradeId}
                />
              </Field>
            ) : null}
          </div>
        </SectionShell>
      ) : null}

      {showEstablishmentSelector ? (
        <SectionShell
          useCards={useCards}
          title="Estabelecimento"
          description="Unidade e série em que este paciente está acompanhado."
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field>
              <Label htmlFor="patient-establishment">Estabelecimento</Label>
              <select
                id="patient-establishment"
                value={selectedEstId}
                onChange={(e) => setSelectedEstId(e.target.value)}
                className={cn(
                  selectClass,
                  selectedEstId === "" && "text-muted-foreground",
                )}
              >
                <option value="">Selecione</option>
                {establishments!.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </Field>

            {showSchoolGradeSelector ? (
              <Field>
                <Label htmlFor="patient-grade">Série / turma</Label>
                <SchoolGradeSelect
                  id="patient-grade"
                  value={selectedGradeId}
                  grades={schoolGrades!}
                  onChange={setSelectedGradeId}
                />
              </Field>
            ) : null}
          </div>
        </SectionShell>
      ) : null}

      <SectionShell
        useCards={useCards}
        title="Contato e acompanhamento"
        description="Tudo opcional — útil para avisos e para saber quem conduz o caso."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <Field>
            <Label htmlFor="patient-email">Email</Label>
            <Input
              id="patient-email"
              name="email"
              type="email"
              defaultValue={defaults.email}
              autoComplete="email"
              placeholder="Opcional"
            />
          </Field>
          <Field>
            <Label htmlFor="patient-phone">Telefone</Label>
            <Input
              id="patient-phone"
              name="phone"
              type="tel"
              defaultValue={defaults.phone}
              autoComplete="tel"
              placeholder="Opcional"
            />
          </Field>
          {teamMembers.length > 0 ? (
            <Field>
              <Label htmlFor="patient-responsible">Profissional responsável</Label>
              <input
                type="hidden"
                name="responsible_team_member_id"
                value={responsibleId}
              />
              <Select
                value={responsibleId || NONE_SELECT}
                onValueChange={(next) => {
                  setResponsibleId(!next || next === NONE_SELECT ? "" : next);
                }}
              >
                <SelectTrigger
                  id="patient-responsible"
                  className={cn("w-full", !responsibleId && "text-muted-foreground")}
                >
                  <SelectValue placeholder="Nenhum">
                    {(current) => {
                      if (!current || current === NONE_SELECT) return "Nenhum";
                      return (
                        teamMembers.find((m) => m.id === current)?.full_name ??
                        "Nenhum"
                      );
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_SELECT}>Nenhum</SelectItem>
                  {teamMembers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          ) : (
            <input type="hidden" name="responsible_team_member_id" value="" />
          )}
        </div>
      </SectionShell>

      <SectionShell
        useCards={useCards}
        title="Notas clínicas"
        description="Alergias, restrições e medicações — dado protegido por LGPD."
      >
        <Field>
          <Label htmlFor="patient-notes">Observações</Label>
          <textarea
            id="patient-notes"
            name="notes"
            rows={3}
            defaultValue={defaults.notes}
            placeholder="Alergias, intolerâncias, restrições alimentares, medicações…"
            className={textareaClass}
          />
        </Field>
      </SectionShell>

      {state?.ok === false ? (
        <p
          id="patient-form-err"
          className="border-destructive/30 bg-destructive/5 text-destructive rounded-md border px-3 py-2 text-sm"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}
      {state?.ok === true ? (
        <p
          className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800"
          role="status"
        >
          Alterações guardadas.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Button type="submit">
          {mode === "create" ? "Criar paciente" : "Salvar alterações"}
        </Button>
        {cancelHref ? (
          <Link
            href={cancelHref}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Cancelar
          </Link>
        ) : null}
      </div>
    </form>
  );
}
