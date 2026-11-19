import React, { useLayoutEffect, useRef, useState } from 'react';
import { Player, VesselToken } from '@one-monopoly/shared';
import { Construction, Container, Fuel, Sailboat, Ship, Snowflake, TrainFront, Truck } from 'lucide-react';
import { TOKEN_CONFIG } from './TokenBadge.js';
import { TokenModel } from './TokenModel.js';

interface Props {
  player: Player;
  is3D: boolean;
  stackIndex: number;
  stackSize: number;
  heading: number;
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

const compassPoints: Record<number, string> = { 0: 'đông', 90: 'nam', 180: 'tây', 270: 'bắc' };

export const Pawn3D: React.FC<Props> = ({ player, is3D, stackIndex, stackSize, heading }) => {
  const pawnRef = useRef<HTMLSpanElement>(null);
  const [camera, setCamera] = useState({ yaw: 0, tilt: 0 });

  useLayoutEffect(() => {
    if (!is3D) return;
    const pawn = pawnRef.current!;
    const viewport = pawn.closest('.board-viewport');
    const syncCamera = () => {
      const style = getComputedStyle(pawn);
      const yaw = parseFloat(style.getPropertyValue('--board-yaw')) || 0;
      const tilt = parseFloat(style.getPropertyValue('--board-tilt')) || 0;
      setCamera(previous => previous.yaw === yaw && previous.tilt === tilt ? previous : { yaw, tilt });
    };
    syncCamera();
    const observer = new ResizeObserver(syncCamera);
    observer.observe(viewport ?? pawn);
    return () => observer.disconnect();
  }, [is3D]);

  const cfg = TOKEN_CONFIG[player.token] || TOKEN_CONFIG.ONE_APUS;
  const direction = compassPoints[heading] ?? `${heading}°`;
  const label = `${player.name} (${cfg.label}), hướng ${direction}`;
  const columns = Math.min(stackSize, 2);
  const row = Math.floor(stackIndex / columns);
  const rowLength = Math.min(columns, stackSize - row * columns);
  const x = stackIndex % columns - (rowLength - 1) / 2;
  const y = row - (Math.ceil(stackSize / columns) - 1) / 2;
  const Icon = counterIcons[player.token] || Ship;
  const azimuth = heading + (is3D ? camera.yaw : 0);
  const radians = Math.PI / 180;
  // The tilted board compresses its vertical screen axis. Keep the fallback arrow on that path.
  const screenBearing = is3D
    ? Math.atan2(Math.sin(azimuth * radians) * Math.cos(camera.tilt * radians), Math.cos(azimuth * radians)) / radians
    : heading;
  // CSS interpolates rotation matrices along the short arc, including north to east.
  const cos = Math.cos(screenBearing * radians);
  const sin = Math.sin(screenBearing * radians);

  return (
    <span
      ref={pawnRef}
      className={is3D ? 'chart-model-pawn' : 'chart-counter'}
      data-grouped={stackSize > 1}
      data-heading={heading}
      data-face-left={Math.cos(azimuth * radians) < -0.01 ? '' : undefined}
      title={label}
      role="img"
      aria-label={label}
      style={{
        '--vessel-color': cfg.color,
        '--stack-x': `${x * 96}%`,
        '--stack-y': `${y * (is3D ? 72 : 96)}%`,
      } as React.CSSProperties}
    >
      {is3D
        ? <TokenModel token={player.token} cameraOrbit={`${azimuth}deg ${camera.tilt}deg auto`} />
        : <Icon strokeWidth={2.2} aria-hidden="true" />}
      <span className="chart-pawn-heading" aria-hidden="true"
        style={{ transform: `matrix(${cos}, ${sin}, ${-sin}, ${cos}, 0, 0)` }} />
    </span>
  );
};
