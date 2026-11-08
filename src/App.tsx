/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CHARACTER_OUTFITS,
  ClimberSkinId,
  IsometricCanvas,
  TelemetryPayload,
} from './components/IsometricCanvas';
import {
  AtmosphericLayerId,
  BIOME_BLUEPRINTS,
  GROUND_STEP_META,
  NpcDialogueChoice,
  PHILOSOPHICAL_ENDING_QUOTE,
  TOTAL_LEVELS,
  TrailNpcData,
  currentSpireSeed,
  reseedLevels500,
} from './game/levels';
import {
  CAMERA_ANGLE_PRESETS,
  CAMERA_MODES_ORDER,
  CAMERA_SHIFT_INTERVAL_STEPS,
  CameraAngleMode,
  createInitialPlayerState,
  getAltitudeAwareNpcDialogue,
  getAutoCameraModeForStep,
} from './game/rules';
import { soundEngine } from './game/audio';

type GameShellState = 'title' | 'playing' | 'paused' | 'gameover';

const ATMOSPHERIC_LAYER_LABELS: Record<
  AtmosphericLayerId,
  { badge: string; colorClass: string }
> = {
  troposphere_valley: {
    badge: 'TROPOSPHERE VALLEY',
    colorClass: 'bg-emerald-950/85 text-emerald-300 border-emerald-500/40',
  },
  alpine_cloud_deck: {
    badge: 'ALPINE CLOUD SEA',
    colorClass: 'bg-sky-950/85 text-sky-200 border-sky-400/40',
  },
  stratosphere: {
    badge: 'STRATOSPHERE (100+)',
    colorClass: 'bg-indigo-950/90 text-indigo-200 border-indigo-400/50',
  },
  thermosphere_aurora: {
    badge: 'THERMOSPHERE AURORA',
    colorClass: 'bg-purple-950/90 text-purple-200 border-purple-400/50',
  },
  deep_space: {
    badge: 'EXOSPHERE · DEEP SPACE',
    colorClass: 'bg-slate-950/95 text-amber-200 border-amber-400/60',
  },
};

const INITIAL_TELEMETRY: TelemetryPayload = {
  currentStep: 0,
  peakStep: 0,
  fallsCount: 0,
  biggestFallLoss: 0,
  rageScore: 0,
  chargeRatio: 0,
  isCharging: false,
  grounded: true,
  inRiverWater: false,
  onRiverBridge: false,
  biomeIndex: 1,
  biomeName: BIOME_BLUEPRINTS[0].name,
  biomeSubtitle: BIOME_BLUEPRINTS[0].subtitle,
  biomeColor: BIOME_BLUEPRINTS[0].themeColor,
  atmosphericLayer: 'troposphere_valley',
  stepTitle: GROUND_STEP_META.title,
  stepTrapText: GROUND_STEP_META.psychologicalTrap,
  stepDifficulty: 1,
  hazardType: 'none',
  surfaceTheme: 'sanctuary',
  crumbleWarning: 0,
  glitchActive: false,
  won: false,
  aimErrorDeg: 0,
  isAimAligned: true,
  idealChargePercent: 60,
  clearGapMeters: 1.25,
  vertRiseMeters: 0.82,
  turnAngleDeg: 0,
  liveWind: {
    windX: 0,
    windZ: 0,
    strength: 0,
    angleRad: 0,
    label: 'CALM',
    compassLabel: 'CALM',
  },
  spireMutations: 0,
  nearbyNpc: GROUND_STEP_META.npc || null,
  nearbyNpcStep: 0,
  nearbyNpcBark: null,
  nearbyNpcBlocking: false,
  activeRuneCount: 0,
  totalRuneCount: 0,
  stepGateUnlocked: true,
  cameraMode: 'isometric',
  nextCameraShiftStep: CAMERA_SHIFT_INTERVAL_STEPS,
};

declare global {
  interface Window {
    __GAME_DEBUG__?: {
      warpToStep: (step: number) => void;
      rerollSeed: (seed?: number) => number;
      getTelemetry: () => TelemetryPayload;
      setCameraMode: (mode: CameraAngleMode) => void;
      openNpcDialogue: () => void;
    };
  }
}

export default function App() {
  const [shellState, setShellState] = useState<GameShellState>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('autostart') === '1' ? 'playing' : 'title';
  });
  const [telemetry, setTelemetry] =
    useState<TelemetryPayload>(INITIAL_TELEMETRY);
  const [finalSnapshot, setFinalSnapshot] =
    useState<TelemetryPayload>(INITIAL_TELEMETRY);
  const [cameraMode, setCameraMode] = useState<CameraAngleMode>('isometric');
  const [vistaOverviewActive, setVistaOverviewActive] =
    useState<boolean>(false);
  const [resetSignal, setResetSignal] = useState<number>(0);
  const [initialStartStep, setInitialStartStep] = useState<number>(0);
  const [activeSeed, setActiveSeed] = useState<number>(currentSpireSeed);

  // Toast / Subtitle banners for falls, camera shifts, and biome milestones
  const [tauntBanner, setTauntBanner] = useState<{
    quote: string;
    author: string;
    stepsLost: number;
  } | null>(null);
  const [milestoneBanner, setMilestoneBanner] = useState<{
    stepNumber: number;
    title: string;
    subtitle: string;
    color: string;
  } | null>(null);

  // Interactive NPC POV Conversation State
  const [activeDialogueNpc, setActiveDialogueNpc] =
    useState<TrailNpcData | null>(null);
  const [selectedChoiceIdx, setSelectedChoiceIdx] = useState<number>(0);
  const [npcReplyLine, setNpcReplyLine] = useState<string | null>(null);

  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [copiedReceipt, setCopiedReceipt] = useState<boolean>(false);

  const [playerSkin, setPlayerSkin] = useState<ClimberSkinId>(() => {
    const saved = localStorage.getItem('sisyphus_skin') as ClimberSkinId;
    return saved && ['cauldron', 'frog', 'chicken', 'astronaut'].includes(saved)
      ? saved
      : 'cauldron';
  });

  const selectedOutfit = useMemo(
    () =>
      CHARACTER_OUTFITS.find((o) => o.id === playerSkin) ||
      CHARACTER_OUTFITS[0],
    [playerSkin]
  );

  const handleSelectSkin = useCallback((skin: ClimberSkinId) => {
    setPlayerSkin(skin);
    localStorage.setItem('sisyphus_skin', skin);
    soundEngine.playChargeTick(0.65);
  }, []);

  useEffect(() => {
    document.body.dataset.state = shellState;
  }, [shellState]);

  const handleTelemetryUpdate = useCallback((payload: TelemetryPayload) => {
    setTelemetry(payload);
    if (payload.won) {
      setFinalSnapshot(payload);
      setShellState('gameover');
    }
  }, []);

  const handleTauntTriggered = useCallback(
    (quote: string, author: string, stepsLost: number) => {
      setTauntBanner({ quote, author, stepsLost });
      window.setTimeout(() => {
        setTauntBanner((prev) => (prev?.quote === quote ? null : prev));
      }, 5200);
    },
    []
  );

  const handleMilestoneReached = useCallback(
    (
      stepNumber: number,
      biomeName: string,
      subtitle: string,
      themeColor: string
    ) => {
      setMilestoneBanner({
        stepNumber,
        title: biomeName,
        subtitle,
        color: themeColor,
      });
      window.setTimeout(() => {
        setMilestoneBanner((prev) =>
          prev?.stepNumber === stepNumber ? null : prev
        );
      }, 4200);
    },
    []
  );

  const handleAutoCameraShift = useCallback(
    (newMode: CameraAngleMode, stepNumber: number) => {
      setCameraMode(newMode);
      if (stepNumber > 0) {
        const preset = CAMERA_ANGLE_PRESETS[newMode];
        setMilestoneBanner({
          stepNumber,
          title: `Perspective Shift · Stage ${stepNumber}`,
          subtitle: `Camera rotated to ${preset.label}`,
          color: '#38bdf8',
        });
        window.setTimeout(() => {
          setMilestoneBanner((prev) =>
            prev?.stepNumber === stepNumber ? null : prev
          );
        }, 3600);
      }
    },
    []
  );

  const cycleCameraAngle = useCallback(
    (e?: React.MouseEvent<HTMLButtonElement>) => {
      if (e) e.currentTarget.blur();
      setCameraMode((prev) => {
        const idx = CAMERA_MODES_ORDER.indexOf(prev);
        return CAMERA_MODES_ORDER[(idx + 1) % CAMERA_MODES_ORDER.length];
      });
    },
    []
  );

  const handleOpenNpcDialogue = useCallback((npc: TrailNpcData) => {
    setActiveDialogueNpc(npc);
    setSelectedChoiceIdx(0);
    setNpcReplyLine(null);
  }, []);

  const activeDialogueContext = useMemo(() => {
    if (!activeDialogueNpc) return null;
    const synthState = createInitialPlayerState(telemetry.currentStep);
    synthState.peakStep = telemetry.peakStep;
    synthState.fallsCount = telemetry.fallsCount;
    if (!telemetry.nearbyNpcBlocking) {
      synthState.clearedNpcSteps = [telemetry.currentStep];
    }
    return getAltitudeAwareNpcDialogue(activeDialogueNpc, synthState, 0);
  }, [
    activeDialogueNpc,
    telemetry.currentStep,
    telemetry.peakStep,
    telemetry.fallsCount,
    telemetry.nearbyNpcBlocking,
  ]);

  const handleSelectDialogueChoice = useCallback(
    (choice: NpcDialogueChoice) => {
      setNpcReplyLine(choice.response);
      if (choice.action === 'clear_path') {
        const hooks = (
          window as unknown as {
            __gameTestHooks?: { clearCurrentStepNpc?: () => void };
          }
        ).__gameTestHooks;
        hooks?.clearCurrentStepNpc?.();
      } else if (choice.action === 'close') {
        setActiveDialogueNpc(null);
        setNpcReplyLine(null);
      }
    },
    []
  );

  const handleStartGame = useCallback(
    (e?: React.MouseEvent<HTMLButtonElement>) => {
      if (e) e.currentTarget.blur();
      soundEngine.startMusicLoop();
      document.body.dataset.state = 'playing';
      setActiveDialogueNpc(null);
      setInitialStartStep(0);
      setCameraMode('isometric');
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
      setActiveDialogueNpc(null);
      setInitialStartStep(0);
      setCameraMode('isometric');
      setResetSignal((n) => n + 1);
      setShellState('playing');
    },
    []
  );

  const handleRetireAttempt = useCallback(
    (e?: React.MouseEvent<HTMLButtonElement>) => {
      if (e) e.currentTarget.blur();
      document.body.dataset.state = 'gameover';
      setFinalSnapshot(telemetry);
      setShellState('gameover');
    },
    [telemetry]
  );

  const toggleMute = useCallback((e?: React.MouseEvent<HTMLButtonElement>) => {
    if (e) e.currentTarget.blur();
    soundEngine.muted = !soundEngine.muted;
    setIsMuted(soundEngine.muted);
  }, []);

  useEffect(() => {
    window.__GAME_DEBUG__ = {
      warpToStep: (step: number) => {
        document.body.dataset.state =
          step >= TOTAL_LEVELS ? 'gameover' : 'playing';
        setShellState(step >= TOTAL_LEVELS ? 'gameover' : 'playing');
        setInitialStartStep(step);
        setCameraMode(getAutoCameraModeForStep(step));
        const hooks = (
          window as unknown as {
            __gameTestHooks?: { teleportToStep?: (s: number) => void };
          }
        ).__gameTestHooks;
        hooks?.teleportToStep?.(step);
      },
      rerollSeed: (seed?: number) => {
        const nextSeed =
          typeof seed === 'number'
            ? seed
            : Math.floor(100000 + Math.random() * 899999);
        reseedLevels500(nextSeed);
        setActiveSeed(nextSeed);
        setResetSignal((r) => r + 1);
        return nextSeed;
      },
      getTelemetry: () => telemetry,
      setCameraMode: (mode: CameraAngleMode) => setCameraMode(mode),
      openNpcDialogue: () => {
        const npc = telemetry.nearbyNpc || GROUND_STEP_META.npc;
        if (npc) handleOpenNpcDialogue(npc);
      },
    };
  }, [telemetry, handleOpenNpcDialogue]);

  // Global keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (activeDialogueNpc && activeDialogueContext) {
        const choicesList = activeDialogueContext.dynamicChoices;
        if (e.code === 'Escape') {
          e.preventDefault();
          setActiveDialogueNpc(null);
          setNpcReplyLine(null);
          return;
        }
        if (e.code === 'ArrowDown' || e.code === 'KeyS') {
          e.preventDefault();
          setSelectedChoiceIdx((i) => (i + 1) % choicesList.length);
          return;
        }
        if (e.code === 'ArrowUp' || e.code === 'KeyW') {
          e.preventDefault();
          setSelectedChoiceIdx(
            (i) => (i - 1 + choicesList.length) % choicesList.length
          );
          return;
        }
        if (e.code === 'Enter') {
          e.preventDefault();
          handleSelectDialogueChoice(
            choicesList[selectedChoiceIdx] || choicesList[0]
          );
          return;
        }
      }

      if (shellState === 'title') {
        if (e.code === 'Digit1') handleSelectSkin('cauldron');
        if (e.code === 'Digit2') handleSelectSkin('frog');
        if (e.code === 'Digit3') handleSelectSkin('chicken');
        if (e.code === 'Digit4') handleSelectSkin('astronaut');
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          handleStartGame();
          return;
        }
      }

      if (e.code === 'Escape') {
        if (shellState === 'playing') {
          setShellState('paused');
        } else if (shellState === 'paused') {
          setShellState('playing');
        }
      } else if (e.code === 'KeyC' && shellState === 'playing') {
        cycleCameraAngle();
      } else if (e.code === 'KeyV' && shellState === 'playing') {
        setVistaOverviewActive((v) => !v);
      } else if (e.code === 'KeyP') {
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
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    shellState,
    activeDialogueNpc,
    activeDialogueContext,
    selectedChoiceIdx,
    handleStartGame,
    handleRestartClimb,
    cycleCameraAngle,
    handleSelectDialogueChoice,
    handleSelectSkin,
  ]);

  const handleCopyViralReceipt = () => {
    const src = shellState === 'gameover' ? finalSnapshot : telemetry;
    const text = [
      '=== HAWK PEAK 500: SISYPHEAN MOUNTAIN HIKE ===',
      `Trail Seed #${activeSeed} · Rig: ${selectedOutfit.name}`,
      `Highest Stage Reached: ${src.peakStep} / ${TOTAL_LEVELS}`,
      `Total Tumbles: ${src.fallsCount} (Worst Drop: -${src.biggestFallLoss} Stages)`,
      `Verdict: "${
        src.won
          ? PHILOSOPHICAL_ENDING_QUOTE
          : tauntBanner?.quote ||
            'Every stage is a puzzle, and gravity never forgets.'
      }"`,
    ].join('\n');

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setCopiedReceipt(true);
    setTimeout(() => setCopiedReceipt(false), 2000);
  };

  const activeCamPreset =
    CAMERA_ANGLE_PRESETS[cameraMode] || CAMERA_ANGLE_PRESETS.isometric;
  const atmoMeta =
    ATMOSPHERIC_LAYER_LABELS[telemetry.atmosphericLayer] ||
    ATMOSPHERIC_LAYER_LABELS.troposphere_valley;

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#7ec8e3] select-none">
      {/* 1. Studio-Grade 60fps Three.js Sculpted 3D Viewport */}
      <IsometricCanvas
        onTelemetryUpdate={handleTelemetryUpdate}
        onTauntTriggered={handleTauntTriggered}
        onMilestoneReached={handleMilestoneReached}
        onInteractNpc={handleOpenNpcDialogue}
        onAutoCameraShift={handleAutoCameraShift}
        activeDialogueNpc={activeDialogueNpc}
        resetSignal={resetSignal}
        selectedOutfit={selectedOutfit}
        cameraPreset={cameraMode}
        vistaOverviewActive={vistaOverviewActive}
        isPaused={shellState === 'paused'}
        isTitlePreview={shellState === 'title'}
        initialStartStep={initialStartStep}
      />

      {/* 2. FIVE-STAR GAME LOBBY TITLE SCREEN:
          - Zero overlapping, non-scrollable, 85% open 3D hero stage
          - Fancy Woodblock "HAWK PEAK 500" emblem (no second subtitle line, no Atlas, no Solo Ascent, no Coins/Leaderboard)
          - Bottom bar holds the 4 selectable Hiker Outfits (no scrollbar) + Giant Golden PLAY HIKE CTA */}
      {shellState === 'title' && (
        <div
          data-testid="title-screen-overlay"
          className="fixed inset-0 z-20 flex flex-col justify-between p-3 sm:p-5 pointer-events-none overflow-hidden select-none"
          style={{
            background:
              'radial-gradient(circle at 50% 45%, rgba(254,243,199,0.0) 0%, rgba(20,13,8,0.12) 68%, rgba(12,8,4,0.48) 100%)',
          }}
        >
          {/* TOP BAR: FANCY "HAWK PEAK 500" EMBLEM (Left) & AUDIO TOGGLE (Right) */}
          <div className="relative z-10 flex items-center justify-between gap-3 pointer-events-auto shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <svg
                viewBox="0 0 478 68"
                className="w-[248px] sm:w-[336px] md:w-[396px] h-auto drop-shadow-[0_6px_0_rgba(18,10,5,0.95)] shrink-0"
                role="img"
                aria-label="Hawk Peak 500"
              >
                <defs>
                  <linearGradient
                    id="hpTitleGold"
                    x1="0%"
                    y1="0%"
                    x2="0%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor="#fffdf2" />
                    <stop offset="42%" stopColor="#fde047" />
                    <stop offset="100%" stopColor="#ea580c" />
                  </linearGradient>
                  <linearGradient
                    id="hpBadge500"
                    x1="0%"
                    y1="0%"
                    x2="0%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor="#fef08a" />
                    <stop offset="50%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#c2410c" />
                  </linearGradient>
                  <linearGradient
                    id="hpCrestCrimson"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor="#fb7185" />
                    <stop offset="50%" stopColor="#e11d48" />
                    <stop offset="100%" stopColor="#881337" />
                  </linearGradient>
                </defs>

                {/* Sculpted Mountain & Golden Hawk Crest Emblem */}
                <g transform="translate(4, 6)">
                  <polygon
                    points="26,2 49,14 43,45 26,54 9,45 3,14"
                    fill="url(#hpCrestCrimson)"
                    stroke="#120904"
                    strokeWidth="4.5"
                    strokeLinejoin="round"
                  />
                  <polygon
                    points="9,42 22,15 30,28 37,18 44,42"
                    fill="url(#hpTitleGold)"
                    stroke="#120904"
                    strokeWidth="3"
                    strokeLinejoin="round"
                  />
                  <circle cx="31" cy="12" r="4.2" fill="#fef08a" stroke="#120904" strokeWidth="1.8" />
                </g>

                {/* 3D Extruded Block Depth Layer for "HAWK PEAK" */}
                <text
                  x="64"
                  y="51"
                  fontFamily="'Lilita One', 'Bungee', cursive"
                  fontWeight="900"
                  fontSize="43"
                  letterSpacing="2"
                  fill="#120904"
                  stroke="#120904"
                  strokeWidth="9.5"
                  strokeLinejoin="round"
                  paintOrder="stroke fill"
                >
                  HAWK PEAK
                </text>

                {/* Main Chiseled Gold-Amber Face for "HAWK PEAK" */}
                <text
                  x="61"
                  y="45"
                  fontFamily="'Lilita One', 'Bungee', cursive"
                  fontWeight="900"
                  fontSize="43"
                  letterSpacing="2"
                  fill="url(#hpTitleGold)"
                  stroke="#120904"
                  strokeWidth="8"
                  strokeLinejoin="round"
                  paintOrder="stroke fill"
                >
                  HAWK PEAK
                </text>

                {/* Slanted Molten-Gold "500" Crest Plaque */}
                <g transform="translate(362, 8) skewX(-8)">
                  <rect
                    x="4"
                    y="6"
                    width="102"
                    height="46"
                    rx="10"
                    fill="#120904"
                  />
                  <rect
                    x="0"
                    y="0"
                    width="102"
                    height="46"
                    rx="10"
                    fill="url(#hpBadge500)"
                    stroke="#120904"
                    strokeWidth="4.5"
                  />
                  <path
                    d="M 8 7 L 94 7"
                    stroke="#fef9c3"
                    strokeWidth="3"
                    strokeLinecap="round"
                    opacity="0.88"
                  />
                  <text
                    x="51"
                    y="35"
                    textAnchor="middle"
                    fontFamily="'Lilita One', 'Bungee', cursive"
                    fontWeight="900"
                    fontSize="35"
                    letterSpacing="1.5"
                    fill="#fffdf5"
                    stroke="#120904"
                    strokeWidth="6.5"
                    strokeLinejoin="round"
                    paintOrder="stroke fill"
                  >
                    500
                  </text>
                </g>
              </svg>
            </div>

            {/* Top-Right: Clean Audio Toggle */}
            <div className="flex items-center gap-2 shrink-0 watch-hide">
              <button
                type="button"
                onClick={toggleMute}
                aria-label={isMuted ? 'Unmute Audio' : 'Mute Audio'}
                className="game-skew-plate px-3 py-2 rounded-md hover:brightness-110 cursor-pointer"
              >
                <div className="game-unskew flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-4 h-4">
                    <path d="M11 5L6 9H2V15H6L11 19V5Z" fill="#fbf3db" />
                    {!isMuted ? (
                      <path
                        d="M15.5 8.5C16.8 9.8 16.8 14.2 15.5 15.5M18.5 6C21 8.5 21 15.5 18.5 18"
                        stroke="#facc15"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        fill="none"
                      />
                    ) : (
                      <path
                        d="M16 9L21 15M21 9L16 15"
                        stroke="#ef4444"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                      />
                    )}
                  </svg>
                </div>
              </button>
            </div>
          </div>

          {/* CENTER STAGE: 100% UNOBSTRUCTED 3D HERO SHOWCASE */}
          <div className="flex-1 min-h-0 pointer-events-none" />

          {/* BOTTOM BAR: CLEAN 4-OUTFIT SELECTOR STRIP (NO SCROLLBAR) + GIANT PLAY HIKE CTA */}
          <div className="relative z-10 pointer-events-auto w-full shrink-0 flex items-end justify-between gap-3">
            <div className="flex items-center gap-2 overflow-visible max-w-full py-0.5 watch-hide">
              {CHARACTER_OUTFITS.map((item) => {
                const selected = playerSkin === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    data-testid={`loadout-outfit-${item.id}`}
                    onClick={() => handleSelectSkin(item.id)}
                    className={`game-skew-plate px-3 py-2 rounded-md cursor-pointer transition-all shrink-0 ${
                      selected
                        ? 'ring-2 ring-[#facc15] brightness-110 -translate-y-0.5'
                        : 'opacity-90 hover:opacity-100 hover:brightness-105'
                    }`}
                  >
                    <div className="game-unskew flex items-center gap-2">
                      <svg
                        viewBox="0 0 28 24"
                        className="w-6 h-5 shrink-0 drop-shadow"
                      >
                        <polygon
                          points="14,2 25,9 21,22 7,22 3,9"
                          fill={item.swatch}
                          stroke={item.trim}
                          strokeWidth="2"
                        />
                        <line
                          x1="9"
                          y1="9"
                          x2="19"
                          y2="9"
                          stroke={item.trim}
                          strokeWidth="2"
                        />
                      </svg>
                      <div className="text-left">
                        <div className="font-display text-xs font-black text-white leading-none">
                          {item.name}
                        </div>
                        <div
                          className={`text-[9px] font-mono-tabular font-bold mt-0.5 ${
                            selected ? 'text-[#4ade80]' : 'text-[#a89076]'
                          }`}
                        >
                          {selected ? '● EQUIPPED' : `RIG [${item.keyNum}]`}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-stretch shrink-0">
              <button
                type="button"
                data-start="true"
                data-testid="start-climb-btn"
                onClick={handleStartGame}
                className="game-play-cta px-7 sm:px-9 py-2.5 rounded-md cursor-pointer flex items-center justify-center"
              >
                <span className="game-unskew game-play-text font-display font-black text-xl sm:text-2xl tracking-wider uppercase whitespace-nowrap">
                  PLAY HIKE
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. PLAYING HUD:
          - Top-left: Stage counter, Atmospheric Layer badge, Active Rune Gate / River status, and NPC POV Talk button
          - Top-right: Auto-Shifting Camera Angle badge [C], Vista [V], Mute [M], Pause [P]
          - Bottom: Completely clean (Selected bottom control bar div & Feather/Glide div removed!) */}
      {shellState === 'playing' && (
        <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-2.5 sm:p-4 md:p-5 watch-compact-pad">
          {/* Top Perimeter Row */}
          <div className="flex items-start justify-between gap-2">
            {/* Top-Left Cluster: Stage Progress + Atmospheric Layer + Stage Puzzle Status */}
            <div className="pointer-events-auto flex flex-col items-start gap-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {/* Stage / Terrace Readout Badge */}
                <div className="timber-plaque px-3.5 py-1.5 rounded-xl flex items-baseline gap-1.5">
                  <span className="text-[10px] sm:text-xs font-bold text-amber-300 uppercase">
                    Stage
                  </span>
                  <span
                    data-testid="hud-step-readout"
                    className="font-display text-xl sm:text-3xl font-black font-mono-tabular leading-none"
                  >
                    {Math.round(telemetry.currentStep)}
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-amber-200/90 font-mono-tabular">
                    /{TOTAL_LEVELS}
                  </span>
                </div>

                {/* Atmospheric Layer Indicator (Valley -> Cloud Sea -> Stratosphere 100+ -> Thermosphere -> Deep Space) */}
                <div
                  data-testid="hud-atmosphere-badge"
                  className={`px-3 py-1.5 rounded-xl border text-[10px] sm:text-xs font-mono-tabular font-black tracking-wider uppercase shadow watch-hide ${atmoMeta.colorClass}`}
                >
                  {atmoMeta.badge}
                </div>

                {/* Multi-Rune Gate Puzzle Status on Locked Stages */}
                {telemetry.totalRuneCount > 0 && (
                  <div
                    data-testid="hud-rune-status"
                    className={`px-3 py-1.5 rounded-xl border-2 text-xs font-mono-tabular font-black flex items-center gap-1.5 shadow ${
                      telemetry.stepGateUnlocked
                        ? 'bg-emerald-950/90 text-emerald-300 border-emerald-400'
                        : 'bg-amber-950/90 text-amber-300 border-amber-400'
                    }`}
                  >
                    <span>
                      {telemetry.stepGateUnlocked
                        ? `GATE UNLOCKED (${telemetry.totalRuneCount}/${telemetry.totalRuneCount})`
                        : `RUNE LOCK ${telemetry.activeRuneCount}/${telemetry.totalRuneCount} · STEP ON RUNES`}
                    </span>
                  </div>
                )}

                {/* River & Bridge Physics Indicator in Base Camp Valley */}
                {telemetry.inRiverWater && (
                  <div className="px-3 py-1.5 rounded-xl bg-cyan-950/90 border border-cyan-400 text-cyan-200 text-xs font-mono-tabular font-black">
                    RIVER CURRENT · WADING
                  </div>
                )}
                {telemetry.onRiverBridge && (
                  <div className="px-3 py-1.5 rounded-xl bg-amber-950/90 border border-amber-400 text-amber-200 text-xs font-mono-tabular font-black watch-hide">
                    CEDAR ARCH BRIDGE
                  </div>
                )}

                {/* Contextual Player POV Talk to NPC Button */}
                {telemetry.nearbyNpc && (
                  <button
                    type="button"
                    data-testid="talk-npc-btn"
                    onClick={() => handleOpenNpcDialogue(telemetry.nearbyNpc!)}
                    className={`px-3 py-1.5 rounded-xl border-2 border-[#1c1008] shadow font-extrabold text-xs cursor-pointer flex items-center gap-1.5 ${
                      telemetry.nearbyNpcBlocking
                        ? 'bg-rose-600 hover:bg-rose-500 text-white'
                        : 'bg-[#f3e9d2] hover:bg-amber-200 text-[#241911]'
                    }`}
                  >
                    <span>
                      {telemetry.nearbyNpcBlocking
                        ? `POV Confront ${telemetry.nearbyNpc.name} [E]`
                        : `POV Talk to ${telemetry.nearbyNpc.name} [E]`}
                    </span>
                  </button>
                )}
              </div>

              {/* Stage Title & Auto-Camera Shift Countdown */}
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono-tabular font-bold text-[#fef3c7] bg-[#1c1008]/75 px-3 py-1 rounded-lg border border-amber-500/30 watch-hide">
                <span>{telemetry.stepTitle}</span>
                <span className="text-amber-400">·</span>
                <span className="text-sky-300">
                  Next Cam Shift: Stage {telemetry.nextCameraShiftStep}
                </span>
                {telemetry.isCharging && (
                  <>
                    <span className="text-amber-400">·</span>
                    <span className="text-emerald-300 font-black">
                      JUMP CHARGE {Math.round(telemetry.chargeRatio * 100)}% (IDEAL ~
                      {telemetry.idealChargePercent}%)
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Top-Right Cluster: Camera Angle [C], Vista [V], Mute [M], Pause [P] */}
            <div className="pointer-events-auto flex flex-col items-end gap-1.5 shrink-0">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  tabIndex={-1}
                  data-testid="camera-angle-btn"
                  onClick={cycleCameraAngle}
                  aria-label={`Switch Camera Angle [C]: ${activeCamPreset.shortLabel}`}
                  title={`Camera shifts automatically every 12 stages · Current: ${activeCamPreset.label} [Press C]`}
                  className="timber-plaque px-2.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer watch-hide hover:brightness-110"
                >
                  <svg viewBox="0 0 20 20" className="w-4 h-4 shrink-0">
                    <rect
                      x="2"
                      y="5"
                      width="12"
                      height="10"
                      rx="2"
                      fill="#fcd34d"
                    />
                    <polygon points="14,8 19,5 19,15 14,12" fill="#f59e0b" />
                  </svg>
                  <span>{activeCamPreset.shortLabel} [C]</span>
                </button>

                <button
                  type="button"
                  tabIndex={-1}
                  data-testid="cinematic-vista-btn"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    setVistaOverviewActive((v) => !v);
                  }}
                  aria-label="Trail Vista Overview [V]"
                  title="Toggle Wide Trail Vista [Press V]"
                  className="timber-plaque px-2.5 py-2 rounded-xl text-amber-300 text-xs font-bold cursor-pointer watch-hide hover:brightness-110"
                >
                  {vistaOverviewActive ? 'Close Vista [V]' : 'Vista [V]'}
                </button>

                <button
                  type="button"
                  tabIndex={-1}
                  onClick={toggleMute}
                  aria-label={isMuted ? 'Unmute Audio [M]' : 'Mute Audio [M]'}
                  className="voxel-btn-neutral min-w-[38px] min-h-[38px] sm:min-w-[42px] sm:min-h-[42px] px-2 rounded-xl flex items-center justify-center cursor-pointer watch-hide"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4">
                    <path d="M11 5L6 9H2V15H6L11 19V5Z" fill="#1c1008" />
                    {!isMuted ? (
                      <path
                        d="M15.5 8.5C16.8 9.8 16.8 14.2 15.5 15.5"
                        stroke="#1c1008"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        fill="none"
                      />
                    ) : (
                      <path
                        d="M16 9L21 15M21 9L16 15"
                        stroke="#dc2626"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                      />
                    )}
                  </svg>
                </button>

                <button
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    setShellState('paused');
                  }}
                  aria-label="Pause Game [P]"
                  className="voxel-btn-neutral min-w-[38px] min-h-[38px] sm:min-w-[42px] sm:min-h-[42px] px-2 rounded-xl flex items-center justify-center cursor-pointer"
                >
                  <svg viewBox="0 0 20 20" className="w-4 h-4">
                    <rect
                      x="5"
                      y="4"
                      width="3.5"
                      height="12"
                      rx="1"
                      fill="#1c1008"
                    />
                    <rect
                      x="11.5"
                      y="4"
                      width="3.5"
                      height="12"
                      rx="1"
                      fill="#1c1008"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Milestone / Perspective Shift Toast Banner */}
          {milestoneBanner && (
            <div className="fixed top-24 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
              <div className="timber-plaque px-5 py-2 rounded-2xl text-center border-2 border-amber-400/60 shadow-xl">
                <div className="font-display text-sm sm:text-base font-black text-[#fef9c3]">
                  {milestoneBanner.title}
                </div>
                <div className="text-[11px] font-mono-tabular font-bold text-amber-200">
                  {milestoneBanner.subtitle}
                </div>
              </div>
            </div>
          )}

          {/* PLAYER POV NPC CONVERSATION DIALOGUE OVERLAY */}
          {activeDialogueNpc && activeDialogueContext && (
            <div
              role="dialog"
              aria-label={`POV Conversation with ${activeDialogueNpc.name}`}
              className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 w-[92vw] max-w-lg pointer-events-auto"
            >
              <div className="relative bg-[#f1f5f9]/95 backdrop-blur-md text-[#1e293b] p-4 sm:p-5 rounded-2xl border-[3px] border-[#1e293b] shadow-2xl space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-slate-300 pb-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-mono-tabular font-black uppercase text-[#b45309]">
                      POV CAM · {activeDialogueNpc.name} ({activeDialogueNpc.role})
                    </span>
                    <span
                      data-testid="npc-stance-badge"
                      className={`text-[10px] font-mono-tabular font-extrabold uppercase px-2 py-0.5 rounded border ${
                        activeDialogueContext.isBlockingNow
                          ? 'bg-rose-100 text-rose-800 border-rose-400'
                          : activeDialogueNpc.blocksPathByDefault
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-400'
                          : 'bg-amber-100 text-amber-900 border-amber-400'
                      }`}
                    >
                      {activeDialogueContext.isBlockingNow
                        ? `BLOCKING STAGE ${telemetry.currentStep}`
                        : activeDialogueNpc.blocksPathByDefault
                        ? 'LANE CLEARED'
                        : `STAGE ${telemetry.currentStep} SCOUT`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveDialogueNpc(null);
                      setNpcReplyLine(null);
                    }}
                    className="text-xs font-black text-slate-500 hover:text-slate-900 cursor-pointer"
                  >
                    [ESC]
                  </button>
                </div>

                <p className="text-sm sm:text-base font-bold text-slate-800 leading-relaxed">
                  &ldquo;{npcReplyLine || activeDialogueContext.greeting}&rdquo;
                </p>

                <div className="space-y-1.5 pt-1">
                  {activeDialogueContext.dynamicChoices.map((ch, idx) => {
                    const isSelected = idx === selectedChoiceIdx;
                    return (
                      <button
                        key={ch.label}
                        type="button"
                        data-testid={`npc-choice-${ch.action}`}
                        onClick={() => {
                          setSelectedChoiceIdx(idx);
                          handleSelectDialogueChoice(ch);
                        }}
                        className={`w-full text-left px-3 py-1.5 rounded-xl font-display text-sm sm:text-lg font-black flex items-center gap-2.5 transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-white text-[#0f172a] shadow-sm'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <span className="text-[#1e3a8a] text-base sm:text-xl w-5">
                          {isSelected ? '▸' : ''}
                        </span>
                        <span>
                          {ch.highlightWord &&
                          ch.label.includes(ch.highlightWord) ? (
                            <>
                              {ch.label.slice(
                                0,
                                ch.label.indexOf(ch.highlightWord)
                              )}
                              <span className="text-[#dc2626]">
                                {ch.highlightWord}
                              </span>
                              {ch.label.slice(
                                ch.label.indexOf(ch.highlightWord) +
                                  ch.highlightWord.length
                              )}
                            </>
                          ) : (
                            ch.label
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Subtle NPC Bark or Fall Roast Subtitle Banner when not in active dialogue */}
          {!activeDialogueNpc &&
            (telemetry.nearbyNpcBark || tauntBanner) && (
              <div className="mx-auto mb-2 max-w-md w-[90vw] pointer-events-auto watch-hide">
                <div
                  onClick={() => {
                    if (telemetry.nearbyNpc) {
                      handleOpenNpcDialogue(telemetry.nearbyNpc);
                    }
                  }}
                  className="parchment-sheet px-4 py-2 rounded-xl cursor-pointer text-center shadow-lg"
                >
                  <p className="text-xs sm:text-sm font-black leading-snug">
                    {telemetry.nearbyNpcBark ||
                      `"${tauntBanner?.quote}" — ${tauntBanner?.author}`}
                  </p>
                </div>
              </div>
            )}
        </div>
      )}

      {/* 4. PAUSED MODAL */}
      {shellState === 'paused' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Hike Paused"
          className="fixed inset-0 z-30 flex items-center justify-center p-4 pointer-events-auto"
          style={{ backgroundColor: 'rgba(28, 19, 11, 0.82)' }}
        >
          <div className="voxel-panel w-full max-w-md p-5 sm:p-6 space-y-5 rounded-2xl">
            <div className="space-y-1">
              <div className="text-xs font-mono-tabular font-black text-amber-800 uppercase">
                Hawk Peak Trail Paused · Seed #{activeSeed}
              </div>
              <h2 className="font-display text-2xl font-black text-zinc-900">
                Stage {Math.round(telemetry.currentStep)} of {TOTAL_LEVELS}
              </h2>
              <p className="text-xs text-stone-700 leading-relaxed">
                {telemetry.stepTrapText}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center font-mono-tabular">
              <div className="p-2.5 bg-amber-100 border-2 border-[#18181b] rounded-lg">
                <div className="text-[10px] font-bold text-stone-600">PEAK</div>
                <div className="text-base font-black text-zinc-900">
                  {telemetry.peakStep}
                </div>
              </div>
              <div className="p-2.5 bg-rose-100 border-2 border-[#18181b] rounded-lg">
                <div className="text-[10px] font-bold text-stone-600">
                  TUMBLES
                </div>
                <div className="text-base font-black text-rose-700">
                  {telemetry.fallsCount}
                </div>
              </div>
              <div className="p-2.5 bg-sky-100 border-2 border-[#18181b] rounded-lg">
                <div className="text-[10px] font-bold text-stone-600">
                  WORST DROP
                </div>
                <div className="text-base font-black text-sky-900">
                  -{telemetry.biggestFallLoss}
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
                Resume Hike [Esc]
              </button>

              <button
                type="button"
                onClick={handleRestartClimb}
                className="voxel-btn-neutral w-full py-2.5 text-sm min-h-[44px] cursor-pointer"
              >
                Restart from Base Camp [R]
              </button>

              <button
                type="button"
                onClick={handleRetireAttempt}
                className="voxel-btn-neutral w-full py-2.5 text-sm min-h-[44px] cursor-pointer text-rose-700"
              >
                End Hike &amp; View Summary
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. SUMMIT / GAME OVER MODAL */}
      {shellState === 'gameover' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={
            finalSnapshot.won ? 'Summit Reached' : 'Climb Retired Summary'
          }
          className="fixed inset-0 z-30 flex items-center justify-center p-4 pointer-events-auto overflow-y-auto"
          style={{ backgroundColor: 'rgba(28, 19, 11, 0.88)' }}
        >
          <div className="voxel-panel w-full max-w-lg p-5 sm:p-7 space-y-5 my-auto rounded-2xl">
            <div className="space-y-1.5">
              <div className="text-xs font-mono-tabular font-black text-amber-800 uppercase">
                {finalSnapshot.won
                  ? 'HAWK PEAK SUMMIT 500 CONQUERED'
                  : `HIKE ENDED AT STAGE ${finalSnapshot.currentStep}`}
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-black text-zinc-900">
                {finalSnapshot.won
                  ? '500 Stages to the Stars'
                  : `Peak Reached: Stage ${finalSnapshot.peakStep} / ${TOTAL_LEVELS}`}
              </h2>
            </div>

            <div className="p-4 bg-[#4f3b22] text-[#fef9c3] border-2 border-[#2b1d10] rounded-xl space-y-1">
              <p
                data-testid="philosophical-ending-quote"
                className="font-display text-sm sm:text-base font-bold italic"
              >
                &ldquo;
                {finalSnapshot.won
                  ? PHILOSOPHICAL_ENDING_QUOTE
                  : tauntBanner?.quote ||
                    'Every stage is a puzzle, and gravity never forgets.'}
                &rdquo;
              </p>
              <div className="text-[11px] font-mono-tabular text-amber-300">
                —{' '}
                {finalSnapshot.won
                  ? 'Hawk Peak Astral Sanctuary (Stage 500)'
                  : tauntBanner?.author || 'Ranger Barnaby'}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center font-mono-tabular">
              <div className="p-2.5 bg-amber-100 border-2 border-[#18181b] rounded-lg">
                <div className="text-[10px] font-bold text-stone-600">PEAK</div>
                <div className="text-base font-black text-zinc-900">
                  {finalSnapshot.peakStep}
                </div>
              </div>
              <div className="p-2.5 bg-rose-100 border-2 border-[#18181b] rounded-lg">
                <div className="text-[10px] font-bold text-stone-600">
                  FALLS
                </div>
                <div className="text-base font-black text-rose-700">
                  {finalSnapshot.fallsCount}
                </div>
              </div>
              <div className="p-2.5 bg-orange-100 border-2 border-[#18181b] rounded-lg">
                <div className="text-[10px] font-bold text-stone-600">
                  WORST DROP
                </div>
                <div className="text-base font-black text-orange-800">
                  -{finalSnapshot.biggestFallLoss}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleRestartClimb}
                className="voxel-btn-primary flex-1 py-3 text-sm min-h-[44px] cursor-pointer"
              >
                Hike Again from Base Camp
              </button>

              <button
                type="button"
                onClick={handleCopyViralReceipt}
                className="voxel-btn-yellow px-4 py-3 text-xs sm:text-sm min-h-[44px] cursor-pointer"
              >
                {copiedReceipt ? 'Copied Trail Log!' : 'Copy Trail Receipt'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
