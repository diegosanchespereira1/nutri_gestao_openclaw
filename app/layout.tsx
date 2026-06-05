import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";

import { SupabaseHashAuthRedirect } from "@/components/auth/supabase-hash-auth-redirect";
import { AppLoadingScreen } from "@/components/mobile/app-loading-screen";
import { CapacitorLinkInterceptor } from "@/components/mobile/capacitor-link-interceptor";
import { getAppVersion } from "@/lib/app-version";
import { getPublicRuntimeEnv } from "@/lib/env/public-runtime";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "NutriGestão",
  description: "Gestão nutricional para profissionais",
};

// Evita cache RSC do shell com env do build (supabaseUrl vazio / chave errada no inline).
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Viewport separado do metadata (Next.js 14+).
// viewportFit: 'cover' é essencial para o notch/Dynamic Island do iPhone
// e para a barra inferior do iOS não cortar conteúdo no app nativo.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,      // evita zoom acidental em campos de formulário no iOS
  userScalable: false,
  viewportFit: "cover", // respeita safe-area-inset-* no Capacitor/iOS
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Env vars lidas no servidor e injetadas inline no HTML.
  // ANTES: usávamos <Script src="/runtime-env.js" strategy="beforeInteractive" />,
  // que faz uma requisição de rede antes de hidratar o React.
  // Em Android WebView (Capacitor), se essa requisição falha ou demora,
  // o Next.js BLOQUEIA toda a hidratação — resultado: só aparece o texto do
  // SSR (LoginFallback "A carregar…"), sem campos nem botões.
  // AGORA: as variáveis são embutidas diretamente no HTML pelo servidor,
  // eliminando a dependência de rede para inicializar o app.
  const runtimeEnv = getPublicRuntimeEnv();
  const inlineEnvScript = `window.__NUTRIGESTAO_PUBLIC_ENV__=${JSON.stringify(runtimeEnv).replace(/</g, "\\u003c")};`;

  return (
    <html
      lang="pt"
      data-theme="nutri-teal-v2"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
      style={{ backgroundColor: '#F4F9F8' }}
    >
      <head>
        <meta name="app-version" content={getAppVersion()} />
        {/* Fundo imediato antes do CSS carregar — evita flash preto no Capacitor */}
        <style dangerouslySetInnerHTML={{ __html: `html,body{background-color:#F4F9F8}` }} />
        {/*
          Env vars injetadas inline: sem requisição de rede, sem risco de bloquear
          a hidratação do React no Android WebView.
        */}
        <script dangerouslySetInnerHTML={{ __html: inlineEnvScript }} />
      </head>
      <body className="min-h-full flex flex-col" style={{ backgroundColor: '#F4F9F8' }}>
        <AppLoadingScreen />
        <CapacitorLinkInterceptor />
        <SupabaseHashAuthRedirect />
        {children}
      </body>
    </html>
  );
}
