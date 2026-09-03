/**
 * Estado real de um cadastro pago, para a página de retorno do Stripe.
 *
 * A faixa de sucesso era decidida só pelo `?pagamento=ok` da URL — ou seja, pelo
 * redirect, não pelo que de facto aconteceu. Quando o webhook falhava depois do
 * pagamento (CPF repetido, e-mail repetido, Auth fora do ar), o utilizador lia
 * "Pagamento recebido" e ficava sem conta, sem saber que precisava de ajuda.
 *
 * A criação da conta acontece no webhook, que é assíncrono: o utilizador costuma
 * voltar do Stripe antes dele terminar. Por isso há um estado `processando` — a
 * ausência de conta logo após o retorno é normal, não é falha.
 *
 * Lógica pura: quem lê o banco é a Server Action.
 */
export const SUPPORT_EMAIL = "suporte@nutrigestaoapp.com.br";

export type SignupOutcome = "criada" | "processando" | "falhou";

export type SignupOutcomeInput = {
  status: string | null;
  createdUserId: string | null;
};

/**
 * `pago` sem `created_user_id` é o estado terminal de falha: o webhook processou o
 * pagamento e desistiu de criar a conta. Enquanto o status for anterior a esse, o
 * webhook ainda pode não ter chegado.
 */
export function resolveSignupOutcome(input: SignupOutcomeInput): SignupOutcome {
  if (input.createdUserId) return "criada";
  if (input.status === "conta_criada") return "criada";
  if (input.status === "pago") return "falhou";
  return "processando";
}

export const SIGNUP_OUTCOME_MESSAGE: Record<SignupOutcome, string> = {
  criada:
    "Pagamento recebido. Enviamos um e-mail para confirmar sua conta. Você só entra depois de clicar no link.",
  processando:
    "Pagamento recebido. Estamos preparando sua conta — o e-mail de confirmação chega em instantes.",
  falhou:
    `Seu pagamento foi confirmado, mas não conseguimos concluir a criação da conta. Entre em contato com o suporte em ${SUPPORT_EMAIL} informando o e-mail usado na compra — vamos resolver o mais rápido possível para você.`,
};
