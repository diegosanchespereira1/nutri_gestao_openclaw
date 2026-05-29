import { redirect } from "next/navigation";

/** Cadastro público desativado temporariamente — novos acessos em fase posterior. */
export default function RegisterPage() {
  redirect("/login");
}
