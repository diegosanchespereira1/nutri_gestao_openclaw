import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";

import { SupabaseHashAuthRedirect } from "@/components/auth/supabase-hash-auth-redirect";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt"
      data-theme="nutri-teal-v2"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SupabaseHashAuthRedirect />
        {children}
      </body>
    </html>
  );
}
