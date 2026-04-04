"use client";

import { useMemo } from "react";

interface MfaTotpQrProps {
  qrCode: string;
}

/**
 * QR TOTP do Supabase: data URL, SVG em texto ou URL https — sem dangerouslySetInnerHTML.
 */
export function MfaTotpQr({ qrCode }: MfaTotpQrProps) {
  const src = useMemo(() => {
    if (qrCode.startsWith("data:")) return qrCode;
    if (/^https?:\/\//i.test(qrCode)) return qrCode;
    const trimmed = qrCode.trimStart();
    if (trimmed.toLowerCase().startsWith("<svg")) {
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(qrCode)}`;
    }
    return null;
  }, [qrCode]);

  if (!src) {
    return (
      <p className="text-muted-foreground text-center text-sm">
        Não foi possível mostrar o código QR. Confirme a configuração MFA no
        Supabase ou tente novamente.
      </p>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- data URL ou URL do TOTP
    <img
      src={src}
      alt="Código QR para configurar TOTP"
      className="max-w-[220px]"
    />
  );
}
