import type { ReactNode } from "react";

import { DecorativePanel } from "@/components/auth/decorative-panel";
import { AppPageScroll } from "@/components/app-page-scroll";

// Layout server component — sem 'use client' para garantir que children renderize corretamente
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-background grid min-h-screen lg:grid-cols-2">
      <div className="safe-top flex min-h-screen flex-col md:min-h-0 md:h-screen md:overflow-hidden">
        <AppPageScroll className="flex flex-1 flex-col justify-center px-6 py-10 sm:px-10 lg:px-16 xl:px-24">
          <div className="mx-auto w-full max-w-md">{children}</div>
        </AppPageScroll>
      </div>
      <DecorativePanel />
    </div>
  );
}
