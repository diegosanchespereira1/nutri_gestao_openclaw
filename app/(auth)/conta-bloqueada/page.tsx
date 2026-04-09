import Link from "next/link";

import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

export default function ContaBloqueadaPage() {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col justify-center gap-6 px-4 py-12">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Acesso encerrado
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          O acesso à sua conta foi encerrado nos termos do pedido de encerramento
          (LGPD). Os dados clínicos podem permanecer retidos pelo período legal
          (mínimo 10 anos). Para rever o estado da conta, contacte um
          administrador da plataforma.
        </p>
      </div>
      <Link
        href="/login"
        className={cn(buttonVariants({ variant: "default" }), "w-fit")}
      >
        Voltar ao login
      </Link>
    </div>
  );
}
