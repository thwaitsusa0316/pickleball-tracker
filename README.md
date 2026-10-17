# Pickleball Tracker

Minimal doubles pickleball tracker for a fixed group of five players — **Liz, Amanda, Boyo, Steve, and Maggie** — who rotate partners.

## Features

- **Log a game** — play date, two teams of two (dropdowns), and scores, with validation
- **Games list** — newest first; multiple games per day supported
- **Stats by pair** — wins / losses / games played for each unordered partner pair (full names, alphabetically normalized)

Games persist in browser `localStorage`. Sample games from 2026-10-17 are seeded on first load.

## Run locally

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173`).

## Build

```bash
npm run build
npm run preview
```
