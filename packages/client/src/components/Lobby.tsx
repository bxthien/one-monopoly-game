import React, { useEffect, useState } from 'react';
import { LOGISTICS_DELIVERY_TARGET, LOGISTICS_ROUND_LIMIT, VESSEL_TOKENS, type VesselToken } from '@one-monopoly/shared';
import { ArrowRight, Check, Compass, Copy, KeyRound, Plus, Users } from 'lucide-react';
import { RoomState } from '../hooks/useSocket.js';
import { TOKEN_CONFIG } from './TokenBadge.js';
import { useIdleMotion } from '../hooks/useIdleMotion.js';
import { TokenModel, tokenPosterUrl } from './TokenModel.js';
import './chart-lobby.css';

interface Props {
  room: RoomState | null;
  myPlayerId: string | null;
  onCreateRoom: (name: string, token: VesselToken) => void;
  onJoinRoom: (roomId: string, name: string, token: VesselToken) => void;
  onToggleReady: (isReady: boolean) => void;
  onStartGame: () => void;
  onLeaveRoom: () => void;
}

export const Lobby: React.FC<Props> = ({
  room, myPlayerId, onCreateRoom, onJoinRoom, onToggleReady, onStartGame, onLeaveRoom,
}) => {
  const idleMotion = useIdleMotion();
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [playerName, setPlayerName] = useState('Thuyền Trưởng ONE');
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
            <p>Vận tải container</p>
            <h1>ONE <em>Monopoly</em></h1>
          </div>
          <Compass aria-hidden="true" className="chart-lobby-compass" strokeWidth={0.8} />
        </div>

        <section className="chart-lobby-panel" aria-labelledby="lobby-panel-title">
          <h2 id="lobby-panel-title">{room ? 'Phòng chờ' : 'Phòng chơi'}</h2>
          <p className="chart-lobby-freight-intro">
            Chở hàng xuất hoặc điều chuyển vỏ rỗng. Mỗi vòng, các đội có thể chào giá kín để giành thêm tiền cước cho chuyến sau.
            Các đội chơi hết vòng có người giao đủ {LOGISTICS_DELIVERY_TARGET} chuyến, tối đa {LOGISTICS_ROUND_LIMIT} vòng.
            Xếp hạng theo số chuyến, rồi đến tiền cước.
          </p>
          {room ? (
            <>
              <div className="chart-room-invite">
                <div><span className="chart-field-label">Mã phòng</span><strong>{room.id}</strong></div>
                <button type="button" className="chart-link-button" onClick={copyRoomCode}>
                  {copied ? <Check /> : <Copy />}
                  {copied ? 'Đã sao chép mã!' : 'Sao chép mã phòng'}
                </button>
              </div>
              <div className="chart-crew-heading"><Users size={17} /><h3>Thuyền trưởng</h3><span>{room.players.length}/4</span></div>
              <ul className="chart-crew">
                {room.players.map((player) => (
                  <li key={player.id}>
                    <img className="chart-crew-token" src={tokenPosterUrl(player.token)} alt="" />
                    <div className="chart-crew-name"><strong>{player.name}{player.id === myPlayerId && ' (bạn)'}</strong><small>{TOKEN_CONFIG[player.token].label}</small></div>
                    <span className="chart-crew-status">{player.id === room.hostId ? 'Chủ phòng' : player.isReady ? 'Sẵn sàng' : 'Chưa sẵn sàng'}</span>
                  </li>
                ))}
              </ul>
              {isHost ? (
                <button className="chart-lobby-primary" type="button" disabled={room.players.length < 1} onClick={onStartGame}>
                  {room.players.length === 1 ? 'Bắt đầu ván đấu (cùng bot)' : 'Bắt đầu ván đấu'}<ArrowRight />
                </button>
              ) : (
                <button className="chart-lobby-primary" type="button" onClick={() => onToggleReady(!myPlayer?.isReady)}>
                  {myPlayer?.isReady ? 'Hủy sẵn sàng' : 'Tôi đã sẵn sàng!'}<Check />
                </button>
              )}
              <button type="button" className="chart-lobby-leave" onClick={onLeaveRoom}>Rời phòng</button>
            </>
          ) : (
            <>
              <div className="chart-lobby-modes" role="group" aria-label="Chọn cách vào phòng">
                <button type="button" aria-pressed={creating} onClick={() => setTab('create')}><Plus />Tạo phòng mới</button>
                <button type="button" aria-pressed={!creating} onClick={() => setTab('join')}><KeyRound />Vào bằng mã</button>
              </div>

              <form onSubmit={(event) => {
                event.preventDefault();
                if (creating) onCreateRoom(playerName, selectedToken);
                else onJoinRoom(roomCode, playerName, selectedToken);
              }}>
                <label className="chart-lobby-field">
                  <span>Tên thuyền trưởng</span>
                  <input value={playerName} onChange={(event) => setPlayerName(event.target.value)}
                    placeholder="Nhập tên của bạn..." maxLength={20} required />
                </label>
                {!creating && (
                  <label className="chart-lobby-field">
                    <span>Mã phòng</span>
                    <input value={roomCode} onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
                      placeholder="VD: ONE-8888" maxLength={10} autoCapitalize="characters" required />
                  </label>
                )}
                <fieldset className="chart-token-field">
                  <legend>Chọn quân cờ vận tải</legend>
                  <figure className="chart-token-preview">
                    <div className="chart-token-stage">
                      <TokenModel token={selectedToken} interactive idle={idleMotion} />
                    </div>
                    <figcaption>
                      <strong>{selectedConfig.label}</strong>
                      <span>{selectedConfig.desc}</span>
                      <small className="chart-token-rotate-hint" aria-hidden="true">Kéo hoặc dùng phím mũi tên để xoay.</small>
                    </figcaption>
                  </figure>
                  <div className="chart-token-grid">
                    {VESSEL_TOKENS.map((token) => {
                      const cfg = TOKEN_CONFIG[token];
                      return (
                        <label key={token} className="chart-token-option">
                          <input type="radio" name="vessel" aria-label={cfg.label} value={token} checked={selectedToken === token}
                            onChange={() => setSelectedToken(token)} />
                          <span className="chart-token-card">
                            <img className="chart-token-thumbnail" src={tokenPosterUrl(token)} alt="" draggable={false} />
                            <span>{cfg.shortName}</span>
                            {selectedToken === token && <Check className="chart-token-check" aria-hidden="true" />}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
                <button className="chart-lobby-primary" type="submit" disabled={!playerName.trim() || (!creating && !roomCode.trim())}>
                  {creating ? 'Khởi tạo phòng chơi' : 'Vào phòng ngay'}<ArrowRight />
                </button>
              </form>
            </>
          )}
          {manualCode && (
            <label className="chart-lobby-field chart-manual-link">
              <span>Sao chép mã phòng này</span>
              <input readOnly value={manualCode} onFocus={(event) => event.target.select()} />
            </label>
          )}
        </section>
      </div>
    </div>
  );
};
