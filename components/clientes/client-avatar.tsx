function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

type Props = {
  name: string;
  imageUrl: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeClass: Record<NonNullable<Props["size"]>, string> = {
  sm: "size-9 text-xs",
  md: "size-11 text-sm",
  lg: "size-14 text-base",
};

// Tamanho em px para width/height no <img> — evita CLS enquanto a imagem carrega.
const sizePx: Record<NonNullable<Props["size"]>, number> = {
  sm: 36,  // size-9  = 2.25rem = 36px
  md: 44,  // size-11 = 2.75rem = 44px
  lg: 56,  // size-14 = 3.5rem  = 56px
};

export function ClientAvatar({
  name,
  imageUrl,
  size = "md",
  className = "",
}: Props) {
  const box = `bg-muted flex shrink-0 items-center justify-center overflow-hidden rounded-lg font-semibold text-foreground ${sizeClass[size]}`;

  if (imageUrl) {
    const px = sizePx[size];
    return (
      // eslint-disable-next-line @next/next/no-img-element -- URL assinada Supabase
      <img
        src={imageUrl}
        alt=""
        width={px}
        height={px}
        className={`${box} object-cover ${className}`}
      />
    );
  }

  return (
    <div className={`${box} ${className}`} aria-hidden>
      {initialsFromName(name)}
    </div>
  );
}
