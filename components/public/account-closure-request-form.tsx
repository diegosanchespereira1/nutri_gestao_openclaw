"use client";

import { useState } from "react";
import Link from "next/link";

import { submitPublicAccountClosureRequest } from "@/lib/actions/public-account-closure-request";
import { LGPD_RETENTION_YEARS } from "@/lib/types/account-deletion";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function AccountClosureRequestForm() {
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const canSubmit = confirmed && email.trim().length > 0 && !loading;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError(null);

    const result = await submitPublicAccountClosureRequest({
      email: email.trim(),
      notes: notes.trim() || undefined,
      confirmed,
    });

    setLoading(false);

    if (!result.success) {
      setError(result.error ?? "Não foi possível enviar o pedido.");
      return;
    }

    setSuccessMessage(result.message ?? "Pedido registado.");
    setEmail("");
    setNotes("");
    setConfirmed(false);
  };

  if (successMessage) {
    return (
      <div
        className="rounded-xl border border-emerald-200 bg-emerald-50 p-6"
        role="status"
      >
        <h2 className="mb-2 text-lg font-semibold text-emerald-900">
          Pedido recebido
        </h2>
        <p className="text-sm leading-relaxed text-emerald-800">
          {successMessage}
        </p>
        <p className="mt-4 text-sm text-emerald-800">
          Dúvidas?{" "}
          <a
            href="mailto:privacidade@nutrigestao.app"
            className="font-medium underline"
          >
            privacidade@nutrigestao.app
          </a>
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-6"
          onClick={() => setSuccessMessage(null)}
        >
          Enviar outro pedido
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="closure-email">Email de acesso à plataforma</Label>
        <Input
          id="closure-email"
          type="email"
          autoComplete="email"
          required
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
        />
        <p className="text-xs text-muted-foreground">
          Use o mesmo email com que você se cadastrou na NutriGestão.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="closure-notes">Motivo (opcional)</Label>
        <Textarea
          id="closure-notes"
          rows={3}
          maxLength={2000}
          placeholder="Conte-nos brevemente o motivo, se desejar."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={loading}
        />
      </div>

      <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
        <Checkbox
          id="closure-confirmed"
          checked={confirmed}
          onCheckedChange={(checked) => setConfirmed(checked === true)}
          disabled={loading}
          className="mt-0.5"
        />
        <Label
          htmlFor="closure-confirmed"
          className="cursor-pointer text-sm leading-relaxed text-amber-950"
        >
          Li e compreendo que o pedido encerra meu acesso à plataforma e que
          dados clínicos de pacientes podem ser retidos pelo prazo legal mínimo
          de {LGPD_RETENTION_YEARS} anos, conforme LGPD e regulamentações
          aplicáveis.
        </Label>
      </div>

      {error ? (
        <div
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <Button type="submit" variant="destructive" disabled={!canSubmit}>
        {loading ? "A enviar…" : "Solicitar exclusão da conta"}
      </Button>

      <p className="text-xs text-muted-foreground">
        Já tem sessão iniciada? Também pode usar{" "}
        <Link href="/configuracoes/deletar-conta" className="underline">
          Configurações → Excluir conta
        </Link>
        .
      </p>
    </form>
  );
}
