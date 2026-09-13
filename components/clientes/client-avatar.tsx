import { cn } from "@/lib/utils";

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

type Props = {
  name: string;
  imageUrl: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  /** Foto circular com anel interno — não recorta a borda. */
  framed?: boolean;
};

const sizeClass: Record<NonNullable<Props["size"]>, string> = {
  sm: "size-9 text-xs",
  md: "size-11 text-sm",
  lg: "size-14 text-base",
  xl: "size-[4.5rem] text-lg sm:size-[5.25rem] sm:text-xl",
};

// Tamanho em px para width/height no <img> — evita CLS enquanto a imagem carrega.
const sizePx: Record<NonNullable<Props["size"]>, number> = {
  sm: 36, // size-9  = 2.25rem = 36px
  md: 44, // size-11 = 2.75rem = 44px
  lg: 56, // size-14 = 3.5rem  = 56px
  xl: 84, // ~5.25rem no desktop (modelo dashboard paciente)
};

export function ClientAvatar({
  name,
  imageUrl,
  size = "md",
  className = "",
  framed = false,
}: Props) {
  const box = cn(
    "bg-muted flex shrink-0 items-center justify-center overflow-hidden font-semibold text-foreground",
    framed ? "size-full rounded-full" : cn("rounded-lg", sizeClass[size]),
    !framed && className,
  );

  const media = imageUrl ? (
    // eslint-disable-next-line @next/next/no-img-element -- URL assinada Supabase
    <img
      src={imageUrl}
      alt=""
      width={sizePx[size]}
      height={sizePx[size]}
      className={cn(box, "object-cover")}
    />
  ) : (
    <div className={box} aria-hidden>
      {initialsFromName(name)}
    </div>
  );

  if (!framed) return media;

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 overflow-visible p-0.5",
        sizeClass[size],
        className,
      )}
    >
      <span className="relative block size-full min-h-0 min-w-0">
        {media}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-inset ring-primary/35"
        />
      </span>
    </span>
  );
}
