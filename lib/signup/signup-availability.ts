/**
 * Disponibilidade de e-mail e CPF/CNPJ **antes** de cobrar.
 *
 * Existe por causa de um bug real: o cadastro pago só validava a unicidade do
 * documento dentro de `completeSignupAccount`, que roda no webhook — ou seja,
 * *depois* do pagamento. Quem repetisse um CPF já usado pagava, via a mensagem de
 * sucesso e ficava sem conta, com uma assinatura ativa no Stripe e nenhum caminho
 * de recuperação. Dinheiro cobrado, nada entregue.
 *
 * Aqui a checagem é feita enquanto o utilizador ainda pode corrigir o formulário.
 * A verificação no webhook continua: é a defesa contra a corrida entre dois
 * checkouts simultâneos com o mesmo documento, que nenhuma checagem prévia evita.
 *
 * Lógica separada do I/O (deps injetadas) para poder ser testada sem banco.
 */
import { TENANT_DOCUMENT_TAKEN_MESSAGE } from "@/lib/tenant/tenant-document";

export type SignupAvailabilityDeps = {
  /** user_id do dono do documento, ou null se estiver livre. */
  findProfileIdByDocument(documentId: string): Promise<string | null>;
  /** id do utilizador com esse e-mail, ou null se estiver livre. */
  findAuthUserIdByEmail(email: string): Promise<string | null>;
};

export type SignupAvailability =
  | { available: true }
  | { available: false; field: "email" | "document"; error: string };

export const EMAIL_TAKEN_MESSAGE =
  "Já existe uma conta com este e-mail. Entre com ela ou use outro e-mail.";

export async function checkSignupAvailability(
  deps: SignupAvailabilityDeps,
  input: { email: string; documentId: string | null },
): Promise<SignupAvailability> {
  const email = input.email.trim().toLowerCase();
  if (email.length > 0) {
    const existing = await deps.findAuthUserIdByEmail(email);
    if (existing) {
      return { available: false, field: "email", error: EMAIL_TAKEN_MESSAGE };
    }
  }

  const documentId = input.documentId?.trim() ?? "";
  if (documentId.length > 0) {
    const owner = await deps.findProfileIdByDocument(documentId);
    if (owner) {
      return {
        available: false,
        field: "document",
        error: TENANT_DOCUMENT_TAKEN_MESSAGE,
      };
    }
  }

  return { available: true };
}
