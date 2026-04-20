import { redirect } from "next/navigation";

/**
 * O estabelecimento agora é criado/editado diretamente na aba
 * "Identificação" do formulário do cliente.
 * Esta rota redireciona para a ficha do cliente.
 */
export default async function NovoEstabelecimentoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: clientId } = await params;
  redirect(`/clientes/${clientId}/editar`);
}
