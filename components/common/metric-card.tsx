import { TrendingDown, TrendingUp, Minus, AlertTriangle, ShieldAlert } from "lucide-react";
import Link from "next/link";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  /** Rótulo descritivo: "Clientes Activos", "Conformidade Média" */
  label: string;
  /** Valor principal: 47 | "91%" | "R$ 2.4k" */
  value: number | string;
  /** Unidade exibida ao lado do valor: "clientes" | "%" */
  unit?: string;
  /** Variação numérica: +3 | -1.2 */
  delta?: number;
  /** Rótulo da comparação: "vs. mês anterior" */
  deltaLabel?: string;
  /** Direção da tendência */
  trend?: "up" | "down" | "neutral";
  /**
   * Para métricas onde "down" é positivo (ex: % de estabelecimentos críticos).
   * "up" = subida é boa | "down" = descida é boa (padrão: "up")
   */
  trendPositive?: "up" | "down";
  /** Dados do sparkline — últimas 8 semanas */
  sparklineData?: number[];
  /** Estado visual do card */
  status?: "normal" | "warning" | "critical";
  /** Ícone complementar (Lucide) */
  icon?: React.ReactNode;
  /** Se fornecido, todo o card vira link */
  href?: string;
  className?: string;
}

function Sparkline({ data, status }: { data: number[]; status?: "normal" | "warning" | "critical" }) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const height = 40;
  const width = 120;
  const padX = 2;
  const step = (width - padX * 2) / (data.length - 1);

  const points = data.map((v, i) => {
    const x = padX + i * step;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  });

  const strokeColor =
    status === "critical"
      ? "hsl(0 82% 57%)"
      : status === "warning"
      ? "hsl(38 90% 50%)"
      : "hsl(173 72% 28%)";

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden
      className="overflow-visible"
    >
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.8"
      />
      {/* Último ponto destacado */}
      {(() => {
        const last = points[points.length - 1].split(",");
        return (
          <circle
            cx={parseFloat(last[0])}
            cy={parseFloat(last[1])}
            r="2.5"
            fill={strokeColor}
          />
        );
      })()}
    </svg>
  );
}

export function MetricCard({
  label,
  value,
  unit,
  delta,
  deltaLabel = "vs. mês anterior",
  trend,
  trendPositive = "up",
  sparklineData,
  status = "normal",
  icon,
  href,
  className,
}: MetricCardProps) {
  const isPositiveDelta =
    delta !== undefined
      ? trendPositive === "up"
        ? delta > 0
        : delta < 0
      : undefined;

  const TrendIcon =
    trend === "up"
      ? TrendingUp
      : trend === "down"
      ? TrendingDown
      : Minus;

  const deltaColorClass =
    isPositiveDelta === true
      ? "text-green-600"
      : isPositiveDelta === false
      ? "text-destructive"
      : "text-muted-foreground";

  const cardContent = (
    <>
      <CardHeader className="pb-2 pt-4 px-5 flex flex-row items-center justify-between space-y-0">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </p>
        {status === "warning" && (
          <AlertTriangle className="h-4 w-4 text-warning shrink-0" aria-label="Atenção" />
        )}
        {status === "critical" && (
          <ShieldAlert className="h-4 w-4 text-destructive shrink-0" aria-label="Crítico" />
        )}
        {status === "normal" && icon && (
          <span className="text-muted-foreground">{icon}</span>
        )}
      </CardHeader>

      <CardContent className="px-5 pb-4">
        {/* Valor principal */}
        <div className="flex items-end justify-between gap-2">
          <div>
            <span
              className={cn(
                "text-3xl font-bold tabular-nums leading-none",
                status === "critical" && "text-destructive",
              )}
            >
              {value}
            </span>
            {unit && (
              <span className="ml-1.5 text-sm text-muted-foreground">
                {unit}
              </span>
            )}
          </div>

          {/* Sparkline */}
          {sparklineData && sparklineData.length > 0 && (
            <Sparkline data={sparklineData} status={status} />
          )}
        </div>

        {/* Delta */}
        {delta !== undefined && (
          <div className={cn("mt-1 flex items-center gap-1 text-xs", deltaColorClass)}>
            <TrendIcon className="h-3 w-3" aria-hidden />
            <span className="tabular-nums font-semibold">
              {delta > 0 ? "+" : ""}
              {typeof delta === "number" && !Number.isInteger(delta)
                ? delta.toFixed(1)
                : delta}
            </span>
            <span className="text-muted-foreground">{deltaLabel}</span>
          </div>
        )}
      </CardContent>
    </>
  );

  const cardClasses = cn(
    "shadow-sm transition-shadow hover:shadow-md",
    status === "warning" && "border-warning",
    status === "critical" && "border-destructive",
    href && "cursor-pointer",
    className,
  );

  if (href) {
    return (
      <Link href={href} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl">
        <Card className={cn(cardClasses, "hover:shadow-md")}>{cardContent}</Card>
      </Link>
    );
  }

  return <Card className={cardClasses}>{cardContent}</Card>;
}
