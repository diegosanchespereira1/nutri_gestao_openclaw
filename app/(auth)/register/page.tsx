import { redirect } from "next/navigation";

/** Cadastro público na mesma tela de login, aba Cadastre-se. */
export default function RegisterPage() {
  redirect("/login?aba=cadastro");
}
