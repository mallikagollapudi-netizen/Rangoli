# Rangoli Studio — PRD

## Original problem statement
Rangoli app. Home asks: Free Art or Dot based. Free art = paint with brush, multiple colours, colour palette + colour wheel. Dot based = X x Y grid, optionally rotated 45°, or triangle layout (1 dot on top, then 2, then 4 with middle 2 aligned, etc.), draw lines with finger.
Later requests: completely offline (no server, saving on device); fix "can't draw / dots not showing"; let user choose to save on device or delete.

## User choices
Palette + custom colour wheel · Save to gallery with name (reloadable) · Festive Indian theme · All 3 grid types.

## Architecture
- Expo Router (stack): `/` home, `/dot-setup` (modal), `/canvas` (free/dot, ?id to reopen), `/gallery`
- Fully offline: artworks stored as vector JSON on device (`src/api.ts` → `@/src/utils/storage`, key `rangoli.artworks.v1`). Backend not used.
- Drawing: react-native-svg + RN touch responder (pageX/pageY on a full-screen canvas). Fonts and images bundled locally.

## Implemented (Oct 2026)
- Home mode cards, recent courtyard list
- Dot setup: Square / Rotated 45° / Triangle, rows & cols steppers (1–30), live preview
- Canvas: brush, join-dots snapping, 16 festive swatches + colour wheel, brush sizes, floor colours, undo, clear
- Save on device with name, exit sheet (Save on device / Delete / Keep drawing), gallery with reopen/edit/delete

## Backlog
- P1: Symmetry/mirror drawing (4/8-way) for rangoli patterns
- P1: Export/share as PNG image
- P2: Eraser tool, curved lines between dots, fill areas
