import React from 'react';
import { Player, VesselToken } from '@one-monopoly/shared';
import { Construction, Container, Fuel, Sailboat, Ship, Snowflake, TrainFront, Truck } from 'lucide-react';
import { TOKEN_CONFIG } from './TokenBadge.js';
import { TokenModel } from './TokenModel.js';

interface Props {
  player: Player;
  is3D: boolean;
  stackIndex: number;
  stackSize: number;
}

const counterIcons: Record<VesselToken, typeof Ship> = {
  ONE_APUS: Ship,
  ONE_MAGENTA: Container,
  GANTRY_CRANE: Construction,
  CONTAINER_TRUCK: Truck,
  FREIGHT_TRAIN: TrainFront,
  REEFER_TRUCK: Snowflake,
  PILOT_BOAT: Sailboat,
  BUNKER_BARGE: Fuel,
};

export const Pawn3D: React.FC<Props> = ({ player, is3D, stackIndex, stackSize }) => {
  const cfg = TOKEN_CONFIG[player.token] || TOKEN_CONFIG.ONE_APUS;
  const label = `${player.name} (${cfg.label})`;
  const columns = Math.min(stackSize, 2);
  const row = Math.floor(stackIndex / columns);
  const rowLength = Math.min(columns, stackSize - row * columns);
  const x = stackIndex % columns - (rowLength - 1) / 2;
  const y = row - (Math.ceil(stackSize / columns) - 1) / 2;
  const Icon = counterIcons[player.token] || Ship;

  return (
    <span
      className={is3D ? 'chart-model-pawn' : 'chart-counter'}
      data-grouped={stackSize > 1}
      title={label}
      role="img"
      aria-label={label}
      style={{
        '--vessel-color': cfg.color,
        '--stack-x': `${x * 96}%`,
        '--stack-y': `${y * (is3D ? 72 : 96)}%`,
      } as React.CSSProperties}
    >
      {is3D ? <TokenModel token={player.token} /> : <Icon strokeWidth={2.2} aria-hidden="true" />}
    </span>
  );
};
