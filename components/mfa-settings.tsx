"use client";

import { useEffect, useState } from "react";

import { MfaTotpQr } from "@/components/auth/mfa-totp-qr";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type FactorRow = {
  id: string;
  factor_type: string;
  friendly_name?: string;
  status: string;
};

export function MfaSettings() {
  const [factors, setFactors] = useState<FactorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const [enrolling, setEnrolling] = useState(false);
  const [enrollFactorId, setEnrollFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [enrollCode, setEnrollCode] = useState("");
  const [challengeId, setChallengeId] = useState<string | null>(null);

  const [unenrollConfirm, setUnenrollConfirm] = useState(false);

  async function refreshFactors() {
    const supabase = createClient();
    const { data, error: e } = await supabase.auth.mfa.listFactors();
    if (e) {
      setError(e.message);
      setFactors([]);
    } else {
      setFactors((data?.all as FactorRow[]) ?? []);
      setError(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const supabase = createClient();
      const { data, error: e } = await supabase.auth.mfa.listFactors();
      if (cancelled) return;
      if (e) {
        setError(e.message);
        setFactors([]);
      } else {
        setFactors((data?.all as FactorRow[]) ?? []);
        setError(null);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const verifiedTotp = factors.find(
    (f) => f.factor_type === "totp" && f.status === "verified",
  );

  async function handleStartEnroll() {
    const supabase = createClient();
    setError(null);
    setInfo(null);
    setEnrolling(true);
    const { data, error: e } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "NutriGestão",
    });
    if (e || !data) {
      setError(
        e?.message ??
          "Não foi possível iniciar o 2FA. Confirme no Supabase Dashboard que MFA (TOTP) está ativo para o projeto.",
      );
      setEnrolling(false);
      return;
    }
    setEnrollFactorId(data.id);
    setQrCode(data.totp?.qr_code ?? null);
    const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({
      factorId: data.id,
    });
    if (chErr || !ch?.id) {
      setError(chErr?.message ?? "Falha ao preparar verificação.");
      setEnrolling(false);
      return;
    }
    setChallengeId(ch.id);
  }

  async function handleConfirmEnroll(e: React.FormEvent) {
    e.preventDefault();
    if (!enrollFactorId || !challengeId) return;
    const supabase = createClient();
    setError(null);
    const { error: vErr } = await supabase.auth.mfa.verify({
      factorId: enrollFactorId,
      challengeId,
      code: enrollCode.replace(/\s/g, ""),
    });
    if (vErr) {
      setError(vErr.message);
      return;
    }
    setEnrollCode("");
    setEnrollFactorId(null);
    setQrCode(null);
    setChallengeId(null);
    setEnrolling(false);
    setInfo("Autenticação em dois passos ativada.");
    await refreshFactors();
  }

  async function handleUnenroll() {
    if (!verifiedTotp || !unenrollConfirm) return;
    const supabase = createClient();
    setError(null);
    const { error: uErr } = await supabase.auth.mfa.unenroll({
      factorId: verifiedTotp.id,
    });
    if (uErr) {
      setError(uErr.message);
      return;
    }
    setUnenrollConfirm(false);
    setInfo("2FA desativado. O próximo login usará só palavra-passe.");
    await refreshFactors();
  }

  if (loading) {
    return <p className="text-muted-foreground text-sm">A carregar…</p>;
  }

  return (
    <div className="max-w-lg space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Autenticação em dois passos (TOTP)</CardTitle>
          <CardDescription>
            Reforce a conta com uma aplicação de códigos (Google Authenticator,
            1Password, etc.). Requer MFA ativo no projeto Supabase.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}
          {info ? (
            <p className="text-muted-foreground text-sm" role="status">
              {info}
            </p>
          ) : null}

          {verifiedTotp ? (
            <div className="space-y-3">
              <p className="text-sm">
                2FA <strong>ativo</strong>
                {verifiedTotp.friendly_name
                  ? ` (${verifiedTotp.friendly_name})`
                  : ""}
                .
              </p>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={unenrollConfirm}
                  onChange={(ev) => setUnenrollConfirm(ev.target.checked)}
                  className="border-input size-4 rounded border"
                />
                Confirmo que quero desativar o 2FA nesta conta
              </label>
              <Button
                type="button"
                variant="destructive"
                disabled={!unenrollConfirm}
                onClick={handleUnenroll}
              >
                Desativar 2FA
              </Button>
            </div>
          ) : !enrolling ? (
            <Button type="button" onClick={handleStartEnroll}>
              Ativar 2FA
            </Button>
          ) : (
            <form onSubmit={handleConfirmEnroll} className="space-y-4">
              {qrCode ? (
                <div className="space-y-2">
                  <p className="text-muted-foreground text-sm">
                    Leia o código QR com a sua aplicação:
                  </p>
                  <div className="bg-background flex justify-center rounded-lg border p-4">
                    <MfaTotpQr qrCode={qrCode} />
                  </div>
                </div>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="mfa-enroll-code">
                  Código de confirmação (6 dígitos)
                </Label>
                <Input
                  id="mfa-enroll-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={enrollCode}
                  onChange={(ev) => setEnrollCode(ev.target.value)}
                  required
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="submit">Confirmar e ativar</Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEnrolling(false);
                    setEnrollFactorId(null);
                    setQrCode(null);
                    setChallengeId(null);
                    setEnrollCode("");
                    setError(null);
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
