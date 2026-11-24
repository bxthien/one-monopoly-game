# Suez & Panama Canal Transit (`CANAL_TRANSIT`) Design Spec

## 1. Overview
Replace the passive `FREE_ANCHOR` (Tile 16) with **Suez & Panama Canal Transit** (`CANAL_TRANSIT`), an active maritime shortcut and navigation hub reflecting ONE's global maritime trade lanes.

## 2. Mechanic Specifications (Option B: Pilot Fee $50M)

### Constant
- `CANAL_TRANSIT_FEE = 50` ($50M).

### Tile 16 Definition
- `id: 16`
- `code: 'CANAL'`
- `name: 'Suez & Panama Canal Transit'`
- `nameVi: 'Kênh Đào Hàng Hải Quốc Tế (Suez · Panama)'`
- `type: 'CANAL_TRANSIT'`

### Trigger on Arrival
When an active player's ship steps onto Tile 16:
- Set `gameState.awaitingCanalChoice = true`.
- Present the Canal Transit Decision Panel in the client interface.

### Player Choices (`RESOLVE_CANAL_TRANSIT`)
1. **`choice: 'TRANSIT'`**:
   - Requires player balance $\ge \$50\text{M}$.
   - Available destinations (`targetTileId`):
     - All 4 global service lines: `SERVICE_LINES = [4, 13, 20, 28]` (`VSS`, `MD2`, `FE2`, `PS3`).
     - Any port tile currently owned by this player (`gameState.properties[id]?.ownerId === player.id`).
   - Deducts $50M pilot fee from player.
   - Emits `CANAL_TRANSITED` event `{ type: 'CANAL_TRANSITED', playerId, from: 16, to: targetTileId, fee: 50 }`.
   - Moves player clockwise from Tile 16 to `targetTileId`.
   - If clockwise transit passes Tile 0 (i.e. `targetTileId < 16`), player collects Go Reward ($200M) and emits `PASSED_GO`.
   - Clears `gameState.awaitingCanalChoice`.
   - Invokes `stepPlayerOnTile(state, events, player, targetTileId)` to trigger standard landing effects at destination.

2. **`choice: 'ROLL_AGAIN'`**:
   - Requires player balance $\ge \$50\text{M}$.
   - Deducts $50M pilot fee from player.
   - Sets `gameState.hasRolled = false`, clears `gameState.awaitingCanalChoice`.
   - Emits `CANAL_TRANSITED` with `to: 16`.
   - Allows player to roll dice again immediately from Tile 16.

3. **`choice: 'SKIP'`**:
   - Cost: $0M.
   - Clears `gameState.awaitingCanalChoice`.
   - Calls `finishStepPhase(state)` (player can end turn normally).

## 3. High-Speed Gliding Animation (`boardTravel.ts`)
- When `CANAL_TRANSITED` event is received with `from !== to`:
  - Calculate clockwise path from `from` (16) to `to`.
  - For each step, create a `TravelFrame` with `duration: 90` (ms) and `gliding: true` (2.5x faster than standard 240ms pace).
  - Calculate headings along the corners so the ship steers cleanly around the bends.
  - Gives the satisfying visual experience of a container vessel cruising at high transit speed through the canal network!

## 4. UI / UX Design
- Tile 16 on board displays:
  - Icon: `Ship` / nautical canal icon.
  - Code: `CANAL`.
  - Label: `Suez · Panama`.
- `CanalDecision`:
  - Interactive decision panel with destination list.
  - Hovering over a destination highlights it on the board with `highlightedTileId`.
  - Buttons for Fast Transit, Roll Again, and Skip.
- Localized into both English (`en` default) and Vietnamese (`vi`).
