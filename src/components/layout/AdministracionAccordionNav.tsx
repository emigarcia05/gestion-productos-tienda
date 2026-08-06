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
import SidebarNavDepthRail from "@/components/layout/SidebarNavDepthRail";

const iconClass = "h-5 w-5 shrink-0";
const subIconClass = "h-4 w-4 shrink-0";

const PILLAR_TRIGGER =
  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold text-sidebar-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring [&>span:first-child_svg]:text-sidebar-foreground";

const ROW_CLASS =
  "flex w-full items-center gap-2 rounded-md py-2 pl-3 pr-2 text-sm font-medium text-sidebar-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring border-l-2 -ml-[2px] pl-[10px]";

function deriveOpenFromPath(
  pathname: string,
  rol: Rol
): { pillarId: AdmPillarId | null; groupId: string | null } {
  const puedeFn = (permiso: { simple: boolean; editor: boolean }) =>
    puede(rol, permiso);
  const activePillar = ADM_PILLARS.find(
    (p) => pillarHasVisibleItems(p, puedeFn) && isAdmPillarActive(pathname, p)
  );
  if (!activePillar) return { pillarId: null, groupId: null };

  if (!activePillar.groups?.length) {
    return { pillarId: activePillar.id, groupId: null };
  }
  const groups = filterVisibleGroups(activePillar.groups, puedeFn);
  const activeGroup = groups.find((g) => isAdmGroupActive(pathname, g));
  return {
    pillarId: activePillar.id,
    groupId: activeGroup ? `${activePillar.id}:${activeGroup.id}` : null,
  };
}

function ScreenLink({
  screen,
  pathname,
  depth,
}: {
  screen: AdmScreenDef;
  pathname: string;
  depth: 1 | 2;
}) {
  const Icon = ADM_ICON_MAP[screen.icon];
  const active = isAdmScreenActive(pathname, screen);
  return (
    <Link
      href={screen.href}
      className={cn(
        ROW_CLASS,
        active
          ? "border-sidebar-indicator bg-sidebar-accent [&_svg]:text-sidebar-foreground"
          : "border-transparent [&_svg]:text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground hover:[&_svg]:text-sidebar-foreground"
      )}
      aria-current={active ? "page" : undefined}
    >
      <span className="flex shrink-0 items-stretch gap-1.5">
        <Icon className={subIconClass} aria-hidden />
        <SidebarNavDepthRail depth={depth} />
      </span>
      <span className="min-w-0 truncate">{screen.label}</span>
    </Link>
  );
}

function ScreensList({
  screens,
  pathname,
  depth,
}: {
  screens: AdmScreenDef[];
  pathname: string;
  depth: 1 | 2;
}) {
  return (
    <div className="flex flex-col">
      {screens.map((screen, index) => (
        <div key={screen.id}>
          {index > 0 ? <SidebarNavDivider /> : null}
          <ScreenLink screen={screen} pathname={pathname} depth={depth} />
        </div>
      ))}
    </div>
  );
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
  const isOpen = openGroupId === groupKey;
  const groupActive = isAdmGroupActive(pathname, group);

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={(open) => onOpenChange(open ? groupKey : null)}
      className="group/adm-group"
    >
      <CollapsibleTrigger
        className={cn(
          ROW_CLASS,
          "font-semibold",
          groupActive
            ? "border-sidebar-indicator bg-sidebar-accent [&_svg]:text-sidebar-foreground"
            : "border-transparent [&_svg]:text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground hover:[&_svg]:text-sidebar-foreground"
        )}
        aria-expanded={isOpen}
      >
        <span className="flex shrink-0 items-stretch gap-1.5">
          <Icon className={subIconClass} aria-hidden />
          <SidebarNavDepthRail depth={1} />
        </span>
        <span className="min-w-0 flex-1 truncate text-left">{group.label}</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-sidebar-indicator transition-transform duration-200",
            isOpen && "rotate-180"
          )}
          aria-hidden
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-4 space-y-0 py-0.5">
          <ScreensList screens={group.screens} pathname={pathname} depth={2} />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

/**
 * Sidebar Administración: árbol de decisiones en acordeón vertical
 * (pilares → grupos → pantallas), SSOT `administracionNav.ts`.
 */
export default function AdministracionAccordionNav({ rol }: { rol: Rol }) {
  const pathname = usePathname();
  const puedeFn = (permiso: { simple: boolean; editor: boolean }) =>
    puede(rol, permiso);

  const visiblePillars = ADM_PILLARS.filter((p) =>
    pillarHasVisibleItems(p, puedeFn)
  );

  const derived = deriveOpenFromPath(pathname, rol);
  const syncKey = `${pathname}::${rol}`;
  const [pathKey, setPathKey] = useState(syncKey);
  const [openPillarId, setOpenPillarId] = useState<AdmPillarId | null>(
    () => derived.pillarId
  );
  const [openGroupId, setOpenGroupId] = useState<string | null>(
    () => derived.groupId
  );

  if (syncKey !== pathKey) {
    setPathKey(syncKey);
    setOpenPillarId(derived.pillarId);
    setOpenGroupId(derived.groupId);
  }

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
            onPillarOpenChange={setOpenPillarId}
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
  const isOpen = openPillarId === pillar.id;
  const pillarActive = isAdmPillarActive(pathname, pillar);

  const groups = pillar.groups
    ? filterVisibleGroups(pillar.groups, puedeFn)
    : [];
  const screens = pillar.screens
    ? filterVisibleScreens(pillar.screens, puedeFn)
    : [];

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={(open) => onPillarOpenChange(open ? pillar.id : null)}
      className="group/adm-pillar"
    >
      <CollapsibleTrigger
        className={cn(
          PILLAR_TRIGGER,
          pillarActive && isOpen && "bg-sidebar-accent/50",
          !isOpen && "hover:bg-sidebar-accent"
        )}
        aria-expanded={isOpen}
      >
        <span className="flex h-5 w-5 shrink-0 items-center justify-center">
          <Icon className={iconClass} aria-hidden />
        </span>
        <span className="min-w-0 flex-1 text-left">{pillar.label}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-sidebar-indicator transition-transform duration-200",
            isOpen && "rotate-180"
          )}
          aria-hidden
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-0.5 ml-2 space-y-0 py-1 pl-2">
          {groups.length > 0 ? (
            <div className="flex flex-col">
              {groups.map((group, index) => (
                <div key={group.id}>
                  {index > 0 ? <SidebarNavDivider /> : null}
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
          ) : (
            <ScreensList screens={screens} pathname={pathname} depth={1} />
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
