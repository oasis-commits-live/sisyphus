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
  ControlSettings,
  DEFAULT_CONTROL_SETTINGS,
  GhostTrajectoryRun,
  ICONIC_TRAIL_GUIDES,
  MAX_CAMERA_ZOOM_FACTOR,
  MIN_CAMERA_ZOOM_FACTOR,
  WHOLE_WORLD_ZOOM_FACTOR,
  buildOfflineFallRoast,
  buildOfflineNpcReply,
  clampCameraZoomFactor,
  createInitialPlayerState,
  createSeededRivalGhostRuns,
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
  puzzleType: 'none',
  runeTimeRemaining: 0,
  requiresBoulderSocket: false,
  boulderSocketLocked: false,
  nextOrderedRuneIndex: 1,
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
      setZoomFactor: (zoom: number) => void;
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
  const [zoomFactor, setZoomFactor] = useState<number>(1.0);
  const [altitudePanOffset, setAltitudePanOffset] = useState<number>(0);
  const [settingsModalOpen, setSettingsModalOpen] = useState<boolean>(false);
  const [gamepadInfo, setGamepadInfo] = useState<{
    connected: boolean;
    id: string | null;
  }>({ connected: false, id: null });

  const [controlSettings, setControlSettings] = useState<ControlSettings>(
    () => {
      try {
        const raw = localStorage.getItem('hawk_peak_control_settings');
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<ControlSettings>;
          return { ...DEFAULT_CONTROL_SETTINGS, ...parsed };
        }
      } catch {
        // Ignore storage errors
      }
      return DEFAULT_CONTROL_SETTINGS;
    }
  );

  const updateControlSettings = useCallback(
    (patch: Partial<ControlSettings>) => {
      setControlSettings((prev) => {
        const next = { ...prev, ...patch };
        try {
          localStorage.setItem(
            'hawk_peak_control_settings',
            JSON.stringify(next)
          );
        } catch {
          // Ignore storage errors
        }
        return next;
      });
    },
    []
  );

  const [resetSignal, setResetSignal] = useState<number>(0);
  const [initialStartStep, setInitialStartStep] = useState<number>(0);
  const [activeSeed, setActiveSeed] = useState<number>(currentSpireSeed);

  // Toast / Subtitle banners for falls, camera shifts, and biome milestones
  const [tauntBanner, setTauntBanner] = useState<{
    quote: string;
    author: string;
    stepsLost: number;
    fallDropMeters?: number;
    source?: 'gemini' | 'offline_fallback' | 'local';
    loading?: boolean;
  } | null>(null);
  const [screenShakeBanner, setScreenShakeBanner] = useState<{
    active: boolean;
    label: string;
    fallDropMeters: number;
    stepsLost: number;
    trauma: number;
  } | null>(null);
  const [milestoneBanner, setMilestoneBanner] = useState<{
    stepNumber: number;
    title: string;
    subtitle: string;
    color: string;
  } | null>(null);

  // Ghost / Phantom Climber System State
  const [ghostsEnabled, setGhostsEnabled] = useState<boolean>(true);
  const [ghostRuns, setGhostRuns] = useState<GhostTrajectoryRun[]>(() =>
    createSeededRivalGhostRuns()
  );

  // Interactive NPC POV Conversation State + Dynamic AI Free-Form Question State
  const [activeDialogueNpc, setActiveDialogueNpc] =
    useState<TrailNpcData | null>(null);
  const [selectedChoiceIdx, setSelectedChoiceIdx] = useState<number>(0);
  const [npcReplyLine, setNpcReplyLine] = useState<string | null>(null);
  const [npcQuestionInput, setNpcQuestionInput] = useState<string>('');
  const [npcAiLoading, setNpcAiLoading] = useState<boolean>(false);
  const [npcAiSource, setNpcAiSource] = useState<
    'gemini' | 'offline_fallback' | null
  >(null);

  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [copiedReceipt, setCopiedReceipt] = useState<boolean>(false);
  const summitModalDismissedRef = React.useRef<boolean>(false);

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

  const handleZoomOut = useCallback(
    (e?: React.MouseEvent<HTMLButtonElement>) => {
      if (e) e.currentTarget.blur();
      setZoomFactor((prev) => clampCameraZoomFactor(prev - 0.18));
    },
    []
  );

  const handleZoomIn = useCallback(
    (e?: React.MouseEvent<HTMLButtonElement>) => {
      if (e) e.currentTarget.blur();
      setZoomFactor((prev) => {
        const next = clampCameraZoomFactor(prev + 0.18);
        if (next > 0.72) setAltitudePanOffset(0);
        return next;
      });
    },
    []
  );

  const handleToggleWholeWorldZoom = useCallback(
    (e?: React.MouseEvent<HTMLButtonElement>) => {
      if (e) e.currentTarget.blur();
      setZoomFactor((prev) => {
        const isWholeWorld = prev <= 0.68;
        if (isWholeWorld) {
          setAltitudePanOffset(0);
          setVistaOverviewActive(false);
          return 1.0;
        }
        return WHOLE_WORLD_ZOOM_FACTOR;
      });
    },
    []
  );

  useEffect(() => {
    document.body.dataset.state = shellState;
  }, [shellState]);

  const handleTelemetryUpdate = useCallback((payload: TelemetryPayload) => {
    setTelemetry(payload);
    if (payload.won) {
      setFinalSnapshot(payload);
      if (!summitModalDismissedRef.current) {
        setShellState('gameover');
      }
    } else {
      summitModalDismissedRef.current = false;
    }
  }, []);

  const requestLiveFallNarratorRoast = useCallback(
    async (
      fromStep: number,
      toStep: number,
      stepsLost: number,
      fallDropMeters: number,
      initialQuote: string,
      initialAuthor: string
    ) => {
      setTauntBanner({
        quote: initialQuote,
        author: initialAuthor,
        stepsLost,
        fallDropMeters,
        source: 'local',
        loading: true,
      });

      const payload = {
        fromStep,
        toStep,
        stepsLost,
        fallDropMeters,
        rageScore: telemetry.rageScore,
        fallsCount: Math.max(1, telemetry.fallsCount),
        outfitName: selectedOutfit.name,
      };

      try {
        const res = await fetch('/api/narrator/fall-roast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as {
          quote?: string;
          author?: string;
          source?: 'gemini' | 'offline_fallback';
        };
        const finalQuote =
          data.quote?.trim() || buildOfflineFallRoast(payload).quote;
        const finalAuthor = data.author?.trim() || 'Hawk Peak AI Narrator';
        setTauntBanner({
          quote: finalQuote,
          author: finalAuthor,
          stepsLost,
          fallDropMeters,
          source: data.source || 'gemini',
          loading: false,
        });
      } catch {
        const fallback = buildOfflineFallRoast(payload);
        setTauntBanner({
          quote: fallback.quote,
          author: fallback.author,
          stepsLost,
          fallDropMeters,
          source: 'offline_fallback',
          loading: false,
        });
      }
    },
    [telemetry.rageScore, telemetry.fallsCount, selectedOutfit.name]
  );

  const handleTauntTriggered = useCallback(
    (
      quote: string,
      author: string,
      stepsLost: number,
      fromStep = telemetry.currentStep + stepsLost,
      toStep = telemetry.currentStep,
      fallDropMeters = Math.max(1.8, stepsLost * 0.95),
      shakeTrauma = 0.55,
      shakeLabel: string = 'HEAVY IMPACT'
    ) => {
      if (shakeTrauma > 0.05) {
        setScreenShakeBanner({
          active: true,
          label: shakeLabel,
          fallDropMeters,
          stepsLost,
          trauma: shakeTrauma,
        });
        window.setTimeout(() => {
          setScreenShakeBanner(null);
        }, 1150);
      }

      void requestLiveFallNarratorRoast(
        fromStep,
        toStep,
        stepsLost,
        fallDropMeters,
        quote,
        author
      );

      window.setTimeout(() => {
        setTauntBanner((prev) =>
          prev?.stepsLost === stepsLost &&
          prev?.fallDropMeters === fallDropMeters
            ? null
            : prev
        );
      }, 7800);
    },
    [telemetry.currentStep, requestLiveFallNarratorRoast]
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
    setNpcAiSource(null);
  }, []);

  const handleAskNpcQuestion = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!activeDialogueNpc) return;
      const trimmed = npcQuestionInput.trim();
      if (!trimmed || npcAiLoading) return;

      setNpcAiLoading(true);
      const askPayload = {
        npcName: activeDialogueNpc.name,
        npcSpecies: activeDialogueNpc.species,
        npcRole: activeDialogueNpc.role,
        question: trimmed,
        currentStep: Math.round(telemetry.currentStep),
        peakStep: telemetry.peakStep,
        fallsCount: telemetry.fallsCount,
        rageScore: telemetry.rageScore,
      };

      try {
        const res = await fetch('/api/npc/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(askPayload),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as {
          reply?: string;
          source?: 'gemini' | 'offline_fallback';
        };
        const replyText =
          data.reply?.trim() || buildOfflineNpcReply(askPayload);
        setNpcReplyLine(replyText);
        setNpcAiSource(data.source || 'gemini');
        setNpcQuestionInput('');
      } catch {
        const fallbackText = buildOfflineNpcReply(askPayload);
        setNpcReplyLine(fallbackText);
        setNpcAiSource('offline_fallback');
        setNpcQuestionInput('');
      } finally {
        setNpcAiLoading(false);
      }
    },
    [
      activeDialogueNpc,
      npcQuestionInput,
      npcAiLoading,
      telemetry.currentStep,
      telemetry.peakStep,
      telemetry.fallsCount,
      telemetry.rageScore,
    ]
  );

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
      setNpcAiSource(null);
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
      setSettingsModalOpen(false);
      setZoomFactor(1.0);
      setAltitudePanOffset(0);
      setVistaOverviewActive(false);
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
      setSettingsModalOpen(false);
      setZoomFactor(1.0);
      setAltitudePanOffset(0);
      setVistaOverviewActive(false);
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

  const handleGamepadStatusChange = useCallback(
    (connected: boolean, gamepadId: string | null) => {
      setGamepadInfo({ connected, id: gamepadId });
    },
    []
  );

  const handleGamepadAction = useCallback(
    (
      action:
        | 'cycle_camera'
        | 'dialogue_cancel'
        | 'dialogue_confirm'
        | 'dialogue_down'
        | 'dialogue_up'
        | 'next_skin'
        | 'prev_skin'
        | 'start_game'
        | 'toggle_pause'
        | 'toggle_world_zoom'
    ) => {
      if (action === 'toggle_world_zoom') {
        handleToggleWholeWorldZoom();
        return;
      }
      if (action === 'cycle_camera' && shellState === 'playing') {
        cycleCameraAngle();
        return;
      }
      if (action === 'start_game' && shellState === 'title') {
        handleStartGame();
        return;
      }
      if (action === 'toggle_pause') {
        if (shellState === 'playing') {
          setShellState('paused');
        } else if (shellState === 'paused') {
          setShellState('playing');
        }
        return;
      }
      if (action === 'next_skin' || action === 'prev_skin') {
        const idx = CHARACTER_OUTFITS.findIndex((o) => o.id === playerSkin);
        const delta = action === 'next_skin' ? 1 : -1;
        const nextIdx =
          (idx + delta + CHARACTER_OUTFITS.length) % CHARACTER_OUTFITS.length;
        handleSelectSkin(CHARACTER_OUTFITS[nextIdx].id);
        return;
      }
      if (activeDialogueNpc && activeDialogueContext) {
        const choicesList = activeDialogueContext.dynamicChoices;
        if (action === 'dialogue_up') {
          setSelectedChoiceIdx(
            (i) => (i - 1 + choicesList.length) % choicesList.length
          );
        } else if (action === 'dialogue_down') {
          setSelectedChoiceIdx((i) => (i + 1) % choicesList.length);
        } else if (action === 'dialogue_confirm') {
          handleSelectDialogueChoice(
            choicesList[selectedChoiceIdx] || choicesList[0]
          );
        } else if (action === 'dialogue_cancel') {
          setActiveDialogueNpc(null);
          setNpcReplyLine(null);
        }
      }
    },
    [
      shellState,
      playerSkin,
      activeDialogueNpc,
      activeDialogueContext,
      selectedChoiceIdx,
      handleToggleWholeWorldZoom,
      cycleCameraAngle,
      handleStartGame,
      handleSelectSkin,
      handleSelectDialogueChoice,
    ]
  );

  useEffect(() => {
    window.__GAME_DEBUG__ = {
      warpToStep: (step: number) => {
        const isSummit = step >= TOTAL_LEVELS;
        summitModalDismissedRef.current = false;
        document.body.dataset.state = isSummit ? 'gameover' : 'playing';
        setShellState(isSummit ? 'gameover' : 'playing');
        setInitialStartStep(step);
        setCameraMode(getAutoCameraModeForStep(step));
        if (isSummit) {
          setFinalSnapshot((prev) => ({
            ...prev,
            currentStep: TOTAL_LEVELS,
            peakStep: Math.max(prev.peakStep, TOTAL_LEVELS),
            won: true,
          }));
        }
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
      setZoomFactor: (z: number) => setZoomFactor(clampCameraZoomFactor(z)),
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

      if (settingsModalOpen && e.code === 'Escape') {
        e.preventDefault();
        setSettingsModalOpen(false);
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
        if (
          e.code === 'Digit1' ||
          e.code === 'Digit2' ||
          e.code === 'Digit3' ||
          e.code === 'Digit4'
        ) {
          const numIdx = Number(e.code.replace('Digit', '')) - 1;
          if (numIdx >= 0 && numIdx < choicesList.length) {
            e.preventDefault();
            setSelectedChoiceIdx(numIdx);
            handleSelectDialogueChoice(choicesList[numIdx]);
            return;
          }
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
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          handleSelectDialogueChoice(
            choicesList[selectedChoiceIdx] || choicesList[0]
          );
          return;
        }
      }

      // Zoom shortcuts work on both Title Screen (before starting climb) and during Gameplay
      if (e.code === 'Equal' || e.code === 'NumpadAdd') {
        e.preventDefault();
        handleZoomIn();
        return;
      }
      if (e.code === 'Minus' || e.code === 'NumpadSubtract') {
        e.preventDefault();
        handleZoomOut();
        return;
      }
      if (e.code === 'KeyZ') {
        e.preventDefault();
        handleToggleWholeWorldZoom();
        return;
      }

      if (shellState === 'title') {
        if (e.code === 'Digit1') handleSelectSkin('cauldron');
        if (e.code === 'Digit2') handleSelectSkin('frog');
        if (e.code === 'Digit3') handleSelectSkin('chicken');
        if (e.code === 'Digit4') handleSelectSkin('astronaut');
        if (e.code === 'Enter' || e.code === 'Space') {
          if (!settingsModalOpen) {
            e.preventDefault();
            handleStartGame();
          }
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
        setVistaOverviewActive((v) => {
          const next = !v;
          setZoomFactor(next ? WHOLE_WORLD_ZOOM_FACTOR : 1.0);
          if (!next) setAltitudePanOffset(0);
          return next;
        });
      } else if (e.code === 'KeyG' && shellState === 'playing') {
        setGhostsEnabled((g) => !g);
      } else if (e.code === 'KeyT' && shellState === 'playing') {
        const targetNpc =
          telemetry.nearbyNpc || ICONIC_TRAIL_GUIDES[0] || GROUND_STEP_META.npc;
        if (targetNpc) handleOpenNpcDialogue(targetNpc);
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
    settingsModalOpen,
    activeDialogueNpc,
    activeDialogueContext,
    selectedChoiceIdx,
    telemetry.nearbyNpc,
    handleStartGame,
    handleRestartClimb,
    cycleCameraAngle,
    handleSelectDialogueChoice,
    handleOpenNpcDialogue,
    handleSelectSkin,
    handleZoomIn,
    handleZoomOut,
    handleToggleWholeWorldZoom,
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
  const isWholeWorldZoom = zoomFactor <= 0.68;
  const zoomPercentage = Math.round(zoomFactor * 100);

  return (
    <main
      className={`relative w-screen h-screen overflow-hidden bg-[#7ec8e3] select-none transition-transform duration-75 ${
        screenShakeBanner?.active ? 'animate-pulse' : ''
      }`}
    >
      {/* Crimson Impact Vignette Flash on Falls from Height */}
      {screenShakeBanner?.active && (
        <div
          data-testid="screen-shake-vignette"
          className="fixed inset-0 z-20 pointer-events-none transition-opacity duration-300"
          style={{
            boxShadow: 'inset 0 0 90px rgba(220, 38, 38, 0.55)',
          }}
        />
      )}

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
        isPaused={shellState === 'paused' || settingsModalOpen}
        isTitlePreview={shellState === 'title'}
        initialStartStep={initialStartStep}
        zoomFactor={zoomFactor}
        altitudePanOffset={altitudePanOffset}
        onZoomChange={setZoomFactor}
        onAltitudePanChange={setAltitudePanOffset}
        controlSettings={controlSettings}
        onGamepadStatusChange={handleGamepadStatusChange}
        onGamepadAction={handleGamepadAction}
        ghostsEnabled={ghostsEnabled}
        onGhostRunsChange={setGhostRuns}
      />

      {/* 2. FIVE-STAR GAME LOBBY TITLE SCREEN:
          - Zero overlapping, non-scrollable, 85% open 3D hero stage
          - Fancy Woodblock "HAWK PEAK 500" emblem + Whole-World Zoom Scout Controls + Controller Settings
          - Bottom bar holds the 4 selectable Hiker Outfits (no scrollbar) + Giant Golden PLAY HIKE CTA */}
      {shellState === 'title' && (
        <div
          data-testid="title-screen-overlay"
          className="fixed inset-0 z-20 flex flex-col justify-between p-3 sm:p-5 pointer-events-none overflow-hidden select-none"
          style={{
            background:
              'radial-gradient(circle at 50% 42%, rgba(254,243,199,0.0) 0%, rgba(16,12,8,0.14) 64%, rgba(10,7,4,0.52) 100%)',
          }}
        >
          {/* Atmospheric Drifting Alpine Mist Layers */}
          <div className="title-mist-ribbon-a absolute inset-x-[-15%] top-[18%] h-[38%] z-0" />
          <div className="title-mist-ribbon-b absolute inset-x-[-15%] bottom-[14%] h-[34%] z-0" />

          {/* TOP BAR: FANCY "HAWK PEAK 500" EMBLEM (Left) & WORLD ZOOM SCOUT + CONTROLLER SETTINGS + AUDIO (Right) */}
          <div className="relative z-10 flex items-center justify-between gap-2 sm:gap-3 pointer-events-auto shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <svg
                viewBox="0 0 478 68"
                className="w-[210px] sm:w-[310px] md:w-[380px] h-auto drop-shadow-[0_6px_0_rgba(18,10,5,0.95)] shrink-0"
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
                  <circle
                    cx="31"
                    cy="12"
                    r="4.2"
                    fill="#fef08a"
                    stroke="#120904"
                    strokeWidth="1.8"
                  />
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

            {/* Top-Right: Whole-World Zoom Scout Bar + Controller & Aim Settings + Audio Toggle */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 watch-hide">
              {/* Zoom Out / Whole-World Scout / Zoom In Bar */}
              <div className="game-skew-plate px-2 py-1.5 rounded-md flex items-center gap-1">
                <div className="game-unskew flex items-center gap-1">
                  <button
                    type="button"
                    data-testid="title-zoom-out-btn"
                    onClick={handleZoomOut}
                    title="Zoom Out to see more stages [- / Scroll Wheel]"
                    aria-label="Zoom Out World View"
                    className="px-2 py-1 rounded bg-[#181009] hover:bg-[#2e1f12] text-[#fef08a] font-mono-tabular font-black text-xs cursor-pointer"
                  >
                    −
                  </button>

                  <button
                    type="button"
                    data-testid="title-world-view-btn"
                    onClick={handleToggleWholeWorldZoom}
                    title="Toggle Whole-World Stage Preview before starting the climb [Press Z]"
                    className={`px-2.5 py-1 rounded font-mono-tabular font-black text-[10px] sm:text-xs cursor-pointer transition-colors ${
                      isWholeWorldZoom
                        ? 'bg-[#facc15] text-[#1c1008]'
                        : 'bg-[#181009]/80 hover:bg-[#2e1f12] text-[#fbf3db]'
                    }`}
                  >
                    {isWholeWorldZoom
                      ? `WORLD VIEW (${zoomPercentage}%)`
                      : `SCOUT WORLD [Z] (${zoomPercentage}%)`}
                  </button>

                  <button
                    type="button"
                    data-testid="title-zoom-in-btn"
                    onClick={handleZoomIn}
                    title="Zoom In [+ / Scroll Wheel]"
                    aria-label="Zoom In World View"
                    className="px-2 py-1 rounded bg-[#181009] hover:bg-[#2e1f12] text-[#fef08a] font-mono-tabular font-black text-xs cursor-pointer"
                  >
                    +
                  </button>

                  {/* Altitude Pan up/down spire when zoomed out */}
                  {isWholeWorldZoom && (
                    <div className="flex items-center gap-0.5 pl-1 border-l border-amber-500/30">
                      <button
                        type="button"
                        data-testid="title-pan-up-btn"
                        onClick={() =>
                          setAltitudePanOffset((p) => Math.min(85, p + 12))
                        }
                        title="Pan Camera Up the Spire Stages"
                        aria-label="Pan Camera Up Spire"
                        className="px-1.5 py-1 rounded bg-[#181009] hover:bg-[#2e1f12] text-amber-300 font-mono-tabular font-black text-[10px] cursor-pointer"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        data-testid="title-pan-down-btn"
                        onClick={() =>
                          setAltitudePanOffset((p) => Math.max(-18, p - 12))
                        }
                        title="Pan Camera Down to Valley Sanctuary"
                        aria-label="Pan Camera Down Spire"
                        className="px-1.5 py-1 rounded bg-[#181009] hover:bg-[#2e1f12] text-amber-300 font-mono-tabular font-black text-[10px] cursor-pointer"
                      >
                        ▼
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Controller & Aim Settings Button */}
              <button
                type="button"
                data-testid="open-settings-btn"
                onClick={() => setSettingsModalOpen(true)}
                aria-label="Controller & Aim Settings"
                title="Configure Mouse Aim, Zoom & Controller Settings"
                className="game-skew-plate px-3 py-2 rounded-md hover:brightness-110 cursor-pointer"
              >
                <div className="game-unskew flex items-center gap-1.5">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0">
                    <path
                      d="M6 9H18C20.2 9 22 10.8 22 13V15C22 17.2 20.2 19 18 19H16.5L14.5 16H9.5L7.5 19H6C3.8 19 2 17.2 2 15V13C2 10.8 3.8 9 6 9Z"
                      fill="#fbf3db"
                      stroke="#120904"
                      strokeWidth="1.6"
                    />
                    <circle cx="7.5" cy="13.5" r="1.4" fill="#120904" />
                    <circle cx="16.5" cy="12.5" r="1.1" fill="#ef4444" />
                    <circle cx="18.3" cy="14.3" r="1.1" fill="#4ade80" />
                  </svg>
                  <span className="hidden md:inline font-display text-xs font-black text-[#fbf3db] tracking-wide">
                    CONTROLS
                  </span>
                  {gamepadInfo.connected && (
                    <span className="w-2 h-2 rounded-full bg-[#4ade80] shadow-[0_0_6px_#4ade80]" />
                  )}
                </div>
              </button>

              {/* Audio Mute Toggle */}
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
          - Top-right: Zoom [- / + / World Z], Camera Angle badge [C], Vista [V], Controls, Mute [M], Pause [P]
          - Bottom: Completely clean */}
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

                {/* Per-Stage Random Difficulty Rating Badge (1/10 to 10/10) */}
                <div
                  data-testid="hud-stage-difficulty-badge"
                  title={telemetry.stepTitle}
                  className={`px-3 py-1.5 rounded-xl border-2 text-[10px] sm:text-xs font-mono-tabular font-black tracking-wider uppercase shadow flex items-center gap-1.5 ${
                    telemetry.stepDifficulty >= 8
                      ? 'bg-rose-950/90 text-rose-200 border-rose-400'
                      : telemetry.stepDifficulty >= 5
                      ? 'bg-amber-950/90 text-amber-200 border-amber-400'
                      : 'bg-emerald-950/90 text-emerald-200 border-emerald-400'
                  }`}
                >
                  <span>
                    DIFF {telemetry.stepDifficulty}/10 ·{' '}
                    {telemetry.stepDifficulty >= 8
                      ? 'EXTREME GAUNTLET'
                      : telemetry.stepDifficulty >= 5
                      ? 'SISYPHEAN TRIAL'
                      : 'CALM LEDGE'}
                  </span>
                </div>

                {/* Atmospheric Layer Indicator */}
                <div
                  data-testid="hud-atmosphere-badge"
                  className={`px-3 py-1.5 rounded-xl border text-[10px] sm:text-xs font-mono-tabular font-black tracking-wider uppercase shadow watch-hide ${atmoMeta.colorClass}`}
                >
                  {atmoMeta.badge}
                </div>

                {/* Active Stage Puzzle & Gate Status Badge */}
                {(telemetry.totalRuneCount > 0 ||
                  telemetry.requiresBoulderSocket) && (
                  <div
                    data-testid="hud-rune-status"
                    className={`px-3 py-1.5 rounded-xl border-2 text-xs font-mono-tabular font-black flex items-center gap-1.5 shadow ${
                      telemetry.stepGateUnlocked
                        ? 'bg-emerald-950/90 text-emerald-300 border-emerald-400'
                        : telemetry.puzzleType === 'ordered_runes'
                        ? 'bg-cyan-950/90 text-cyan-200 border-cyan-400'
                        : telemetry.puzzleType === 'timed_runes'
                        ? 'bg-orange-950/90 text-orange-200 border-orange-400'
                        : telemetry.puzzleType === 'boulder_socket'
                        ? 'bg-amber-950/90 text-amber-200 border-amber-400'
                        : 'bg-amber-950/90 text-amber-300 border-amber-400'
                    }`}
                  >
                    <span>
                      {telemetry.stepGateUnlocked
                        ? `PUZZLE SOLVED · GATE UNLOCKED (${telemetry.totalRuneCount}/${telemetry.totalRuneCount})`
                        : telemetry.puzzleType === 'boulder_socket'
                        ? `SISYPHUS STONE: ${
                            telemetry.boulderSocketLocked
                              ? 'SOCKETED ✓'
                              : 'DRIVE UPHILL TO SOCKET (ROLLS BACK!)'
                          } + RUNE ${telemetry.activeRuneCount}/${telemetry.totalRuneCount}`
                        : telemetry.puzzleType === 'ordered_runes'
                        ? `HARMONIC RUNES: DECIPHER SEQUENCE (${telemetry.activeRuneCount}/${telemetry.totalRuneCount})`
                        : telemetry.puzzleType === 'timed_runes'
                        ? `⏱ TIMED RUNE RELAY: ${
                            telemetry.runeTimeRemaining > 0
                              ? `${telemetry.runeTimeRemaining.toFixed(1)}s`
                              : 'READY'
                          } (${telemetry.activeRuneCount}/${telemetry.totalRuneCount})`
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

                {/* Contextual Player POV Talk to NPC / Trail Guides Button */}
                <button
                  type="button"
                  data-testid="talk-npc-btn"
                  onClick={() =>
                    handleOpenNpcDialogue(
                      telemetry.nearbyNpc ||
                        ICONIC_TRAIL_GUIDES[0] ||
                        GROUND_STEP_META.npc!
                    )
                  }
                  className={`px-3 py-1.5 rounded-xl border-2 border-[#1c1008] shadow font-extrabold text-xs cursor-pointer flex items-center gap-1.5 ${
                    telemetry.nearbyNpcBlocking
                      ? 'bg-rose-600 hover:bg-rose-500 text-white'
                      : 'bg-[#f3e9d2] hover:bg-amber-200 text-[#241911]'
                  }`}
                >
                  <span>
                    {telemetry.nearbyNpc
                      ? telemetry.nearbyNpcBlocking
                        ? `POV Confront ${telemetry.nearbyNpc.name} [E]`
                        : `POV Talk to ${telemetry.nearbyNpc.name} [E]`
                      : 'Ask Trail Guides (AI) [T]'}
                  </span>
                </button>

                {/* Screen-Shake Fall Impact Badge */}
                {screenShakeBanner?.active && (
                  <div
                    data-testid="screen-shake-badge"
                    className="px-3 py-1.5 rounded-xl bg-rose-950/95 border-2 border-rose-400 text-rose-200 text-xs font-mono-tabular font-black uppercase shadow-lg"
                  >
                    {screenShakeBanner.label} · -
                    {screenShakeBanner.fallDropMeters.toFixed(1)}m DROP
                  </div>
                )}

                {/* Reopen Summit 500 Victory Card when Exploring 3D Summit */}
                {telemetry.won && (
                  <button
                    type="button"
                    data-testid="reopen-victory-modal-btn"
                    onClick={() => {
                      summitModalDismissedRef.current = false;
                      setFinalSnapshot(telemetry);
                      setShellState('gameover');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 border-2 border-[#1c1008] font-mono-tabular font-black text-xs cursor-pointer shadow"
                  >
                    ★ SUMMIT 500 VICTORY CARD
                  </button>
                )}
              </div>
            </div>

            {/* Top-Right Cluster: Ghosts [G], Zoom [- / +], Camera Angle [C], Vista [V], Controls, Mute [M], Pause [P] */}
            <div className="pointer-events-auto flex flex-col items-end gap-1.5 shrink-0">
              <div className="flex items-center gap-1.5">
                {/* 3D Ghost / Phantom Climber Toggle Button */}
                <button
                  type="button"
                  tabIndex={-1}
                  data-testid="hud-ghosts-btn"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    setGhostsEnabled((g) => !g);
                  }}
                  title="Toggle 3D Phantom Climber Ghosts (Your Past Best Runs & Rival Climbers) [Press G]"
                  className={`timber-plaque px-2.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer watch-hide hover:brightness-110 ${
                    ghostsEnabled ? 'text-cyan-300' : 'text-stone-400 opacity-75'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      ghostsEnabled
                        ? 'bg-cyan-300 shadow-[0_0_6px_#67e8f9]'
                        : 'bg-stone-500'
                    }`}
                  />
                  <span>
                    Ghosts {ghostsEnabled ? `ON (${ghostRuns.length})` : 'OFF'}{' '}
                    [G]
                  </span>
                </button>

                {/* Compact HUD Zoom Controls */}
                <div className="timber-plaque px-2 py-1.5 rounded-xl flex items-center gap-1 watch-hide">
                  <button
                    type="button"
                    tabIndex={-1}
                    data-testid="hud-zoom-out-btn"
                    onClick={handleZoomOut}
                    title="Zoom Out [- / Scroll Wheel / LB]"
                    aria-label="Zoom Out"
                    className="px-1.5 py-0.5 rounded bg-black/35 hover:bg-black/55 text-amber-300 font-mono-tabular font-black text-xs cursor-pointer"
                  >
                    −
                  </button>
                  <button
                    type="button"
                    tabIndex={-1}
                    data-testid="hud-world-zoom-btn"
                    onClick={handleToggleWholeWorldZoom}
                    title="Toggle Whole-World Stage Zoom [Press Z / Select]"
                    className="px-1.5 py-0.5 text-[10px] font-mono-tabular font-black text-amber-100 hover:text-amber-300 cursor-pointer"
                  >
                    {zoomPercentage}%
                  </button>
                  <button
                    type="button"
                    tabIndex={-1}
                    data-testid="hud-zoom-in-btn"
                    onClick={handleZoomIn}
                    title="Zoom In [+ / Scroll Wheel / RB]"
                    aria-label="Zoom In"
                    className="px-1.5 py-0.5 rounded bg-black/35 hover:bg-black/55 text-amber-300 font-mono-tabular font-black text-xs cursor-pointer"
                  >
                    +
                  </button>
                </div>

                <button
                  type="button"
                  tabIndex={-1}
                  data-testid="camera-angle-btn"
                  onClick={cycleCameraAngle}
                  aria-label={`Switch Camera Angle [C]: ${activeCamPreset.shortLabel}`}
                  title={`Camera shifts automatically every 12 stages · Current: ${activeCamPreset.label} [Press C / Y]`}
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
                    setVistaOverviewActive((v) => {
                      const next = !v;
                      setZoomFactor(next ? WHOLE_WORLD_ZOOM_FACTOR : 1.0);
                      if (!next) setAltitudePanOffset(0);
                      return next;
                    });
                  }}
                  aria-label="Trail Vista Overview [V]"
                  title="Toggle Whole-World Vista [Press V / Z]"
                  className="timber-plaque px-2.5 py-2 rounded-xl text-amber-300 text-xs font-bold cursor-pointer watch-hide hover:brightness-110"
                >
                  {vistaOverviewActive || isWholeWorldZoom
                    ? 'Close Vista [V]'
                    : 'Vista [V]'}
                </button>

                <button
                  type="button"
                  tabIndex={-1}
                  data-testid="hud-settings-btn"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    setSettingsModalOpen(true);
                  }}
                  aria-label="Controller & Aim Settings"
                  title="Controller & Mouse Aim Settings"
                  className="voxel-btn-neutral min-w-[38px] min-h-[38px] sm:min-w-[42px] sm:min-h-[42px] px-2 rounded-xl flex items-center justify-center cursor-pointer watch-hide relative"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4">
                    <path
                      d="M6 9H18C20.2 9 22 10.8 22 13V15C22 17.2 20.2 19 18 19H16.5L14.5 16H9.5L7.5 19H6C3.8 19 2 17.2 2 15V13C2 10.8 3.8 9 6 9Z"
                      fill="#1c1008"
                    />
                    <circle cx="7.5" cy="13.5" r="1.3" fill="#fef08a" />
                    <circle cx="16.5" cy="13.5" r="1.3" fill="#4ade80" />
                  </svg>
                  {gamepadInfo.connected && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-black" />
                  )}
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
            <div className="fixed top-28 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
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

          {/* WITCHER 3 STYLE FRAMELESS OVER-THE-SHOULDER NPC DIALOGUE HUD:
              - Unobstructed 3D characters (Player on left, NPC on right-center)
              - Bottom-right numbered bracketed choices + golden diamond status bar
              - Centered frameless spoken subtitle line at the bottom */}
          {activeDialogueNpc && activeDialogueContext && (
            <div
              role="dialog"
              aria-label={`POV Conversation with ${activeDialogueNpc.name}`}
              className="fixed inset-0 z-30 pointer-events-none flex flex-col justify-end select-none"
              style={{
                background:
                  'linear-gradient(to top, rgba(5, 4, 3, 0.88) 0%, rgba(8, 6, 4, 0.46) 24%, rgba(8, 6, 4, 0.0) 52%)',
              }}
            >
              {/* Bottom-Right Choice Cluster + Witcher-Style Golden Diamond Status Bar */}
              <div className="w-full px-4 sm:px-10 md:px-16 pb-4 sm:pb-6 flex flex-col sm:flex-row items-end sm:items-center justify-end gap-4 sm:gap-8 pointer-events-auto">
                {/* Left of choices: Witcher-3 "Time left to decide" style status bar & golden diamond emblem */}
                <div className="flex flex-col items-end sm:items-center gap-1.5 shrink-0">
                  <div className="flex items-center gap-2">
                    <span
                      data-testid="npc-stance-badge"
                      className="text-xs sm:text-sm font-semibold tracking-wide text-[#f8fafc] witcher-subtitle-text"
                    >
                      {activeDialogueContext.isBlockingNow
                        ? `Blocking Stage ${telemetry.currentStep} · Decide`
                        : activeDialogueNpc.blocksPathByDefault
                        ? 'Launch Lane Cleared'
                        : `${activeDialogueNpc.name} · ${activeDialogueNpc.role}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveDialogueNpc(null);
                        setNpcReplyLine(null);
                      }}
                      className="text-[11px] font-mono-tabular font-bold text-amber-300/85 hover:text-amber-200 witcher-subtitle-text cursor-pointer"
                    >
                      [ESC]
                    </button>
                  </div>

                  {/* Golden Diamond Icon + Horizontal Amber Bar */}
                  <div className="flex items-center gap-2">
                    <svg
                      viewBox="0 0 24 24"
                      className="w-5 h-5 shrink-0 drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]"
                    >
                      <polygon
                        points="12,2 22,12 12,22 2,12"
                        fill="#1c1309"
                        stroke="#fbbf24"
                        strokeWidth="2.2"
                      />
                      <polygon
                        points="12,6 18,12 12,18 6,12"
                        fill="#f59e0b"
                      />
                    </svg>
                    <div className="w-36 sm:w-44 h-2 bg-black/80 border border-amber-500/40 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          activeDialogueContext.isBlockingNow
                            ? 'w-[72%] bg-gradient-to-r from-amber-500 to-yellow-400'
                            : 'w-full bg-gradient-to-r from-amber-400 to-yellow-300'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Bottom-Right Numbered Bracketed Dialogue Choices + Dynamic AI Question Input */}
                <div className="flex flex-col items-start gap-1.5 w-full sm:w-auto min-w-[270px] sm:min-w-[350px] max-w-md">
                  {/* Trail Guide Switcher (Bear / Hermit Goat / Cynical Crow) */}
                  <div className="flex flex-wrap items-center gap-1 pb-1">
                    {ICONIC_TRAIL_GUIDES.map((guide) => {
                      const isCurrent =
                        activeDialogueNpc.species === guide.species ||
                        activeDialogueNpc.name === guide.name;
                      return (
                        <button
                          key={guide.id}
                          type="button"
                          data-testid={`switch-guide-${guide.species}`}
                          onClick={() => handleOpenNpcDialogue(guide)}
                          className={`px-2 py-0.5 rounded text-[11px] font-mono-tabular font-bold border cursor-pointer transition-colors ${
                            isCurrent
                              ? 'bg-amber-400 text-zinc-950 border-amber-200'
                              : 'bg-black/65 text-amber-200/85 border-amber-500/35 hover:bg-black/85'
                          }`}
                        >
                          {guide.name} ({guide.species.toUpperCase()})
                        </button>
                      );
                    })}
                  </div>

                  {activeDialogueContext.dynamicChoices.map((ch, idx) => {
                    const isSelected = idx === selectedChoiceIdx;
                    const formattedChoice =
                      ch.label.charAt(0).toUpperCase() + ch.label.slice(1);
                    return (
                      <button
                        key={ch.label}
                        type="button"
                        data-testid={`npc-choice-${ch.action}`}
                        onMouseEnter={() => setSelectedChoiceIdx(idx)}
                        onClick={() => {
                          setSelectedChoiceIdx(idx);
                          handleSelectDialogueChoice(ch);
                        }}
                        className={`w-full text-left px-3 py-1 text-sm sm:text-base font-semibold tracking-wide flex items-center gap-2 cursor-pointer ${
                          isSelected
                            ? 'witcher-choice-row-active'
                            : 'witcher-choice-row'
                        }`}
                      >
                        <span className="w-4 text-[#fbbf24] text-sm sm:text-base shrink-0">
                          {isSelected ? '▸' : ''}
                        </span>
                        <span>
                          {idx + 1}. [{formattedChoice}]
                        </span>
                      </button>
                    );
                  })}

                  {/* Free-Form Gemini AI Question Input */}
                  <form
                    data-testid="npc-ai-form"
                    onSubmit={handleAskNpcQuestion}
                    className="w-full pt-1.5 flex items-center gap-1.5"
                  >
                    <input
                      type="text"
                      data-testid="npc-question-input"
                      aria-label="Ask the trail guide a question"
                      value={npcQuestionInput}
                      onChange={(e) => setNpcQuestionInput(e.target.value)}
                      placeholder={`Ask ${activeDialogueNpc.name} anything...`}
                      maxLength={200}
                      className="flex-1 px-2.5 py-1.5 rounded bg-black/75 border border-amber-400/50 text-amber-100 placeholder-amber-200/45 text-xs sm:text-sm focus:outline-none focus:border-amber-300"
                    />
                    <button
                      type="submit"
                      data-testid="npc-ask-submit-btn"
                      disabled={npcAiLoading || !npcQuestionInput.trim()}
                      className="px-3 py-1.5 rounded bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-zinc-950 font-mono-tabular font-black text-xs cursor-pointer shrink-0"
                    >
                      {npcAiLoading ? 'Asking...' : 'Ask AI'}
                    </button>
                  </form>
                </div>
              </div>

              {/* Bottom-Center Frameless Spoken Subtitle Line */}
              <div className="w-full px-4 sm:px-12 pb-5 sm:pb-7 text-center pointer-events-auto">
                <p
                  data-testid="npc-spoken-subtitle"
                  className="mx-auto max-w-3xl text-sm sm:text-lg font-medium leading-relaxed witcher-subtitle-text"
                >
                  <span className="text-[#fbbf24] font-semibold">
                    {activeDialogueNpc.name}:{' '}
                  </span>
                  {npcReplyLine || activeDialogueContext.greeting}
                  {npcAiSource && (
                    <span className="ml-2 inline-block px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/40 text-[10px] font-mono-tabular text-amber-300 align-middle">
                      {npcAiSource === 'gemini' ? 'GEMINI AI' : 'TRAIL LORE'}
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Live Gemini AI Narrator Fall Roast or NPC Bark Banner when not in active dialogue */}
          {!activeDialogueNpc &&
            (tauntBanner || telemetry.nearbyNpcBark) && (
              <div className="mx-auto mb-2 max-w-xl w-[92vw] pointer-events-auto watch-hide">
                <div
                  data-testid="ai-narrator-banner"
                  onClick={() => {
                    if (telemetry.nearbyNpc) {
                      handleOpenNpcDialogue(telemetry.nearbyNpc);
                    }
                  }}
                  className="parchment-sheet px-4 py-2.5 rounded-xl cursor-pointer text-center shadow-lg space-y-1"
                >
                  {tauntBanner ? (
                    <>
                      <div className="flex items-center justify-center gap-2 text-[10px] font-mono-tabular font-black uppercase tracking-wider text-amber-900">
                        <span>
                          {tauntBanner.source === 'gemini'
                            ? '● GEMINI AI LIVE NARRATOR'
                            : tauntBanner.loading
                            ? '● AI NARRATOR ANALYZING FALL...'
                            : '● HAWK PEAK LIVE NARRATOR'}
                        </span>
                        {typeof tauntBanner.fallDropMeters === 'number' && (
                          <span className="text-rose-700">
                            · -{tauntBanner.fallDropMeters.toFixed(1)}m DROP (-
                            {tauntBanner.stepsLost} STAGES)
                          </span>
                        )}
                      </div>
                      <p
                        data-testid="ai-narrator-quote"
                        className="text-xs sm:text-sm font-black leading-snug text-zinc-900"
                      >
                        &ldquo;{tauntBanner.quote}&rdquo; — {tauntBanner.author}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs sm:text-sm font-black leading-snug">
                      {telemetry.nearbyNpcBark}
                    </p>
                  )}
                </div>
              </div>
            )}
        </div>
      )}

      {/* 4. PAUSED MODAL */}
      {shellState === 'paused' && !settingsModalOpen && (
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
                onClick={() => setSettingsModalOpen(true)}
                className="voxel-btn-yellow w-full py-2.5 text-sm min-h-[44px] cursor-pointer"
              >
                Controller &amp; Aim Settings
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

      {/* 5. CONTROLLER, MOUSE AIM, WORLD ZOOM & GHOST MODE SETTINGS MODAL (Non-Scrollable, Fits Game Screen Dimensions) */}
      {settingsModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Controller and Aim Settings"
          data-testid="settings-modal"
          className="fixed inset-0 z-40 flex items-center justify-center p-2.5 sm:p-4 pointer-events-auto overflow-hidden"
          style={{ backgroundColor: 'rgba(18, 12, 7, 0.85)' }}
        >
          <div className="voxel-panel w-full max-w-3xl max-h-[calc(100vh-20px)] overflow-hidden p-3.5 sm:p-4 space-y-2.5 rounded-2xl flex flex-col justify-between">
            {/* Header Row */}
            <div className="flex items-center justify-between gap-3 shrink-0">
              <div>
                <div className="text-[10px] font-mono-tabular font-black text-amber-800 uppercase leading-tight">
                  Hawk Peak 500 · Input, Optics &amp; Ghost Climber Configuration
                </div>
                <h2 className="font-display text-lg sm:text-xl font-black text-zinc-900 leading-tight">
                  Mouse Aim, Zoom, Ghost Mode &amp; Controller Settings
                </h2>
              </div>
              <button
                type="button"
                data-testid="close-settings-btn"
                onClick={() => setSettingsModalOpen(false)}
                className="voxel-btn-neutral px-3 py-1.5 text-xs font-black rounded-lg cursor-pointer shrink-0"
              >
                Close [Esc]
              </button>
            </div>

            {/* Live Gamepad Status + Ghost Mode Quick Banner Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 shrink-0">
              <div
                data-testid="gamepad-status-banner"
                className={`px-3 py-2 rounded-xl border-2 flex items-center justify-between gap-2 ${
                  gamepadInfo.connected
                    ? 'bg-emerald-950 text-emerald-200 border-emerald-500'
                    : 'bg-stone-900 text-amber-100 border-stone-700'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      gamepadInfo.connected
                        ? 'bg-emerald-400 shadow-[0_0_8px_#4ade80]'
                        : 'bg-amber-400'
                    }`}
                  />
                  <div className="truncate">
                    <div className="text-[11px] font-black uppercase tracking-wider leading-tight">
                      {gamepadInfo.connected
                        ? 'Controller Connected & Ready'
                        : 'Controller Standby (Xbox / DualSense / Pro)'}
                    </div>
                    <div className="text-[10px] font-mono-tabular opacity-85 truncate">
                      {gamepadInfo.connected
                        ? gamepadInfo.id
                        : 'Press any button on your controller to pair'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Dedicated Ghost / Phantom Climber Enable / Disable Control */}
              <div className="px-3 py-2 bg-cyan-950 text-cyan-100 border-2 border-cyan-500/60 rounded-xl flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[11px] font-black uppercase tracking-wider text-cyan-200 leading-tight">
                    3D Ghost / Phantom Climber Mode
                  </div>
                  <div className="text-[10px] font-mono-tabular text-cyan-100/80 truncate">
                    Replay past jump arcs &amp; rival ghosts ({ghostRuns.length}{' '}
                    active) [Key G]
                  </div>
                </div>
                <button
                  type="button"
                  data-testid="settings-toggle-ghosts-btn"
                  onClick={() => setGhostsEnabled((g) => !g)}
                  className={`px-3 py-1 rounded-lg border-2 border-[#18181b] font-mono-tabular font-black text-xs cursor-pointer shrink-0 ${
                    ghostsEnabled
                      ? 'bg-cyan-400 text-zinc-950'
                      : 'bg-stone-300 text-stone-700'
                  }`}
                >
                  {ghostsEnabled ? 'ENABLED' : 'DISABLED'}
                </button>
              </div>
            </div>

            {/* 2-Column Main Settings Grid (Zero Vertical Scrolling) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 shrink-0">
              {/* Left Column: Mouse Aiming & World Zoom */}
              <div className="p-3 bg-amber-50/90 border-2 border-[#18181b] rounded-xl space-y-2.5 flex flex-col justify-between">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="font-display text-xs sm:text-sm font-black text-zinc-900 leading-tight">
                      Mouse Cursor Next-Stage Aiming
                    </div>
                    <div className="text-[10px] text-stone-700 leading-tight">
                      Aim jump direction toward the next stage with your mouse.
                    </div>
                  </div>
                  <button
                    type="button"
                    data-testid="toggle-mouse-aim-btn"
                    onClick={() =>
                      updateControlSettings({
                        mouseAimEnabled: !controlSettings.mouseAimEnabled,
                      })
                    }
                    className={`px-2.5 py-1 rounded-lg border-2 border-[#18181b] font-mono-tabular font-black text-xs cursor-pointer shrink-0 ${
                      controlSettings.mouseAimEnabled
                        ? 'bg-emerald-500 text-zinc-950'
                        : 'bg-stone-300 text-stone-700'
                    }`}
                  >
                    {controlSettings.mouseAimEnabled ? 'ENABLED' : 'DISABLED'}
                  </button>
                </div>

                <div className="space-y-0.5">
                  <div className="flex justify-between text-[11px] font-mono-tabular font-bold text-stone-800">
                    <span>Mouse Aim Responsiveness</span>
                    <span>
                      {controlSettings.mouseAimSensitivity.toFixed(2)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.5}
                    max={2.0}
                    step={0.05}
                    value={controlSettings.mouseAimSensitivity}
                    onChange={(e) =>
                      updateControlSettings({
                        mouseAimSensitivity: parseFloat(e.target.value),
                      })
                    }
                    className="w-full h-1.5 accent-amber-600 cursor-pointer"
                  />
                </div>

                <div className="space-y-0.5 pt-1.5 border-t border-amber-900/15">
                  <div className="flex justify-between text-[11px] font-mono-tabular font-bold text-stone-800">
                    <span>Camera Zoom Level (Whole-World Scout)</span>
                    <span>{zoomPercentage}%</span>
                  </div>
                  <input
                    type="range"
                    data-testid="settings-zoom-slider"
                    min={MIN_CAMERA_ZOOM_FACTOR}
                    max={MAX_CAMERA_ZOOM_FACTOR}
                    step={0.02}
                    value={zoomFactor}
                    onChange={(e) =>
                      setZoomFactor(
                        clampCameraZoomFactor(parseFloat(e.target.value))
                      )
                    }
                    className="w-full h-1.5 accent-amber-600 cursor-pointer"
                  />
                </div>
              </div>

              {/* Right Column: Controller Configuration */}
              <div className="p-3 bg-amber-50/90 border-2 border-[#18181b] rounded-xl space-y-2.5 flex flex-col justify-between">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="font-display text-xs sm:text-sm font-black text-zinc-900 leading-tight">
                      Gamepad / Controller Input
                    </div>
                    <div className="text-[10px] text-stone-700 leading-tight">
                      Twin-stick movement, 360° jump aiming &amp; triggers.
                    </div>
                  </div>
                  <button
                    type="button"
                    data-testid="toggle-controller-btn"
                    onClick={() =>
                      updateControlSettings({
                        controllerEnabled: !controlSettings.controllerEnabled,
                      })
                    }
                    className={`px-2.5 py-1 rounded-lg border-2 border-[#18181b] font-mono-tabular font-black text-xs cursor-pointer shrink-0 ${
                      controlSettings.controllerEnabled
                        ? 'bg-emerald-500 text-zinc-950'
                        : 'bg-stone-300 text-stone-700'
                    }`}
                  >
                    {controlSettings.controllerEnabled ? 'ENABLED' : 'DISABLED'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-0.5">
                    <div className="flex justify-between text-[11px] font-mono-tabular font-bold text-stone-800">
                      <span>Deadzone</span>
                      <span>
                        {Math.round(controlSettings.controllerDeadzone * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.08}
                      max={0.4}
                      step={0.02}
                      value={controlSettings.controllerDeadzone}
                      onChange={(e) =>
                        updateControlSettings({
                          controllerDeadzone: parseFloat(e.target.value),
                        })
                      }
                      className="w-full h-1.5 accent-amber-600 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex justify-between text-[11px] font-mono-tabular font-bold text-stone-800">
                      <span>R-Stick Speed</span>
                      <span>
                        {controlSettings.controllerAimSensitivity.toFixed(2)}x
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.5}
                      max={2.0}
                      step={0.05}
                      value={controlSettings.controllerAimSensitivity}
                      onChange={(e) =>
                        updateControlSettings({
                          controllerAimSensitivity: parseFloat(e.target.value),
                        })
                      }
                      className="w-full h-1.5 accent-amber-600 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1 border-t border-amber-900/15">
                  <button
                    type="button"
                    onClick={() =>
                      updateControlSettings({
                        invertControllerY: !controlSettings.invertControllerY,
                      })
                    }
                    className="px-2.5 py-1 rounded-lg border border-stone-800 bg-white text-[11px] font-bold text-stone-900 cursor-pointer"
                  >
                    Invert Y: {controlSettings.invertControllerY ? 'ON' : 'OFF'}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      updateControlSettings({
                        controllerVibration:
                          !controlSettings.controllerVibration,
                      })
                    }
                    className="px-2.5 py-1 rounded-lg border border-stone-800 bg-white text-[11px] font-bold text-stone-900 cursor-pointer"
                  >
                    Rumble: {controlSettings.controllerVibration ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>
            </div>

            {/* Compact Controller Mapping Bar + Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-amber-900/20 shrink-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] font-mono-tabular text-stone-800">
                <span>
                  <strong className="text-zinc-950">L-Stick:</strong> Move
                </span>
                <span>
                  <strong className="text-zinc-950">R-Stick/Mouse:</strong> Aim
                </span>
                <span>
                  <strong className="text-zinc-950">A/RT/Space:</strong> Jump
                </span>
                <span>
                  <strong className="text-zinc-950">G:</strong> Ghosts
                </span>
                <span>
                  <strong className="text-zinc-950">LB/RB/Z:</strong> Zoom
                </span>
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => {
                    updateControlSettings(DEFAULT_CONTROL_SETTINGS);
                    setGhostsEnabled(true);
                    setZoomFactor(1.0);
                    setAltitudePanOffset(0);
                  }}
                  className="voxel-btn-neutral px-3 py-1.5 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Reset Defaults
                </button>
                <button
                  type="button"
                  onClick={() => setSettingsModalOpen(false)}
                  className="voxel-btn-primary px-4 py-1.5 text-xs font-black rounded-xl cursor-pointer"
                >
                  Save &amp; Return
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. SUMMIT / GAME OVER MODAL */}
      {shellState === 'gameover' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={
            finalSnapshot.won ? 'Summit Reached' : 'Climb Retired Summary'
          }
          className="fixed inset-0 z-30 flex items-center justify-center p-4 pointer-events-auto overflow-hidden"
          style={{ backgroundColor: 'rgba(28, 19, 11, 0.84)' }}
        >
          <div className="voxel-panel w-full max-w-lg p-5 sm:p-6 space-y-4 my-auto rounded-2xl">
            <div className="space-y-1">
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

            <div className="p-3.5 bg-[#4f3b22] text-[#fef9c3] border-2 border-[#2b1d10] rounded-xl space-y-1">
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

            <div className="flex flex-wrap items-center gap-2">
              {finalSnapshot.won && (
                <button
                  type="button"
                  data-testid="explore-summit-btn"
                  onClick={() => {
                    summitModalDismissedRef.current = true;
                    document.body.dataset.state = 'playing';
                    setShellState('playing');
                  }}
                  className="voxel-btn-yellow px-4 py-2.5 text-xs sm:text-sm min-h-[42px] cursor-pointer"
                >
                  Admire 3D Summit 500
                </button>
              )}

              <button
                type="button"
                onClick={handleRestartClimb}
                className="voxel-btn-primary flex-1 py-2.5 text-xs sm:text-sm min-h-[42px] cursor-pointer"
              >
                Hike Again from Base Camp
              </button>

              <button
                type="button"
                onClick={handleCopyViralReceipt}
                className="voxel-btn-neutral px-3.5 py-2.5 text-xs sm:text-sm min-h-[42px] cursor-pointer"
              >
                {copiedReceipt ? 'Copied Log!' : 'Copy Receipt'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
