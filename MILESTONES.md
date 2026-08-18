# Wire-it milestones

A web app for documenting real household NM (Romex) runs: labeled boxes, typed cables, notes, and later the splices inside each box. This is a documentation tool, not a circuit simulator or code checker.

Hosted at **wire.therobhenry.com**, invite-only, behind Clerk.

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

## Milestone 1 tweaks — done enough to host

Reshape the palette and the things you drop on the board: panel that looks like a panel, gang-sized boxes, devices that go *into* boxes, draggable / reattachable cables, and an off-drawing stub. Details are in [MILESTONE-1-TWEAKS.md](./MILESTONE-1-TWEAKS.md). Leftover routing and look polish rides with editor reliability.

## Milestone 2 — Host and accounts (in progress)

Lock the app behind login and stop storing the only copy of a drawing in the browser.

- Cloudflare Worker + static SPA at `wire.therobhenry.com`
- Clerk **email/password**, **invite-only** (public sign-up off)
- Many named drawings per user, saved in Cloudflare D1, keyed by Clerk `userId`
- Debounced cloud autosave; `localStorage` is a cache, not the source of truth
- First login can upload drawings already in this browser
- Milestone 1 export/import stays as the backup and share path
- Safer local load: never replace an existing library with the sample kitchen

Out of scope here: OAuth, box internals, sharing links.

## Milestone 3 — Box internals

Double-click a box to zoom into how individual conductors land.

- Incoming cable stubs (black, white, red, ground, and extras)
- Connect a conductor to a device terminal or to a wire-nut group
- 3-way / 4-way travelers as first-class connections
- Data stays attached to `{ cableId, conductor }` from the floor-plan graph

## Milestone 4 — Editor reliability

- Remaining cable attach, landing, and route bugs
- Comprehensive undo/redo history

## Milestone 5 — OAuth

- Clerk social providers (Google and similar)
- Same Clerk `userId`; no drawing migration

## Milestone 6 — Light / dark mode

- App-wide light and dark themes (the editor still ships **dark only**)
- PNG / image export already offers light or dark; the in-app chrome gets the same choice here

## Milestone 7 — Custom colors and appearance

- User-chosen colors for wires (beyond the starter palette), boxes, notes, and more
- Discuss tokens, presets, and print contrast before building

## Milestone 8 — Richer devices

- Dimmer, fan, multi-gang boxes (two or more devices in one box)
- More fixture types as needed

## Milestone 9 — House context

- Optional floor-plan / photo underlay
- Rooms, multiple pages or circuits in one drawing

## Milestone 10 — Share and print

- Optional “open this JSON” link
- Print-friendly view

## Milestone 11 — More tldraw-like markup

- Freehand pen, arrows that are not cables, highlighter
- Only if notes are not enough
