"use client";

import {
  Building2,
  FileStack,
  Globe,
  HeartPulse,
  IdCard,
  ImageIcon,
  StickyNote,
  UserCircle,
  Users,
} from "lucide-react";
import { useActionState, useState } from "react";

import {
  type ClientFormResult,
  createClientAction,
  updateClientAction,
} from "@/lib/actions/clients";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CLIENT_BUSINESS_SEGMENTS,
  clientBusinessSegmentLabel,
} from "@/lib/constants/client-business-segment";
import { clientLifecycleLabel } from "@/lib/constants/client-lifecycle";
import { MAX_CLIENT_LOGO_BYTES } from "@/lib/constants/client-logos-storage";
import type { ClientKind, ClientLifecycleStatus } from "@/lib/types/clients";
import type { PatientSex } from "@/lib/types/patients";

const initial: ClientFormResult | undefined = undefined;

const sexOptions: { value: PatientSex; label: string }[] = [
  { value: "female", label: "Feminino" },
  { value: "male", label: "Masculino" },
  { value: "other", label: "Outro" },
];

const selectClassName =
  "border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none";

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
  | "pj-fiscal"
  | "pj-web"
  | "pj-marca"
  | "pj-responsaveis"
  | "notas";

const PF_ONLY_TABS: ClientFormTab[] = ["pessoa-saude", "documentos"];
const PJ_ONLY_TABS: ClientFormTab[] = [
  "pj-fiscal",
  "pj-web",
  "pj-marca",
  "pj-responsaveis",
];

export function ClientForm({
  mode,
  clientId,
  defaultKind,
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
}: {
  mode: "create" | "edit";
  clientId?: string;
  defaultKind: ClientKind;
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
}) {
  const action =
    mode === "create" ? createClientAction : updateClientAction;
  const [state, formAction] = useActionState(action, initial);
  const [kind, setKind] = useState<ClientKind>(defaultKind);
  const [tab, setTab] = useState<ClientFormTab>("identificacao");

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

  return (
    <Card className="max-w-3xl">
      <CardHeader className="border-b border-foreground/10 pb-4">
        <CardTitle className="text-base">
          {mode === "create" ? "Novo registo na carteira" : "Dados do cliente"}
        </CardTitle>
        <CardDescription>
          Aqui regista o <strong className="text-foreground font-medium">contrato</strong>{" "}
          (PF ou PJ). Em PF, o separador{" "}
          <strong className="text-foreground font-medium">Pessoa atendida e saúde</strong>{" "}
          concentra dados clínicos iniciais. Em PJ, use os separadores para estado do
          contrato, fiscal, web, marca e responsáveis. Um clique em guardar grava tudo.
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
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

              <Separator />

              <div className="space-y-4">
                <div>
                  <p className="text-foreground text-sm font-semibold">
                    Titular do contrato
                  </p>
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
                    Nome fantasia (opcional)
                  </Label>
                  <Input
                    id="client-trade-name"
                    name="trade_name"
                    defaultValue={defaultTradeName}
                    disabled={kind === "pf"}
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
                      Categoria do negócio (opcional)
                    </Label>
                    <select
                      id="business-segment"
                      name="business_segment"
                      defaultValue={defaultBusinessSegment}
                      className={selectClassName}
                    >
                      <option value="">— Indefinida —</option>
                      {CLIENT_BUSINESS_SEGMENTS.map((s) => (
                        <option key={s} value={s}>
                          {clientBusinessSegmentLabel[s]}
                        </option>
                      ))}
                    </select>
                    <p className="text-muted-foreground text-xs">
                      Aparece na lista de clientes (ex.: padaria, escola,
                      hospital). Pode definir mais tarde.
                    </p>
                  </div>
                ) : null}

                <div className="space-y-2">
                  <Label htmlFor="client-document">
                    {kind === "pf"
                      ? "CPF do titular (opcional)"
                      : "CNPJ (opcional)"}
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
                    <Label htmlFor="client-email">Email (opcional)</Label>
                    <Input
                      id="client-email"
                      name="email"
                      type="email"
                      defaultValue={defaultEmail}
                      autoComplete="email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="client-phone">Telefone (opcional)</Label>
                    <Input
                      id="client-phone"
                      name="phone"
                      type="tel"
                      defaultValue={defaultPhone}
                      autoComplete="tel"
                    />
                  </div>
                </div>

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
                        <select
                          id="lifecycle-status"
                          name="lifecycle_status"
                          required={kind === "pj"}
                          defaultValue={defaultLifecycleStatus}
                          className={selectClassName}
                        >
                          {lifecycleOptions.map((s) => (
                            <option key={s} value={s}>
                              {clientLifecycleLabel[s]}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="activated-at">
                          Data de ativação (opcional)
                        </Label>
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
                        Nome completo da pessoa atendida (opcional)
                      </Label>
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
                          Data de nascimento (opcional)
                        </Label>
                        <Input
                          id="client-birth"
                          name="birth_date"
                          type="date"
                          defaultValue={defaultBirthDate}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="client-sex">Sexo (opcional)</Label>
                        <select
                          id="client-sex"
                          name="sex"
                          defaultValue={defaultSex}
                          className={selectClassName}
                        >
                          <option value="">—</option>
                          {sexOptions.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
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
                        Restrições alimentares (opcional)
                      </Label>
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
                        Medicamento(s) de uso contínuo (opcional)
                      </Label>
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
                        Nome completo (opcional)
                      </Label>
                      <Input
                        id="guardian-name"
                        name="guardian_full_name"
                        defaultValue={defaultGuardianFullName}
                        autoComplete="name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="guardian-doc">
                        Documento de identificação (opcional)
                      </Label>
                      <Input
                        id="guardian-doc"
                        name="guardian_document_id"
                        defaultValue={defaultGuardianDocumentId}
                        autoComplete="off"
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="guardian-email">Email (opcional)</Label>
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
                          Telefone (opcional)
                        </Label>
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
                      <Label htmlFor="guardian-rel">Vínculo (opcional)</Label>
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
                      Exames já realizados (opcional)
                    </Label>
                    <Input
                      id="exam-previous"
                      name="exam_previous"
                      type="file"
                      multiple
                      accept="application/pdf,image/*,.doc,.docx"
                      className="border-input bg-background text-muted-foreground file:text-foreground h-auto rounded-md border px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-secondary file:px-3 file:py-1.5"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="exam-scheduled">
                      Exames pedidos, agendados ou a realizar (opcional)
                    </Label>
                    <Input
                      id="exam-scheduled"
                      name="exam_scheduled"
                      type="file"
                      multiple
                      accept="application/pdf,image/*,.doc,.docx"
                      className="border-input bg-background text-muted-foreground file:text-foreground h-auto rounded-md border px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-secondary file:px-3 file:py-1.5"
                    />
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
                      Inscrição estadual (IE) (opcional)
                    </Label>
                    <Input
                      id="state-registration"
                      name="state_registration"
                      defaultValue={defaultStateRegistration}
                      placeholder="Ou ISENTO"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="municipal-registration">
                      Inscrição municipal (IM) (opcional)
                    </Label>
                    <Input
                      id="municipal-registration"
                      name="municipal_registration"
                      defaultValue={defaultMunicipalRegistration}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sanitary-license">
                      Alvará / licença sanitária (opcional)
                    </Label>
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
                    <Label htmlFor="website-url">Site (opcional)</Label>
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
                    Redes sociais (opcional)
                  </p>
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
                      accept="image/png,image/jpeg,image/webp"
                      className="border-input bg-background text-muted-foreground file:text-foreground h-auto rounded-md border px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-secondary file:px-3 file:py-1.5"
                    />
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
                        <Label htmlFor="legal-rep-doc">CPF (opcional)</Label>
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
              <Label htmlFor="client-notes">Notas internas (opcional)</Label>
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
                : null}
            </span>
          )}
          {state?.ok === true ? (
            <p className="text-muted-foreground text-sm sm:order-first" role="status">
              Alterações guardadas.
            </p>
          ) : null}
          <div className="flex flex-wrap justify-end gap-2 sm:ms-auto">
            <Button type="submit" className="min-w-[9rem]">
              {mode === "create" ? "Criar cliente" : "Guardar alterações"}
            </Button>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
