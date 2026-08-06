"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ADM_PILLARS,
  filterVisibleGroups,
  filterVisibleScreens,
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
/** Panel: alto = contenido (cantidad de opciones); no estira con el hermano. */
const PANEL_CLASS =
  "h-fit w-56 shrink-0 self-start border border-sidebar-border bg-sidebar shadow-md";
const ITEM_CLASS =
  "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring hover:bg-sidebar-accent";

function labelMayusculas(label: string): string {
  return label.toLocaleUpperCase("es");
}

/** Separador horizontal al 80% del ancho del panel. */
function PanelDivider() {
  return (
    <div className="flex justify-center py-0.5" aria-hidden>
      <div className="h-px w-[80%] bg-sidebar-border" />
    </div>
  );
}

function PanelItems({
  children,
}: {
  children: { key: string; node: ReactNode }[];
}) {
  return (
    <div className="flex h-fit flex-col p-1.5">
      {children.map((child, index) => (
        <div key={child.key}>
          {index > 0 ? <PanelDivider /> : null}
          {child.node}
        </div>
      ))}
    </div>
  );
}

function ScreenLink({
  screen,
  pathname,
  onNavigate,
  labelMode,
}: {
  screen: AdmScreenDef;
  pathname: string;
  onNavigate: () => void;
  /** 1ª apertura → MAYÚSCULAS; 2ª → title case (label del SSOT). */
  labelMode: "upper" | "title";
}) {
  const Icon = ADM_ICON_MAP[screen.icon];
  const active = isAdmScreenActive(pathname, screen);
  const label =
    labelMode === "upper" ? labelMayusculas(screen.label) : screen.label;
  return (
    <Link
      href={screen.href}
      onClick={onNavigate}
      className={cn(ITEM_CLASS, active && "font-semibold")}
      aria-current={active ? "page" : undefined}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1 truncate text-left">{label}</span>
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
      // No preseleccionar grupo: el 2º panel aparece al hover sobre una opción.
      setOpenGroupId((prev) => {
        if (prev && groups.some((g) => g.id === prev)) return prev;
        return null;
      });
    },
    [clearCloseTimer, puedeFn, updatePanelPos]
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
                "flex w-full cursor-default items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold text-sidebar-foreground transition-colors hover:bg-sidebar-accent",
                "[&>span:first-child_svg]:text-sidebar-foreground",
                // Activo por ruta: tipografía; el fondo de hover solo con :hover.
                pillarActive && "underline decoration-sidebar-indicator underline-offset-4"
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
          className="fixed z-50 flex items-start"
          style={{ top: panelPos.top, left: panelPos.left }}
          role="menu"
          aria-label={openPillarDef.label}
          onMouseEnter={clearCloseTimer}
          onMouseLeave={scheduleClose}
        >
          {/* 1ª apertura */}
          <div className={PANEL_CLASS}>
            {openDirectScreens.length > 0 ? (
              <PanelItems>
                {openDirectScreens.map((screen) => ({
                  key: screen.id,
                  node: (
                    <ScreenLink
                      screen={screen}
                      pathname={pathname}
                      onNavigate={closeAll}
                      labelMode="upper"
                    />
                  ),
                }))}
              </PanelItems>
            ) : (
              <PanelItems>
                {openGroups.map((group) => {
                  const GroupIcon = ADM_ICON_MAP[group.icon];
                  return {
                    key: group.id,
                    node: (
                      <button
                        type="button"
                        className={ITEM_CLASS}
                        onMouseEnter={() => setOpenGroupId(group.id)}
                        aria-expanded={openGroupId === group.id}
                      >
                        <GroupIcon className="h-4 w-4 shrink-0" aria-hidden />
                        <span className="min-w-0 flex-1 truncate text-left">
                          {labelMayusculas(group.label)}
                        </span>
                        <ChevronRight
                          className="h-3.5 w-3.5 shrink-0 text-sidebar-indicator"
                          aria-hidden
                        />
                      </button>
                    ),
                  };
                })}
              </PanelItems>
            )}
          </div>

          {/* 2ª apertura */}
          {openGroup ? (
            <div className={cn(PANEL_CLASS, "border-l-0")} aria-label={openGroup.label}>
              <PanelItems>
                {openGroup.screens.map((screen) => ({
                  key: screen.id,
                  node: (
                    <ScreenLink
                      screen={screen}
                      pathname={pathname}
                      onNavigate={closeAll}
                      labelMode="title"
                    />
                  ),
                }))}
              </PanelItems>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
