"use client";

import {
  Building2,
  FileStack,
  Globe,
  HeartPulse,
  IdCard,
  ImageIcon,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  StickyNote,
  UserCircle,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";

import {
  type ClientFormResult,
  createClientAction,
  updateClientAction,
} from "@/lib/actions/clients";
import type { TeamMemberSelectOption } from "@/lib/actions/team-members";
import {
  prepareImageInputInPlace,
  prepareMixedFilesInputInPlace,
} from "@/lib/images/prepare-image-upload";
import {
  type ClientCustomSegment,
  createCustomSegmentAction,
} from "@/lib/actions/client-segments";
import { Button } from "@/components/ui/button";
import { EstablishmentCategorySelect } from "@/components/clientes/establishment-category-select";
import { EstablishmentTypeSelect } from "@/components/clientes/establishment-type-select";
import { BusinessSegmentSelect } from "@/components/clientes/business-segment-select";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  categoryFromType,
} from "@/lib/constants/establishment-types";
import { clientLifecycleLabel } from "@/lib/constants/client-lifecycle";
import { MAX_CLIENT_LOGO_BYTES } from "@/lib/constants/client-logos-storage";
import type { ClientKind, ClientLifecycleStatus } from "@/lib/types/clients";
import type { EstablishmentCategory, EstablishmentType } from "@/lib/types/establishments";
import type { PatientSex } from "@/lib/types/patients";
import { cn } from "@/lib/utils";

const initial: ClientFormResult | undefined = undefined;

const sexOptions: { value: PatientSex; label: string }[] = [
  { value: "female", label: "Feminino" },
  { value: "male", label: "Masculino" },
  { value: "other", label: "Outro" },
];

const EMPTY_SELECT_VALUE = "__empty__";

const textareaClass =
  "border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none";

const lifecycleOptions: ClientLifecycleStatus[] = [
  "ativo",
  "inativo",
  "finalizado",
];

type ClientFormTab =
  | "identificacao"
  | "pessoa-saude"
  | "documentos"
  | "pj-estabelecimento"
  | "pj-fiscal"
  | "pj-web"
  | "pj-marca"
  | "pj-responsaveis"
  | "notas";

const PF_ONLY_TABS: ClientFormTab[] = ["pessoa-saude", "documentos"];
const PJ_ONLY_TABS: ClientFormTab[] = [
  "pj-estabelecimento",
  "pj-fiscal",
  "pj-web",
  "pj-marca",
  "pj-responsaveis",
];

export function ClientForm({
  mode,
  clientId,
  canEdit = true,
  defaultKind,
  lockKind = false,
  defaultLegalName,
  defaultTradeName,
  defaultDocumentId,
  defaultEmail,
  defaultPhone,
  defaultNotes,
  defaultAttendedFullName,
  defaultBirthDate,
  defaultSex,
  defaultDietaryRestrictions,
  defaultChronicMedications,
  defaultGuardianFullName,
  defaultGuardianDocumentId,
  defaultGuardianEmail,
  defaultGuardianPhone,
  defaultGuardianRelationship,
  defaultLifecycleStatus,
  defaultActivatedAt,
  defaultStateRegistration,
  defaultMunicipalRegistration,
  defaultSanitaryLicense,
  defaultWebsiteUrl,
  defaultSocialInstagram,
  defaultSocialFacebook,
  defaultSocialLinkedin,
  defaultSocialWhatsapp,
  defaultSocialOther,
  defaultLogoPreviewUrl,
  defaultLegalRepFullName,
  defaultLegalRepDocumentId,
  defaultLegalRepRole,
  defaultLegalRepEmail,
  defaultLegalRepPhone,
  defaultTechnicalRepFullName,
  defaultTechnicalRepProfessionalId,
  defaultTechnicalRepEmail,
  defaultTechnicalRepPhone,
  defaultBusinessSegment,
  defaultCustomSegments = [],
  teamMembersForSelect = [],
  defaultResponsibleTeamMemberId = null,
  defaultEstName = "",
  defaultEstType,
  defaultEstAddressLine1 = "",
  defaultEstAddressLine2 = "",
  defaultEstCity = "",
  defaultEstState = "",
  defaultEstPostalCode = "",
  /** Abre o separador interno «Estabelecimento» ao carregar (edição PJ). */
  initialFormTab,
  children,
}: {
  mode: "create" | "edit";
  clientId?: string;
  /** Em modo edit: mostra ícone Editar e permite gravar. Create ignora. */
  canEdit?: boolean;
  defaultKind: ClientKind;
  /** Quando true, o toggle PF/PJ fica oculto e o kind é fixado em defaultKind.
   *  Usar nas páginas de Clientes (apenas PJ). */
  lockKind?: boolean;
  defaultLegalName: string;
  defaultTradeName: string;
  defaultDocumentId: string;
  defaultEmail: string;
  defaultPhone: string;
  defaultNotes: string;
  defaultAttendedFullName: string;
  defaultBirthDate: string;
  defaultSex: PatientSex | "";
  defaultDietaryRestrictions: string;
  defaultChronicMedications: string;
  defaultGuardianFullName: string;
  defaultGuardianDocumentId: string;
  defaultGuardianEmail: string;
  defaultGuardianPhone: string;
  defaultGuardianRelationship: string;
  defaultLifecycleStatus: ClientLifecycleStatus;
  defaultActivatedAt: string;
  defaultStateRegistration: string;
  defaultMunicipalRegistration: string;
  defaultSanitaryLicense: string;
  defaultWebsiteUrl: string;
  defaultSocialInstagram: string;
  defaultSocialFacebook: string;
  defaultSocialLinkedin: string;
  defaultSocialWhatsapp: string;
  defaultSocialOther: string;
  /** URL assinada só para pré-visualização (edição). */
  defaultLogoPreviewUrl: string | null;
  defaultLegalRepFullName: string;
  defaultLegalRepDocumentId: string;
  defaultLegalRepRole: string;
  defaultLegalRepEmail: string;
  defaultLegalRepPhone: string;
  defaultTechnicalRepFullName: string;
  defaultTechnicalRepProfessionalId: string;
  defaultTechnicalRepEmail: string;
  defaultTechnicalRepPhone: string;
  /** Valor do select `business_segment`; vazio = sem categoria. */
  defaultBusinessSegment: string;
  /** Categorias personalizadas já criadas no workspace. */
  defaultCustomSegments?: ClientCustomSegment[];
  /** Membros da equipe para atribuir responsável pela carteira. */
  teamMembersForSelect?: TeamMemberSelectOption[];
  /** ID do `team_member` responsável. */
  defaultResponsibleTeamMemberId?: string | null;
  /** Campos do estabelecimento 1:1 (apenas PJ). */
  defaultEstName?: string;
  defaultEstType?: EstablishmentType;
  defaultEstAddressLine1?: string;
  defaultEstAddressLine2?: string;
  defaultEstCity?: string;
  defaultEstState?: string;
  defaultEstPostalCode?: string;
  initialFormTab?: "pj-estabelecimento";
  children?: ReactNode;
}) {
  const router = useRouter();
  const action =
    mode === "create" ? createClientAction : updateClientAction;
  const [state, formAction, isPending] = useActionState(action, initial);
  const [isEditing, setIsEditing] = useState(mode === "create");
  const [formEpoch, setFormEpoch] = useState(0);
  const fieldsLocked = mode === "edit" && !isEditing;
  // Fecha o overlay assim que a action devolve resultado. Evita popup preso
  // quando isPending fica true após router.refresh() (deadlock Next.js).
  const savingDialogOpen = isPending && state?.ok !== true;
  const [kind, setKind] = useState<ClientKind>(defaultKind);
  const [tab, setTab] = useState<ClientFormTab>(() => {
    if (
      initialFormTab === "pj-estabelecimento" &&
      defaultKind === "pj"
    ) {
      return "pj-estabelecimento";
    }
    return "identificacao";
  });

  const initialEstCategory: EstablishmentCategory | "" = defaultEstType
    ? categoryFromType(defaultEstType)
    : "";
  const [estCategory, setEstCategory] = useState<EstablishmentCategory | "">(initialEstCategory);
  const [estType, setEstType] = useState<EstablishmentType | "">(defaultEstType ?? "");
  const [estValidationError, setEstValidationError] = useState(false);
  const [logoPrepareError, setLogoPrepareError] = useState<string | null>(null);
  const [examPrepareError, setExamPrepareError] = useState<string | null>(null);

  const handleExamFilesChange = (input: HTMLInputElement) => {
    setExamPrepareError(null);
    // PDFs/DOCs passam intactos; fotos (HEIC/AVIF/JPEG grandes) são
    // convertidas e comprimidas no cliente antes do submit.
    void prepareMixedFilesInputInPlace(input, { maxDimension: 2048 }).then(
      (res) => {
        if (!res.ok) setExamPrepareError(res.error);
      },
    );
  };
  const [estValidationDialogOpen, setEstValidationDialogOpen] = useState(false);

  function handleEstCategoryChange(cat: EstablishmentCategory | "") {
    setEstCategory(cat);
    setEstType("");
    setEstValidationError(false);
  }

  const [segmentValue, setSegmentValue] = useState(defaultBusinessSegment);
  const [responsibleValue, setResponsibleValue] = useState(
    defaultResponsibleTeamMemberId ?? "",
  );
  const [sexValue, setSexValue] = useState(defaultSex);
  const [customSegments, setCustomSegments] =
    useState<ClientCustomSegment[]>(defaultCustomSegments);
  const [segmentDialogOpen, setSegmentDialogOpen] = useState(false);
  const [newSegmentLabel, setNewSegmentLabel] = useState("");
  const [newSegmentError, setNewSegmentError] = useState<string | null>(null);
  const [segmentPending, startSegmentTransition] = useTransition();
  const newSegmentInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state?.ok !== false || !state.error) return;
    const needsEstablishment =
      state.error.includes("estabelecimento") ||
      state.error.includes("Estabelecimento");
    if (!needsEstablishment) return;
    const id = window.setTimeout(() => {
      setEstValidationError(true);
      setEstValidationDialogOpen(true);
      setTab("pj-estabelecimento");
    }, 0);
    return () => window.clearTimeout(id);
  }, [state]);

  useEffect(() => {
    if (mode !== "edit" || state?.ok !== true) return;
    // Sai do modo de edição após salvar com sucesso; adiado para fora do
    // corpo síncrono do efeito.
    queueMicrotask(() => setIsEditing(false));
    // revalidatePath na action já invalida a página; o refresh no cliente
    // só atualiza default*. Atrasar evita descartar a transition da action
    // e deixar isPending=true para sempre (Unicorn/deadlock do App Router).
    const refreshId = window.setTimeout(() => {
      router.refresh();
    }, 100);
    return () => window.clearTimeout(refreshId);
  }, [mode, state, router]);

  const defaultsSignature = [
    defaultLegalName,
    defaultTradeName,
    defaultDocumentId,
    defaultEmail,
    defaultPhone,
    defaultNotes,
    defaultAttendedFullName,
    defaultBirthDate,
    defaultSex,
    defaultDietaryRestrictions,
    defaultChronicMedications,
    defaultGuardianFullName,
    defaultGuardianDocumentId,
    defaultGuardianEmail,
    defaultGuardianPhone,
    defaultGuardianRelationship,
    defaultLifecycleStatus,
    defaultActivatedAt,
    defaultStateRegistration,
    defaultMunicipalRegistration,
    defaultSanitaryLicense,
    defaultWebsiteUrl,
    defaultSocialInstagram,
    defaultSocialFacebook,
    defaultSocialLinkedin,
    defaultSocialWhatsapp,
    defaultSocialOther,
    defaultLegalRepFullName,
    defaultLegalRepDocumentId,
    defaultLegalRepRole,
    defaultLegalRepEmail,
    defaultLegalRepPhone,
    defaultTechnicalRepFullName,
    defaultTechnicalRepProfessionalId,
    defaultTechnicalRepEmail,
    defaultTechnicalRepPhone,
    defaultBusinessSegment,
    defaultResponsibleTeamMemberId ?? "",
    defaultEstName,
    defaultEstType ?? "",
    defaultEstAddressLine1,
    defaultEstAddressLine2,
    defaultEstCity,
    defaultEstState,
    defaultEstPostalCode,
    defaultLogoPreviewUrl ?? "",
  ].join("\u0001");

  // key no mesmo render que os default* mudam — evita aviso Base UI
  // (FieldControl uncontrolled) de defaultValue a mudar após o mount.
  const formInstanceKey =
    mode === "create"
      ? "create"
      : isEditing
        ? `edit-${formEpoch}`
        : `view-${defaultsSignature}`;

  useEffect(() => {
    if (isEditing) return;
    // Sincroniza estado local com os valores vindos das props quando não
    // está em edição (fora de edição, o formulário reflete os dados do servidor).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setKind(defaultKind);
    setSegmentValue(defaultBusinessSegment);
    setResponsibleValue(defaultResponsibleTeamMemberId ?? "");
    setSexValue(defaultSex);
    setEstCategory(defaultEstType ? categoryFromType(defaultEstType) : "");
    setEstType(defaultEstType ?? "");
  }, [
    isEditing,
    defaultKind,
    defaultBusinessSegment,
    defaultResponsibleTeamMemberId,
    defaultSex,
    defaultEstType,
  ]);

  function handleCreateSegment() {
    setNewSegmentError(null);
    startSegmentTransition(async () => {
      const result = await createCustomSegmentAction(newSegmentLabel);
      if (!result.ok) {
        setNewSegmentError(result.error);
        return;
      }
      setCustomSegments((prev) => {
        const already = prev.some((s) => s.id === result.segment.id);
        return already ? prev : [...prev, result.segment].sort((a, b) =>
          a.label.localeCompare(b.label, "pt", { sensitivity: "base" }),
        );
      });
      setSegmentValue(result.segment.label);
      setNewSegmentLabel("");
      setSegmentDialogOpen(false);
    });
  }

  function setKindAndTab(next: ClientKind) {
    setKind(next);
    if (next !== "pf" && PF_ONLY_TABS.includes(tab)) {
      setTab("identificacao");
    }
    if (next !== "pj" && PJ_ONLY_TABS.includes(tab)) {
      setTab("identificacao");
    }
  }

  const hasLogoPreview = Boolean(defaultLogoPreviewUrl);

  function enterEditMode() {
    setIsEditing(true);
  }

  function cancelEditMode() {
    setIsEditing(false);
    setFormEpoch((n) => n + 1);
    setKind(defaultKind);
    setSegmentValue(defaultBusinessSegment);
    setResponsibleValue(defaultResponsibleTeamMemberId ?? "");
    setSexValue(defaultSex);
    setEstCategory(initialEstCategory);
    setEstType(defaultEstType ?? "");
    setEstValidationError(false);
  }

  return (
    <>
    <Card className="max-w-3xl">
      <form
        key={formInstanceKey}
        action={formAction}
        onReset={(e) => e.preventDefault()}
        onSubmit={(e) => {
          if (!isEditing) {
            e.preventDefault();
            return;
          }
          if (kind === "pj" && !estType) {
            e.preventDefault();
            setEstValidationError(true);
            setEstValidationDialogOpen(true);
            setTab("pj-estabelecimento");
          }
        }}
        className={cn(
          fieldsLocked &&
            "[&_input:not([type=hidden]):not([type=file])]:pointer-events-none [&_input:not([type=hidden]):not([type=file])]:bg-muted/40 [&_textarea]:pointer-events-none [&_textarea]:bg-muted/40 [&_[data-slot=select-trigger]]:pointer-events-none [&_[data-slot=select-trigger]]:bg-muted/40 [&_input[type=file]]:hidden",
        )}
      >
        {mode === "edit" && clientId ? (
          <input type="hidden" name="id" value={clientId} />
        ) : null}

        <CardContent className="pt-6">
          <Tabs
            value={tab}
            onValueChange={(v: string | number | null) =>
              setTab(String(v) as ClientFormTab)
            }
          >
            <TabsList
              className="flex h-auto w-full flex-wrap gap-1 sm:w-auto"
              aria-label="Secções do formulário"
            >
              <TabsTrigger value="identificacao" className="shrink-0">
                <UserCircle className="size-4 opacity-70" aria-hidden />
                Identificação
              </TabsTrigger>
              {kind === "pf" ? (
                <>
                  <TabsTrigger value="pessoa-saude" className="shrink-0">
                    <HeartPulse className="size-4 opacity-70" aria-hidden />
                    Pessoa atendida e saúde
                  </TabsTrigger>
                  <TabsTrigger value="documentos" className="shrink-0">
                    <FileStack className="size-4 opacity-70" aria-hidden />
                    Exames
                  </TabsTrigger>
                </>
              ) : null}
              {kind === "pj" ? (
                <>
                  <TabsTrigger value="pj-estabelecimento" className="shrink-0 relative">
                    <MapPin className="size-4 opacity-70" aria-hidden />
                    Estabelecimento
                    {!estType && (
                      <span
                        className="absolute -top-1 -right-1 flex size-2.5 items-center justify-center rounded-full bg-destructive"
                        aria-label="Campo obrigatório não preenchido"
                      />
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="pj-fiscal" className="shrink-0">
                    <IdCard className="size-4 opacity-70" aria-hidden />
                    Fiscal e licenças
                  </TabsTrigger>
                  <TabsTrigger value="pj-web" className="shrink-0">
                    <Globe className="size-4 opacity-70" aria-hidden />
                    Web e redes
                  </TabsTrigger>
                  <TabsTrigger value="pj-marca" className="shrink-0">
                    <ImageIcon className="size-4 opacity-70" aria-hidden />
                    Marca
                  </TabsTrigger>
                  <TabsTrigger value="pj-responsaveis" className="shrink-0">
                    <Users className="size-4 opacity-70" aria-hidden />
                    Responsáveis
                  </TabsTrigger>
                </>
              ) : null}
              <TabsTrigger value="notas" className="shrink-0">
                <StickyNote className="size-4 opacity-70" aria-hidden />
                Notas
              </TabsTrigger>
            </TabsList>

            <TabsContent value="identificacao" className="space-y-6">
              {lockKind ? (
                /* kind fixado — campo hidden para garantir envio no form */
                <input type="hidden" name="kind" value={kind} />
              ) : (
                <fieldset className="space-y-3">
                  <legend className="text-foreground mb-1 text-sm font-medium">
                    Tipo de cliente
                  </legend>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="kind"
                        value="pf"
                        checked={kind === "pf"}
                        onChange={() => setKindAndTab("pf")}
                        className="border-input size-4 accent-primary"
                      />
                      Pessoa física
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="kind"
                        value="pj"
                        checked={kind === "pj"}
                        onChange={() => setKindAndTab("pj")}
                        className="border-input size-4 accent-primary"
                      />
                      <Building2
                        className="text-muted-foreground size-4"
                        aria-hidden
                      />
                      Pessoa jurídica
                    </label>
                  </div>
                </fieldset>
              )}

              <Separator />

              <div className="space-y-4">
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-foreground text-sm font-semibold">
                      Titular do contrato
                    </p>
                    {mode === "edit" && fieldsLocked && canEdit ? (
                      <button
                        type="button"
                        onClick={enterEditMode}
                        className="text-primary hover:text-primary/80 inline-flex shrink-0 cursor-pointer items-center gap-1.5 text-sm font-medium transition-colors"
                      >
                        <Pencil className="size-3.5 shrink-0" aria-hidden />
                        Editar dados
                      </button>
                    ) : null}
                  </div>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {kind === "pf"
                      ? "Quem assina ou paga o serviço. Se for a mesma pessoa que vem à consulta, pode deixar o nome da pessoa atendida em branco no outro separador."
                      : "Empresa ou organização que contrata — não confundir com estabelecimento (unidade); isso adiciona-se depois na ficha do cliente."}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="client-legal-name">
                    {kind === "pf"
                      ? "Nome completo do titular"
                      : "Razão social"}
                  </Label>
                  <Input
                    id="client-legal-name"
                    name="legal_name"
                    required
                    defaultValue={defaultLegalName}
                    autoComplete="name"
                    aria-invalid={state?.ok === false}
                    aria-describedby={
                      state?.ok === false ? "client-form-err" : undefined
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="client-trade-name">
                    Nome fantasia                  </Label>
                  <Input
                    id="client-trade-name"
                    name="trade_name"
                    defaultValue={defaultTradeName}
                    disabled={kind === "pf" || fieldsLocked}
                    placeholder={kind === "pj" ? "Ex.: Unidade Centro" : "—"}
                    className="disabled:opacity-60"
                  />
                  {kind === "pf" ? (
                    <p className="text-muted-foreground text-xs">
                      Só se aplica a clientes PJ.
                    </p>
                  ) : null}
                </div>

                {kind === "pj" ? (
                  <div className="space-y-2">
                    <Label htmlFor="business-segment">
                      Categoria do negócio                    </Label>
                    <div className="flex gap-2">
                      <BusinessSegmentSelect
                        id="business-segment"
                        value={segmentValue}
                        onChange={setSegmentValue}
                        customSegments={customSegments}
                        className="min-w-0 flex-1"
                        disabled={fieldsLocked}
                      />
                      {!fieldsLocked ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="shrink-0"
                          title="Criar nova categoria"
                          aria-label="Criar nova categoria de negócio"
                          onClick={() => {
                            setNewSegmentLabel("");
                            setNewSegmentError(null);
                            setSegmentDialogOpen(true);
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </div>
                    <p className="text-muted-foreground text-xs">
                      Aparece na lista de clientes (ex.: padaria, escola,
                      hospital). Use <strong>+</strong> para criar uma nova
                      categoria caso não esteja na lista.
                    </p>
                  </div>
                ) : null}

                <div className="space-y-2">
                  <Label htmlFor="client-document">
                    {kind === "pf"
                      ? "CPF do titular"
                      : "CNPJ"}
                  </Label>
                  <Input
                    id="client-document"
                    name="document_id"
                    defaultValue={defaultDocumentId}
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder={
                      kind === "pf" ? "000.000.000-00" : "00.000.000/0001-00"
                    }
                    aria-invalid={state?.ok === false}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="client-email">Email</Label>
                    <Input
                      id="client-email"
                      name="email"
                      type="email"
                      defaultValue={defaultEmail}
                      autoComplete="email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="client-phone">Telefone</Label>
                    <Input
                      id="client-phone"
                      name="phone"
                      type="tel"
                      defaultValue={defaultPhone}
                      autoComplete="tel"
                    />
                  </div>
                </div>

                {teamMembersForSelect.length > 0 ? (
                  <div className="space-y-2">
                    <Label htmlFor="responsible-team-member">
                      Profissional responsável pelo atendimento                    </Label>
                    <input
                      type="hidden"
                      name="responsible_team_member_id"
                      value={responsibleValue}
                    />
                    <Select
                      value={responsibleValue || EMPTY_SELECT_VALUE}
                      disabled={fieldsLocked}
                      onValueChange={(next) => {
                        setResponsibleValue(
                          !next || next === EMPTY_SELECT_VALUE ? "" : next,
                        );
                      }}
                    >
                      <SelectTrigger
                        id="responsible-team-member"
                        className={cn(
                          "w-full",
                          !responsibleValue && "text-muted-foreground",
                        )}
                      >
                        <SelectValue placeholder="Selecione">
                          {(selected) => {
                            if (!selected || selected === EMPTY_SELECT_VALUE) {
                              return "Selecione";
                            }
                            return (
                              teamMembersForSelect.find((m) => m.id === selected)
                                ?.full_name ?? selected
                            );
                          }}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={EMPTY_SELECT_VALUE}>Selecione</SelectItem>
                        {teamMembersForSelect.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-muted-foreground text-xs">
                      Quem acompanha a carteira deste cliente. Se outro colega
                      fizer uma visita ou checklist, pode actualizar este campo
                      para reflectir quem está a tratar o caso.
                    </p>
                  </div>
                ) : (
                  <input type="hidden" name="responsible_team_member_id" value="" />
                )}

                {kind === "pj" && !estType ? (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 dark:border-amber-800 dark:bg-amber-950/40">
                    <span className="mt-px shrink-0 text-amber-600 dark:text-amber-400" aria-hidden>ℹ️</span>
                    <p className="text-xs text-amber-800 dark:text-amber-300">
                      Clientes PJ precisam de um <strong>estabelecimento</strong> cadastrado.
                      Acesse a aba{" "}
                      <button
                        type="button"
                        className="font-semibold underline underline-offset-2"
                        onClick={() => setTab("pj-estabelecimento")}
                      >
                        Estabelecimento
                      </button>{" "}
                      e selecione a categoria e tipo antes de salvar.
                    </p>
                  </div>
                ) : null}

                {kind === "pj" ? (
                  <>
                    <Separator />
                    <div>
                      <p className="text-foreground text-sm font-semibold">
                        Estado do contrato
                      </p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        Inativo ou finalizado: não é possível agendar novas visitas até
                        voltar a «Ativo». Inativo = pausa; finalizado = contrato
                        encerrado.
                      </p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="lifecycle-status">Estado</Label>
                        <Select
                          name="lifecycle_status"
                          defaultValue={defaultLifecycleStatus}
                          disabled={fieldsLocked}
                        >
                          <SelectTrigger id="lifecycle-status" className="w-full">
                            <SelectValue placeholder="Selecione o estado">
                              {(selected) =>
                                selected
                                  ? clientLifecycleLabel[
                                      selected as ClientLifecycleStatus
                                    ]
                                  : null
                              }
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {lifecycleOptions.map((s) => (
                              <SelectItem key={s} value={s}>
                                {clientLifecycleLabel[s]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="activated-at">
                          Data de ativação                        </Label>
                        <Input
                          id="activated-at"
                          name="activated_at"
                          type="date"
                          defaultValue={defaultActivatedAt}
                        />
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
            </TabsContent>

            {kind === "pj" ? (
              <TabsContent value="pj-estabelecimento" className="space-y-6">
                {estValidationError && (
                  <div
                    role="alert"
                    className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/8 px-4 py-3"
                  >
                    <span className="mt-0.5 shrink-0 text-destructive" aria-hidden>⚠️</span>
                    <div>
                      <p className="text-sm font-semibold text-destructive">
                        Estabelecimento obrigatório para clientes PJ
                      </p>
                      <p className="mt-0.5 text-xs text-destructive/80">
                        Selecione a <strong>Categoria</strong> e o <strong>Tipo de estabelecimento</strong> abaixo antes de guardar.
                      </p>
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-foreground flex items-center gap-1.5 text-sm font-semibold">
                    <MapPin className="size-4 text-muted-foreground" aria-hidden />
                    Estabelecimento
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Unidade física onde o serviço é prestado. Cada cliente PJ representa
                    1 CNPJ = 1 estabelecimento. Guarde as alterações no fim do formulário.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="est-name">
                    Nome do estabelecimento                  </Label>
                  <Input
                    id="est-name"
                    name="est_name"
                    defaultValue={defaultEstName}
                    placeholder="Se vazio, usa a razão social acima"
                    autoComplete="organization"
                  />
                </div>

                {/* Categoria */}
                <div className="space-y-2">
                  <Label htmlFor="est-category">Categoria</Label>
                  <EstablishmentCategorySelect
                    id="est-category"
                    value={estCategory}
                    onChange={handleEstCategoryChange}
                    className="w-full"
                    disabled={fieldsLocked}
                  />
                </div>

                {/* Tipo — só aparece após categoria */}
                {estCategory !== "" ? (
                  <div className="space-y-2">
                    <Label htmlFor="est-type">Tipo de estabelecimento</Label>
                    <input
                      type="hidden"
                      name="est_type"
                      value={estType}
                      required
                    />
                    <EstablishmentTypeSelect
                      id="est-type"
                      category={estCategory}
                      value={estType}
                      onChange={(value) => {
                        setEstType(value);
                        setEstValidationError(false);
                      }}
                      placeholder="Selecione o tipo…"
                      className="w-full"
                      disabled={fieldsLocked}
                    />
                  </div>
                ) : null}
                <div className="space-y-2">
                  <Label htmlFor="est-address1">
                    Endereço (linha 1)                  </Label>
                  <Input
                    id="est-address1"
                    name="est_address_line1"
                    defaultValue={defaultEstAddressLine1}
                    placeholder="Rua, número, complemento…"
                    autoComplete="street-address"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="est-address2">
                    Endereço (linha 2)                  </Label>
                  <Input
                    id="est-address2"
                    name="est_address_line2"
                    defaultValue={defaultEstAddressLine2}
                    placeholder="Bairro, bloco, andar…"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2 sm:col-span-1">
                    <Label htmlFor="est-city">Cidade</Label>
                    <Input
                      id="est-city"
                      name="est_city"
                      defaultValue={defaultEstCity}
                      autoComplete="address-level2"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="est-state">UF</Label>
                    <Input
                      id="est-state"
                      name="est_state"
                      defaultValue={defaultEstState}
                      maxLength={2}
                      placeholder="SP"
                      className="uppercase"
                      autoComplete="address-level1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="est-postal">CEP</Label>
                    <Input
                      id="est-postal"
                      name="est_postal_code"
                      defaultValue={defaultEstPostalCode}
                      inputMode="numeric"
                      placeholder="00000-000"
                      autoComplete="postal-code"
                    />
                  </div>
                </div>
                {children ? (
                  <>
                    <Separator />
                    {children}
                  </>
                ) : null}
              </TabsContent>
            ) : null}

            {kind === "pf" ? (
              <>
                <TabsContent value="pessoa-saude" className="space-y-8">
                  <section className="space-y-4">
                    <div>
                      <p className="text-foreground text-sm font-semibold">
                        Quem recebe a consulta
                      </p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        Se for outra pessoa que o titular (ex.: criança), indique
                        o nome. Se ficar vazio, assume-se que a pessoa atendida é
                        o titular. A ficha clínica completa fica em{" "}
                        <span className="text-foreground font-medium">Pacientes</span>{" "}
                        depois de criar o registo.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="client-attended-name">
                        Nome completo da pessoa atendida                      </Label>
                      <Input
                        id="client-attended-name"
                        name="attended_full_name"
                        defaultValue={defaultAttendedFullName}
                        autoComplete="name"
                      />
                    </div>
                  </section>

                  <Separator />

                  <section className="space-y-4">
                    <div>
                      <p className="text-foreground text-sm font-semibold">
                        Dados pessoais (pessoa atendida)
                      </p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        Referem-se a quem será acompanhado(a) nutricionalmente
                        (a mesma pessoa do nome acima, ou o titular se o nome
                        acima estiver vazio).
                      </p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="client-birth">
                          Data de nascimento                        </Label>
                        <Input
                          id="client-birth"
                          name="birth_date"
                          type="date"
                          defaultValue={defaultBirthDate}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="client-sex">Sexo</Label>
                        <input type="hidden" name="sex" value={sexValue} />
                        <Select
                          value={sexValue || EMPTY_SELECT_VALUE}
                          disabled={fieldsLocked}
                          onValueChange={(next) => {
                            setSexValue(
                              !next || next === EMPTY_SELECT_VALUE
                                ? ""
                                : (next as PatientSex),
                            );
                          }}
                        >
                          <SelectTrigger id="client-sex" className="w-full">
                            <SelectValue placeholder="—">
                              {(selected) => {
                                if (!selected || selected === EMPTY_SELECT_VALUE) {
                                  return null;
                                }
                                return (
                                  sexOptions.find((o) => o.value === selected)?.label ??
                                  selected
                                );
                              }}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={EMPTY_SELECT_VALUE}>—</SelectItem>
                            {sexOptions.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </section>

                  <Separator />

                  <section className="space-y-4">
                    <div>
                      <p className="text-foreground text-sm font-semibold">
                        Saúde — notas iniciais
                      </p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        Não substituem avaliação nem prescrição médica.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="client-dietary">
                        Restrições alimentares                      </Label>
                      <textarea
                        id="client-dietary"
                        name="dietary_restrictions"
                        rows={3}
                        defaultValue={defaultDietaryRestrictions}
                        placeholder="Alergias, intolerâncias, restrições culturais ou religiosas…"
                        className={textareaClass}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="client-meds">
                        Medicamento(s) de uso contínuo                      </Label>
                      <textarea
                        id="client-meds"
                        name="chronic_medications"
                        rows={3}
                        defaultValue={defaultChronicMedications}
                        placeholder="Nome, dose se souber — texto livre."
                        className={textareaClass}
                      />
                    </div>
                  </section>

                  <Separator />

                  <section className="space-y-4">
                    <div>
                      <p className="text-foreground text-sm font-semibold">
                        Responsável legal e financeiro
                      </p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        Só quando quem representa ou paga não é o titular (ex.:
                        tutor, familiar responsável).
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="guardian-name">
                        Nome completo                      </Label>
                      <Input
                        id="guardian-name"
                        name="guardian_full_name"
                        defaultValue={defaultGuardianFullName}
                        autoComplete="name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="guardian-doc">
                        Documento de identificação                      </Label>
                      <Input
                        id="guardian-doc"
                        name="guardian_document_id"
                        defaultValue={defaultGuardianDocumentId}
                        autoComplete="off"
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="guardian-email">Email</Label>
                        <Input
                          id="guardian-email"
                          name="guardian_email"
                          type="email"
                          defaultValue={defaultGuardianEmail}
                          autoComplete="email"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="guardian-phone">
                          Telefone                        </Label>
                        <Input
                          id="guardian-phone"
                          name="guardian_phone"
                          type="tel"
                          defaultValue={defaultGuardianPhone}
                          autoComplete="tel"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="guardian-rel">Vínculo</Label>
                      <Input
                        id="guardian-rel"
                        name="guardian_relationship"
                        placeholder="Ex.: Mãe, tutor legal, filho responsável…"
                        defaultValue={defaultGuardianRelationship}
                      />
                    </div>
                  </section>
                </TabsContent>

                <TabsContent value="documentos" className="space-y-4">
                  <div>
                    <p className="text-foreground text-sm font-semibold">
                      Exames (anexos)
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      PDF ou imagens até 15 MB cada. Os ficheiros ficam
                      privados na sua conta.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="exam-previous">
                      Exames já realizados                    </Label>
                    <Input
                      id="exam-previous"
                      name="exam_previous"
                      type="file"
                      multiple
                      accept="application/pdf,image/*,.doc,.docx"
                      onChange={(e) => handleExamFilesChange(e.currentTarget)}
                      className="border-input bg-background text-muted-foreground file:text-foreground h-auto rounded-md border px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-secondary file:px-3 file:py-1.5"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="exam-scheduled">
                      Exames pedidos, agendados ou a realizar                    </Label>
                    <Input
                      id="exam-scheduled"
                      name="exam_scheduled"
                      type="file"
                      multiple
                      accept="application/pdf,image/*,.doc,.docx"
                      onChange={(e) => handleExamFilesChange(e.currentTarget)}
                      className="border-input bg-background text-muted-foreground file:text-foreground h-auto rounded-md border px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-secondary file:px-3 file:py-1.5"
                    />
                    {examPrepareError ? (
                      <p className="text-destructive text-xs" role="alert">
                        {examPrepareError}
                      </p>
                    ) : null}
                  </div>
                </TabsContent>
              </>
            ) : null}

            {kind === "pj" ? (
              <>
                <TabsContent value="pj-fiscal" className="space-y-4">
                  <p className="text-muted-foreground text-xs">
                    Dados fiscais e licenciamento da empresa contratante.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="state-registration">
                      Inscrição estadual (IE)                    </Label>
                    <Input
                      id="state-registration"
                      name="state_registration"
                      defaultValue={defaultStateRegistration}
                      placeholder="Ou ISENTO"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="municipal-registration">
                      Inscrição municipal (IM)                    </Label>
                    <Input
                      id="municipal-registration"
                      name="municipal_registration"
                      defaultValue={defaultMunicipalRegistration}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sanitary-license">
                      Alvará / licença sanitária                    </Label>
                    <textarea
                      id="sanitary-license"
                      name="sanitary_license"
                      rows={3}
                      defaultValue={defaultSanitaryLicense}
                      placeholder="Número, órgão emissor, validade…"
                      className={textareaClass}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="pj-web" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="website-url">Site</Label>
                    <Input
                      id="website-url"
                      name="website_url"
                      type="url"
                      defaultValue={defaultWebsiteUrl}
                      placeholder="https://…"
                    />
                  </div>
                  <Separator />
                  <p className="text-foreground text-sm font-medium">
                    Redes sociais                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="social-ig">Instagram</Label>
                      <Input
                        id="social-ig"
                        name="social_instagram"
                        defaultValue={defaultSocialInstagram}
                        placeholder="@empresa ou URL"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="social-fb">Facebook</Label>
                      <Input
                        id="social-fb"
                        name="social_facebook"
                        defaultValue={defaultSocialFacebook}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="social-li">LinkedIn</Label>
                      <Input
                        id="social-li"
                        name="social_linkedin"
                        defaultValue={defaultSocialLinkedin}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="social-wa">WhatsApp</Label>
                      <Input
                        id="social-wa"
                        name="social_whatsapp"
                        defaultValue={defaultSocialWhatsapp}
                        placeholder="+55…"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="social-other">Outra rede / link</Label>
                    <Input
                      id="social-other"
                      name="social_other"
                      defaultValue={defaultSocialOther}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="pj-marca" className="space-y-4">
                  <p className="text-muted-foreground text-xs">
                    PNG, JPEG ou WebP até {MAX_CLIENT_LOGO_BYTES / 1024 / 1024} MB.
                    Aparece na lista de clientes e no cabeçalho da ficha.
                  </p>
                  {hasLogoPreview ? (
                    <div className="flex flex-wrap items-end gap-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={defaultLogoPreviewUrl!}
                        alt=""
                        className="border-border max-h-24 max-w-[200px] rounded-md border object-contain"
                      />
                      <label className="flex cursor-pointer items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          name="remove_logo"
                          value="1"
                          className="border-input size-4 accent-primary"
                        />
                        Remover logótipo atual
                      </label>
                    </div>
                  ) : null}
                  <div className="space-y-2">
                    <Label htmlFor="client-logo">
                      {hasLogoPreview
                        ? "Substituir logótipo"
                        : "Carregar logótipo"}
                    </Label>
                    <Input
                      id="client-logo"
                      name="logo"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const input = e.currentTarget;
                        setLogoPrepareError(null);
                        // HEIC/AVIF → JPEG/PNG + compressão no cliente.
                        void prepareImageInputInPlace(input, {
                          maxDimension: 1024,
                          preservePng: true,
                        }).then((res) => {
                          if (!res.ok) setLogoPrepareError(res.error);
                        });
                      }}
                      className="border-input bg-background text-muted-foreground file:text-foreground h-auto rounded-md border px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-secondary file:px-3 file:py-1.5"
                    />
                    {logoPrepareError ? (
                      <p className="text-destructive text-xs" role="alert">
                        {logoPrepareError}
                      </p>
                    ) : null}
                  </div>
                </TabsContent>

                <TabsContent value="pj-responsaveis" className="space-y-8">
                  <section className="space-y-4">
                    <p className="text-foreground text-sm font-semibold">
                      Responsável legal / proprietário
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="legal-rep-name">Nome completo</Label>
                        <Input
                          id="legal-rep-name"
                          name="legal_rep_full_name"
                          defaultValue={defaultLegalRepFullName}
                          autoComplete="name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="legal-rep-doc">CPF</Label>
                        <Input
                          id="legal-rep-doc"
                          name="legal_rep_document_id"
                          defaultValue={defaultLegalRepDocumentId}
                          inputMode="numeric"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="legal-rep-role">Cargo / vínculo</Label>
                        <Input
                          id="legal-rep-role"
                          name="legal_rep_role"
                          defaultValue={defaultLegalRepRole}
                          placeholder="Ex.: Sócio-administrador"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="legal-rep-email">Email</Label>
                        <Input
                          id="legal-rep-email"
                          name="legal_rep_email"
                          type="email"
                          defaultValue={defaultLegalRepEmail}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="legal-rep-phone">Telefone</Label>
                        <Input
                          id="legal-rep-phone"
                          name="legal_rep_phone"
                          type="tel"
                          defaultValue={defaultLegalRepPhone}
                        />
                      </div>
                    </div>
                  </section>
                  <Separator />
                  <section className="space-y-4">
                    <p className="text-foreground text-sm font-semibold">
                      Responsável técnico
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="tech-rep-name">Nome completo</Label>
                        <Input
                          id="tech-rep-name"
                          name="technical_rep_full_name"
                          defaultValue={defaultTechnicalRepFullName}
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="tech-rep-reg">
                          Registo profissional (ex.: CRN)
                        </Label>
                        <Input
                          id="tech-rep-reg"
                          name="technical_rep_professional_id"
                          defaultValue={defaultTechnicalRepProfessionalId}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tech-rep-email">Email</Label>
                        <Input
                          id="tech-rep-email"
                          name="technical_rep_email"
                          type="email"
                          defaultValue={defaultTechnicalRepEmail}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tech-rep-phone">Telefone</Label>
                        <Input
                          id="tech-rep-phone"
                          name="technical_rep_phone"
                          type="tel"
                          defaultValue={defaultTechnicalRepPhone}
                        />
                      </div>
                    </div>
                  </section>
                </TabsContent>
              </>
            ) : null}

            <TabsContent value="notas" className="space-y-2">
              <Label htmlFor="client-notes">Notas internas</Label>
              <textarea
                id="client-notes"
                name="notes"
                rows={6}
                defaultValue={defaultNotes}
                className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[120px] w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              />
              <p className="text-muted-foreground text-xs">
                Não são mostradas a pacientes ou a contactos externos.
              </p>
            </TabsContent>
          </Tabs>
        </CardContent>

        <CardFooter className="flex-col items-stretch gap-3 border-t border-foreground/10 bg-muted/30 sm:flex-row sm:items-center sm:justify-between">
          {state?.ok === false ? (
            <p
              id="client-form-err"
              className="text-destructive text-sm"
              role="alert"
            >
              {state.error}
            </p>
          ) : (
            <span className="text-muted-foreground hidden text-sm sm:block">
              {mode === "create"
                ? "Depois de criar, pode continuar a editar e carregar exames."
                : fieldsLocked
                  ? "Dados do cliente. Clique em Editar dados para alterar."
                  : null}
            </span>
          )}
          {state?.ok === true && fieldsLocked ? (
            <p className="text-muted-foreground text-sm sm:order-first" role="status">
              Alterações guardadas.
            </p>
          ) : null}
          {isEditing ? (
            <div className="flex flex-wrap justify-end gap-2 sm:ms-auto">
              {mode === "edit" ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={cancelEditMode}
                  disabled={savingDialogOpen}
                >
                  Cancelar
                </Button>
              ) : null}
              <Button type="submit" className="min-w-[9rem]" disabled={savingDialogOpen}>
                {savingDialogOpen ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    {mode === "create" ? "Cadastrando…" : "Salvando…"}
                  </>
                ) : mode === "create" ? (
                  "Criar cliente"
                ) : (
                  "Salvar alterações"
                )}
              </Button>
            </div>
          ) : null}
        </CardFooter>
      </form>
    </Card>

    <Dialog open={savingDialogOpen}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-md"
        aria-describedby="client-form-pending-desc"
      >
        <DialogHeader className="items-center pr-0 text-center">
          <Loader2
            className="mx-auto mb-3 size-10 animate-spin text-primary"
            aria-hidden
          />
          <DialogTitle>
            {mode === "create" ? "Cadastrando cliente…" : "Salvando alterações…"}
          </DialogTitle>
          <DialogDescription id="client-form-pending-desc">
            {mode === "create" && kind === "pj"
              ? "Estamos a registar o cliente e o estabelecimento associado. Aguarde — não feche esta página."
              : mode === "create"
                ? "Estamos a registar o cliente. Aguarde — não feche esta página."
                : "Aguarde enquanto guardamos os dados do cliente."}
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>

    <Dialog
      open={estValidationDialogOpen}
      onOpenChange={setEstValidationDialogOpen}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Complete o cadastro do estabelecimento</DialogTitle>
          <DialogDescription>
            Para clientes pessoa jurídica, é obrigatório informar a{" "}
            <strong className="text-foreground">categoria</strong> e o{" "}
            <strong className="text-foreground">tipo de estabelecimento</strong>{" "}
            antes de concluir o cadastro. Acesse a aba Estabelecimento e preencha
            esses campos.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            onClick={() => {
              setEstValidationDialogOpen(false);
              setTab("pj-estabelecimento");
            }}
          >
            Ir para estabelecimento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog
      open={segmentDialogOpen}
      onOpenChange={(open) => {
        if (!segmentPending) setSegmentDialogOpen(open);
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Nova categoria de negócio</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-2">
            <Label htmlFor="new-segment-label">Nome da categoria</Label>
            <Input
              id="new-segment-label"
              ref={newSegmentInputRef}
              value={newSegmentLabel}
              onChange={(e) => {
                setNewSegmentLabel(e.target.value);
                setNewSegmentError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleCreateSegment();
                }
              }}
              placeholder="Ex.: Creche, UBS, Catering…"
              maxLength={80}
              disabled={segmentPending}
              autoFocus
            />
            {newSegmentError ? (
              <p className="text-destructive text-xs" role="alert">
                {newSegmentError}
              </p>
            ) : null}
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setSegmentDialogOpen(false)}
            disabled={segmentPending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleCreateSegment}
            disabled={segmentPending || newSegmentLabel.trim().length === 0}
          >
            {segmentPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            ) : null}
            Criar e selecionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
