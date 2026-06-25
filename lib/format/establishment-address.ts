/** Monta address_line1/2 a partir dos campos separados do formulário. */
export function formatEstablishmentAddressLines(fields: {
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
}): { address_line1: string; address_line2: string | null } {
  const street = fields.street.trim();
  const number = fields.number.trim();
  const complement = fields.complement.trim();
  const neighborhood = fields.neighborhood.trim();

  const line1 =
    street && number ? `${street}, ${number}` : street || number;

  const line2Parts: string[] = [];
  if (complement) line2Parts.push(complement);
  if (neighborhood) line2Parts.push(neighborhood);

  return {
    address_line1: line1,
    address_line2: line2Parts.length > 0 ? line2Parts.join(" — ") : null,
  };
}
