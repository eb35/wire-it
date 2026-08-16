# Wire-it milestones

A local-first web app for documenting real household NM (Romex) runs: labeled boxes, typed cables, notes, and later the splices inside each box. This is a documentation tool, not a circuit simulator or code checker.

## Milestone 1 — Floor-plan cable map (done)

A working dark-mode React app you can run locally.

- Palette + canvas + inspector
- Add, name, freely move, and delete panels, boxes, fixtures, and notes
- Assign a device (outlet, GFCI, single-pole, 3-way, 4-way, light)
- Draw typed cables between locations (`14/2`, `14/3`, `12/2`, `12/3`, `10/2`, `10/3`)
- Several cables can land on the same box without stacking on top of each other
- On-wire text repeats along the run: **type always**, plus an optional **user label** (`12/2  from brk 29`)
- Draggable bend points so you can route around boxes and uncross runs
- Wire color: default by gauge (14 white, 12 yellow, 10 orange), plus a small palette so nearby runs stay distinguishable
- Several **local drawings** (no account) with autosave
- Export / import JSON; export PNG with a **light or dark** background
- Sample drawing on first load

Out of scope here: box internals, accounts, a full light-mode UI, and custom colors for every object.

## Milestone 2 — Box internals

Double-click a box to zoom into how individual conductors land.

- Incoming cable stubs (black, white, red, ground, and extras)
- Connect a conductor to a device terminal or to a wire-nut group
- 3-way / 4-way travelers as first-class connections
- Data stays attached to `{ cableId, conductor }` from the floor-plan graph

## Milestone 3 — Drawings and accounts

- Many named drawings per user, saved under an account
- More than one person can keep their own library
- Milestone 1 export/import stays as the backup and share path

## Milestone 4 — Light / dark mode

- App-wide light and dark themes (milestone 1 ships **dark only**)
- PNG / image export already offers light or dark in milestone 1; the in-app chrome gets the same choice here

## Milestone 5 — Custom colors and appearance

- User-chosen colors for wires (beyond the starter palette), boxes, notes, and more
- Discuss tokens, presets, and print contrast before building

## Milestone 6 — Richer devices

- Dimmer, fan, multi-gang boxes (two or more devices in one box)
- More fixture types as needed

## Milestone 7 — House context

- Optional floor-plan / photo underlay
- Rooms, multiple pages or circuits in one drawing

## Milestone 8 — Share and deploy

- Hosted static site
- Optional “open this JSON” link
- Print-friendly view

## Milestone 9 — More tldraw-like markup

- Freehand pen, arrows that are not cables, highlighter
- Only if notes are not enough
