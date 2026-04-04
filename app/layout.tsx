import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { SupabaseHashAuthRedirect } from "@/components/auth/supabase-hash-auth-redirect";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
      className={`${geistSans.variable} ${geistMono.variable} theme-nutri-teal h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SupabaseHashAuthRedirect />
        {children}
      </body>
    </html>
  );
}
