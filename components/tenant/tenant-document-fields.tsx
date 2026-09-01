"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { nativeSelectValueClass } from "@/components/forms/form-section";
import { maskBrDocumentInput } from "@/lib/format/br-document";
import type { TenantDocumentKind } from "@/lib/tenant/tenant-document";

/**
 * Par "tipo de documento + número" do TENANT (a conta), usado no wizard do
 * admin, no onboarding e no perfil.
 *
 * Controlado de propósito: o onboarding mantém o valor em estado e envia por
 * campos ocultos noutro passo, por isso `kindName`/`documentName` são
 * opcionais — sem eles o componente não participa do FormData.
 */
export type TenantDocumentFieldsProps = {
  idPrefix: string;
  kind: TenantDocumentKind | "";
  document: string;
  onKindChange: (kind: TenantDocumentKind | "") => void;
  onDocumentChange: (document: string) => void;
  kindName?: string;
  documentName?: string;
  disabled?: boolean;
  required?: boolean;
  helpText?: string;
};

export function TenantDocumentFields({
  idPrefix,
  kind,
  document,
  onKindChange,
  onDocumentChange,
  kindName,
  documentName,
  disabled,
  required,
  helpText,
}: TenantDocumentFieldsProps) {
  const kindId = `${idPrefix}-document-kind`;
  const documentId = `${idPrefix}-document-id`;

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor={kindId}>
          Tipo de documento{" "}
          {required ? null : (
            <span className="text-muted-foreground font-normal">(opcional)</span>
          )}
        </Label>
        <select
          id={kindId}
          name={kindName}
          value={kind}
          disabled={disabled}
          className={nativeSelectValueClass(kind)}
          onChange={(e) => {
            const next = e.target.value as TenantDocumentKind | "";
            onKindChange(next);
            // Ao trocar o tipo, remascara o que já foi digitado (e corta o
            // excedente quando vai de CNPJ para CPF).
            onDocumentChange(maskBrDocumentInput(next || null, document));
          }}
        >
          <option value="">Selecione…</option>
          <option value="cnpj">CNPJ</option>
          <option value="cpf">CPF</option>
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor={documentId}>
          {kind === "cpf" ? "CPF" : kind === "cnpj" ? "CNPJ" : "CPF ou CNPJ"}
        </Label>
        <Input
          id={documentId}
          name={documentName}
          value={document}
          disabled={disabled}
          inputMode="numeric"
          autoComplete="off"
          placeholder={kind === "cpf" ? "000.000.000-00" : "00.000.000/0000-00"}
          onChange={(e) =>
            onDocumentChange(maskBrDocumentInput(kind || null, e.target.value))
          }
        />
      </div>

      {helpText ? (
        <p className="text-muted-foreground text-xs leading-relaxed sm:col-span-2">
          {helpText}
        </p>
      ) : null}
    </>
  );
}
