import type { ReactNode } from "react";

type Props = {
  id: string;
  title: string;
  /** Conteúdo da subseção (lista, vazio, etc.). */
  children: ReactNode;
  /** Ações à direita do título (ex.: link). */
  actions?: ReactNode;
};

export function DashboardClinicalSubsection({
  id,
  title,
  children,
  actions,
}: Props) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h3
          id={id}
          className="text-foreground text-base font-semibold"
        >
          {title}
        </h3>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      <div aria-labelledby={id}>{children}</div>
    </div>
  );
}
