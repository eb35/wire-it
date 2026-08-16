# Wire-it

Document real household Romex runs: labeled boxes, typed cables you can bend and color, and notes on a canvas. Dark mode for now. This is a documentation sketch, not a wiring or code guide.

**What is already built:** milestone 1 — a local React editor with multiple drawings, export/import, and PNG export in light or dark. **What is in progress:** [milestone 1 tweaks](./MILESTONE-1-TWEAKS.md) (panel/box looks, devices in boxes, draggable cables). **What comes next:** box internals, accounts, in-app light mode, and more. Details are in [PLAN.md](./PLAN.md) and [MILESTONES.md](./MILESTONES.md).

## Getting started

You need [Node.js](https://nodejs.org/) **20 or newer** (the LTS installer is fine). You do not need to know React to run this.

1. Open a terminal.
2. Go to this project folder:

   ```bash
   cd /path/to/wire-it
   ```

3. Install dependencies (first time, or after a pull):

   ```bash
   npm install
   ```

4. Start the app:

   ```bash
   npm run dev
   ```

5. Vite prints a local URL, usually **http://localhost:5173/**. Open that in your browser.

Stop the server with `Ctrl+C` in the terminal.

Drawings autosave in this browser. Use **Export → JSON** if you want a file backup.

## How to use it

- **Palette (left):** drag a panel, box, fixture, or note onto the canvas. Click a cable type, then drag from a node on one box to a node on another (or click two boxes).
- **Canvas:** drag boxes anywhere. Each box has a short code (A, B, …). Select a cable and drag the round pressure points — runs stay at 90 degrees. End labels read like `A1` / `To B2`.
- **Inspector (right):** rename a box, set its code and device, set each end’s port number, and change cable type or color.
- **Toolbar:** name the drawing, switch or create drawings, export JSON or a PNG (light or dark), import a JSON drawing.

The first launch loads a sample **Kitchen lighting** drawing so the board is not empty.

## Scripts

| Command | What it does |
| --- | --- |
| `npm install` | Install dependencies |
| `npm run dev` | Start the local app |
| `npm run build` | Production build |
| `npm run preview` | Serve the production build |
| `npm test` | Domain unit tests |
