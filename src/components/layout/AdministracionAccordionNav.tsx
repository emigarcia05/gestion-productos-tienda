"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import SidebarNavDivider from "@/components/layout/SidebarNavDivider";

const iconClass = "h-5 w-5 shrink-0";
const subIconClass = "h-4 w-4 shrink-0";

/** Panel hijo: solo indentación (sin guía vertical). */
const TREE_PANEL = "sidebar-nav-tree";
const TREE_PANEL_NESTED = "sidebar-nav-tree sidebar-nav-tree--nested";

function ScreenLink({
  screen,
  pathname,
}: {
  screen: AdmScreenDef;
  pathname: string;
}) {
  const Icon = ADM_ICON_MAP[screen.icon];
  const active = isAdmScreenActive(pathname, screen);
  return (
    <Link
      href={screen.href}
      className="sidebar-nav-item"
      data-active={active ? "true" : undefined}
      aria-current={active ? "page" : undefined}
    >
      <Icon className={subIconClass} aria-hidden />
      <span className="min-w-0 truncate">{screen.label}</span>
    </Link>
  );
}

function ScreensList({
  screens,
  pathname,
}: {
  screens: AdmScreenDef[];
  pathname: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      {screens.map((screen) => (
        <div key={screen.id}>
          <ScreenLink screen={screen} pathname={pathname} />
        </div>
      ))}
    </div>
  );
}

function getSoleNavigableHrefForPillar(
  pillar: AdmPillarDef,
  puedeFn: (permiso: { simple: boolean; editor: boolean }) => boolean
): string | null {
  const screens = pillar.screens
    ? filterVisibleScreens(pillar.screens, puedeFn)
    : [];
  const groups = pillar.groups
    ? filterVisibleGroups(pillar.groups, puedeFn)
    : [];
  const allScreens = [
    ...screens,
    ...groups.flatMap((g) => g.screens),
  ];
  if (allScreens.length === 1) return allScreens[0]!.href;
  return null;
}

function getSoleScreenHrefForGroup(group: AdmGroupDef): string | null {
  if (group.screens.length === 1) return group.screens[0]!.href;
  return null;
}

function GroupAccordion({
  pillarId,
  group,
  pathname,
  openGroupId,
  onOpenChange,
}: {
  pillarId: AdmPillarId;
  group: AdmGroupDef;
  pathname: string;
  openGroupId: string | null;
  onOpenChange: (groupId: string | null) => void;
}) {
  const Icon = ADM_ICON_MAP[group.icon];
  const groupKey = `${pillarId}:${group.id}`;
  const soleHref = getSoleScreenHrefForGroup(group);
  if (soleHref) {
    const active = isAdmScreenActive(pathname, {
      ...group.screens[0]!,
      href: soleHref,
    });
    return (
      <Link
        href={soleHref}
        className="sidebar-nav-item"
        data-active={active ? "true" : undefined}
        aria-current={active ? "page" : undefined}
      >
        <Icon className={subIconClass} aria-hidden />
        <span className="min-w-0 truncate">{group.label}</span>
      </Link>
    );
  }

  const isOpen = openGroupId === groupKey;
  const groupActive = isAdmGroupActive(pathname, group);

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={(open) => onOpenChange(open ? groupKey : null)}
      className="group/adm-group"
    >
      <CollapsibleTrigger
        className="sidebar-nav-item"
        data-ancestor={groupActive ? "true" : undefined}
        aria-expanded={isOpen}
      >
        <Icon className={subIconClass} aria-hidden />
        <span className="min-w-0 flex-1 truncate text-left">{group.label}</span>
        <ChevronDown
          className={cn(
            "sidebar-nav-chevron h-3.5 w-3.5 shrink-0 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
          aria-hidden
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className={TREE_PANEL_NESTED}>
          <ScreensList screens={group.screens} pathname={pathname} />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

/**
 * Sidebar Administración: árbol de decisiones en acordeón vertical
 * (pilares → grupos → pantallas), SSOT `administracionNav.ts`.
 * Arranca con todos los pilares/grupos cerrados; un solo destino → navegación directa.
 */
export default function AdministracionAccordionNav({ rol }: { rol: Rol }) {
  const pathname = usePathname();
  const puedeFn = (permiso: { simple: boolean; editor: boolean }) =>
    puede(rol, permiso);

  const visiblePillars = ADM_PILLARS.filter((p) =>
    pillarHasVisibleItems(p, puedeFn)
  );

  const [openPillarId, setOpenPillarId] = useState<AdmPillarId | null>(null);
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);

  if (visiblePillars.length === 0) {
    return (
      <div className="rounded-lg border border-sidebar-border/60 bg-sidebar-accent/20 px-3 py-3 text-xs text-sidebar-foreground/80">
        No Hay Módulos Disponibles En Esta Área.
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {visiblePillars.map((pillar, pillarIndex) => (
        <div key={pillar.id}>
          {pillarIndex > 0 ? <SidebarNavDivider /> : null}
          <PillarAccordion
            pillar={pillar}
            pathname={pathname}
            puedeFn={puedeFn}
            openPillarId={openPillarId}
            onPillarOpenChange={(id) => {
              setOpenPillarId(id);
              if (id == null) setOpenGroupId(null);
            }}
            openGroupId={openGroupId}
            onGroupOpenChange={setOpenGroupId}
          />
        </div>
      ))}
    </div>
  );
}

function PillarAccordion({
  pillar,
  pathname,
  puedeFn,
  openPillarId,
  onPillarOpenChange,
  openGroupId,
  onGroupOpenChange,
}: {
  pillar: AdmPillarDef;
  pathname: string;
  puedeFn: (permiso: { simple: boolean; editor: boolean }) => boolean;
  openPillarId: AdmPillarId | null;
  onPillarOpenChange: (id: AdmPillarId | null) => void;
  openGroupId: string | null;
  onGroupOpenChange: (id: string | null) => void;
}) {
  const Icon = ADM_ICON_MAP[pillar.icon];
  const pillarActive = isAdmPillarActive(pathname, pillar);

  const groups = pillar.groups
    ? filterVisibleGroups(pillar.groups, puedeFn)
    : [];
  const screens = pillar.screens
    ? filterVisibleScreens(pillar.screens, puedeFn)
    : [];

  const soleHref = getSoleNavigableHrefForPillar(pillar, puedeFn);
  if (soleHref) {
    const soleScreen = [...screens, ...groups.flatMap((g) => g.screens)].find(
      (s) => s.href === soleHref
    );
    const screenActive = soleScreen
      ? isAdmScreenActive(pathname, soleScreen)
      : isAdmPillarActive(pathname, pillar);
    return (
      <Link
        href={soleHref}
        className="sidebar-nav-module"
        data-active={screenActive ? "true" : undefined}
        aria-current={screenActive ? "page" : undefined}
      >
        <span className="flex h-5 w-5 shrink-0 items-center justify-center">
          <Icon className={iconClass} aria-hidden />
        </span>
        <span className="min-w-0 flex-1 text-left">{pillar.label}</span>
      </Link>
    );
  }

  const isOpen = openPillarId === pillar.id;

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={(open) => onPillarOpenChange(open ? pillar.id : null)}
      className="group/adm-pillar"
    >
      <CollapsibleTrigger
        className="sidebar-nav-module"
        data-ancestor={pillarActive ? "true" : undefined}
        aria-expanded={isOpen}
      >
        <span className="flex h-5 w-5 shrink-0 items-center justify-center">
          <Icon className={iconClass} aria-hidden />
        </span>
        <span className="min-w-0 flex-1 text-left">{pillar.label}</span>
        <ChevronDown
          className={cn(
            "sidebar-nav-chevron h-4 w-4 shrink-0 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
          aria-hidden
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className={TREE_PANEL}>
          <div className="flex flex-col gap-0.5">
            {screens.length > 0 ? (
              <ScreensList screens={screens} pathname={pathname} />
            ) : null}
            {groups.map((group) => (
              <div key={group.id}>
                <GroupAccordion
                  pillarId={pillar.id}
                  group={group}
                  pathname={pathname}
                  openGroupId={openGroupId}
                  onOpenChange={onGroupOpenChange}
                />
              </div>
            ))}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
