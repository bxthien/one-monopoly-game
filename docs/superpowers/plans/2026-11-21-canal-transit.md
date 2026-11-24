# Suez & Panama Canal Transit Implementation Plan

## Proposed Changes

### 1. Shared Types & Data
- `packages/shared/src/types.ts`:
  - Update `TileType`: add `'CANAL_TRANSIT'`, deprecate/keep `'FREE_ANCHOR'`.
  - Add `CANAL_TRANSITED` event to `GameEvent`:
    ```ts
    | {
        type: 'CANAL_TRANSITED';
        playerId: string;
        from: number;
        to: number;
        fee: number;
        choice: 'TRANSIT' | 'ROLL_AGAIN' | 'SKIP';
      }
    ```
  - Add `RESOLVE_CANAL_TRANSIT` action to `GameAction`:
    ```ts
    | {
        type: 'RESOLVE_CANAL_TRANSIT';
        choice: 'TRANSIT' | 'ROLL_AGAIN' | 'SKIP';
        targetTileId?: number;
      }
    ```
  - Update `GameState`: add `awaitingCanalChoice?: boolean`.
- `packages/shared/src/boardData.ts`:
  - Export `CANAL_TRANSIT_FEE = 50`.
  - Update Tile 16 in `BOARD_TILES`:
    - `code: 'CANAL'`
    - `name: 'Suez & Panama Canal Transit'`
    - `nameVi: 'Kênh Đào Hàng Hải Quốc Tế (Suez · Panama)'`
    - `type: 'CANAL_TRANSIT'`

### 2. Game Engine
- `packages/shared/src/gameEngine.ts`:
  - In `stepPlayerOnTile`:
    - When stepping on `CANAL_TRANSIT`, if player has balance $\ge 50$, set `state.awaitingCanalChoice = true`. If not, finish step phase.
  - In `applyAction`:
    - Handle `RESOLVE_CANAL_TRANSIT`.
    - If `TRANSIT`: deduct fee, emit `CANAL_TRANSITED`, move clockwise to `targetTileId` (check GO reward), trigger landing at target tile.
    - If `ROLL_AGAIN`: deduct fee, emit event, reset `hasRolled = false`.
    - If `SKIP`: clear choice, finish step phase.
  - Unit tests in `packages/shared/tests/canalTransit.test.ts`.

### 3. Client High-Speed Animation & Playback
- `packages/client/src/components/boardTravel.ts`:
  - Handle `CANAL_TRANSITED`: build rapid cruising frames (90ms per tile) from `from` to `to`.
- `packages/client/tests/canalTravel.test.ts`:
  - Test frames generated for canal transit.

### 4. UI & Localization
- `packages/client/src/i18n/translations.ts`:
  - Add `canal` translations for `en` and `vi`.
- `packages/client/src/components/TileView.tsx`:
  - Update icon and display for `CANAL_TRANSIT`.
- `packages/client/src/components/CanalDecision.tsx`:
  - Component for choosing Transit, Roll Again, or Skip.
- `packages/client/src/components/ActionControls.tsx`:
  - Render `CanalDecision` when `gameState.awaitingCanalChoice && isMyTurn`.
- `packages/client/src/App.tsx`:
  - Add log formatting for `CANAL_TRANSITED`.

## Verification
- `npm run test:shared`
- `npm test --workspace=@one-monopoly/client`
- `npm run build`
- Zero git commits or pushes.
