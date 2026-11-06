import React, { useEffect, useState } from 'react';
import {
  ClimberSkin,
  LeaderboardEntry,
  User,
  fetchFirestoreTopClimbers,
  signInWithGooglePopup,
  signOutUser,
  syncFirestoreLeaderboardEntry,
} from '../firebase';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  firebaseUser: User | null;
  playerUid: string;
  playerHandle: string;
  playerSkin: ClimberSkin;
  playerMotto: string;
  onUpdateProfile: (handle: string, skin: ClimberSkin, motto: string) => void;
  peakStep: number;
  totalFalls: number;
  worstFall: number;
  rageScore: number;
}

const SKIN_OPTIONS: { id: ClimberSkin; label: string; color: string }[] = [
  { id: 'cauldron', label: 'Obsidian Cauldron', color: '#f97316' },
  { id: 'frog', label: 'Celadon Jade Idol', color: '#10b981' },
  { id: 'chicken', label: 'Gilded Astrolabe', color: '#facc15' },
  { id: 'astronaut', label: 'Astral Void Prism', color: '#6366f1' },
];

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  onClose,
  firebaseUser,
  playerUid,
  playerHandle,
  playerSkin,
  playerMotto,
  onUpdateProfile,
  peakStep,
  totalFalls,
  worstFall,
  rageScore,
}) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [handleInput, setHandleInput] = useState(playerHandle);
  const [skinInput, setSkinInput] = useState<ClimberSkin>(playerSkin);
  const [mottoInput, setMottoInput] = useState(playerMotto);
  const [formError, setFormError] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  useEffect(() => {
    setHandleInput(playerHandle);
    setSkinInput(playerSkin);
    setMottoInput(playerMotto);
  }, [playerHandle, playerSkin, playerMotto]);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      const apiRes = await fetch('/api/leaderboard');
      const apiData = apiRes.ok ? await apiRes.json() : { entries: [] };
      const serverEntries: LeaderboardEntry[] = Array.isArray(apiData.entries)
        ? apiData.entries
        : [];

      let firestoreEntries: LeaderboardEntry[] = [];
      try {
        firestoreEntries = await fetchFirestoreTopClimbers();
      } catch {
        // Fallback to server entries if Firestore read fails
      }

      const mergedMap = new Map<string, LeaderboardEntry>();
      [...serverEntries, ...firestoreEntries].forEach((item) => {
        const existing = mergedMap.get(item.uid);
        if (!existing || item.peakStep >= existing.peakStep) {
          mergedMap.set(item.uid, item);
        }
      });

      const merged = Array.from(mergedMap.values()).sort((a, b) => {
        if (b.peakStep !== a.peakStep) return b.peakStep - a.peakStep;
        return a.totalFalls - b.totalFalls;
      });
      setEntries(merged);
    } catch {
      // Keep current list on transient network error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadLeaderboard();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveAndPostScore = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedHandle = handleInput.trim();
    const trimmedMotto = mottoInput.trim();
    if (trimmedHandle.length < 2 || trimmedHandle.length > 24) {
      setFormError('Climber Handle must be between 2 and 24 characters.');
      return;
    }
    if (trimmedMotto.length < 1 || trimmedMotto.length > 80) {
      setFormError('Inscription Motto must be between 1 and 80 characters.');
      return;
    }

    setFormError(null);
    onUpdateProfile(trimmedHandle, skinInput, trimmedMotto);

    const activeUid = firebaseUser ? firebaseUser.uid : playerUid;
    const record: Omit<LeaderboardEntry, 'updatedAt'> = {
      uid: activeUid,
      handle: trimmedHandle,
      avatarSkin: skinInput,
      tauntMotto: trimmedMotto,
      peakStep: Math.max(1, Math.min(500, peakStep)),
      totalFalls: Math.max(0, totalFalls),
      worstFall: Math.max(0, worstFall),
      rageScore: Math.max(0, rageScore),
    };

    try {
      const res = await fetch('/api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.entries)) {
          setEntries(data.entries);
        }
      }

      if (firebaseUser) {
        await syncFirestoreLeaderboardEntry(record);
      }

      setStatusBanner(
        `Inscribed on Global Monolith: ${trimmedHandle} at Step ${record.peakStep}/500!`
      );
      await loadLeaderboard();
    } catch {
      setFormError('Could not reach leaderboard server. Please try again.');
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const user = await signInWithGooglePopup();
      if (user) {
        const displayHandle = (
          user.displayName ||
          handleInput ||
          'Pilgrim'
        ).slice(0, 24);
        setHandleInput(displayHandle);
        onUpdateProfile(displayHandle, skinInput, mottoInput);
        await syncFirestoreLeaderboardEntry({
          uid: user.uid,
          handle: displayHandle,
          avatarSkin: skinInput,
          tauntMotto: mottoInput || 'Verified sufferer on the 500 monoliths.',
          peakStep: Math.max(1, peakStep),
          totalFalls,
          worstFall,
          rageScore,
        });
        await loadLeaderboard();
      }
    } catch {
      setFormError('Google Sign-In popup was closed or blocked.');
    }
  };

  const skinLabelMap: Record<ClimberSkin, string> = {
    cauldron: 'Obsidian Cauldron',
    frog: 'Jade Idol',
    chicken: 'Gilded Astrolabe',
    astronaut: 'Void Prism',
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Global 500-Step Leaderboard and Climber Profile"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 pointer-events-auto"
      style={{ backgroundColor: 'rgba(15, 23, 30, 0.84)' }}
    >
      <div className="voxel-panel w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-[#d95829] text-amber-50 border-b-[3px] border-[#18181b]">
          <div>
            <h2 className="font-display text-lg sm:text-xl font-black tracking-tight">
              Global 500-Step Wall of Suffering
            </h2>
            <p className="text-xs font-semibold text-amber-100 watch-hide">
              Live Sanctuary Ledger · Ranked by Peak Monolith Reached &amp; Fewest Falls
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Leaderboard"
            className="voxel-btn-neutral px-3 py-1.5 text-xs min-h-[40px] cursor-pointer whitespace-nowrap shrink-0"
          >
            Close [Esc]
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column: Climber Identity & Score Submission Form */}
          <div className="lg:col-span-5 space-y-4">
            <form
              onSubmit={handleSaveAndPostScore}
              className="p-4 bg-[#fffdf9] border-[3px] border-[#18181b] space-y-3.5"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display text-base font-extrabold text-zinc-900">
                  Your Pilgrim Ledger
                </h3>
                {firebaseUser ? (
                  <button
                    type="button"
                    onClick={() => signOutUser()}
                    className="text-xs font-bold text-rose-700 hover:underline cursor-pointer"
                  >
                    Sign Out
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    className="px-2.5 py-1 text-xs font-bold bg-amber-100 hover:bg-amber-200 text-zinc-900 border-2 border-[#18181b] cursor-pointer whitespace-nowrap"
                  >
                    Verify with Google
                  </button>
                )}
              </div>

              <div>
                <label
                  htmlFor="climber-handle-input"
                  className="block text-xs font-bold text-zinc-800 mb-1"
                >
                  Climber Handle (2–24 chars)
                </label>
                <input
                  id="climber-handle-input"
                  type="text"
                  value={handleInput}
                  onChange={(e) => setHandleInput(e.target.value)}
                  maxLength={24}
                  placeholder="e.g. MonolithWalker"
                  className="w-full px-3 py-2 text-sm font-bold bg-[#f6f1e7] border-2 border-[#18181b] text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-600"
                />
              </div>

              <div>
                <span className="block text-xs font-bold text-zinc-800 mb-1.5">
                  Sculpted Relic Vessel
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {SKIN_OPTIONS.map((sk) => (
                    <button
                      key={sk.id}
                      type="button"
                      onClick={() => setSkinInput(sk.id)}
                      className={`px-2.5 py-2 text-xs font-bold border-2 border-[#18181b] flex items-center gap-2 cursor-pointer transition-colors ${
                        skinInput === sk.id
                          ? 'bg-[#eab308] text-zinc-950'
                          : 'bg-[#f6f1e7] hover:bg-stone-200 text-zinc-800'
                      }`}
                    >
                      <span
                        className="w-3 h-3 border border-[#18181b] shrink-0"
                        style={{ backgroundColor: sk.color }}
                      />
                      <span className="truncate">{sk.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label
                  htmlFor="climber-motto-input"
                  className="block text-xs font-bold text-zinc-800 mb-1"
                >
                  Stone Inscription / Excuse Motto
                </label>
                <input
                  id="climber-motto-input"
                  type="text"
                  value={mottoInput}
                  onChange={(e) => setMottoInput(e.target.value)}
                  maxLength={80}
                  placeholder="Inscribe your lament on the monolith..."
                  className="w-full px-3 py-2 text-xs font-semibold bg-[#f6f1e7] border-2 border-[#18181b] text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-600"
                />
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1 text-center font-mono-tabular">
                <div className="p-2 bg-amber-100 border-2 border-[#18181b]">
                  <div className="text-[10px] font-bold text-zinc-700">PEAK</div>
                  <div className="text-sm font-black text-zinc-900">
                    {peakStep}/500
                  </div>
                </div>
                <div className="p-2 bg-rose-100 border-2 border-[#18181b]">
                  <div className="text-[10px] font-bold text-zinc-700">FALLS</div>
                  <div className="text-sm font-black text-rose-700">
                    {totalFalls}
                  </div>
                </div>
                <div className="p-2 bg-teal-100 border-2 border-[#18181b]">
                  <div className="text-[10px] font-bold text-zinc-700">RAGE</div>
                  <div className="text-sm font-black text-teal-900">
                    {rageScore}%
                  </div>
                </div>
              </div>

              {formError && (
                <p
                  role="alert"
                  className="text-xs font-bold text-rose-700 bg-rose-100 border-2 border-rose-800 p-2"
                >
                  {formError}
                </p>
              )}

              {statusBanner && (
                <p
                  role="status"
                  className="text-xs font-bold text-teal-950 bg-teal-200 border-2 border-[#18181b] p-2"
                >
                  {statusBanner}
                </p>
              )}

              <button
                type="submit"
                className="voxel-btn-primary w-full py-2.5 text-xs sm:text-sm min-h-[44px] cursor-pointer"
              >
                Inscribe Profile &amp; Post Score to Global Board
              </button>
            </form>
          </div>

          {/* Right Column: Live Global Rankings */}
          <div className="lg:col-span-7 flex flex-col space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-extrabold text-zinc-900">
                Top Climbers ({entries.length})
              </h3>
              <button
                type="button"
                onClick={loadLeaderboard}
                className="text-xs font-bold text-teal-800 hover:underline cursor-pointer"
              >
                {loading ? 'Refreshing...' : 'Refresh Board'}
              </button>
            </div>

            <div className="space-y-2">
              {entries.map((item, idx) => {
                const isSelf =
                  item.uid === playerUid ||
                  (firebaseUser && item.uid === firebaseUser.uid);
                return (
                  <div
                    key={item.uid}
                    className={`p-3 border-[3px] border-[#18181b] flex items-center justify-between gap-3 ${
                      isSelf ? 'bg-amber-100' : 'bg-[#fffdf9]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 border-2 border-[#18181b] flex items-center justify-center font-display font-black text-xs shrink-0 ${
                          idx === 0
                            ? 'bg-[#eab308]'
                            : idx === 1
                            ? 'bg-stone-300'
                            : idx === 2
                            ? 'bg-amber-500 text-white'
                            : 'bg-stone-100'
                        }`}
                      >
                        #{idx + 1}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-xs font-extrabold text-zinc-900">
                          <span className="truncate">{item.handle}</span>
                          <span className="text-zinc-400" aria-hidden="true">
                            ·
                          </span>
                          <span className="text-[11px] font-semibold text-stone-600">
                            {skinLabelMap[item.avatarSkin] || item.avatarSkin}
                          </span>
                        </div>
                        <p className="text-xs text-stone-600 italic truncate mt-0.5">
                          &ldquo;{item.tauntMotto}&rdquo;
                        </p>
                      </div>
                    </div>

                    <div className="text-right font-mono-tabular shrink-0">
                      <div className="font-display text-base font-black text-zinc-900">
                        Step {item.peakStep}
                        <span className="text-xs font-semibold text-stone-500">
                          /500
                        </span>
                      </div>
                      <div className="text-[11px] font-semibold text-rose-700">
                        {item.totalFalls} falls · -{item.worstFall} max drop
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
