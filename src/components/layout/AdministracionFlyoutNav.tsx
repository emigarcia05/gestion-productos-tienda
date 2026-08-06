"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ADM_PILLARS,
  filterVisibleGroups,
  filterVisibleScreens,
  isAdmGroupActive,
  isAdmPillarActive,
  isAdmScreenActive,
  pillarHasVisibleItems,
  type AdmGroupDef,
  type AdmPillarDef,
  type AdmPillarId,
  type AdmScreenDef,
} from "@/lib/administracionNav";
import { ADM_ICON_MAP } from "@/lib/administracionNavIcons";
import { puede, type Rol } from "@/lib/permisos";

const CLOSE_DELAY_MS = 180;
const PANEL_CLASS =
  "w-56 shrink-0 border border-sidebar-border bg-sidebar shadow-md";
const ITEM_CLASS =
  "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring";

function ScreenLink({
  screen,
  pathname,
  onNavigate,
}: {
  screen: AdmScreenDef;
  pathname: string;
  onNavigate: () => void;
}) {
  const Icon = ADM_ICON_MAP[screen.icon];
  const active = isAdmScreenActive(pathname, screen);
  return (
    <Link
      href={screen.href}
      onClick={onNavigate}
      className={cn(
        ITEM_CLASS,
        active ? "bg-sidebar-accent" : "hover:bg-sidebar-accent"
      )}
      aria-current={active ? "page" : undefined}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1 truncate text-left">{screen.label}</span>
    </Link>
  );
}

/**
 * Sidebar Administración: 3 pilares fijos; desgloses en paneles horizontales al hover.
 * Paneles en `position: fixed` para no quedar recortados por `AppShell` (`overflow-hidden`).
 */
export default function AdministracionFlyoutNav({ rol }: { rol: Rol }) {
  const pathname = usePathname();
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pillarRefs = useRef<Partial<Record<AdmPillarId, HTMLDivElement | null>>>(
    {}
  );
  const [openPillarId, setOpenPillarId] = useState<AdmPillarId | null>(null);
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number } | null>(
    null
  );

  const puedeFn = useCallback(
    (permiso: { simple: boolean; editor: boolean }) => puede(rol, permiso),
    [rol]
  );

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      setOpenPillarId(null);
      setOpenGroupId(null);
      setPanelPos(null);
    }, CLOSE_DELAY_MS);
  }, [clearCloseTimer]);

  const updatePanelPos = useCallback((pillarId: AdmPillarId) => {
    const el = pillarRefs.current[pillarId];
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPanelPos({ top: rect.top, left: rect.right });
  }, []);

  const openPillar = useCallback(
    (pillar: AdmPillarDef) => {
      clearCloseTimer();
      setOpenPillarId(pillar.id);
      updatePanelPos(pillar.id);
      if (pillar.screens?.length) {
        setOpenGroupId(null);
        return;
      }
      const groups = filterVisibleGroups(pillar.groups ?? [], puedeFn);
      const activeGroup = groups.find((g) => isAdmGroupActive(pathname, g));
      setOpenGroupId(activeGroup?.id ?? groups[0]?.id ?? null);
    },
    [clearCloseTimer, pathname, puedeFn, updatePanelPos]
  );

  const closeAll = useCallback(() => {
    clearCloseTimer();
    setOpenPillarId(null);
    setOpenGroupId(null);
    setPanelPos(null);
  }, [clearCloseTimer]);

  useEffect(() => () => clearCloseTimer(), [clearCloseTimer]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeAll();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeAll]);

  useEffect(() => {
    queueMicrotask(() => {
      closeAll();
    });
  }, [pathname, closeAll]);

  useEffect(() => {
    if (!openPillarId) return;
    function onReposition() {
      if (openPillarId) updatePanelPos(openPillarId);
    }
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [openPillarId, updatePanelPos]);

  const visiblePillars = ADM_PILLARS.filter((p) =>
    pillarHasVisibleItems(p, puedeFn)
  );

  if (visiblePillars.length === 0) {
    return (
      <div className="rounded-lg border border-sidebar-border/60 bg-sidebar-accent/20 px-3 py-3 text-xs text-sidebar-foreground/80">
        No Hay Módulos Disponibles En Esta Área.
      </div>
    );
  }

  const openPillarDef = visiblePillars.find((p) => p.id === openPillarId);
  const openGroups = openPillarDef
    ? filterVisibleGroups(openPillarDef.groups ?? [], puedeFn)
    : [];
  const openDirectScreens = openPillarDef
    ? filterVisibleScreens(openPillarDef.screens ?? [], puedeFn)
    : [];
  const openGroup: AdmGroupDef | undefined = openGroups.find(
    (g) => g.id === openGroupId
  );

  return (
    <div className="flex flex-col gap-0.5" aria-label="Navegación Administración">
      {visiblePillars.map((pillar) => {
        const PillarIcon = ADM_ICON_MAP[pillar.icon];
        const pillarActive = isAdmPillarActive(pathname, pillar);
        const isOpen = openPillarId === pillar.id;

        return (
          <div
            key={pillar.id}
            ref={(node) => {
              pillarRefs.current[pillar.id] = node;
            }}
            onMouseEnter={() => openPillar(pillar)}
            onMouseLeave={scheduleClose}
          >
            <div
              className={cn(
                "flex w-full cursor-default items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold text-sidebar-foreground transition-colors",
                "[&>span:first-child_svg]:text-sidebar-foreground",
                pillarActive || isOpen
                  ? "bg-sidebar-accent"
                  : "hover:bg-sidebar-accent"
              )}
              aria-expanded={isOpen}
              aria-haspopup="menu"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                <PillarIcon className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1 text-left">{pillar.label}</span>
              <ChevronRight
                className="h-4 w-4 shrink-0 text-sidebar-indicator"
                aria-hidden
              />
            </div>
          </div>
        );
      })}

      {openPillarDef && panelPos ? (
        <div
          className="fixed z-50 flex"
          style={{ top: panelPos.top, left: panelPos.left }}
          role="menu"
          aria-label={openPillarDef.label}
          onMouseEnter={clearCloseTimer}
          onMouseLeave={scheduleClose}
        >
          <div className={cn(PANEL_CLASS, "p-1.5")}>
            {openDirectScreens.length > 0
              ? openDirectScreens.map((screen) => (
                  <ScreenLink
                    key={screen.id}
                    screen={screen}
                    pathname={pathname}
                    onNavigate={closeAll}
                  />
                ))
              : openGroups.map((group) => {
                  const GroupIcon = ADM_ICON_MAP[group.icon];
                  const groupActive =
                    openGroupId === group.id ||
                    isAdmGroupActive(pathname, group);
                  return (
                    <button
                      key={group.id}
                      type="button"
                      className={cn(
                        ITEM_CLASS,
                        groupActive
                          ? "bg-sidebar-accent"
                          : "hover:bg-sidebar-accent"
                      )}
                      onMouseEnter={() => setOpenGroupId(group.id)}
                      aria-expanded={openGroupId === group.id}
                    >
                      <GroupIcon className="h-4 w-4 shrink-0" aria-hidden />
                      <span className="min-w-0 flex-1 truncate text-left">
                        {group.label}
                      </span>
                      <ChevronRight
                        className="h-3.5 w-3.5 shrink-0 text-sidebar-indicator"
                        aria-hidden
                      />
                    </button>
                  );
                })}
          </div>

          {openGroup ? (
            <div
              className={cn(PANEL_CLASS, "border-l-0 p-1.5")}
              aria-label={openGroup.label}
            >
              {openGroup.screens.map((screen) => (
                <ScreenLink
                  key={screen.id}
                  screen={screen}
                  pathname={pathname}
                  onNavigate={closeAll}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
