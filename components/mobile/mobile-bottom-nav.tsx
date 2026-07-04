"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type Ref,
} from "react";

import { useModuleGate } from "@/components/modules/module-gate-provider";
import { AppBuildLabel } from "@/components/app-version-guard";
import { LogoutButton } from "@/components/auth/logout-button";
import { AppShellUserGreeting } from "@/components/app-shell-user-greeting";
import { Separator } from "@/components/ui/separator";
import {
  buildVisibleNavGroups,
  isNavItemActive,
  mobileMoreNavItem,
  resolveNavItemModuleGate,
  splitMobileNavItems,
  type AppNavItem,
  type AppNavGroup,
  type NavItemRef,
} from "@/lib/app-nav";
import { cn } from "@/lib/utils";

const MORE_NAV_ID = "__more__";

type IndicatorRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const INDICATOR_SLIDE_TRANSITION =
  "transform 420ms cubic-bezier(0.34, 1.56, 0.64, 1), width 420ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 220ms ease-out";

const navItemClassName = (active: boolean) =>
  cn(
    "relative z-10 flex h-10 items-center gap-1.5 rounded-full py-1.5 pl-2 pr-2.5",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    active
      ? "shrink-0 text-primary-foreground"
      : "shrink-0 text-muted-foreground hover:text-foreground",
  );

const BottomNavItem = forwardRef<
  HTMLAnchorElement | HTMLButtonElement,
  {
    label: string;
    icon: AppNavItem["icon"];
    active: boolean;
    onClick?: () => void;
    onNavigate?: () => void;
    href?: string;
  }
>(function BottomNavItem(
  { label, icon: Icon, active, onClick, onNavigate, href },
  ref,
) {
  const className = navItemClassName(active);

  const content = (
    <>
      <span className="flex size-8 shrink-0 items-center justify-center">
        <Icon className="size-4 shrink-0" aria-hidden />
      </span>
      <span
        className={cn(
          "grid overflow-hidden text-xs font-semibold whitespace-nowrap transition-[grid-template-columns,opacity] duration-300 motion-reduce:transition-none",
          "ease-[cubic-bezier(0.34,1.56,0.64,1)]",
          active ? "grid-cols-[1fr] opacity-100" : "grid-cols-[0fr] opacity-0",
        )}
        aria-hidden={!active}
      >
        <span className="overflow-hidden pr-0.5">{label}</span>
      </span>
    </>
  );

  if (href) {
    return (
      <Link
        ref={ref as Ref<HTMLAnchorElement>}
        href={href}
        prefetch
        onClick={onNavigate}
        className={className}
        aria-current={active ? "page" : undefined}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      ref={ref as Ref<HTMLButtonElement>}
      type="button"
      onClick={() => {
        onNavigate?.();
        onClick?.();
      }}
      className={className}
      aria-expanded={active}
      aria-label={label}
    >
      {content}
    </button>
  );
});

function MoreSheetNavItem({
  entry,
  pathname,
  onNavigate,
}: {
  entry: NavItemRef;
  pathname: string;
  onNavigate: () => void;
}) {
  const { item, group } = entry;
  const Icon = item.icon;
  const { isModuleEnabled, openDisabledModule } = useModuleGate();
  const moduleGate = resolveNavItemModuleGate(item, group);
  const isLocked = moduleGate !== null && !isModuleEnabled(moduleGate);
  const active = !isLocked && isNavItemActive(pathname, item.href);

  const itemClassName = cn(
    "flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    isLocked
      ? "text-muted-foreground/70 hover:bg-muted/60 cursor-pointer"
      : active
        ? "bg-primary/10 text-primary font-semibold"
        : "text-foreground hover:bg-muted/60",
  );

  if (isLocked && moduleGate) {
    return (
      <button
        type="button"
        onClick={() => {
          openDisabledModule(moduleGate);
          onNavigate();
        }}
        className={itemClassName}
        aria-disabled="true"
      >
        <Icon className="size-4 shrink-0 opacity-60" aria-hidden />
        <span className="truncate">{item.label}</span>
      </button>
    );
  }

  return (
    <Link
      href={item.href}
      prefetch
      onClick={onNavigate}
      className={itemClassName}
      aria-current={active ? "page" : undefined}
    >
      <Icon
        className={cn("size-4 shrink-0", active ? "text-primary" : "opacity-70")}
        aria-hidden
      />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function MoreSheetGroups({
  groups,
  primaryHrefs,
  pathname,
  onNavigate,
}: {
  groups: AppNavGroup[];
  primaryHrefs: Set<string>;
  pathname: string;
  onNavigate: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {groups.map((group) => {
        const items = group.items.filter((item) => !primaryHrefs.has(item.href));
        if (items.length === 0) return null;

        return (
          <div key={group.label}>
            <p className="text-muted-foreground mb-1 px-1 text-[10px] font-semibold uppercase tracking-wide">
              {group.label}
            </p>
            <div className="flex flex-col gap-0.5">
              {items.map((item) => (
                <MoreSheetNavItem
                  key={item.href}
                  entry={{ item, group }}
                  pathname={pathname}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function MobileBottomNav({
  showAdminNav = false,
  userFirstName = null,
}: {
  showAdminNav?: boolean;
  userFirstName?: string | null;
}) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const { isModuleEnabled, openDisabledModule } = useModuleGate();
  const containerRef = useRef<HTMLDivElement>(null);
  const navShellRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef(new Map<string, HTMLElement>());
  const [indicator, setIndicator] = useState<IndicatorRect | null>(null);
  const [indicatorReady, setIndicatorReady] = useState(false);
  const [indicatorPop, setIndicatorPop] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [navShellHeight, setNavShellHeight] = useState(0);

  const closeMoreMenu = useCallback(() => setMoreOpen(false), []);

  const groups = useMemo(
    () => buildVisibleNavGroups(showAdminNav),
    [showAdminNav],
  );
  const { primary, overflow } = useMemo(
    () => splitMobileNavItems(groups),
    [groups],
  );
  const primaryHrefs = useMemo(
    () => new Set(primary.map(({ item }) => item.href)),
    [primary],
  );

  const isMoreRouteActive = overflow.some(({ item, group }) => {
    const moduleGate = resolveNavItemModuleGate(item, group);
    const isLocked = moduleGate !== null && !isModuleEnabled(moduleGate);
    return !isLocked && isNavItemActive(pathname, item.href);
  });
  const isMoreActive = moreOpen || isMoreRouteActive;
  const MoreIcon = mobileMoreNavItem.icon;

  const activeNavId = useMemo(() => {
    if (isMoreActive) return MORE_NAV_ID;

    for (const { item, group } of primary) {
      const moduleGate = resolveNavItemModuleGate(item, group);
      const isLocked = moduleGate !== null && !isModuleEnabled(moduleGate);
      if (!isLocked && isNavItemActive(pathname, item.href)) {
        return item.href;
      }
    }

    return null;
  }, [isMoreActive, isModuleEnabled, pathname, primary]);

  const setItemRef = useCallback((id: string, node: HTMLElement | null) => {
    if (node) {
      itemRefs.current.set(id, node);
    } else {
      itemRefs.current.delete(id);
    }
  }, []);

  const updateIndicator = useCallback(() => {
    if (!activeNavId) {
      setIndicator(null);
      setIndicatorReady(true);
      return;
    }

    const container = containerRef.current;
    const activeEl = itemRefs.current.get(activeNavId);
    if (!container || !activeEl) return;

    const containerRect = container.getBoundingClientRect();
    const elRect = activeEl.getBoundingClientRect();

    setIndicator({
      x: elRect.left - containerRect.left,
      y: elRect.top - containerRect.top,
      width: elRect.width,
      height: elRect.height,
    });
    setIndicatorReady(true);
  }, [activeNavId]);

  useEffect(() => {
    if (!activeNavId || reduceMotion) return;

    setIndicatorPop(true);
    const timer = window.setTimeout(() => setIndicatorPop(false), 420);
    return () => window.clearTimeout(timer);
  }, [activeNavId, reduceMotion]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const onChange = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMoreOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [moreOpen]);

  useEffect(() => {
    const shell = navShellRef.current;
    if (!shell) return;

    const updateShellHeight = () => {
      setNavShellHeight(shell.getBoundingClientRect().height);
    };

    updateShellHeight();
    const observer = new ResizeObserver(updateShellHeight);
    observer.observe(shell);
    window.addEventListener("resize", updateShellHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateShellHeight);
    };
  }, []);

  useLayoutEffect(() => {
    updateIndicator();
  }, [updateIndicator, primary.length]);

  useEffect(() => {
    if (!activeNavId) return;

    const activeEl = itemRefs.current.get(activeNavId);
    if (!activeEl) return;

    const observer = new ResizeObserver(updateIndicator);
    observer.observe(activeEl);
    return () => observer.disconnect();
  }, [activeNavId, updateIndicator]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(updateIndicator);
    observer.observe(container);

    window.addEventListener("resize", updateIndicator);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateIndicator);
    };
  }, [updateIndicator]);

  return (
    <>
      <nav
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] lg:hidden"
        aria-label="Navegação inferior"
      >
        <div
          ref={navShellRef}
          className="pointer-events-auto flex justify-center px-4 pb-[max(0.75rem,var(--safe-area-bottom))]"
        >
          <div
            ref={containerRef}
            className="relative inline-flex max-w-full items-center gap-0.5 rounded-full bg-muted px-1.5 py-1.5 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.18)] ring-1 ring-border/60"
          >
            {indicator ? (
              <div
                aria-hidden
                className={cn(
                  "bg-primary pointer-events-none absolute top-0 left-0 rounded-full shadow-sm",
                  "motion-reduce:transition-none",
                )}
                style={{
                  transform: `translate3d(${indicator.x}px, ${indicator.y}px, 0) scale(${indicatorPop ? 1.03 : 1})`,
                  width: indicator.width,
                  height: indicator.height,
                  opacity: indicatorReady ? 1 : 0,
                  transition: reduceMotion ? "none" : INDICATOR_SLIDE_TRANSITION,
                  willChange: reduceMotion ? undefined : "transform, width",
                }}
              />
            ) : null}

            {primary.map(({ item, group }) => {
              const Icon = item.icon;
              const moduleGate = resolveNavItemModuleGate(item, group);
              const isLocked = moduleGate !== null && !isModuleEnabled(moduleGate);
              const active =
                !isLocked && activeNavId === item.href;

              if (isLocked && moduleGate) {
                return (
                  <button
                    key={item.href}
                    type="button"
                    onClick={() => {
                      closeMoreMenu();
                      openDisabledModule(moduleGate);
                    }}
                    className={cn(
                      navItemClassName(false),
                      "text-muted-foreground/70 hover:text-muted-foreground",
                    )}
                    aria-disabled="true"
                    aria-label={item.label}
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center">
                      <Icon className="size-4 shrink-0 opacity-60" aria-hidden />
                    </span>
                  </button>
                );
              }

              return (
                <BottomNavItem
                  key={item.href}
                  ref={(node) => setItemRef(item.href, node)}
                  label={item.label}
                  icon={Icon}
                  active={active}
                  href={item.href}
                  onNavigate={closeMoreMenu}
                />
              );
            })}

            <BottomNavItem
              ref={(node) => setItemRef(MORE_NAV_ID, node)}
              label={mobileMoreNavItem.label}
              icon={MoreIcon}
              active={activeNavId === MORE_NAV_ID}
              onClick={() => setMoreOpen((open) => !open)}
            />
          </div>
        </div>
      </nav>

      {moreOpen ? (
        <>
          <button
            type="button"
            aria-label="Fechar menu Mais"
            className="fixed inset-0 z-[55] bg-black/10 supports-backdrop-filter:backdrop-blur-xs lg:hidden"
            onClick={() => setMoreOpen(false)}
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="more-menu-title"
            className="pointer-events-none fixed inset-x-0 z-[58] mx-auto max-w-lg px-4 lg:hidden"
            style={{ bottom: navShellHeight }}
          >
            <div
              className={cn(
                "pointer-events-auto flex flex-col overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-lg",
                !reduceMotion &&
                  "animate-in fade-in-0 slide-in-from-bottom-2 duration-200",
              )}
              style={{
                maxHeight: `min(calc(100dvh - ${navShellHeight}px - 0.5rem), 28rem)`,
              }}
            >
              <div className="flex items-center justify-center pt-3 pb-1">
                <div className="bg-muted h-1 w-10 rounded-full" aria-hidden />
              </div>

              <div className="overflow-y-auto px-4 pt-2 pb-4">
                <p id="more-menu-title" className="text-foreground mb-3 text-base font-semibold">
                  Mais
                </p>
                <MoreSheetGroups
                  groups={groups}
                  primaryHrefs={primaryHrefs}
                  pathname={pathname}
                  onNavigate={() => setMoreOpen(false)}
                />

                <Separator className="my-4" />

                <AppShellUserGreeting firstName={userFirstName} />

                <div className="mt-3 flex flex-col gap-1">
                  <LogoutButton />
                  <AppBuildLabel className="text-muted-foreground/60" />
                  <Link
                    href="/politica-de-privacidade"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setMoreOpen(false)}
                    className="text-muted-foreground/60 hover:text-muted-foreground mt-1 px-3 text-[10px] transition-colors"
                  >
                    Política de Privacidade
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
