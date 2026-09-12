import { defaultBreakers, emptySlots } from "./location";
import { emptyProject } from "./project";
import type { Project } from "./types";

export function sampleKitchen(): Project {
  const project = emptyProject("Kitchen lighting");
  const breakers = defaultBreakers(12);
  breakers[4] = { number: 5, label: "Kitchen island" };

  return {
    ...project,
    locations: [
      {
        id: "loc_panel",
        kind: "panel",
        label: "Main panel",
        code: "P",
        position: { x: 40, y: 80 },
        capacity: 1,
        slots: emptySlots(1),
        spaces: 12,
        breakers,
        externalRef: "",
      },
      {
        id: "loc_island",
        kind: "box",
        label: "Kitchen island",
        code: "A",
        position: { x: 460, y: 40 },
        capacity: 2,
        slots: [{ device: "duplex-15" }, { device: "empty" }],
        spaces: 12,
        breakers: defaultBreakers(12),
        externalRef: "",
      },
      {
        id: "loc_hall",
        kind: "box",
        label: "Hall 3-way",
        code: "B",
        position: { x: 200, y: 420 },
        capacity: 1,
        slots: [{ device: "three-way" }],
        spaces: 12,
        breakers: defaultBreakers(12),
        externalRef: "",
      },
      {
        id: "loc_porch",
        kind: "box",
        label: "Porch light",
        code: "C",
        position: { x: 560, y: 420 },
        capacity: 1,
        slots: [{ device: "light" }],
        spaces: 12,
        breakers: defaultBreakers(12),
        externalRef: "",
      },
    ],
    cables: [
      {
        id: "cab_feed",
        type: "12/2",
        source: "loc_panel",
        target: "loc_island",
        sourceHandle: "s-brk-5",
        targetHandle: "t-l1",
        sourcePort: "5",
        targetPort: "1",
        label: "from brk 5",
        color: "sheath",
        waypoints: [],
      },
      {
        id: "cab_onward",
        type: "12/2",
        source: "loc_island",
        target: "loc_hall",
        sourceHandle: "s-b0",
        targetHandle: "t-t1",
        sourcePort: "2",
        targetPort: "1",
        label: "",
        color: "blue",
        waypoints: [],
      },
      {
        id: "cab_travelers",
        type: "12/3",
        source: "loc_hall",
        target: "loc_porch",
        sourceHandle: "s-r1",
        targetHandle: "t-l1",
        sourcePort: "2",
        targetPort: "1",
        label: "",
        color: "sheath",
        waypoints: [],
      },
    ],
    notes: [
      {
        id: "note_stairs",
        text: "Other 3-way is at the stairs. Red in the 12/3 is the traveler — not drawn yet.",
        position: { x: 500, y: 220 },
      },
    ],
    nuts: [],
    splices: [],
  };
}
