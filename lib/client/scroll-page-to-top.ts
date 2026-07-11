import { APP_PAGE_SCROLL_ID } from "@/components/app-page-scroll";

/** Leva o utilizador ao topo da página (window + landmarks do shell). */
export function scrollPageToTop(options?: { behavior?: ScrollBehavior }): void {
  if (typeof window === "undefined") return;

  const behavior = options?.behavior ?? "auto";
  window.scrollTo({ top: 0, left: 0, behavior });
  document.documentElement.scrollTo({ top: 0, left: 0, behavior });
  document.body.scrollTo({ top: 0, left: 0, behavior });

  const main = document.getElementById("conteudo-principal");
  if (main) {
    main.scrollTop = 0;
  }

  const pageScroll = document.getElementById(APP_PAGE_SCROLL_ID);
  if (pageScroll) {
    pageScroll.scrollTop = 0;
  }
}
