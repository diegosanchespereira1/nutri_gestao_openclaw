'use client';

import Image from "next/image";
import { useEffect, useState, useSyncExternalStore } from 'react';

const AUTH_PANEL_VARIANT = process.env.NEXT_PUBLIC_AUTH_PANEL_VARIANT ?? "classic";
const MARKETING_SLIDE_INTERVAL_MS = 4500;
/**
 * Slides do carrossel de marketing.
 */
const MARKETING_SLIDES = [
  "/auth/login-slide-1.png",
  "/auth/login-slide-2.png",
  "/auth/login-slide-3.png",
  "/auth/login-slide-4.png",
];

function subscribeDesktopMq(onChange: () => void) {
  const mq = window.matchMedia('(min-width: 1024px)');
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}

function getDesktopMqSnapshot() {
  return window.matchMedia('(min-width: 1024px)').matches;
}

/**
 * Painel decorativo lateral da tela de auth.
 * Renderiza APENAS no cliente e apenas em telas >= 1024px.
 * Nunca aparece no SSR — evita flash no Android WebView.
 */
export function DecorativePanel() {
  const show = useSyncExternalStore(
    subscribeDesktopMq,
    getDesktopMqSnapshot,
    () => false,
  );
  const [slideIndex, setSlideIndex] = useState(0);

  useEffect(() => {
    if (!show) return;
    if (AUTH_PANEL_VARIANT !== "marketing") return;
    if (MARKETING_SLIDES.length <= 1) return;

    const timer = window.setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % MARKETING_SLIDES.length);
    }, MARKETING_SLIDE_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [show]);

  if (!show) return null;

  if (AUTH_PANEL_VARIANT === "marketing") {
    return (
      <div
        className="from-primary/15 via-background to-accent/20 text-foreground relative flex flex-col items-center justify-center bg-gradient-to-br p-10"
        aria-hidden
      >
        <div className="w-full max-w-xl space-y-5">
          <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border border-white/30 bg-white/70 shadow-2xl">
            <Image
              src={MARKETING_SLIDES[slideIndex] ?? MARKETING_SLIDES[0]}
              alt=""
              fill
              sizes="(min-width: 1536px) 40rem, (min-width: 1280px) 36rem, (min-width: 1024px) 32rem, 100vw"
              className="object-contain object-center"
              priority
            />
          </div>
          {MARKETING_SLIDES.length > 1 ? (
            <div className="flex items-center justify-center gap-1.5">
              {MARKETING_SLIDES.map((_, index) => (
                <span
                  key={index}
                  className={`h-1.5 w-6 rounded-full transition-opacity ${
                    index === slideIndex ? "bg-primary opacity-100" : "bg-primary/35 opacity-60"
                  }`}
                />
              ))}
            </div>
          ) : null}
          <div className="space-y-2 text-center">
            <div className="flex items-center justify-center gap-2">
              <Image
                src="/app-logo-transparent.png"
                alt=""
                width={34}
                height={34}
              />
              <p className="text-primary text-3xl font-bold tracking-tight">
                NutriGestão
              </p>
            </div>
            <p className="text-foreground text-sm font-semibold">
              Gestão completa da sua operação nutricional em um só lugar.
            </p>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Controle clientes, checklists, visitas, equipe e indicadores com
              uma experiência simples, segura e profissional.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="from-primary/15 via-background to-accent/20 text-foreground relative flex flex-col items-center justify-center bg-gradient-to-br p-12"
      aria-hidden
    >
      <div className="max-w-sm text-center">
        <div className="flex items-center justify-center gap-2">
          <Image
            src="/app-logo-transparent.png"
            alt=""
            width={34}
            height={34}
          />
          <p className="text-primary font-heading text-3xl font-bold tracking-tight">
            NutriGestão
          </p>
        </div>
        <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
          Gestão nutricional profissional.
        </p>
      </div>
    </div>
  );
}
