import React, { useEffect, useId, useState } from 'react';
import {
  FREIGHT_RIVALS, FREIGHT_RIVAL_STYLES, LOGISTICS_DELIVERY_TARGET, LOGISTICS_ROUND_LIMIT, VESSEL_TOKENS,
  type FreightRivalStyle, type VesselToken,
} from '@one-monopoly/shared';
import { ArrowRight, Check, Compass, Copy, KeyRound, Plus, Users } from 'lucide-react';
import { RoomState } from '../hooks/useSocket.js';
import { TOKEN_CONFIG } from './TokenBadge.js';
import { useIdleMotion } from '../hooks/useIdleMotion.js';
import { TokenModel, tokenPosterUrl } from './TokenModel.js';
import { useI18n } from '../i18n/I18nContext.js';
import { LanguageToggle } from './LanguageToggle.js';
import './chart-lobby.css';
import './lobby-rival-picker.css';

interface Props {
  room: RoomState | null;
  myPlayerId: string | null;
  onCreateRoom: (name: string, token: VesselToken) => void;
  onJoinRoom: (roomId: string, name: string, token: VesselToken) => void;
  onToggleReady: (isReady: boolean) => void;
  onStartGame: (mode: 'classic' | 'logistics', style?: FreightRivalStyle) => void;
  isStarting?: boolean;
  onLeaveRoom: () => void;
}

function HostStart({ room, onStartGame, isStarting }: Pick<Props, 'onStartGame' | 'isStarting'> & { room: RoomState }) {
  const { t, lang } = useI18n();
  const [gameMode, setGameMode] = useState<'classic' | 'logistics'>('classic');
  const [selected, setSelected] = useState<FreightRivalStyle>('standard');
  const groupId = useId();
  const solo = room.players.length === 1;

  return (
    <>
      <div className="mb-3">
        <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
          {lang === 'vi' ? 'Chế độ chơi' : 'Game Mode'}
        </span>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className={`py-2 px-3 rounded-lg border text-xs font-bold text-left transition-all ${
              gameMode === 'classic'
                ? 'border-[#E1007A] bg-[#E1007A]/10 text-[#E1007A] shadow-xs'
                : 'border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
            onClick={() => setGameMode('classic')}
          >
            <span className="text-sm block">🎲 {lang === 'vi' ? 'Cờ Tỷ Phú Cổ Điển' : 'Classic Monopoly'}</span>
            <span className="text-[10px] font-normal opacity-80 block mt-0.5">
              {lang === 'vi' ? 'Thâu tóm cảng, kênh đào, nhiệm vụ' : 'Port buyout, canal transit, missions'}
            </span>
          </button>

          <button
            type="button"
            className={`py-2 px-3 rounded-lg border text-xs font-bold text-left transition-all ${
              gameMode === 'logistics'
                ? 'border-[#E1007A] bg-[#E1007A]/10 text-[#E1007A] shadow-xs'
                : 'border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
            onClick={() => setGameMode('logistics')}
          >
            <span className="text-sm block">🚢 {lang === 'vi' ? 'Vận Tải Toàn Cầu' : 'Global Logistics'}</span>
            <span className="text-[10px] font-normal opacity-80 block mt-0.5">
              {lang === 'vi' ? 'Vận chuyển container, tuyến gom feeder' : 'Container cargo, feeder routes'}
            </span>
          </button>
        </div>
      </div>

      {gameMode === 'logistics' && solo && !room.isGameStarted && (
        <fieldset className="lobby-rival-picker" data-rival-picker disabled={isStarting}>
          <legend>{lang === 'vi' ? 'Chọn đối thủ máy' : 'Select Rival Captain'}</legend>
          <div className="lobby-rival-options">
            {FREIGHT_RIVAL_STYLES.map(style => {
              const rival = FREIGHT_RIVALS[style];
              const id = `${groupId}-${style}`;
              return (
                <label key={style} className="lobby-rival-option">
                  <input
                    type="radio"
                    name={groupId}
                    value={style}
                    data-rival-option={style}
                    checked={selected === style}
                    aria-labelledby={`${id}-name`}
                    aria-describedby={`${id}-description`}
                    onChange={() => setSelected(style)}
                  />
                  <span className="lobby-rival-card">
                    <span className="lobby-rival-emoji" aria-hidden="true">{rival.emoji}</span>
                    <strong id={`${id}-name`} title={rival.name}>{rival.shortName}</strong>
                    <span className="lobby-rival-description" id={`${id}-description`}>{rival.description}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      <button
        className="chart-lobby-primary"
        type="button"
        data-lobby-start
        disabled={!room.players.length || room.isGameStarted || isStarting}
        onClick={() => (gameMode === 'logistics' && solo) ? onStartGame('logistics', selected) : onStartGame(gameMode)}
      >
        {isStarting
          ? (lang === 'vi' ? 'Đang mở ván…' : 'Starting voyage...')
          : solo
          ? (lang === 'vi' ? `Bắt đầu ${gameMode === 'classic' ? 'Cổ Điển' : 'Logistics'} (cùng bot)` : `Start ${gameMode === 'classic' ? 'Classic' : 'Logistics'} (with bot)`)
          : (lang === 'vi' ? `Bắt đầu ván ${gameMode === 'classic' ? 'Cổ Điển' : 'Logistics'}` : `Start ${gameMode === 'classic' ? 'Classic' : 'Logistics'} Voyage`)}
        <ArrowRight />
      </button>
    </>
  );
}

export const Lobby: React.FC<Props> = ({
  room, myPlayerId, onCreateRoom, onJoinRoom, onToggleReady, onStartGame, isStarting = false, onLeaveRoom,
}) => {
  const { lang, t } = useI18n();
  const idleMotion = useIdleMotion();
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [playerName, setPlayerName] = useState('ONE 01');
  const [roomCode, setRoomCode] = useState('');
  const [selectedToken, setSelectedToken] = useState<VesselToken>('ONE_APUS');
  const [copied, setCopied] = useState<boolean>(false);
  const [manualCode, setManualCode] = useState('');

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('room');
    if (code) {
      setRoomCode(code.toUpperCase());
      setTab('join');
    }
  }, []);

  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  const isHost = room?.hostId === myPlayerId;
  const myPlayer = room?.players.find((player) => player.id === myPlayerId);
  const creating = tab === 'create';
  const selectedConfig = TOKEN_CONFIG[selectedToken];

  async function copyRoomCode() {
    if (!room) return;
    try {
      await navigator.clipboard.writeText(room.id);
      setManualCode('');
      setCopied(true);
    } catch {
      setManualCode(room.id);
    }
  }

  return (
    <div className="chart-lobby">
      <div className="chart-lobby-spread">
        <div className="chart-lobby-poster">
          <img src="/images/harbor-approach.webp" alt="" className="chart-lobby-photo" />
          <div className="chart-lobby-poster-grid" aria-hidden="true" />
          <div className="chart-lobby-poster-title">
            <p>{t('lobby.subtitle')}</p>
            <h1>ONE <em>Monopoly</em></h1>
          </div>
          <Compass aria-hidden="true" className="chart-lobby-compass" strokeWidth={0.8} />
        </div>

        <section className="chart-lobby-panel" aria-labelledby="lobby-panel-title">
          <div className="flex justify-end mb-2">
            <LanguageToggle />
          </div>

          <h2 id="lobby-panel-title">{room ? t('lobby.roomTitle') : (lang === 'vi' ? 'Phòng chơi' : 'Game Lobby')}</h2>

          {room ? (
            <>
              <div className="chart-room-invite">
                <div><span className="chart-field-label">{t('lobby.roomCode')}</span><strong>{room.id}</strong></div>
                <button type="button" className="chart-link-button" onClick={copyRoomCode}>
                  {copied ? <Check /> : <Copy />}
                  {copied ? t('lobby.copied') : t('lobby.copyCode')}
                </button>
              </div>
              <div className="chart-crew-heading">
                <Users size={17} />
                <h3>{t('lobby.vesselsInRoom')}</h3>
                <span>{room.players.length}/4</span>
              </div>
              <ul className="chart-crew">
                {room.players.map((player) => {
                  const cfg = TOKEN_CONFIG[player.token];
                  const label = lang === 'vi' ? cfg.labelVi : cfg.label;
                  return (
                    <li key={player.id}>
                      <img className="chart-crew-token" src={tokenPosterUrl(player.token)} alt="" />
                      <div className="chart-crew-name">
                        <strong>{player.name}{player.id === myPlayerId && (lang === 'vi' ? ' (bạn)' : ' (you)')}</strong>
                        <small>{label}</small>
                      </div>
                      <span className="chart-crew-status">
                        {player.id === room.hostId
                          ? (lang === 'vi' ? 'Chủ phòng' : 'Host')
                          : player.isReady
                          ? t('lobby.ready')
                          : t('lobby.notReady')}
                      </span>
                    </li>
                  );
                })}
              </ul>
              {isHost ? (
                <HostStart
                  key={`${room.id}/${room.players.length === 1 ? 'solo' : 'crew'}`}
                  room={room}
                  onStartGame={onStartGame}
                  isStarting={isStarting}
                />
              ) : (
                <button className="chart-lobby-primary" type="button" onClick={() => onToggleReady(!myPlayer?.isReady)}>
                  {myPlayer?.isReady ? t('lobby.unreadyButton') : t('lobby.readyButton')}<Check />
                </button>
              )}
              <button type="button" className="chart-lobby-leave" onClick={onLeaveRoom}>{t('lobby.leaveButton')}</button>
            </>
          ) : (
            <>
              <div className="chart-lobby-modes" role="group" aria-label="Select mode">
                <button type="button" aria-pressed={creating} onClick={() => setTab('create')}>
                  <Plus />{t('lobby.createNew')}
                </button>
                <button type="button" aria-pressed={!creating} onClick={() => setTab('join')}>
                  <KeyRound />{t('lobby.joinByCode')}
                </button>
              </div>
              {creating && (
                <p className="lobby-solo-hint">
                  {lang === 'vi' ? 'Đấu với máy hoặc mời bạn bè bằng mã phòng.' : 'Play with bots or invite friends via room code.'}
                </p>
              )}

              <form onSubmit={(event) => {
                event.preventDefault();
                if (creating) onCreateRoom(playerName, selectedToken);
                else onJoinRoom(roomCode, playerName, selectedToken);
              }}>
                <label className="chart-lobby-field">
                  <span>{t('lobby.captainName')}</span>
                  <input
                    value={playerName}
                    onChange={(event) => setPlayerName(event.target.value.slice(0, 7))}
                    placeholder={t('lobby.captainPlaceholder')}
                    maxLength={7}
                    required
                  />
                </label>
                {!creating && (
                  <label className="chart-lobby-field">
                    <span>{t('lobby.roomCode')}</span>
                    <input
                      value={roomCode}
                      onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
                      placeholder={t('lobby.roomCodePlaceholder')}
                      maxLength={10}
                      autoCapitalize="characters"
                      required
                    />
                  </label>
                )}
                <fieldset className="chart-token-field">
                  <legend>{t('lobby.selectToken')}</legend>
                  <figure className="chart-token-preview">
                    <div className="chart-token-stage">
                      <TokenModel token={selectedToken} interactive idle={idleMotion} />
                    </div>
                    <figcaption>
                      <strong>{lang === 'vi' ? selectedConfig.labelVi : selectedConfig.label}</strong>
                      <span>{lang === 'vi' ? selectedConfig.descVi : selectedConfig.desc}</span>
                      <small className="chart-token-rotate-hint" aria-hidden="true">{t('lobby.rotateHint')}</small>
                    </figcaption>
                  </figure>
                  <div className="chart-token-grid">
                    {VESSEL_TOKENS.map((token) => {
                      const cfg = TOKEN_CONFIG[token];
                      const label = lang === 'vi' ? cfg.labelVi : cfg.label;
                      const shortName = lang === 'vi' ? cfg.shortNameVi : cfg.shortName;
                      return (
                        <label key={token} className="chart-token-option">
                          <input
                            type="radio"
                            name="vessel"
                            aria-label={label}
                            value={token}
                            checked={selectedToken === token}
                            onChange={() => setSelectedToken(token)}
                          />
                          <span className="chart-token-card">
                            <img className="chart-token-thumbnail" src={tokenPosterUrl(token)} alt="" draggable={false} />
                            <span>{shortName}</span>
                            {selectedToken === token && <Check className="chart-token-check" aria-hidden="true" />}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
                <button
                  className="chart-lobby-primary"
                  type="submit"
                  disabled={!playerName.trim() || (!creating && !roomCode.trim())}
                >
                  {creating ? t('lobby.createButton') : t('lobby.joinButton')}<ArrowRight />
                </button>
              </form>
            </>
          )}
          {manualCode && (
            <label className="chart-lobby-field chart-manual-link">
              <span>{lang === 'vi' ? 'Sao chép mã phòng này' : 'Copy this room code'}</span>
              <input readOnly value={manualCode} onFocus={(event) => event.target.select()} />
            </label>
          )}
        </section>
      </div>
    </div>
  );
};
