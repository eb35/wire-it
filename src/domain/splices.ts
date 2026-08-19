import { CABLE_CATALOG } from "./catalog";
import { createId } from "./id";
import { terminalsFor } from "./terminals";
import type {
  Cable,
  ConductorColor,
  LandingTarget,
  Location,
  Nut,
  Project,
  Splice,
} from "./types";

export type CableEndAtBox = {
  cable: Cable;
  end: "source" | "target";
  localPort: string;
  otherId: string;
  otherPort: string;
};

export function cablesAtLocation(project: Pick<Project, "cables">, locationId: string): CableEndAtBox[] {
  const ends: CableEndAtBox[] = [];
  for (const cable of project.cables) {
    if (cable.source === locationId) {
      ends.push({
        cable,
        end: "source",
        localPort: cable.sourcePort,
        otherId: cable.target,
        otherPort: cable.targetPort,
      });
    }
    if (cable.target === locationId) {
      ends.push({
        cable,
        end: "target",
        localPort: cable.targetPort,
        otherId: cable.source,
        otherPort: cable.sourcePort,
      });
    }
  }
  return ends;
}

export function conductorsOf(cable: Pick<Cable, "type">): ConductorColor[] {
  return CABLE_CATALOG[cable.type].conductors;
}

export type ConductorEnd = {
  cableId: string;
  conductor: ConductorColor;
  cable: Cable;
  localPort: string;
  otherId: string;
  otherPort: string;
  splice: Splice | undefined;
};

export function conductorEndsAt(
  project: Pick<Project, "cables" | "splices">,
  locationId: string,
): ConductorEnd[] {
  const ends: ConductorEnd[] = [];
  for (const landing of cablesAtLocation(project, locationId)) {
    for (const conductor of conductorsOf(landing.cable)) {
      ends.push({
        cableId: landing.cable.id,
        conductor,
        cable: landing.cable,
        localPort: landing.localPort,
        otherId: landing.otherId,
        otherPort: landing.otherPort,
        splice: project.splices.find(
          (item) =>
            item.locationId === locationId &&
            item.cableId === landing.cable.id &&
            item.conductor === conductor,
        ),
      });
    }
  }
  return ends;
}

export function occupantOf(
  splices: Splice[],
  locationId: string,
  target: Extract<LandingTarget, { kind: "terminal" }>,
): Splice | undefined {
  return splices.find(
    (item) =>
      item.locationId === locationId &&
      item.target.kind === "terminal" &&
      item.target.slotIndex === target.slotIndex &&
      item.target.terminalId === target.terminalId,
  );
}

function sameEnd(item: Splice, locationId: string, cableId: string, conductor: ConductorColor): boolean {
  return item.locationId === locationId && item.cableId === cableId && item.conductor === conductor;
}

export function suggestNutLabel(
  nuts: Nut[],
  locationId: string,
  conductor: ConductorColor,
): string {
  const used = new Set(nuts.filter((item) => item.locationId === locationId).map((item) => item.label));
  const preferred = conductor === "white" ? "N" : conductor === "bare" ? "G" : "H";
  if (!used.has(preferred)) return preferred;
  for (const label of ["N", "G", "H", "2", "3", "4", "5", "6", "7", "8", "9"]) {
    if (!used.has(label)) return label;
  }
  return String(used.size + 1);
}

export function landConductor(
  project: Project,
  locationId: string,
  cableId: string,
  conductor: ConductorColor,
  target: LandingTarget | null,
): Project {
  let splices = project.splices.filter((item) => !sameEnd(item, locationId, cableId, conductor));

  if (target?.kind === "terminal") {
    splices = splices.filter(
      (item) =>
        !(
          item.locationId === locationId &&
          item.target.kind === "terminal" &&
          item.target.slotIndex === target.slotIndex &&
          item.target.terminalId === target.terminalId
        ),
    );
    splices = [...splices, { locationId, cableId, conductor, target }];
  } else if (target?.kind === "nut") {
    splices = [...splices, { locationId, cableId, conductor, target }];
  }

  return pruneInternals({ ...project, splices });
}

export function addNutAndLand(
  project: Project,
  locationId: string,
  cableId: string,
  conductor: ConductorColor,
): Project {
  const nut: Nut = {
    id: createId("nut"),
    locationId,
    label: suggestNutLabel(project.nuts, locationId, conductor),
  };
  return landConductor(
    { ...project, nuts: [...project.nuts, nut] },
    locationId,
    cableId,
    conductor,
    { kind: "nut", nutId: nut.id },
  );
}

export function pruneInternals(project: Project): Project {
  const locationIds = new Set(project.locations.map((item) => item.id));
  const cables = new Map(project.cables.map((item) => [item.id, item]));
  const locations = new Map(project.locations.map((item) => [item.id, item]));

  const nuts = (project.nuts ?? []).filter((item) => locationIds.has(item.locationId));
  const nutIds = new Set(nuts.map((item) => item.id));

  const splices = (project.splices ?? []).filter((item) => {
    if (!locationIds.has(item.locationId)) return false;
    const cable = cables.get(item.cableId);
    if (!cable) return false;
    if (cable.source !== item.locationId && cable.target !== item.locationId) return false;
    if (!conductorsOf(cable).includes(item.conductor)) return false;
    if (item.target.kind === "nut") return nutIds.has(item.target.nutId);
    const target = item.target;
    const location = locations.get(item.locationId);
    if (!location || location.kind !== "box") return false;
    const slot = location.slots[target.slotIndex];
    if (!slot) return false;
    return terminalsFor(slot.device).some((terminal) => terminal.id === target.terminalId);
  });

  const usedNuts = new Set(
    splices.flatMap((item) => (item.target.kind === "nut" ? [item.target.nutId] : [])),
  );

  return {
    ...project,
    nuts: nuts.filter((item) => usedNuts.has(item.id)),
    splices,
  };
}

export function spliceRows(
  project: Project,
  location: Location,
): { conductor: string; lands: string }[] {
  const codeOf = (id: string) => project.locations.find((item) => item.id === id)?.code ?? "?";
  return conductorEndsAt(project, location.id).map((end) => {
    const dest = end.otherId
      ? `${end.cable.type} to ${codeOf(end.otherId)}${end.otherPort}`
      : `${end.cable.type} loose`;
    const conductor = `${location.code}${end.localPort} ${end.conductor}  (${dest})`;
    if (!end.splice) return { conductor, lands: "unassigned" };
    const target = end.splice.target;
    if (target.kind === "nut") {
      const nut = project.nuts.find((item) => item.id === target.nutId);
      return { conductor, lands: `Nut ${nut?.label ?? "?"}` };
    }
    const slot = location.slots[target.slotIndex];
    const terminal = slot ? terminalsFor(slot.device).find((item) => item.id === target.terminalId) : undefined;
    const gang = location.slots.length > 1 ? `gang ${target.slotIndex + 1} ` : "";
    return { conductor, lands: `${gang}${terminal?.label ?? target.terminalId}` };
  });
}
