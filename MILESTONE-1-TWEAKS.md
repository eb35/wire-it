# Milestone 1 tweaks

Notes and a working plan for the first round of changes after the floor-plan editor. Milestone 1 stays the base: a local documentation sketch, not a simulator.

This file is the source of truth for this branch. Open questions are called out in place. Defaults below are what the code will use until you say otherwise.

## What we have now

The left palette has four **Locations** (Panel, Box, Fixture, Note) and a **Cables** strip you click, then connect node-to-node.

On the canvas, Panel / Box / Off-drawing show a one-line header inside the body (box code, then name; no kind badge). Boxes keep a 2×N device area under that strip. Cables auto-route with rounded 90° bends, one-line end labels, and type+note text along the run.

## Palette direction

Three groups, not two:

1. **Locations** — things that live on the drawing
2. **Devices** — things you drop *into* a location
3. **Cables** — typed NM you drop onto the board (and can later reattach)

### Locations

| Item | Keep? | Direction |
| --- | --- | --- |
| **Panel** | Yes, restyle | Taller than wide. Looks like a load center, not a card. Each landing is a **breaker number** plus an optional text label. |
| **Box** | Yes, restyle | Real device-box form factor, chosen when you drag it in. Capacity is how many devices it *can* hold, not how many it uses. |
| **Note** | Yes | No change until you have a stronger opinion. |
| **Fixture** | Remove from here | A fixture is a device you put in a box (ceiling box, porch box, etc.), not a third kind of location. |
| **Off-drawing** | New | Stand-in for a box that lives on another drawing. Must look different from a normal box. |

Box sizes (height × width, in “gangs”):

- 1-device box → **2 × 1** (portrait)
- 2-device box → **2 × 2** (square)
- 3-device box → **2 × 3** (wide)

That is the common limit for now. A 2-gang box can still be a junction (both slots empty) or hold a single device and leave the other blank.

Palette names used in this pass: **1-gang**, **2-gang**, **3-gang**. Say if you want “1-device box” instead.

### Devices (new section)

Drag these onto a box or panel. They do not sit on the canvas by themselves.

First set:

- 15A duplex outlet
- 20A duplex outlet
- Single receptacle
- Single-pole switch
- 3-way switch
- 4-way switch
- Light (the old Fixture)
- Breaker (for the panel)

**Kept for now:** 15A and 20A GFCI. They were already in the app and are common. Easy to drop if you do not want them.

How a device looks *inside* the box (icons vs. full labels, mud-ring, etc.) is **later**. This pass: empty slots are visible, a placed device shows a simple symbol plus a short name, and the box code / name sit in a thin header strip at the top *inside* the box (code first, name truncated to one line; hover shows the full name). The 2×N device area stays below that strip.

### Cables

Click-to-arm, then connect, is easy to miss and is not how the locations work. Make cable types **draggable** like everything else:

- Drag `12/2` (etc.) onto or near a box / panel → snap to that location and start the run from there.
- Drop on empty canvas → still arm that cable type so you can finish by clicking or dragging to a second location (same as today’s connect mode).
- **Reattach:** drag an existing run’s end from one location to another. No more delete-and-recreate.

The old “click the type, then click two boxes” path can stay as a fallback.

Auto-route (empty waypoints) takes the shortest orthogonal path with the fewest bends, rounded corners, and a clearance around other boxes. Multiple runs between the same boxes travel in parallel. Landings can sit anywhere on a box edge (the old 3-per-side dots were making routes zigzag). Hover a run to drag a bend; drag a landing along the border; drop a run on empty canvas for a one-ended (loose) wire.

On-wire text is `12/2` plus the inspector Note, repeated with space between. End labels are one line (`A2 to H2`) and sit beside the path.

## Off-drawing location

A box on *this* drawing that really lives on another page. Use it when a run leaves the sheet.

This pass:

- Dashed / ghosted body, distinct badge, same connection handles as a box so a cable can land.
- Optional text field for “where this really is” (drawing name, room, etc.). Not a live link between local drawings yet.

## Data model (so old drawings still open)

Bump saved JSON from version **1** to **3**. `parseProject` still reads v1 and v2 and fills in the new fields.

- `fixture` locations become **1-gang boxes** with a light in the slot.
- The old single `device` field becomes **slots** (one per gang). `none` / `duplex-outlet` / `gfci-outlet` map to `empty` / `duplex-15` / `gfci-15`.
- New boxes default to **empty slots** (junction until you drop a device).
- Panels get a list of numbered **breaker spaces** (default **12**, two columns, US-style odd left / even right). Connecting to a space uses that breaker number as the port.
- Off-drawing is a new `kind`.
- Cables may have an empty `target` and a `looseEnd` point (one-ended run).

## Implementation plan

Work in this order so each step is usable on its own.

1. **Model + migration** — types, parse/migrate, tests, sample drawing.
2. **Palette** — Locations / Devices / Cables; gang choices; Fixture gone from Locations.
3. **Looks** — panel body, 2×N boxes, off-drawing ghost.
4. **Drop devices** — fill the next empty slot, or a specific slot; inspector can still edit.
5. **Cables** — drag-to-place + snap; reconnect an existing end to another location.
6. **Docs** — keep this file and the README/plan pointers honest as behavior lands.

### Defaults I am using (change any of these)

- Palette box names: 1-gang / 2-gang / 3-gang
- New box: all slots empty
- Panel: 12 spaces, two columns, odd left / even right
- GFCI 15 / 20 stay in Devices
- Off-drawing: visual stub + optional caption, no cross-drawing link
- Device art on the box: simple symbol for now
- You can change gang count in the inspector if the extra slots are empty
- Cable drop on empty canvas still arms that type

## Open questions

Answer these whenever. I will keep moving on the defaults above.

1. **Panel size** — 12 spaces enough to start, or do you want 20 / 30 / 40 (or “add a space when I land a cable”)?
2. **Gang naming** — 1-gang OK, or “1-device box”?
3. **Off-drawing** — caption only, or pick another local drawing by name later?
4. **GFCI** — keep in the device list?
5. **Empty-canvas cable drop** — arm the type (default) or refuse unless a box is nearby?
6. **Resize after place** — inspector gang/space changes OK?
7. **Breaker labels** — edit on the panel face, only in the inspector, or both?

## Progress

- [x] This file and the feature branch
- [x] Model + v1 → v2 migration
- [x] Palette restructure
- [x] Panel / box / off-drawing looks (first pass; device art is still simple)
- [x] Devices drop into slots
- [x] Cable drag, snap, and reconnect
- [x] README / PLAN / MILESTONES pointers
- [x] In-box header: code + name, no kind badge
- [x] Cable routing: rounded 90° auto-route, on-wire notes, loose ends

Started on `feat/milestone-1-tweaks`. Existing milestone 1 drawings should keep opening after the version bump.
