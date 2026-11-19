// Bearings are measured on the printed chart, clockwise from east.
const watches = [
  { phase: 'dawn',     body: 'sun',  label: 'Bình minh', bearing: -20,  length: 10 },
  { phase: 'day',      body: 'sun',  label: 'Giữa trưa', bearing: -90,  length: 3 },
  { phase: 'dusk',     body: 'sun',  label: 'Hoàng hôn', bearing: -160, length: 10 },
  { phase: 'moonrise', body: 'moon', label: 'Trăng mọc', bearing: -24,  length: 7 },
  { phase: 'midnight', body: 'moon', label: 'Nửa đêm',   bearing: -90,  length: 2.5 },
  { phase: 'moonset',  body: 'moon', label: 'Trăng lặn', bearing: -156, length: 7 },
] as const;

interface VoyageTime {
  turnCount: number;
  activePlayerIndex: number;
  playerCount: number;
  stormActive?: boolean;
}

export type BoardLighting = ReturnType<typeof getBoardLighting>;

export function getBoardLighting({ turnCount, activePlayerIndex, playerCount, stormActive = false }: VoyageTime) {
  // turnCount is the round number. Using the original seats keeps observers and reconnects in sync.
  const turn = (turnCount - 1) * playerCount + activePlayerIndex;
  const watch = watches[turn % watches.length];
  const radians = watch.bearing * Math.PI / 180;
  const sourceX = Math.cos(radians);
  const sourceY = Math.sin(radians);
  const moonlit = watch.body === 'moon';
  const length = watch.length * (stormActive ? .28 : 1);
  return {
    phase: watch.phase,
    body: watch.body,
    label: watch.label,
    weather: stormActive ? 'storm' as const : 'clear' as const,
    sourceX, sourceY,
    shadowX: -sourceX * length,
    shadowY: -sourceY * length,
    shadowBlur: stormActive ? 6 : moonlit ? 3.5 : 2,
    shadowOpacity: (moonlit ? .32 : .44) * (stormActive ? .42 : 1),
    exposure: (moonlit ? .85 : 1) * (stormActive ? .91 : 1),
  };
}
