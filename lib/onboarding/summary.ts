import type { OnboardingWorkContext } from "@/lib/actions/onboarding";
import { establishmentTypeLabel } from "@/lib/constants/establishment-types";
import type { EstablishmentType } from "@/lib/types/establishments";

export type OnboardingSummaryInput = {
  tenantCompanyName: string;
  crn: string;
  workContext: OnboardingWorkContext;
  workContextLabel: string;
  legalName: string;
  documentId: string;
  needsEstablishment: boolean;
  establishmentName: string;
  establishmentType: EstablishmentType;
  postalCode: string;
  addressStreet: string;
  addressNumber: string;
  addressComplement: string;
  neighborhood: string;
  city: string;
  stateUf: string;
};

export type OnboardingSummaryItem = {
  label: string;
  value: string;
};

export function buildOnboardingSummaryItems(
  input: OnboardingSummaryInput,
): OnboardingSummaryItem[] {
  const items: OnboardingSummaryItem[] = [
    { label: "Sua empresa", value: input.tenantCompanyName.trim() },
  ];

  if (input.crn.trim()) {
    items.push({ label: "CRN", value: input.crn.trim() });
  }

  items.push(
    { label: "Contexto de trabalho", value: input.workContextLabel },
    { label: "Primeiro cliente", value: input.legalName.trim() },
  );

  if (input.documentId.trim()) {
    items.push({
      label: input.needsEstablishment ? "CNPJ" : "CPF",
      value: input.documentId.trim(),
    });
  }

  if (!input.needsEstablishment) return items;

  items.push({
    label: "Estabelecimento",
    value: input.establishmentName.trim(),
  });
  items.push({
    label: "Tipo",
    value: establishmentTypeLabel[input.establishmentType],
  });

  if (input.postalCode.trim()) {
    items.push({ label: "CEP", value: input.postalCode.trim() });
  }

  const street = input.addressStreet.trim();
  const number = input.addressNumber.trim();
  if (street || number) {
    items.push({
      label: "Endereço",
      value: street && number ? `${street}, ${number}` : street || number,
    });
  }

  if (input.addressComplement.trim()) {
    items.push({
      label: "Complemento",
      value: input.addressComplement.trim(),
    });
  }

  if (input.neighborhood.trim()) {
    items.push({ label: "Bairro", value: input.neighborhood.trim() });
  }

  const cityUf = [input.city.trim(), input.stateUf.toUpperCase()]
    .filter(Boolean)
    .join(" — ");
  if (cityUf) {
    items.push({ label: "Cidade / UF", value: cityUf });
  }

  return items;
}
