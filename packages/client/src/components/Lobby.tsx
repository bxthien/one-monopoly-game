import React, { useState } from 'react';
import { VesselToken } from '@one-monopoly/shared';
import { RoomState } from '../hooks/useSocket.js';
import { TOKEN_CONFIG, TokenBadge } from './TokenBadge.js';
import { Users, Copy, Check, Play, Anchor, ShieldCheck } from 'lucide-react';

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
  room,
  myPlayerId,
  onCreateRoom,
  onJoinRoom,
  onToggleReady,
  onStartGame,
  onLeaveRoom,
}) => {
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [playerName, setPlayerName] = useState('Thuyền Trưởng ONE');
  const [roomCode, setRoomCode] = useState('');
  const [selectedToken, setSelectedToken] = useState<VesselToken>('ONE_APUS');
  const [copied, setCopied] = useState(false);

  // Auto-fill room code from URL params if present
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('room');
    if (code) {
      setRoomCode(code.toUpperCase());
      setTab('join');
    }
  }, []);

  const handleCopyLink = () => {
    if (!room) return;
    const url = `${window.location.origin}?room=${room.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const availableTokens: VesselToken[] = [
    'ONE_APUS',
    'ONE_MAGENTA',
    'GANTRY_CRANE',
    'REEFER_TRUCK',
    'PILOT_BOAT',
    'BUNKER_BARGE',
  ];

  // If in room lobby
  if (room) {
    const isHost = room.hostId === myPlayerId;
    const myPlayer = room.players.find((p) => p.id === myPlayerId);
    const canStart = isHost && room.players.length >= 2;

    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-white rounded-3xl shadow-xl border border-gray-100">
        <div className="flex items-center justify-between border-b pb-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#E1007A] flex items-center justify-center text-white font-extrabold text-xl shadow-lg shadow-pink-200">
              ONE
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">Phòng Chờ Logistics</h2>
              <p className="text-sm text-gray-500">Chuẩn bị xuất bến hải trình toàn cầu</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-2xl border border-gray-200">
            <span className="text-xs text-gray-500 font-semibold">MÃ PHÒNG:</span>
            <span className="text-lg font-black text-[#E1007A] tracking-wider">{room.id}</span>
            <button
              onClick={handleCopyLink}
              className="p-1.5 hover:bg-white rounded-lg text-gray-600 transition shadow-sm border border-transparent hover:border-gray-200"
              title="Sao chép link mời"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Players List */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3 text-sm font-bold text-gray-600">
            <span>DANH SÁCH THUYỀN TRƯỞNG ({room.players.length}/4)</span>
            {copied && <span className="text-xs text-emerald-600 font-medium">Đã chép link mời!</span>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {room.players.map((p) => {
              const isMe = p.id === myPlayerId;
              const isRoomHost = p.id === room.hostId;

              return (
                <div
                  key={p.id}
                  className={`p-4 rounded-2xl border-2 transition flex items-center justify-between ${
                    isMe
                      ? 'border-[#E1007A] bg-pink-50/40 shadow-sm'
                      : 'border-gray-100 bg-gray-50/70'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <TokenBadge token={p.token} size="md" />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-gray-900 text-sm">{p.name}</span>
                        {isRoomHost && (
                          <span className="text-[10px] bg-amber-100 text-amber-800 font-extrabold px-1.5 py-0.5 rounded-full">
                            HOST
                          </span>
                        )}
                        {isMe && (
                          <span className="text-[10px] bg-[#E1007A] text-white font-extrabold px-1.5 py-0.5 rounded-full">
                            BẠN
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">{TOKEN_CONFIG[p.token].label}</p>
                    </div>
                  </div>

                  <div>
                    {isRoomHost ? (
                      <span className="text-xs font-bold text-amber-600 flex items-center gap-1">
                        <ShieldCheck className="w-4 h-4" /> Chủ phòng
                      </span>
                    ) : p.isReady ? (
                      <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                        <Check className="w-4 h-4" /> Sẵn sàng
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-gray-400">Chưa sẵn sàng</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-100">
          <button
            onClick={onLeaveRoom}
            className="text-sm text-gray-500 hover:text-red-600 font-semibold transition"
          >
            Rời phòng
          </button>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {!isHost && (
              <button
                onClick={() => onToggleReady(!myPlayer?.isReady)}
                className={`flex-1 sm:flex-initial px-6 py-3 rounded-2xl font-bold transition shadow-md ${
                  myPlayer?.isReady
                    ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    : 'bg-emerald-500 text-white hover:bg-emerald-600'
                }`}
              >
                {myPlayer?.isReady ? 'Hủy Sẵn Sàng' : 'Tôi Đã Sẵn Sàng!'}
              </button>
            )}

            {isHost && (
              <button
                disabled={!canStart}
                onClick={onStartGame}
                className={`flex-1 sm:flex-initial px-8 py-3 rounded-2xl font-black text-white flex items-center justify-center gap-2 transition shadow-lg ${
                  canStart
                    ? 'bg-[#E1007A] hover:bg-[#B80063] shadow-pink-200 cursor-pointer'
                    : 'bg-gray-300 cursor-not-allowed text-gray-500'
                }`}
              >
                <Play className="w-5 h-5 fill-current" />
                {room.players.length < 2 ? 'Chờ thêm người chơi (tối thiểu 2)' : 'BẮT ĐẦU VÁN ĐẤU!'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Pre-join View
  return (
    <div className="max-w-xl mx-auto my-12 p-8 bg-white rounded-3xl shadow-2xl border border-gray-100">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-[#E1007A] text-white font-black text-3xl shadow-xl shadow-pink-200 mb-4">
          ONE
        </div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">ONE MONOPOLY</h1>
        <p className="text-gray-500 text-sm mt-1">Cờ Tỷ Phú Chuẩn Logistics Ocean Network Express</p>
      </div>

      {/* Tabs */}
      <div className="flex rounded-2xl bg-gray-100 p-1 mb-6">
        <button
          onClick={() => setTab('create')}
          className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition ${
            tab === 'create'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          Tạo Phòng Mới
        </button>
        <button
          onClick={() => setTab('join')}
          className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition ${
            tab === 'join'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          Vào Bằng Mã Phòng
        </button>
      </div>

      {/* Form */}
      <div className="space-y-5">
        <div>
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
            Tên Người Chơi / Thuyền Trưởng
          </label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E1007A] font-semibold text-gray-800"
            placeholder="Nhập tên của bạn..."
            maxLength={20}
          />
        </div>

        {tab === 'join' && (
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
              Mã Phòng (Room Code)
            </label>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E1007A] font-black text-gray-800 tracking-widest uppercase"
              placeholder="VD: ONE-8888"
              maxLength={10}
            />
          </div>
        )}

        {/* Token Selection */}
        <div>
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
            Chọn Quân Cờ Vận Tải
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {availableTokens.map((t) => {
              const isSelected = selectedToken === t;
              const cfg = TOKEN_CONFIG[t];
              return (
                <button
                  type="button"
                  key={t}
                  onClick={() => setSelectedToken(t)}
                  className={`p-3 rounded-2xl border-2 text-left transition flex flex-col items-center gap-1.5 ${
                    isSelected
                      ? 'border-[#E1007A] bg-pink-50/50 shadow-sm'
                      : 'border-gray-100 hover:border-gray-300 bg-gray-50/50'
                  }`}
                >
                  <TokenBadge token={t} size="md" />
                  <span className="font-bold text-xs text-gray-800 text-center leading-tight">
                    {cfg.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Submit Button */}
        <button
          onClick={() => {
            if (tab === 'create') {
              onCreateRoom(playerName, selectedToken);
            } else {
              onJoinRoom(roomCode, playerName, selectedToken);
            }
          }}
          disabled={!playerName.trim() || (tab === 'join' && !roomCode.trim())}
          className="w-full mt-4 py-4 rounded-2xl bg-[#E1007A] hover:bg-[#B80063] text-white font-black text-base shadow-lg shadow-pink-200 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {tab === 'create' ? 'KHỞI TẠO PHÒNG CHƠI' : 'VÀO PHÒNG NGAY'}
        </button>
      </div>
    </div>
  );
};
