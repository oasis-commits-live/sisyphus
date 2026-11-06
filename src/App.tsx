/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  GameShellState,
  IsometricCanvas,
  TelemetryUpdate,
} from './components/IsometricCanvas';
import { BlueprintModal } from './components/BlueprintModal';
import { LeaderboardModal } from './components/LeaderboardModal';
import {
  BIOME_BLUEPRINTS,
  DEFAULT_SPIRE_SEED,
  GROUND_STEP_META,
  LEVELS_500,
  PHILOSOPHICAL_ENDING_QUOTE,
  TOTAL_LEVELS,
  currentSpireSeed,
  reseedLevels500,
} from './game/levels';
import { soundEngine } from './game/audio';
import {
  ClimberSkin,
  User,
  auth,
  onAuthStateChanged,
  syncFirestoreLeaderboardEntry,
} from './firebase';

const INITIAL_TELEMETRY: TelemetryUpdate = {
  currentStep: 0,
  peakStep: 0,
  fallsCount: 0,
  biggestFallLoss: 0,
  rageScore: 0,
  coinsCollected: 0,
  chargeRatio: 0,
  chargeHoldTime: 0,
  isOvercharging: false,
  isOnTarget: false,
  isCharging: false,
  isTumbling: false,
  glitchActive: false,
  idealChargePercent: 62,
  angleErrorDeg: 0,
  isAimAligned: true,
  altitude: 0,
  elapsedSeconds: 0,
  spireSeed: DEFAULT_SPIRE_SEED,
  spireMutations: 0,
  windLabel: 'CALM',
  windStrength: 0,
  windAngleRad: 0,
  activeStepMeta: GROUND_STEP_META,
  taunt: null,
  won: false,
};

declare global {
  interface Window {
    __GAME_DEBUG__?: {
      warpToStep: (step: number) => void;
      rerollSeed: (seed?: number) => number;
      getTelemetry: () => TelemetryUpdate;
    };
  }
}

export default function App() {
  const [shellState, setShellState] = useState<GameShellState>('title');
  const [telemetry, setTelemetry] =
    useState<TelemetryUpdate>(INITIAL_TELEMETRY);
  const [finalSnapshot, setFinalSnapshot] =
    useState<TelemetryUpdate>(INITIAL_TELEMETRY);
  const [resetSignal, setResetSignal] = useState<number>(0);
  const [seedSignal, setSeedSignal] = useState<number>(0);
  const [activeSeed, setActiveSeed] = useState<number>(currentSpireSeed);
  const [warpSignal, setWarpSignal] = useState<{ step: number; seq: number }>({
    step: 1,
    seq: 0,
  });

  // Modals & Audio state
  const [blueprintOpen, setBlueprintOpen] = useState<boolean>(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [copiedReceipt, setCopiedReceipt] = useState<boolean>(false);

  // Mobile / Watch Touch Controls State
  const [touchMoveDir, setTouchMoveDir] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [touchCharging, setTouchCharging] = useState<boolean>(false);

  // Player Identity & Firebase Auth State
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [playerUid] = useState<string>(() => {
    const saved = localStorage.getItem('sisyphus_uid');
    if (saved) return saved;
    const generated =
      'climber-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
    localStorage.setItem('sisyphus_uid', generated);
    return generated;
  });
  const [playerHandle, setPlayerHandle] = useState<string>(() => {
    return localStorage.getItem('sisyphus_handle') || 'MonolithPilgrim';
  });
  const [playerSkin, setPlayerSkin] = useState<ClimberSkin>(() => {
    const saved = localStorage.getItem('sisyphus_skin') as ClimberSkin;
    return saved && ['chicken', 'cauldron', 'frog', 'astronaut'].includes(saved)
      ? saved
      : 'cauldron';
  });
  const [playerMotto, setPlayerMotto] = useState<string>(() => {
    return (
      localStorage.getItem('sisyphus_motto') ||
      'The spire shifts, yet I keep vaulting.'
    );
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setFirebaseUser(u);
      if (u?.displayName && playerHandle === 'MonolithPilgrim') {
        const cleanName = u.displayName.slice(0, 24);
        setPlayerHandle(cleanName);
        localStorage.setItem('sisyphus_handle', cleanName);
      }
    });
    return () => unsub();
  }, [playerHandle]);

  const handleUpdateProfile = useCallback(
    (handle: string, skin: ClimberSkin, motto: string) => {
      setPlayerHandle(handle);
      setPlayerSkin(skin);
      setPlayerMotto(motto);
      localStorage.setItem('sisyphus_handle', handle);
      localStorage.setItem('sisyphus_skin', skin);
      localStorage.setItem('sisyphus_motto', motto);
    },
    []
  );

  // Automatically post high-score progress to backend & Firestore when reaching new milestones or summit
  const syncScoreSilently = useCallback(
    async (snap: TelemetryUpdate) => {
      const uid = firebaseUser ? firebaseUser.uid : playerUid;
      const payload = {
        uid,
        handle: playerHandle,
        avatarSkin: playerSkin,
        tauntMotto: playerMotto,
        peakStep: Math.max(1, Math.min(500, snap.peakStep)),
        totalFalls: Math.max(0, snap.fallsCount),
        worstFall: Math.max(0, snap.biggestFallLoss),
        rageScore: Math.max(0, snap.rageScore),
      };
      try {
        await fetch('/api/leaderboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (firebaseUser) {
          await syncFirestoreLeaderboardEntry(payload);
        }
      } catch {
        // Ignore background sync errors during active gameplay
      }
    },
    [firebaseUser, playerUid, playerHandle, playerSkin, playerMotto]
  );

  // Sync body[data-state] attribute
  useEffect(() => {
    document.body.dataset.state = shellState;
  }, [shellState]);

  const handleRerollSpireSeed = useCallback(
    (customSeed?: number, e?: React.MouseEvent<HTMLButtonElement>) => {
      if (e) e.currentTarget.blur();
      const nextSeed =
        typeof customSeed === 'number'
          ? customSeed
          : Math.floor(100000 + Math.random() * 899999);
      reseedLevels500(nextSeed);
      setActiveSeed(nextSeed);
      setSeedSignal((s) => s + 1);
      setResetSignal((r) => r + 1);
      soundEngine.playGlitchZap();
    },
    []
  );

  // Expose deterministic debug hook for automated verification
  useEffect(() => {
    window.__GAME_DEBUG__ = {
      warpToStep: (step: number) => {
        document.body.dataset.state =
          step >= TOTAL_LEVELS ? 'gameover' : 'playing';
        setShellState(step >= TOTAL_LEVELS ? 'gameover' : 'playing');
        setWarpSignal((prev) => ({ step, seq: prev.seq + 1 }));
      },
      rerollSeed: (seed?: number) => {
        const nextSeed =
          typeof seed === 'number'
            ? seed
            : Math.floor(100000 + Math.random() * 899999);
        reseedLevels500(nextSeed);
        setActiveSeed(nextSeed);
        setSeedSignal((s) => s + 1);
        setResetSignal((r) => r + 1);
        return nextSeed;
      },
      getTelemetry: () => telemetry,
    };
  }, [telemetry]);

  const handleStartGame = useCallback(
    (e?: React.MouseEvent<HTMLButtonElement>) => {
      if (e) e.currentTarget.blur();
      soundEngine.startMusicLoop();
      document.body.dataset.state = 'playing';
      setBlueprintOpen(false);
      setLeaderboardOpen(false);
      setResetSignal((n) => n + 1);
      setShellState('playing');
    },
    []
  );

  const handleRestartClimb = useCallback(
    (e?: React.MouseEvent<HTMLButtonElement>) => {
      if (e) e.currentTarget.blur();
      soundEngine.startMusicLoop();
      document.body.dataset.state = 'playing';
      setBlueprintOpen(false);
      setLeaderboardOpen(false);
      setResetSignal((n) => n + 1);
      setShellState('playing');
    },
    []
  );

  const handleReachSummit = useCallback(
    (finalSnap: TelemetryUpdate) => {
      document.body.dataset.state = 'gameover';
      setFinalSnapshot(finalSnap);
      setShellState('gameover');
      syncScoreSilently(finalSnap);
    },
    [syncScoreSilently]
  );

  const handleRetireAttempt = useCallback(
    (e?: React.MouseEvent<HTMLButtonElement>) => {
      if (e) e.currentTarget.blur();
      document.body.dataset.state = 'gameover';
      setFinalSnapshot(telemetry);
      setShellState('gameover');
      syncScoreSilently(telemetry);
    },
    [telemetry, syncScoreSilently]
  );

  const handlePracticeStep = useCallback((stepNumber: number) => {
    soundEngine.startMusicLoop();
    setBlueprintOpen(false);
    setLeaderboardOpen(false);
    if (stepNumber < TOTAL_LEVELS) {
      document.body.dataset.state = 'playing';
      setShellState('playing');
    }
    setWarpSignal((prev) => ({ step: stepNumber, seq: prev.seq + 1 }));
  }, []);

  const toggleMute = useCallback(
    (e?: React.MouseEvent<HTMLButtonElement>) => {
      if (e) e.currentTarget.blur();
      soundEngine.muted = !soundEngine.muted;
      setIsMuted(soundEngine.muted);
    },
    []
  );

  // Global keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (shellState === 'title' && !blueprintOpen && !leaderboardOpen) {
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          handleStartGame();
          return;
        }
      }

      if (e.code === 'Escape') {
        if (blueprintOpen) {
          setBlueprintOpen(false);
          return;
        }
        if (leaderboardOpen) {
          setLeaderboardOpen(false);
          return;
        }
        if (shellState === 'playing') {
          setShellState('paused');
        } else if (shellState === 'paused') {
          setShellState('playing');
        }
      } else if (e.code === 'KeyP' && !blueprintOpen && !leaderboardOpen) {
        if (shellState === 'playing') {
          setShellState('paused');
        } else if (shellState === 'paused') {
          setShellState('playing');
        }
      } else if (e.code === 'KeyM') {
        soundEngine.muted = !soundEngine.muted;
        setIsMuted(soundEngine.muted);
      } else if (e.code === 'KeyR' && shellState === 'playing') {
        handleRestartClimb();
      } else if (e.code === 'KeyG' && !blueprintOpen && !leaderboardOpen) {
        handleRerollSpireSeed();
      } else if (
        e.code === 'KeyB' &&
        (shellState === 'playing' || shellState === 'paused')
      ) {
        setLeaderboardOpen(false);
        setBlueprintOpen((o) => !o);
      } else if (
        e.code === 'KeyL' &&
        (shellState === 'playing' || shellState === 'paused')
      ) {
        setBlueprintOpen(false);
        setLeaderboardOpen((o) => !o);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    shellState,
    blueprintOpen,
    leaderboardOpen,
    handleStartGame,
    handleRestartClimb,
    handleRerollSpireSeed,
  ]);

  const handleCopyViralReceipt = () => {
    const src = shellState === 'gameover' ? finalSnapshot : telemetry;
    const text = [
      '=== SISYPHEAN MONOLITH: 500 STEPS OF NOTHING ===',
      `Pilgrim: ${playerHandle} · Seed #${activeSeed}`,
      `Peak Monolith Reached: ${src.peakStep} / ${TOTAL_LEVELS}`,
      `Total Falls: ${src.fallsCount} (Worst Single Drop: -${src.biggestFallLoss} Steps)`,
      `Rage Index: ${src.rageScore}% · Spire Mutations: ${src.spireMutations}`,
      `Verdict: "${
        src.won
          ? PHILOSOPHICAL_ENDING_QUOTE
          : src.taunt?.quote ||
            'You tried to memorize a rhythm on a mountain that refuses to repeat itself.'
      }"`,
    ].join('\n');

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setCopiedReceipt(true);
    setTimeout(() => setCopiedReceipt(false), 2000);
  };

  const activeBiome =
    BIOME_BLUEPRINTS[(telemetry.activeStepMeta.biome || 1) - 1] ||
    BIOME_BLUEPRINTS[0];

  const nextStepMeta =
    LEVELS_500[
      Math.min(TOTAL_LEVELS - 1, Math.max(0, telemetry.currentStep))
    ] || telemetry.activeStepMeta;

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#283845] select-none">
      {/* 1. Isolated 60fps Three.js Architectural Diorama Isometric Viewport */}
      <IsometricCanvas
        shellState={shellState}
        playerSkin={playerSkin}
        resetSignal={resetSignal}
        seedSignal={seedSignal}
        warpStepSignal={warpSignal}
        touchMoveDir={touchMoveDir}
        touchCharging={touchCharging}
        onTelemetryChange={setTelemetry}
        onReachSummit={handleReachSummit}
      />

      {/* 2. TITLE SCREEN OVERLAY */}
      {shellState === 'title' && (
        <div
          className="fixed inset-0 z-20 flex flex-col justify-between p-3 sm:p-6 md:p-10 pointer-events-none overflow-y-auto"
          style={{
            background:
              'linear-gradient(90deg, rgba(16,22,28,0.88) 0%, rgba(16,22,28,0.58) 54%, rgba(16,22,28,0.12) 100%)',
          }}
        >
          <div className="max-w-xl my-auto space-y-4 sm:space-y-6 pointer-events-auto watch-compact-pad">
            {/* Custom Inline SVG Architectural Monolith & Cauldron Pilgrim Lockup */}
            <div className="space-y-2 sm:space-y-3">
              <svg
                viewBox="0 0 560 136"
                className="w-full max-w-[510px] h-auto"
                role="img"
                aria-label="Sisyphean Monolith: 500 Steps of Nothing"
              >
                {/* Sculpted Isometric Ground Trailhead + Block-Art Atlas Wayfarer Emblem */}
                <g transform="translate(8, 10)">
                  {/* Sanctuary Ground Plinth */}
                  <polygon
                    points="46,66 88,84 46,102 4,84"
                    fill="#52b788"
                    stroke="#18181b"
                    strokeWidth="3"
                  />
                  <polygon
                    points="4,84 46,102 46,118 4,100"
                    fill="#40916c"
                    stroke="#18181b"
                    strokeWidth="3"
                  />
                  <polygon
                    points="88,84 46,102 46,118 88,100"
                    fill="#2d6a4f"
                    stroke="#18181b"
                    strokeWidth="3"
                  />
                  {/* Chained Runic Boulder Backpack on Wayfarer's Back */}
                  <rect
                    x="14"
                    y="24"
                    width="20"
                    height="24"
                    fill="#292524"
                    stroke="#18181b"
                    strokeWidth="2.5"
                  />
                  <rect
                    x="19"
                    y="29"
                    width="10"
                    height="14"
                    fill="#38bdf8"
                    stroke="#18181b"
                    strokeWidth="1.5"
                  />
                  {/* Flowing Crimson Cloak Tail */}
                  <polygon
                    points="22,46 10,64 24,62 28,48"
                    fill="#ea580c"
                    stroke="#18181b"
                    strokeWidth="2.5"
                  />
                  {/* Articulated Block Boots */}
                  <rect
                    x="32"
                    y="58"
                    width="11"
                    height="12"
                    fill="#0f172a"
                    stroke="#18181b"
                    strokeWidth="2.5"
                  />
                  <rect
                    x="47"
                    y="58"
                    width="11"
                    height="12"
                    fill="#0f172a"
                    stroke="#18181b"
                    strokeWidth="2.5"
                  />
                  {/* Armored Slate Cuirass & Crimson Tunic */}
                  <rect
                    x="30"
                    y="32"
                    width="28"
                    height="26"
                    fill="#1e293b"
                    stroke="#18181b"
                    strokeWidth="3"
                  />
                  <rect
                    x="34"
                    y="36"
                    width="20"
                    height="14"
                    fill="#c2410c"
                    stroke="#18181b"
                    strokeWidth="2"
                  />
                  <rect
                    x="30"
                    y="50"
                    width="28"
                    height="5"
                    fill="#f59e0b"
                    stroke="#18181b"
                    strokeWidth="2"
                  />
                  {/* Wayfarer Horned Helm & Glowing Cyan Voxel Eyes */}
                  <rect
                    x="32"
                    y="12"
                    width="24"
                    height="20"
                    fill="#0f172a"
                    stroke="#18181b"
                    strokeWidth="3"
                  />
                  <rect
                    x="30"
                    y="10"
                    width="28"
                    height="8"
                    fill="#1e293b"
                    stroke="#18181b"
                    strokeWidth="2.5"
                  />
                  <rect
                    x="40"
                    y="4"
                    width="8"
                    height="7"
                    fill="#f59e0b"
                    stroke="#18181b"
                    strokeWidth="2"
                  />
                  <rect
                    x="39"
                    y="20"
                    width="5"
                    height="4"
                    fill="#38bdf8"
                  />
                  <rect
                    x="48"
                    y="20"
                    width="5"
                    height="4"
                    fill="#38bdf8"
                  />
                  {/* Climber's Steel & Brass Pickaxe */}
                  <line
                    x1="64"
                    y1="64"
                    x2="72"
                    y2="18"
                    stroke="#78350f"
                    strokeWidth="4"
                  />
                  <polygon
                    points="60,18 84,22 74,12"
                    fill="#e2e8f0"
                    stroke="#18181b"
                    strokeWidth="2"
                  />
                </g>

                {/* Sculpted Architectural Title Typography */}
                <text
                  x="106"
                  y="54"
                  fontFamily="Outfit, sans-serif"
                  fontWeight="900"
                  fontSize="40"
                  fill="#f6f1e7"
                  stroke="#18181b"
                  strokeWidth="6"
                  paintOrder="stroke fill"
                  letterSpacing="-0.5"
                >
                  SISYPHEAN MONOLITH
                </text>
                <text
                  x="106"
                  y="92"
                  fontFamily="Outfit, sans-serif"
                  fontWeight="900"
                  fontSize="26"
                  fill="#f59e0b"
                  stroke="#18181b"
                  strokeWidth="5"
                  paintOrder="stroke fill"
                >
                  500 SHIFTING STEPS OF NOTHING
                </text>
                <text
                  x="108"
                  y="118"
                  fontFamily="JetBrains Mono, monospace"
                  fontWeight="700"
                  fontSize="10.2"
                  fill="#99f6e4"
                  letterSpacing="0.5"
                >
                  PROCEDURAL SPIRE SEEDS · TURNTABLES &amp; CONVEYORS · CASCADING FALLS
                </text>
              </svg>

              <p className="text-xs sm:text-sm text-stone-200 max-w-md leading-relaxed font-medium watch-hide">
                Ascend 500 non-repeating procedural monoliths across 10
                architectural eras. Every step varies its turn angle, chasm gap,
                and charge tension—and falling mutates the spire above you so
                muscle memory will never save you.
              </p>

              {/* Active Spire Seed Pill */}
              <div className="flex items-center gap-2 pt-0.5 watch-hide">
                <span className="px-2.5 py-1 bg-[#1c1917] text-amber-300 border-2 border-[#18181b] font-mono-tabular text-xs font-bold">
                  Spire Seed #{activeSeed}
                </span>
                <button
                  type="button"
                  onClick={(e) => handleRerollSpireSeed(undefined, e)}
                  className="px-2.5 py-1 bg-stone-200 hover:bg-amber-200 text-zinc-900 border-2 border-[#18181b] font-mono-tabular text-xs font-bold cursor-pointer"
                >
                  Re-Roll Seed [G]
                </button>
              </div>
            </div>

            {/* Primary CTA & Utility Actions */}
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 pt-1">
              <button
                type="button"
                data-testid="start-climb-btn"
                onClick={handleStartGame}
                className="voxel-btn-primary px-5 sm:px-7 py-3 sm:py-3.5 text-sm sm:text-base min-h-[44px] cursor-pointer"
              >
                Begin Ascent (500 Steps)
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.currentTarget.blur();
                  setLeaderboardOpen(true);
                }}
                className="voxel-btn-yellow px-4 py-3 text-xs sm:text-sm min-h-[44px] cursor-pointer watch-hide"
              >
                Global Leaderboard
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.currentTarget.blur();
                  setBlueprintOpen(true);
                }}
                className="voxel-btn-neutral px-4 py-3 text-xs sm:text-sm min-h-[44px] cursor-pointer watch-hide"
              >
                500-Step Atlas
              </button>
            </div>
          </div>

          {/* Bottom Controls Legend */}
          <div className="flex items-center justify-between text-[11px] font-mono-tabular text-stone-200/90 pointer-events-auto watch-hide">
            <span>
              WASD / Arrows / Drag to Aim · Hold Space to Surge-Charge (Release
              Before Overcharge Misfire!) · G Mutate Seed
            </span>
          </div>
        </div>
      )}

      {/* 3. PLAYING HUD (Architectural Diorama Numerals + Wind Compass + Tension Surge Bar) */}
      {shellState === 'playing' && (
        <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-2 sm:p-4 md:p-5 watch-compact-pad">
          {/* Top Perimeter Row */}
          <div className="flex items-start justify-between gap-2">
            {/* Top-Left Cluster: Step Number + Procedural Step Telemetry + Wind Compass */}
            <div className="pointer-events-auto flex flex-col items-start min-w-0">
              <div className="flex items-baseline gap-2">
                <span
                  data-testid="hud-step-readout"
                  className="font-display text-3xl sm:text-5xl font-black voxel-stroke-white font-mono-tabular leading-none"
                >
                  {Math.round(telemetry.currentStep)}
                </span>
                <span className="font-display text-sm sm:text-lg font-black voxel-stroke-yellow font-mono-tabular">
                  /{TOTAL_LEVELS}
                </span>
                <span className="hidden md:inline-block ml-1 px-2 py-0.5 bg-[#1c1917] text-amber-300 border-2 border-[#18181b] font-mono-tabular text-[11px] font-bold">
                  Seed #{telemetry.spireSeed}
                </span>
              </div>

              {/* Compact Biome, Peak & Falls Sub-Strip */}
              <div className="voxel-panel px-2 sm:px-2.5 py-1 mt-1.5 flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-bold watch-hide">
                <span
                  className="w-2.5 h-2.5 border border-[#18181b] shrink-0"
                  style={{ backgroundColor: activeBiome.themeColor }}
                />
                <span className="truncate max-w-[82px] sm:max-w-[190px]">
                  {telemetry.activeStepMeta.title}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono-tabular text-stone-700 whitespace-nowrap">
                  Peak {Math.round(telemetry.peakStep)}
                </span>
                <span aria-hidden="true" className="hidden sm:inline">
                  ·
                </span>
                <span className="hidden sm:inline font-mono-tabular text-rose-700 whitespace-nowrap">
                  Falls {Math.round(telemetry.fallsCount)}
                </span>
                {telemetry.spireMutations > 0 && (
                  <>
                    <span aria-hidden="true" className="hidden md:inline">
                      ·
                    </span>
                    <span className="hidden md:inline font-mono-tabular text-amber-800 whitespace-nowrap">
                      Shifts {telemetry.spireMutations}
                    </span>
                  </>
                )}
                {telemetry.glitchActive && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-purple-800 font-extrabold">
                      INVERTED!
                    </span>
                  </>
                )}
              </div>

              {/* Next Jump Non-Repeating Geometry & Live Wind Compass Strip (Desktop & Tablet) */}
              <div className="hidden sm:flex items-center gap-2 mt-1.5 text-[11px] font-mono-tabular font-bold watch-hide">
                <div className="px-2 py-0.5 bg-[#1c1917] text-stone-100 border-2 border-[#18181b] flex items-center gap-2">
                  <span>Air Gap: {nextStepMeta.clearGap.toFixed(1)}m</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-emerald-300">
                    Ideal Power: ~{telemetry.idealChargePercent}%
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    Turn:{' '}
                    {nextStepMeta.turnAngleDeg > 0
                      ? `+${nextStepMeta.turnAngleDeg}`
                      : nextStepMeta.turnAngleDeg}
                    °
                  </span>
                </div>

                <div className="px-2 py-0.5 bg-[#0f766e] text-amber-50 border-2 border-[#18181b] flex items-center gap-1.5">
                  <span>Wind: {telemetry.windLabel}</span>
                </div>
              </div>
            </div>

            {/* Top-Right Cluster: Relic Shard Counter + Square Action Buttons */}
            <div className="pointer-events-auto flex flex-col items-end gap-1.5 shrink-0">
              <div className="flex items-center gap-1.5 watch-hide">
                <span className="font-display text-2xl sm:text-4xl font-black voxel-stroke-yellow font-mono-tabular leading-none">
                  {Math.round(telemetry.coinsCollected)}
                </span>
                <span
                  aria-label="Relic Shards"
                  className="w-6 h-6 sm:w-7 sm:h-7 bg-[#d97706] border-[3px] border-[#18181b] shadow-[0_3px_0_#18181b] flex items-center justify-center font-mono-tabular font-black text-xs text-amber-50"
                >
                  R
                </span>
              </div>

              {/* Utility Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => handleRerollSpireSeed(undefined, e)}
                  aria-label="Mutate Spire Seed [G]"
                  title="Re-Roll Non-Repeating Spire Seed [G]"
                  className="voxel-btn-neutral min-w-[38px] min-h-[38px] sm:min-w-[44px] sm:min-h-[44px] px-2 flex items-center justify-center cursor-pointer watch-hide"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
                    <rect
                      x="4"
                      y="4"
                      width="16"
                      height="16"
                      stroke="#18181b"
                      strokeWidth="2.2"
                    />
                    <circle cx="8.5" cy="8.5" r="1.5" fill="#18181b" />
                    <circle cx="15.5" cy="15.5" r="1.5" fill="#18181b" />
                    <circle cx="12" cy="12" r="1.5" fill="#d95829" />
                  </svg>
                </button>

                <button
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    setLeaderboardOpen(true);
                  }}
                  aria-label="Open Global Leaderboard [L]"
                  title="Global Leaderboard & Profile [L]"
                  className="voxel-btn-yellow min-w-[38px] min-h-[38px] sm:min-w-[44px] sm:min-h-[44px] px-2 flex items-center justify-center cursor-pointer watch-hide"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
                    <path
                      d="M6 4H18V9C18 12.3137 15.3137 15 12 15C8.68629 15 6 12.3137 6 9V4Z"
                      stroke="#18181b"
                      strokeWidth="2.2"
                    />
                    <path
                      d="M12 15V20M8 20H16"
                      stroke="#18181b"
                      strokeWidth="2.2"
                    />
                  </svg>
                </button>

                <button
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    setBlueprintOpen(true);
                  }}
                  aria-label="Open 500-Level Atlas [B]"
                  title="500-Step Spire Atlas [B]"
                  className="voxel-btn-neutral min-w-[38px] min-h-[38px] sm:min-w-[44px] sm:min-h-[44px] px-2 flex items-center justify-center cursor-pointer watch-hide"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
                    <rect
                      x="3"
                      y="4"
                      width="18"
                      height="16"
                      stroke="#18181b"
                      strokeWidth="2.2"
                    />
                    <line
                      x1="8"
                      y1="9"
                      x2="16"
                      y2="9"
                      stroke="#18181b"
                      strokeWidth="2.2"
                    />
                    <line
                      x1="8"
                      y1="14"
                      x2="13"
                      y2="14"
                      stroke="#18181b"
                      strokeWidth="2.2"
                    />
                  </svg>
                </button>

                <button
                  type="button"
                  tabIndex={-1}
                  onClick={toggleMute}
                  aria-label={isMuted ? 'Unmute Audio [M]' : 'Mute Audio [M]'}
                  title="Mute / Unmute Music & Voice [M]"
                  className="voxel-btn-neutral min-w-[38px] min-h-[38px] sm:min-w-[44px] sm:min-h-[44px] px-2 flex items-center justify-center cursor-pointer watch-hide"
                >
                  {isMuted ? (
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
                      <path
                        d="M11 5L6 9H2V15H6L11 19V5Z"
                        stroke="#18181b"
                        strokeWidth="2.2"
                      />
                      <line
                        x1="21"
                        y1="9"
                        x2="15"
                        y2="15"
                        stroke="#ef4444"
                        strokeWidth="2.4"
                      />
                      <line
                        x1="15"
                        y1="9"
                        x2="21"
                        y2="15"
                        stroke="#ef4444"
                        strokeWidth="2.4"
                      />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
                      <path
                        d="M11 5L6 9H2V15H6L11 19V5Z"
                        stroke="#18181b"
                        strokeWidth="2.2"
                      />
                      <path
                        d="M15.5 8.5C17 10 17 14 15.5 15.5"
                        stroke="#18181b"
                        strokeWidth="2.2"
                      />
                    </svg>
                  )}
                </button>

                <button
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    setShellState('paused');
                  }}
                  aria-label="Pause Game [P]"
                  title="Pause [P]"
                  className="voxel-btn-neutral min-w-[38px] min-h-[38px] sm:min-w-[44px] sm:min-h-[44px] px-2 flex items-center justify-center cursor-pointer"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
                    <rect x="6" y="5" width="4" height="14" fill="#18181b" />
                    <rect x="14" y="5" width="4" height="14" fill="#18181b" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Non-Blocking Top-Center Narration Toast (Auto-fades after 2.8s, never covers the middle of the screen!) */}
          {telemetry.taunt && telemetry.fallsCount > 0 && (
            <div className="fixed top-2.5 left-1/2 -translate-x-1/2 z-20 max-w-sm w-[88vw] pointer-events-none watch-hide">
              <div className="voxel-panel-dark px-3 py-1.5 text-center border-2 border-amber-500/80 shadow-md">
                <div className="text-[10px] font-mono-tabular font-black text-amber-400 uppercase">
                  Fell -{telemetry.taunt.stepsLost} Steps to Monolith{' '}
                  {telemetry.currentStep} · Spire Shifted
                </div>
                <p className="text-[11px] font-semibold text-stone-100 truncate mt-0.5">
                  &ldquo;{telemetry.taunt.quote}&rdquo;
                </p>
              </div>
            </div>
          )}

          {/* Bottom Perimeter Row: Touch Aim + Oscillating Surge Meter + Hold-to-Vault */}
          <div className="pointer-events-auto flex items-end justify-between gap-2 w-full max-w-xl mx-auto">
            <div className="voxel-panel p-2 sm:p-2.5 flex-1 flex items-center justify-between gap-2 sm:gap-3">
              {/* Touch / Mouse Aim Buttons */}
              <div className="flex items-center gap-1 watch-hide">
                <button
                  type="button"
                  tabIndex={-1}
                  onPointerDown={() => setTouchMoveDir({ x: -1, y: 0 })}
                  onPointerUp={() => setTouchMoveDir({ x: 0, y: 0 })}
                  onPointerLeave={() => setTouchMoveDir({ x: 0, y: 0 })}
                  aria-label="Aim Left"
                  className="voxel-btn-neutral w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-xs font-black cursor-pointer"
                >
                  ◀
                </button>
                <button
                  type="button"
                  tabIndex={-1}
                  onPointerDown={() => setTouchMoveDir({ x: 0, y: 1 })}
                  onPointerUp={() => setTouchMoveDir({ x: 0, y: 0 })}
                  onPointerLeave={() => setTouchMoveDir({ x: 0, y: 0 })}
                  aria-label="Aim Forward"
                  className="voxel-btn-neutral w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-xs font-black cursor-pointer"
                >
                  ▲
                </button>
                <button
                  type="button"
                  tabIndex={-1}
                  onPointerDown={() => setTouchMoveDir({ x: 1, y: 0 })}
                  onPointerUp={() => setTouchMoveDir({ x: 0, y: 0 })}
                  onPointerLeave={() => setTouchMoveDir({ x: 0, y: 0 })}
                  aria-label="Aim Right"
                  className="voxel-btn-neutral w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-xs font-black cursor-pointer"
                >
                  ▶
                </button>
              </div>

              {/* Oscillating Tension & Target Lock Meter with Visual Sweet-Spot Bracket */}
              <div className="flex-1 flex items-center gap-2 min-w-0">
                <span
                  className={`text-[10px] sm:text-xs font-mono-tabular font-black whitespace-nowrap watch-hide ${
                    telemetry.isOnTarget
                      ? 'text-emerald-700'
                      : !telemetry.isAimAligned
                      ? 'text-amber-700'
                      : telemetry.isOvercharging
                      ? 'text-rose-700'
                      : 'text-zinc-900'
                  }`}
                >
                  {telemetry.isOnTarget
                    ? 'RELEASE NOW!'
                    : !telemetry.isAimAligned
                    ? telemetry.angleErrorDeg > 0
                      ? 'AIM ◀ A'
                      : 'AIM D ▶'
                    : telemetry.isOvercharging
                    ? 'SURGE!'
                    : `TARGET ~${telemetry.idealChargePercent}%`}
                </span>
                <div className="flex-1 h-4 bg-stone-200 border-2 border-[#18181b] overflow-hidden relative">
                  {/* Visual Target Sweet-Spot Bracket on the Tension Bar */}
                  <div
                    aria-hidden="true"
                    className="absolute top-0 bottom-0 border-x-2 border-emerald-700 bg-emerald-400/35 pointer-events-none z-10"
                    style={{
                      left: `${Math.max(
                        4,
                        Math.min(82, telemetry.idealChargePercent - 7)
                      )}%`,
                      width: '14%',
                    }}
                  />
                  <div
                    className="h-full transition-none relative z-0"
                    style={{
                      width: `${Math.round(telemetry.chargeRatio * 100)}%`,
                      backgroundColor: telemetry.isOnTarget
                        ? '#10b981'
                        : telemetry.isOvercharging
                        ? '#e11d48'
                        : telemetry.chargeRatio > 0.78
                        ? '#d95829'
                        : telemetry.chargeRatio > 0.42
                        ? '#eab308'
                        : '#0f766e',
                    }}
                  />
                </div>
                <span className="text-xs font-mono-tabular font-black text-zinc-900 w-9 text-right">
                  {Math.round(telemetry.chargeRatio * 100)}%
                </span>
              </div>

              {/* Hold to Vault Touch/Click Trigger */}
              <button
                type="button"
                tabIndex={-1}
                onPointerDown={() => {
                  soundEngine.startMusicLoop();
                  setTouchCharging(true);
                }}
                onPointerUp={() => setTouchCharging(false)}
                onPointerCancel={() => setTouchCharging(false)}
                onPointerLeave={() => {
                  if (touchCharging) setTouchCharging(false);
                }}
                className="voxel-btn-primary px-3 sm:px-4 py-2 text-xs sm:text-sm min-h-[40px] sm:min-h-[44px] cursor-pointer whitespace-nowrap"
              >
                Hold to Vault
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. PAUSED MODAL */}
      {shellState === 'paused' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Climb Paused"
          className="fixed inset-0 z-30 flex items-center justify-center p-4 pointer-events-auto"
          style={{ backgroundColor: 'rgba(15, 23, 30, 0.8)' }}
        >
          <div className="voxel-panel w-full max-w-md p-5 sm:p-6 space-y-5">
            <div className="space-y-1">
              <div className="text-xs font-mono-tabular font-black text-amber-800 uppercase">
                Sanctuary Ascent Paused · Seed #{activeSeed}
              </div>
              <h2 className="font-display text-2xl font-black text-zinc-900">
                Monolith {Math.round(telemetry.currentStep)} of {TOTAL_LEVELS}
              </h2>
              <p className="text-xs text-stone-700 leading-relaxed">
                {telemetry.activeStepMeta.psychologicalTrap}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center font-mono-tabular">
              <div className="p-2.5 bg-amber-100 border-2 border-[#18181b]">
                <div className="text-[10px] font-bold text-stone-600">PEAK</div>
                <div className="text-base font-black text-zinc-900">
                  {telemetry.peakStep}
                </div>
              </div>
              <div className="p-2.5 bg-rose-100 border-2 border-[#18181b]">
                <div className="text-[10px] font-bold text-stone-600">FALLS</div>
                <div className="text-base font-black text-rose-700">
                  {telemetry.fallsCount}
                </div>
              </div>
              <div className="p-2.5 bg-teal-100 border-2 border-[#18181b]">
                <div className="text-[10px] font-bold text-stone-600">RAGE</div>
                <div className="text-base font-black text-teal-900">
                  {telemetry.rageScore}%
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={(e) => {
                  e.currentTarget.blur();
                  setShellState('playing');
                }}
                className="voxel-btn-primary w-full py-2.5 text-sm min-h-[44px] cursor-pointer"
              >
                Resume Ascent [Esc]
              </button>

              <button
                type="button"
                onClick={(e) => {
                  handleRerollSpireSeed(undefined, e);
                  setShellState('playing');
                }}
                className="voxel-btn-yellow w-full py-2.5 text-xs sm:text-sm min-h-[44px] cursor-pointer"
              >
                Re-Roll New Procedural Spire Seed [G]
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.currentTarget.blur();
                  setLeaderboardOpen(true);
                }}
                className="voxel-btn-neutral w-full py-2.5 text-xs sm:text-sm min-h-[44px] cursor-pointer"
              >
                Global Leaderboard &amp; Relic Profile [L]
              </button>

              <button
                type="button"
                onClick={handleRestartClimb}
                className="voxel-btn-neutral w-full py-2.5 text-xs sm:text-sm min-h-[44px] cursor-pointer"
              >
                Restart from Step 1 [R]
              </button>

              <button
                type="button"
                onClick={handleRetireAttempt}
                className="voxel-btn-neutral w-full py-2 text-xs text-rose-700 min-h-[40px] cursor-pointer"
              >
                Retire &amp; Generate Suffering Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. GAMEOVER / STEP 500 PHILOSOPHICAL ENDING OVERLAY */}
      {shellState === 'gameover' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Philosophical Verdict and Suffering Receipt"
          className="fixed inset-0 z-30 flex items-center justify-center p-3 sm:p-6 pointer-events-auto overflow-y-auto"
          style={{ backgroundColor: 'rgba(15, 23, 30, 0.9)' }}
        >
          <div className="voxel-panel w-full max-w-xl p-5 sm:p-8 space-y-6 my-auto">
            <div className="space-y-2 text-center">
              <div className="inline-block px-3 py-1 bg-[#eab308] border-2 border-[#18181b] text-xs font-mono-tabular font-black text-zinc-950">
                {finalSnapshot.won
                  ? 'MONOLITH 500 / 500 SUMMIT REACHED'
                  : `EXPEDITION RETIRED AT MONOLITH ${finalSnapshot.currentStep} / ${TOTAL_LEVELS}`}
              </div>

              <h2
                data-testid="philosophical-ending-quote"
                className="font-display text-2xl sm:text-3xl font-black text-zinc-950 leading-tight pt-2"
              >
                &ldquo;
                {finalSnapshot.won
                  ? PHILOSOPHICAL_ENDING_QUOTE
                  : 'You stopped climbing, which is the only way to win.'}
                &rdquo;
              </h2>

              <p className="text-xs sm:text-sm text-stone-700 max-w-md mx-auto">
                {finalSnapshot.won
                  ? 'Five hundred shifting monoliths, rotating sundials, meteor bolts, and cascading falls—only to discover the summit is an empty stone.'
                  : 'Every fall landed you on a lower monolith and mutated the spire above you.'}
              </p>
            </div>

            {/* Viral Suffering Receipt Card */}
            <div className="p-4 bg-[#fffdf9] border-[3px] border-[#18181b] space-y-3 font-mono-tabular">
              <div className="flex items-center justify-between text-xs font-bold text-stone-600 border-b-2 border-stone-200 pb-2">
                <span>PILGRIM: {playerHandle}</span>
                <span>SEED #{activeSeed}</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="p-2 bg-amber-100 border-2 border-[#18181b]">
                  <div className="text-[10px] font-bold text-stone-600">
                    PEAK STEP
                  </div>
                  <div className="text-base font-black text-zinc-900">
                    {finalSnapshot.peakStep}/500
                  </div>
                </div>
                <div className="p-2 bg-rose-100 border-2 border-[#18181b]">
                  <div className="text-[10px] font-bold text-stone-600">
                    TOTAL FALLS
                  </div>
                  <div className="text-base font-black text-rose-700">
                    {finalSnapshot.fallsCount}
                  </div>
                </div>
                <div className="p-2 bg-orange-100 border-2 border-[#18181b]">
                  <div className="text-[10px] font-bold text-stone-600">
                    MAX DROP
                  </div>
                  <div className="text-base font-black text-orange-800">
                    -{finalSnapshot.biggestFallLoss}
                  </div>
                </div>
                <div className="p-2 bg-teal-100 border-2 border-[#18181b]">
                  <div className="text-[10px] font-bold text-stone-600">
                    RAGE INDEX
                  </div>
                  <div className="text-base font-black text-teal-900">
                    {finalSnapshot.rageScore}%
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                data-testid="play-again-btn"
                onClick={handleRestartClimb}
                className="voxel-btn-primary px-6 py-3 text-sm min-h-[44px] cursor-pointer"
              >
                Climb Again (Step 1)
              </button>

              <button
                type="button"
                onClick={(e) => {
                  handleRerollSpireSeed(undefined, e);
                  setShellState('playing');
                }}
                className="voxel-btn-yellow px-4 py-3 text-xs sm:text-sm min-h-[44px] cursor-pointer"
              >
                New Procedural Seed
              </button>

              <button
                type="button"
                onClick={() => setLeaderboardOpen(true)}
                className="voxel-btn-neutral px-4 py-3 text-xs sm:text-sm min-h-[44px] cursor-pointer"
              >
                Global Leaderboard
              </button>

              <button
                type="button"
                onClick={handleCopyViralReceipt}
                className="voxel-btn-neutral px-4 py-3 text-xs sm:text-sm min-h-[44px] cursor-pointer"
              >
                {copiedReceipt ? 'Receipt Copied!' : 'Copy Suffering Receipt'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. 500-LEVEL ATLAS MODAL */}
      <BlueprintModal
        isOpen={blueprintOpen}
        onClose={() => setBlueprintOpen(false)}
        onSelectPracticeStep={handlePracticeStep}
        onRerollSeed={() => handleRerollSpireSeed()}
        currentStep={Math.round(telemetry.currentStep)}
        peakStep={Math.round(telemetry.peakStep)}
      />

      {/* 7. GLOBAL LEADERBOARD & PROFILE MODAL */}
      <LeaderboardModal
        isOpen={leaderboardOpen}
        onClose={() => setLeaderboardOpen(false)}
        firebaseUser={firebaseUser}
        playerUid={playerUid}
        playerHandle={playerHandle}
        playerSkin={playerSkin}
        playerMotto={playerMotto}
        onUpdateProfile={handleUpdateProfile}
        peakStep={Math.max(telemetry.peakStep, finalSnapshot.peakStep)}
        totalFalls={Math.max(telemetry.fallsCount, finalSnapshot.fallsCount)}
        worstFall={Math.max(
          telemetry.biggestFallLoss,
          finalSnapshot.biggestFallLoss
        )}
        rageScore={Math.max(telemetry.rageScore, finalSnapshot.rageScore)}
      />
    </main>
  );
}
