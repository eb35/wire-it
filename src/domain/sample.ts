import { emptyProject } from "./project";
import type { Project } from "./types";

export function sampleKitchen(): Project {
  const project = emptyProject("Kitchen lighting");
  return {
    ...project,
    locations: [
      {
        id: "loc_panel",
        kind: "panel",
        label: "Main panel",
        code: "P",
        device: "none",
        position: { x: 40, y: 200 },
      },
      {
        id: "loc_island",
        kind: "box",
        label: "Kitchen island",
        code: "A",
        device: "duplex-outlet",
        position: { x: 460, y: 40 },
      },
      {
        id: "loc_hall",
        kind: "box",
        label: "Hall 3-way",
        code: "B",
        device: "three-way",
        position: { x: 200, y: 360 },
      },
      {
        id: "loc_porch",
        kind: "fixture",
        label: "Porch light",
        code: "C",
        device: "light",
        position: { x: 560, y: 360 },
      },
    ],
    cables: [
      {
        id: "cab_feed",
        type: "12/2",
        source: "loc_panel",
        target: "loc_island",
        sourceHandle: "s-r1",
        targetHandle: "t-l1",
        sourcePort: "1",
        targetPort: "1",
        label: "from brk 29",
        color: "sheath",
        waypoints: [
          { x: 280, y: 240 },
          { x: 280, y: 80 },
        ],
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
        waypoints: [
          { x: 400, y: 160 },
          { x: 260, y: 160 },
        ],
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
        waypoints: [
          { x: 394, y: 400 },
          { x: 500, y: 400 },
        ],
      },
    ],
    notes: [
      {
        id: "note_stairs",
        text: "Other 3-way is at the stairs. Red in the 12/3 is the traveler — not drawn yet.",
        position: { x: 500, y: 180 },
      },
    ],
  };
}
