import {
  AtmosphericLayerId,
  GROUND_FLOOR_Y,
  GROUND_SPAWN_X,
  GROUND_SPAWN_Z,
  GROUND_STEP_META,
  LEVELS_500,
  LevelStep,
  NpcDialogueChoice,
  PHILOSOPHICAL_ENDING_QUOTE,
  PHILOSOPHICAL_TAUNTS,
  TOTAL_LEVELS,
  TrailNpcData,
  VALLEY_BRIDGE_BOUNDS,
  VALLEY_LANDMARKS,
  VALLEY_RIVER_BOUNDS,
  VALLEY_SOLID_COLLIDERS,
  currentSpireSeed,
  getAtmosphericLayerForStep,
} from './levels';

export type CameraAngleMode =
  | 'isometric'
  | 'follow'
  | 'side'
  | 'reverse_angle'
  | 'topdown'
  | 'panoramic';

export interface CameraPresetConfig {
  mode: CameraAngleMode;
  label: string;
  shortLabel: string;
  offsetX: number;
  offsetY: number;
  offsetZ: number;
  zoomMultiplier: number;
}

export const CAMERA_ANGLE_PRESETS: Record<CameraAngleMode, CameraPresetConfig> =
  {
    isometric: {
      mode: 'isometric',
      label: '3/4 Expedition Trail View',
      shortLabel: '3/4 Trail',
      offsetX: 14.5,
      offsetY: 14.8,
      offsetZ: 14.5,
      zoomMultiplier: 1.0,
    },
    follow: {
      mode: 'follow',
      label: 'Low Shoulder Pursuit Angle',
      shortLabel: 'Shoulder Cam',
      offsetX: 8.5,
      offsetY: 9.2,
      offsetZ: 14.0,
      zoomMultiplier: 1.18,
    },
    side: {
      mode: 'side',
      label: 'Sheer Precipice Profile',
      shortLabel: 'Cliff Profile',
      offsetX: 18.2,
      offsetY: 8.8,
      offsetZ: 3.2,
      zoomMultiplier: 1.04,
    },
    reverse_angle: {
      mode: 'reverse_angle',
      label: 'Inverted Canyon Vertigo Cam',
      shortLabel: 'Vertigo Angle',
      offsetX: -13.5,
      offsetY: 14.2,
      offsetZ: 13.8,
      zoomMultiplier: 1.02,
    },
    topdown: {
      mode: 'topdown',
      label: 'High Zenith Survey Angle',
      shortLabel: 'Zenith Survey',
      offsetX: 4.2,
      offsetY: 23.5,
      offsetZ: 4.2,
      zoomMultiplier: 0.9,
    },
    panoramic: {
      mode: 'panoramic',
      label: 'Wide Atmospheric Vista',
      shortLabel: 'Wide Vista',
      offsetX: 19.5,
      offsetY: 18.0,
      offsetZ: -14.5,
      zoomMultiplier: 0.82,
    },
  };

export const CAMERA_MODES_ORDER: CameraAngleMode[] = [
  'isometric',
  'follow',
  'side',
  'reverse_angle',
  'topdown',
  'panoramic',
];

export const CAMERA_SHIFT_INTERVAL_STEPS = 12;

/**
 * Automatically selects the camera perspective as the player ascends.
 * Shifts every 12 steps to challenge spatial depth perception and aiming.
 */
export function getAutoCameraModeForStep(stepNumber: number): CameraAngleMode {
  if (stepNumber <= 0) return 'isometric';
  const band = Math.floor(stepNumber / CAMERA_SHIFT_INTERVAL_STEPS);
  return CAMERA_MODES_ORDER[band % CAMERA_MODES_ORDER.length];
}

export interface PlayerState {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  grounded: boolean;
  inRiverWater: boolean;
  onRiverBridge: boolean;
  isCharging: boolean;
  chargeRatio: number; // 0.0 to 1.0
  chargeDirection: 1 | -1; // 1 = rising, -1 = surging back
  chargeHoldTime: number;
  aimAngle: number; // radians in XZ plane
  currentStep: number; // 0 to 500
  peakStep: number; // 0 to 500
  lastStableStep: number;
  fallsCount: number;
  biggestFallLoss: number;
  rageScore: number; // 0 to 100
  activatedRuneIds: string[];
  unlockedGateSteps: number[];
  clearedNpcSteps: number[];
  visitedLandmarks: string[];
  spireMutations: number;
  crumbleTimer: number;
  coyoteTimer: number;
  jumpBufferTimer: number;
  glitchTimer: number;
  teeterAmount: number;
  isTumbling: boolean;
  tumbleSpin: number;
  won: boolean;
}

export interface StepRuntimeOffset {
  offsetX: number;
  offsetZ: number;
  collapsed: boolean;
  collapseWarning: number; // 0..1
  hazardWarning: number; // 0..1
  pusherExtended: number; // 0..1
  boulderRelX: number;
  boulderRelZ: number;
  sweeperAngle: number;
  turntableAngle: number;
  vehicleOffset: number;
  vehicleActive: boolean;
  glitchJitterX: number;
}

export interface LiveWindState {
  windX: number;
  windZ: number;
  strength: number; // 0..1
  angleRad: number;
  label: string;
  compassLabel: string;
}

export const GRAVITY = -22.0;
export const MIN_JUMP_HORIZ_SPEED = 1.6;
export const MAX_JUMP_HORIZ_SPEED = 8.4;
export const MIN_JUMP_VERT_SPEED = 4.8;
export const MAX_JUMP_VERT_SPEED = 10.5;
export const CHARGE_FULL_DURATION = 0.88;
export const GROUND_NUDGE_SPEED = 3.4;
export const AIR_CONTROL_ACCEL = 3.5;
export const PLAYER_COLLISION_RADIUS = 0.31;

export function createInitialPlayerState(startStep = 0): PlayerState {
  if (startStep <= 0) {
    const firstStep = LEVELS_500[0];
    const initialAim = Math.atan2(
      firstStep.z - GROUND_SPAWN_Z,
      firstStep.x - GROUND_SPAWN_X
    );
    return {
      x: GROUND_SPAWN_X,
      y: GROUND_FLOOR_Y,
      z: GROUND_SPAWN_Z,
      vx: 0,
      vy: 0,
      vz: 0,
      grounded: true,
      inRiverWater: false,
      onRiverBridge: false,
      isCharging: false,
      chargeRatio: 0,
      chargeDirection: 1,
      chargeHoldTime: 0,
      aimAngle: initialAim,
      currentStep: 0,
      peakStep: 0,
      lastStableStep: 0,
      fallsCount: 0,
      biggestFallLoss: 0,
      rageScore: 0,
      activatedRuneIds: [],
      unlockedGateSteps: [],
      clearedNpcSteps: [],
      visitedLandmarks: [],
      spireMutations: 0,
      crumbleTimer: 0,
      coyoteTimer: 0.14,
      jumpBufferTimer: 0,
      glitchTimer: 0,
      teeterAmount: 0,
      isTumbling: false,
      tumbleSpin: 0,
      won: false,
    };
  }

  const clampedIdx = Math.max(0, Math.min(TOTAL_LEVELS - 1, startStep - 1));
  const stepObj = LEVELS_500[clampedIdx] || LEVELS_500[0];
  const nextObj =
    LEVELS_500[Math.min(TOTAL_LEVELS - 1, clampedIdx + 1)] || stepObj;

  // Spawn on the safe entry side of the stage deck so the player never spawns inside a central boulder/totem!
  const spawnX = stepObj.x - stepObj.dirX * (stepObj.width * 0.31);
  const spawnZ = stepObj.z - stepObj.dirZ * (stepObj.depth * 0.31);
  const initialAim = Math.atan2(nextObj.z - spawnZ, nextObj.x - spawnX);

  return {
    x: spawnX,
    y: stepObj.y,
    z: spawnZ,
    vx: 0,
    vy: 0,
    vz: 0,
    grounded: true,
    inRiverWater: false,
    onRiverBridge: false,
    isCharging: false,
    chargeRatio: 0,
    chargeDirection: 1,
    chargeHoldTime: 0,
    aimAngle: initialAim,
    currentStep: stepObj.stepNumber,
    peakStep: stepObj.stepNumber,
    lastStableStep: stepObj.stepNumber,
    fallsCount: 0,
    biggestFallLoss: 0,
    rageScore: 0,
    activatedRuneIds: [],
    unlockedGateSteps: [],
    clearedNpcSteps: [],
    visitedLandmarks: [],
    spireMutations: 0,
    crumbleTimer: 0,
    coyoteTimer: 0.14,
    jumpBufferTimer: 0,
    glitchTimer: 0,
    teeterAmount: 0,
    isTumbling: false,
    tumbleSpin: 0,
    won: stepObj.stepNumber >= TOTAL_LEVELS,
  };
}

/**
 * Resolves 2D XZ circle-vs-AABB collision so the player smoothly slides along
 * buildings, trees, boulders, totems, and stage walls without ever clipping through.
 */
export function resolveCircleAabbCollision(
  px: number,
  pz: number,
  radius: number,
  boxCenterX: number,
  boxCenterZ: number,
  halfW: number,
  halfD: number
): { x: number; z: number; collided: boolean; normalX: number; normalZ: number } {
  const closestX = Math.max(
    boxCenterX - halfW,
    Math.min(px, boxCenterX + halfW)
  );
  const closestZ = Math.max(
    boxCenterZ - halfD,
    Math.min(pz, boxCenterZ + halfD)
  );
  const dx = px - closestX;
  const dz = pz - closestZ;
  const distSq = dx * dx + dz * dz;

  if (distSq >= radius * radius) {
    return { x: px, z: pz, collided: false, normalX: 0, normalZ: 0 };
  }

  const dist = Math.sqrt(distSq);
  if (dist > 0.0001) {
    const nx = dx / dist;
    const nz = dz / dist;
    const push = radius - dist;
    return {
      x: px + nx * push,
      z: pz + nz * push,
      collided: true,
      normalX: nx,
      normalZ: nz,
    };
  }

  // Player center is inside the AABB: push out along minimum penetration axis
  const penLeft = Math.abs(px - (boxCenterX - halfW));
  const penRight = Math.abs(boxCenterX + halfW - px);
  const penBack = Math.abs(pz - (boxCenterZ - halfD));
  const penFront = Math.abs(boxCenterZ + halfD - pz);
  const minPen = Math.min(penLeft, penRight, penBack, penFront);

  if (minPen === penLeft) {
    return {
      x: boxCenterX - halfW - radius,
      z: pz,
      collided: true,
      normalX: -1,
      normalZ: 0,
    };
  }
  if (minPen === penRight) {
    return {
      x: boxCenterX + halfW + radius,
      z: pz,
      collided: true,
      normalX: 1,
      normalZ: 0,
    };
  }
  if (minPen === penBack) {
    return {
      x: px,
      z: boxCenterZ - halfD - radius,
      collided: true,
      normalX: 0,
      normalZ: -1,
    };
  }
  return {
    x: px,
    z: boxCenterZ + halfD + radius,
    collided: true,
    normalX: 0,
    normalZ: 1,
  };
}

/**
 * Resolves 2D XZ circle-vs-Oriented Bounding Box (OBB) collision for rotated stage barriers
 * (such as the Locked Rune Gate aligned with step.dirX, step.dirZ).
 */
export function resolveCircleObbCollision(
  px: number,
  pz: number,
  radius: number,
  centerX: number,
  centerZ: number,
  fwdX: number,
  fwdZ: number,
  halfFwd: number,
  halfLat: number
): { x: number; z: number; collided: boolean; normalX: number; normalZ: number } {
  const perpX = -fwdZ;
  const perpZ = fwdX;
  const relX = px - centerX;
  const relZ = pz - centerZ;

  // Transform player into local OBB coordinates (localFwd, localLat)
  const localFwd = relX * fwdX + relZ * fwdZ;
  const localLat = relX * perpX + relZ * perpZ;

  const resLocal = resolveCircleAabbCollision(
    localFwd,
    localLat,
    radius,
    0,
    0,
    halfFwd,
    halfLat
  );
  if (!resLocal.collided) {
    return { x: px, z: pz, collided: false, normalX: 0, normalZ: 0 };
  }

  // Transform resolved local coordinates and normal back to world XZ
  const worldX = centerX + resLocal.x * fwdX + resLocal.z * perpX;
  const worldZ = centerZ + resLocal.x * fwdZ + resLocal.z * perpZ;
  const worldNx = resLocal.normalX * fwdX + resLocal.normalZ * perpX;
  const worldNz = resLocal.normalX * fwdZ + resLocal.normalZ * perpZ;

  return {
    x: worldX,
    z: worldZ,
    collided: true,
    normalX: worldNx,
    normalZ: worldNz,
  };
}

export interface NpcPhysicalState {
  relX: number;
  relZ: number;
  worldX: number;
  worldZ: number;
  facingAngleRad: number;
  isBlockingLane: boolean;
  stance:
    | 'idle'
    | 'blocking_lane'
    | 'stepped_aside'
    | 'waving_helpful'
    | 'mocking_laugh';
  hopOffsetY: number;
  armWaveRad: number;
}

export function computeNpcPhysicalState(
  step: LevelStep,
  state: PlayerState,
  elapsedTime = 0
): NpcPhysicalState | null {
  if (!step.npc) return null;
  const npc = step.npc;
  const isCleared = state.clearedNpcSteps.includes(step.stepNumber);
  const isBlockingLane = npc.blocksPathByDefault && !isCleared;

  const perpX = -step.dirZ;
  const perpZ = step.dirX;

  let relX = npc.relX;
  let relZ = npc.relZ;

  const rt = getStepRuntimeOffset(step, elapsedTime, 0);
  const platX = step.x + rt.offsetX;
  const platZ = step.z + rt.offsetZ;

  const playerOnSameStep = state.currentStep === step.stepNumber;
  if (isBlockingLane) {
    const playerRelX = state.x - platX;
    const playerRelZ = state.z - platZ;
    const playerLat = playerRelX * perpX + playerRelZ * perpZ;
    const patrolWave = playerOnSameStep
      ? Math.max(-0.55, Math.min(0.55, playerLat * 0.78))
      : Math.sin(elapsedTime * 2.4 + step.stepNumber) * 0.42;
    relX = step.dirX * (step.width * 0.28) + perpX * patrolWave;
    relZ = step.dirZ * (step.depth * 0.28) + perpZ * patrolWave;
  } else if (npc.blocksPathByDefault && isCleared) {
    const sideSign = step.stepNumber % 2 === 0 ? 1 : -1;
    relX = perpX * sideSign * (step.width * 0.38);
    relZ = perpZ * sideSign * (step.depth * 0.38);
  }

  const worldX = platX + relX;
  const worldZ = platZ + relZ;
  const distToPlayer = Math.hypot(state.x - worldX, state.z - worldZ);
  const facingAngleRad =
    distToPlayer < 5.0
      ? Math.atan2(state.z - worldZ, state.x - worldX)
      : Math.atan2(-relZ, -relX);

  let stance: NpcPhysicalState['stance'] = 'idle';
  let hopOffsetY = 0;
  let armWaveRad = 0;

  if (npc.blocksPathByDefault && isCleared) {
    stance = 'stepped_aside';
    armWaveRad = 0.55 + Math.sin(elapsedTime * 5) * 0.35;
  } else if (state.isTumbling || state.teeterAmount > 0.35) {
    stance = 'mocking_laugh';
    hopOffsetY = Math.abs(Math.sin(elapsedTime * 11)) * 0.12;
    armWaveRad = Math.sin(elapsedTime * 16) * 0.85;
  } else if (isBlockingLane && distToPlayer < 3.2) {
    stance = 'blocking_lane';
    hopOffsetY = Math.abs(Math.sin(elapsedTime * 6.5)) * 0.06;
    armWaveRad = 0.95 + Math.sin(elapsedTime * 8) * 0.25;
  } else if (distToPlayer < 3.8) {
    stance = npc.behavior === 'cynical' ? 'mocking_laugh' : 'waving_helpful';
    hopOffsetY = Math.abs(Math.sin(elapsedTime * 5.2)) * 0.07;
    armWaveRad = 0.75 + Math.sin(elapsedTime * 9) * 0.45;
  }

  return {
    relX,
    relZ,
    worldX,
    worldZ,
    facingAngleRad,
    isBlockingLane,
    stance,
    hopOffsetY,
    armWaveRad,
  };
}

/**
 * Computes an Over-the-Shoulder / Player POV Camera rig when talking with an NPC.
 */
export function computeNpcPovCameraRig(
  player: PlayerState,
  npcPhys: NpcPhysicalState,
  npcStepY: number,
  elapsedTime = 0
): {
  camPosX: number;
  camPosY: number;
  camPosZ: number;
  lookAtX: number;
  lookAtY: number;
  lookAtZ: number;
  zoom: number;
} {
  const dx = npcPhys.worldX - player.x;
  const dz = npcPhys.worldZ - player.z;
  const dist = Math.max(0.6, Math.hypot(dx, dz));
  const dirX = dx / dist;
  const dirZ = dz / dist;
  // Right-hand perpendicular vector for a cinematic over-the-shoulder POV offset
  const rightX = -dirZ;
  const rightZ = dirX;

  const breath = Math.sin(elapsedTime * 2.2) * 0.04;
  // Place camera just behind and above the player's right shoulder looking directly at the NPC's face
  const camPosX = player.x - dirX * 3.2 + rightX * 1.35;
  const camPosY = Math.max(player.y, npcStepY) + 2.35 + breath;
  const camPosZ = player.z - dirZ * 3.2 + rightZ * 1.35;

  const lookAtX = npcPhys.worldX - dirX * 0.15;
  const lookAtY = npcStepY + 0.68 + npcPhys.hopOffsetY * 0.5;
  const lookAtZ = npcPhys.worldZ - dirZ * 0.15;

  return {
    camPosX,
    camPosY,
    camPosZ,
    lookAtX,
    lookAtY,
    lookAtZ,
    zoom: 2.35,
  };
}

export function clearBlockingNpcForStep(
  state: PlayerState,
  stepNumber = state.currentStep
): boolean {
  if (!state.clearedNpcSteps.includes(stepNumber)) {
    state.clearedNpcSteps.push(stepNumber);
    return true;
  }
  return false;
}

export function getAltitudeAwareNpcDialogue(
  npc: TrailNpcData,
  state: PlayerState,
  elapsedTime = 0
): {
  greeting: string;
  liveBark: string;
  altitudeTier: 'low_valley' | 'mid_mountain' | 'high_summit';
  atmosphericLayer: AtmosphericLayerId;
  isBlockingNow: boolean;
  dynamicChoices: NpcDialogueChoice[];
} {
  const stepNum = state.currentStep;
  const nextStep =
    LEVELS_500[Math.max(0, Math.min(TOTAL_LEVELS - 1, stepNum))] || LEVELS_500[0];
  const curStepObj =
    stepNum <= 0
      ? GROUND_STEP_META
      : LEVELS_500[Math.max(0, Math.min(TOTAL_LEVELS - 1, stepNum - 1))] ||
        LEVELS_500[0];
  const align = computeAimAlignment(
    curStepObj.x,
    curStepObj.y,
    curStepObj.z,
    Math.atan2(nextStep.z - curStepObj.z, nextStep.x - curStepObj.x),
    nextStep,
    elapsedTime
  );
  const wind = getLiveWindVector(elapsedTime, Math.max(1, stepNum));
  const isBlockingNow =
    npc.blocksPathByDefault && !state.clearedNpcSteps.includes(stepNum);
  const atmosphericLayer = getAtmosphericLayerForStep(stepNum);

  const altitudeTier: 'low_valley' | 'mid_mountain' | 'high_summit' =
    stepNum <= 50
      ? 'low_valley'
      : stepNum <= 200
      ? 'mid_mountain'
      : 'high_summit';

  const droppedFromPeak = state.peakStep - stepNum;
  let greeting = npc.greeting;
  let liveBark = npc.idleBark;

  if (isBlockingNow) {
    liveBark = `${npc.name} is blocking the Stage ${stepNum} launch edge! Press [E] for POV confrontation!`;
    greeting = `Hold up, climber! I am standing right across the Stage ${stepNum} launch lane. Up here at ${Math.max(0, Math.round(state.y - GROUND_FLOOR_Y))}m altitude, one sloppy jump sends you tumbling down to the lower stages. Ask me to clear the path when you are ready!`;
  } else if (droppedFromPeak >= 3) {
    liveBark = `${npc.name}: "Didn't you just tumble ${droppedFromPeak} stages down from Stage ${state.peakStep}?!" [E]`;
    greeting = `Yikes! I watched you fall ${droppedFromPeak} stages from Stage ${state.peakStep} right onto this cliff terrace! At least our stone ledge caught you. Want the exact jump telemetry for Stage ${stepNum + 1}?`;
  } else if (atmosphericLayer === 'deep_space') {
    liveBark = `${npc.name} gazes into the nebula at Stage ${stepNum}: "We are in Deep Space! Press [E]!"`;
    greeting = `Stage ${stepNum} of 500—we have officially left the atmosphere and entered Deep Space! Next monolith '${nextStep.title}' is ${nextStep.clearGap.toFixed(1)}m away (~${align.idealChargePercent}% jump power).`;
  } else if (
    atmosphericLayer === 'stratosphere' ||
    atmosphericLayer === 'thermosphere_aurora'
  ) {
    liveBark = `${npc.name} points at the upper atmosphere from Stage ${stepNum}: "Thin air & ${wind.compassLabel} jetstream! [E]"`;
    greeting = `Welcome to the upper atmosphere at Stage ${stepNum}! Above Stage 100 the sky turns to stratospheric indigo and auroras. Clear the rune plates on '${nextStep.title}' and charge to ~${align.idealChargePercent}%!`;
  } else if (altitudeTier === 'low_valley') {
    liveBark = `${npc.name} waves from Stage ${stepNum}: "Need a POV scout of '${nextStep.title}'? Press [E]!"`;
    greeting = `${npc.greeting} Next stage '${nextStep.title}' is ${nextStep.clearGap.toFixed(1)}m ahead—follow the golden launch arrow and charge your jump to ~${align.idealChargePercent}%!`;
  } else {
    liveBark = `${npc.name} smirks at Stage ${stepNum}: "Camera shifts every 12 stages! Talk [E]!"`;
    greeting = `Made it to Stage ${stepNum}! Remember: every 12 stages the camera shifts perspective around the mountain. For '${nextStep.title}', charge to ~${align.idealChargePercent}% with ${wind.compassLabel} wind.`;
  }

  const dynamicChoices: NpcDialogueChoice[] = [];
  if (isBlockingNow) {
    dynamicChoices.push({
      label: 'step aside! clear the launch lane!',
      highlightWord: 'clear the launch lane!',
      response: `Alright, alright! Stepping aside to the outer rim so your launch lane is wide open. Aim for '${nextStep.title}' at ~${align.idealChargePercent}% jump charge!`,
      action: 'clear_path',
    });
  }

  dynamicChoices.push({
    label:
      altitudeTier === 'low_valley'
        ? `scout stage ${stepNum + 1} from this angle`
        : `give me the cynical breakdown for stage ${stepNum + 1}`,
    highlightWord: `stage ${stepNum + 1}`,
    response:
      altitudeTier === 'low_valley'
        ? `Scout Report: Stage ${stepNum + 1} ('${nextStep.title}') has a ${nextStep.clearGap.toFixed(1)}m gap and +${nextStep.vertRise.toFixed(2)}m rise. Clear any Rune Plates on the deck first, then hold Space to ~${align.idealChargePercent}% at the golden launch compass!`
        : `Cynical Report for Stage ${stepNum + 1} ('${nextStep.title}'): ${nextStep.psychologicalTrap} Ideal jump charge is ~${align.idealChargePercent}% (${wind.compassLabel} wind).`,
    action: 'altitude_hint',
  });

  for (const ch of npc.choices) {
    dynamicChoices.push(ch);
  }

  return {
    greeting,
    liveBark,
    altitudeTier,
    atmosphericLayer,
    isBlockingNow,
    dynamicChoices: dynamicChoices.slice(0, 4),
  };
}

export function findNearbyNpc(
  state: PlayerState,
  elapsedTime = 0
): {
  npc: TrailNpcData;
  stepNumber: number;
  stepY: number;
  dist: number;
  phys: NpcPhysicalState;
} | null {
  const candidates: LevelStep[] = [GROUND_STEP_META];
  const curIdx = Math.max(0, state.currentStep - 1);
  for (
    let i = Math.max(0, curIdx - 2);
    i <= Math.min(TOTAL_LEVELS - 1, curIdx + 2);
    i++
  ) {
    candidates.push(LEVELS_500[i]);
  }

  let best: {
    npc: TrailNpcData;
    stepNumber: number;
    stepY: number;
    dist: number;
    phys: NpcPhysicalState;
  } | null = null;
  for (const step of candidates) {
    if (!step.npc) continue;
    const phys = computeNpcPhysicalState(step, state, elapsedTime);
    if (!phys) continue;
    const dy = Math.abs(state.y - step.y);
    if (dy > 1.8) continue;
    const dist = Math.hypot(state.x - phys.worldX, state.z - phys.worldZ);
    if (dist <= 3.8 && (!best || dist < best.dist)) {
      best = {
        npc: step.npc,
        stepNumber: step.stepNumber,
        stepY: step.y,
        dist,
        phys,
      };
    }
  }
  return best;
}

export function getLiveWindVector(
  elapsedTime: number,
  stepNumber: number,
  seed = currentSpireSeed
): LiveWindState {
  const step =
    LEVELS_500[Math.max(0, Math.min(TOTAL_LEVELS - 1, stepNumber - 1))];
  const isWindStep = step?.hazard === 'wind';
  const altitudeFactor =
    stepNumber < 65
      ? 0
      : Math.min(1, (stepNumber - 65) / 380) * 0.45 + (isWindStep ? 0.55 : 0);

  if (altitudeFactor <= 0.02 && !isWindStep) {
    return {
      windX: 0,
      windZ: 0,
      strength: 0,
      angleRad: 0,
      label: 'CALM',
      compassLabel: 'CALM',
    };
  }

  const phase = elapsedTime * 0.65 + (seed % 97) * 0.1 + stepNumber * 0.23;
  const gustWave =
    0.55 + 0.45 * Math.sin(elapsedTime * 1.35 + stepNumber * 0.5);
  const strength = Number(Math.min(1, altitudeFactor * gustWave).toFixed(2));
  const angleRad = phase % (Math.PI * 2);
  const maxForce = isWindStep ? 2.4 : 1.35;

  const compass = ['E', 'NE', 'N', 'NW', 'W', 'SW', 'S', 'SE'];
  const idx =
    Math.round((((angleRad * 180) / Math.PI + 360) % 360) / 45) % 8;
  const formatted = `${compass[idx]} ${(strength * maxForce).toFixed(1)}m/s`;

  return {
    windX: Math.cos(angleRad) * strength * maxForce,
    windZ: Math.sin(angleRad) * strength * maxForce,
    strength,
    angleRad,
    label: formatted,
    compassLabel: formatted,
  };
}

export function advanceChargeState(
  chargeRatio: number,
  chargeDirection: 1 | -1,
  chargeHoldTime: number,
  dt: number,
  stepChargeMultiplier = 1.0
): {
  chargeRatio: number;
  chargeDirection: 1 | -1;
  chargeHoldTime: number;
  overcharged: boolean;
} {
  const nextHold = chargeHoldTime + dt;
  const rate = (1 / CHARGE_FULL_DURATION) * stepChargeMultiplier;
  let nextRatio = chargeRatio + chargeDirection * rate * dt;
  let nextDir = chargeDirection;
  let overcharged = false;

  if (nextRatio >= 1) {
    nextRatio = 1 - (nextRatio - 1);
    nextDir = -1;
  } else if (nextRatio <= 0.12 && nextDir === -1) {
    nextRatio = 0.12 + (0.12 - nextRatio);
    nextDir = 1;
  }

  if (nextHold >= 2.35) {
    overcharged = true;
    nextRatio = 0.96;
  }

  return {
    chargeRatio: Math.max(0, Math.min(1, nextRatio)),
    chargeDirection: nextDir,
    chargeHoldTime: nextHold,
    overcharged,
  };
}

export function getStepRuntimeOffset(
  step: LevelStep,
  elapsedTime: number,
  crumbleProgress = 0
): StepRuntimeOffset {
  let offsetX = 0;
  let offsetZ = 0;
  let collapsed = false;
  let collapseWarning = 0;
  let hazardWarning = 0;
  let pusherExtended = 0;
  let boulderRelX = 0;
  let boulderRelZ = 0;
  let sweeperAngle = 0;
  let turntableAngle = 0;
  const vehicleOffset = 0;
  const vehicleActive = false;
  let glitchJitterX = 0;

  const t = elapsedTime * step.hazardSpeed + step.hazardPhase;

  if (step.hazard === 'log') {
    const wave = Math.sin(t);
    const perpX = -step.dirZ;
    const perpZ = step.dirX;
    offsetX = perpX * wave * step.hazardAmplitude;
    offsetZ = perpZ * wave * step.hazardAmplitude;
    hazardWarning = Math.abs(wave) > 0.82 ? 0.5 : 0;
  } else if (step.hazard === 'turntable') {
    turntableAngle =
      (elapsedTime * step.hazardSpeed + step.hazardPhase) % (Math.PI * 2);
    hazardWarning = 0.35;
  } else if (step.hazard === 'blinker') {
    const cycle = (elapsedTime * step.hazardSpeed + step.hazardPhase) % 4.4;
    if (cycle > 2.55 && cycle <= 3.35) {
      collapseWarning = (cycle - 2.55) / 0.8;
      hazardWarning = collapseWarning;
    } else if (cycle > 3.35 && cycle < 3.95) {
      collapsed = true;
    }
  } else if (step.hazard === 'glitch') {
    const cycle = (elapsedTime * step.hazardSpeed + step.hazardPhase) % 3.6;
    if (cycle > 2.4 && cycle < 2.95) {
      hazardWarning = (cycle - 2.4) / 0.55;
      glitchJitterX = Math.sin(elapsedTime * 55) * 0.08;
    } else if (cycle >= 2.95 && cycle < 3.25) {
      const snap = Math.sin(elapsedTime * 16) > 0 ? 1 : -1;
      offsetX = -step.dirZ * snap * step.hazardAmplitude * 0.55;
      offsetZ = step.dirX * snap * step.hazardAmplitude * 0.55;
      hazardWarning = 1;
    }
  } else if (step.hazard === 'crumble') {
    if (crumbleProgress > 0 && crumbleProgress < 1.65) {
      collapseWarning = Math.min(1, crumbleProgress / 1.65);
    } else if (crumbleProgress >= 1.65 && crumbleProgress < 3.65) {
      collapsed = true;
    }
  } else if (step.hazard === 'pusher') {
    const cycle = (elapsedTime * step.hazardSpeed + step.hazardPhase) % 3.4;
    const perpX = -step.dirZ || 1;
    const perpZ = step.dirX || 0;
    const span = Math.max(step.width, step.depth) * 0.42;
    const travel = Math.sin((cycle / 3.4) * Math.PI * 2) * span;
    boulderRelX = perpX * travel;
    boulderRelZ = perpZ * travel;
    if (Math.abs(travel) < span * 0.35) {
      pusherExtended = 1;
      hazardWarning = 0.85;
    }
  } else if (step.hazard === 'sweeper') {
    sweeperAngle =
      (elapsedTime * step.hazardSpeed + step.hazardPhase) % (Math.PI * 2);
  }

  return {
    offsetX,
    offsetZ,
    collapsed,
    collapseWarning,
    hazardWarning,
    pusherExtended,
    boulderRelX,
    boulderRelZ,
    sweeperAngle,
    turntableAngle,
    vehicleOffset,
    vehicleActive,
    glitchJitterX,
  };
}

export function computeJumpVelocity(
  chargeRatio: number,
  aimAngle: number
): { vx: number; vy: number; vz: number } {
  const clamped = Math.max(0, Math.min(1, chargeRatio));
  const curved = Math.pow(clamped, 1.04);
  const horizSpeed =
    MIN_JUMP_HORIZ_SPEED +
    curved * (MAX_JUMP_HORIZ_SPEED - MIN_JUMP_HORIZ_SPEED);
  const vertSpeed =
    MIN_JUMP_VERT_SPEED +
    curved * (MAX_JUMP_VERT_SPEED - MIN_JUMP_VERT_SPEED);

  return {
    vx: Math.cos(aimAngle) * horizSpeed,
    vy: vertSpeed,
    vz: Math.sin(aimAngle) * horizSpeed,
  };
}

export function computePredictedLandingSpot(
  startX: number,
  startY: number,
  startZ: number,
  chargeRatio: number,
  aimAngle: number,
  nextStep: LevelStep,
  elapsedTime = 0
): {
  x: number;
  y: number;
  z: number;
  isOnTarget: boolean;
  flightTime: number;
  targetCenterX: number;
  targetCenterZ: number;
} {
  const { vx, vy, vz } = computeJumpVelocity(chargeRatio, aimAngle);
  const dy = nextStep.y - startY;
  const g = -GRAVITY; // +22.0
  const disc = vy * vy - 2 * g * dy;
  let flightTime = 0.55;
  if (disc >= 0) {
    flightTime = (vy + Math.sqrt(disc)) / g;
  } else {
    flightTime = Math.max(0.25, (vy * 1.65) / g);
  }

  const wind = getLiveWindVector(elapsedTime, nextStep.stepNumber - 1);
  const windDriftX =
    wind.strength > 0 ? 0.5 * (wind.windX * 0.55) * flightTime * flightTime : 0;
  const windDriftZ =
    wind.strength > 0 ? 0.5 * (wind.windZ * 0.55) * flightTime * flightTime : 0;

  const landX = startX + vx * flightTime + windDriftX;
  const landZ = startZ + vz * flightTime + windDriftZ;
  const landY =
    startY + vy * flightTime + 0.5 * GRAVITY * flightTime * flightTime;

  const rt = getStepRuntimeOffset(nextStep, elapsedTime + flightTime, 0);
  const cx = nextStep.x + rt.offsetX;
  const cz = nextStep.z + rt.offsetZ;
  const isOnTarget =
    !rt.collapsed &&
    disc > 0.5 &&
    Math.abs(landX - cx) <= nextStep.width * 0.44 &&
    Math.abs(landZ - cz) <= nextStep.depth * 0.44;

  return {
    x: landX,
    y: Math.max(nextStep.y, landY),
    z: landZ,
    isOnTarget,
    flightTime,
    targetCenterX: cx,
    targetCenterZ: cz,
  };
}

export function computeAimAlignment(
  playerX: number,
  playerY: number,
  playerZ: number,
  aimAngle: number,
  nextStep: LevelStep,
  elapsedTime = 0
): {
  idealAimAngle: number;
  angleErrorDeg: number;
  isAimAligned: boolean;
  idealChargePercent: number;
} {
  const rtNow = getStepRuntimeOffset(nextStep, elapsedTime + 0.55, 0);
  const tx = nextStep.x + rtNow.offsetX;
  const tz = nextStep.z + rtNow.offsetZ;
  const idealAimAngle = Math.atan2(tz - playerZ, tx - playerX);
  const diffRad = Math.atan2(
    Math.sin(aimAngle - idealAimAngle),
    Math.cos(aimAngle - idealAimAngle)
  );
  const angleErrorDeg = Math.round((diffRad * 180) / Math.PI);
  const isAimAligned = Math.abs(angleErrorDeg) <= 15;

  let bestCharge = 0.58;
  let bestDist = Infinity;
  for (let c = 0.22; c <= 0.96; c += 0.02) {
    const pred = computePredictedLandingSpot(
      playerX,
      playerY,
      playerZ,
      c,
      idealAimAngle,
      nextStep,
      elapsedTime
    );
    const dHoriz = Math.hypot(
      pred.x - pred.targetCenterX,
      pred.z - pred.targetCenterZ
    );
    const vertPenalty = pred.y < nextStep.y - 0.02 ? 100 : 0;
    const score = dHoriz + vertPenalty;
    if (score < bestDist) {
      bestDist = score;
      bestCharge = c;
    }
  }

  return {
    idealAimAngle,
    angleErrorDeg,
    isAimAligned,
    idealChargePercent: Math.round(bestCharge * 100),
  };
}

export function computeIdealJumpToNextStep(
  fromStepNumber = 0,
  elapsedTime = 0
): { aimAngle: number; chargeRatio: number } {
  if (fromStepNumber <= 0) {
    const next = LEVELS_500[0];
    const align = computeAimAlignment(
      GROUND_SPAWN_X,
      GROUND_FLOOR_Y,
      GROUND_SPAWN_Z,
      0,
      next,
      elapsedTime
    );
    return {
      aimAngle: align.idealAimAngle,
      chargeRatio: Number((align.idealChargePercent / 100).toFixed(2)),
    };
  }

  const idx = Math.max(0, Math.min(TOTAL_LEVELS - 2, fromStepNumber - 1));
  const current = LEVELS_500[idx];
  const next = LEVELS_500[idx + 1];

  const align = computeAimAlignment(
    current.x,
    current.y,
    current.z,
    0,
    next,
    elapsedTime
  );

  return {
    aimAngle: align.idealAimAngle,
    chargeRatio: Number((align.idealChargePercent / 100).toFixed(2)),
  };
}

export function calculateRageScore(
  fallsCount: number,
  stepsLostThisFall: number,
  currentRage: number
): number {
  const spike =
    stepsLostThisFall <= 0
      ? 0
      : Math.min(
          68,
          8 + stepsLostThisFall * 1.4 + Math.min(24, fallsCount * 1.5)
        );
  return Math.min(100, Math.round(currentRage * 0.8 + spike));
}

export function selectPhilosophicalTaunt(
  stepsLost: number,
  fallsCount: number
): { quote: string; author: string } {
  const eligible = PHILOSOPHICAL_TAUNTS.filter(
    (t) => stepsLost >= t.minStepsLost
  );
  const pool =
    eligible.length > 0 ? eligible : PHILOSOPHICAL_TAUNTS.slice(0, 2);
  const topCandidates = pool.slice(-3);
  return topCandidates[fallsCount % topCandidates.length];
}

export function checkVictoryPhilosophy(stepNumber: number): {
  isVictory: boolean;
  message: string;
} {
  if (stepNumber >= TOTAL_LEVELS) {
    return {
      isVictory: true,
      message: PHILOSOPHICAL_ENDING_QUOTE,
    };
  }
  return {
    isVictory: false,
    message: '',
  };
}

export interface StepPhysicsResult {
  landedStep: number | null;
  fellToLowerStep: boolean;
  stepsLost: number;
  knockedByHazard: boolean;
  bouncedOffLedge: boolean;
  triggeredGlitch: boolean;
  reachedSummit: boolean;
  activatedRunePlate?: boolean;
  unlockedTrailGate?: boolean;
  enteredRiverWater?: boolean;
  discoveredLandmark?: string;
  blockedByNpc?: boolean;
  cameraShiftedTo?: CameraAngleMode;
}

export function isStepGateUnlocked(
  step: LevelStep,
  state: PlayerState
): boolean {
  if (!step.requiresSwitch || step.runePlates.length === 0) return true;
  if (state.unlockedGateSteps.includes(step.stepNumber)) return true;
  return step.runePlates.every((rp) => state.activatedRuneIds.includes(rp.id));
}

/**
 * Helper that enforces all solid obstacles & locked rune gate on a given stage `plat`
 * against the player's `(state.x, state.z, state.vx, state.vz)`.
 * Used BOTH when grounded on `plat` AND when airborne at `plat`'s vertical level so
 * no block, boulder, totem, tree, or gate is EVER permeable!
 */
function enforceStageSolidObstacles(
  plat: LevelStep,
  platCenterX: number,
  platCenterZ: number,
  state: PlayerState,
  isAirborne: boolean
): boolean {
  let hitAny = false;

  // Run 2 iterative resolution passes so corner wedges between two boulders never allow clipping
  for (let pass = 0; pass < 2; pass++) {
    for (const obs of plat.deckObstacles) {
      if (isAirborne && state.y > plat.y + obs.height + 0.14) continue;
      if (isAirborne && state.y < plat.y - 0.18) continue;

      const resolved = resolveCircleAabbCollision(
        state.x,
        state.z,
        PLAYER_COLLISION_RADIUS,
        platCenterX + obs.relX,
        platCenterZ + obs.relZ,
        obs.halfW + 0.04,
        obs.halfD + 0.04
      );
      if (resolved.collided) {
        state.x = resolved.x;
        state.z = resolved.z;
        const vn = state.vx * resolved.normalX + state.vz * resolved.normalZ;
        if (vn < 0) {
          const bounce = isAirborne ? 1.42 : 1.0;
          state.vx -= bounce * vn * resolved.normalX;
          state.vz -= bounce * vn * resolved.normalZ;
        }
        hitAny = true;
      }
    }

    // Oriented Bounding Box (OBB) Collision against Locked Rune Gate Barrier!
    if (!isStepGateUnlocked(plat, state)) {
      if (!isAirborne || (state.y >= plat.y - 0.15 && state.y <= plat.y + 1.18)) {
        const gateCenterX = platCenterX + plat.dirX * (plat.width * 0.31);
        const gateCenterZ = platCenterZ + plat.dirZ * (plat.depth * 0.31);
        const resGate = resolveCircleObbCollision(
          state.x,
          state.z,
          PLAYER_COLLISION_RADIUS,
          gateCenterX,
          gateCenterZ,
          plat.dirX,
          plat.dirZ,
          0.18, // barrier thickness half-extent
          plat.depth * 0.44 // barrier span across launch edge
        );
        if (resGate.collided) {
          state.x = resGate.x;
          state.z = resGate.z;
          const vn = state.vx * resGate.normalX + state.vz * resGate.normalZ;
          if (vn < 0) {
            const bounce = isAirborne ? 1.45 : 1.0;
            state.vx -= bounce * vn * resGate.normalX;
            state.vz -= bounce * vn * resGate.normalZ;
          }
          hitAny = true;
        }
      }
    }
  }

  return hitAny;
}

export function advancePlayerPhysics(
  state: PlayerState,
  simDt: number,
  elapsedTime: number,
  inputMoveX: number,
  inputMoveZ: number
): StepPhysicsResult {
  const result: StepPhysicsResult = {
    landedStep: null,
    fellToLowerStep: false,
    stepsLost: 0,
    knockedByHazard: false,
    bouncedOffLedge: false,
    triggeredGlitch: false,
    reachedSummit: false,
    activatedRunePlate: false,
    unlockedTrailGate: false,
    enteredRiverWater: false,
    blockedByNpc: false,
  };

  if (state.won || simDt <= 0) return result;

  if (state.glitchTimer > 0) {
    state.glitchTimer = Math.max(0, state.glitchTimer - simDt);
  }

  const prevY = state.y;

  const activeStepObj =
    state.currentStep <= 0
      ? GROUND_STEP_META
      : LEVELS_500[state.currentStep - 1] || LEVELS_500[0];
  const prevRuntime = getStepRuntimeOffset(
    activeStepObj,
    elapsedTime - simDt,
    state.crumbleTimer
  );
  const activeRuntime = getStepRuntimeOffset(
    activeStepObj,
    elapsedTime,
    state.crumbleTimer
  );

  const effMoveX = state.glitchTimer > 0 ? -inputMoveX : inputMoveX;
  const effMoveZ = state.glitchTimer > 0 ? -inputMoveZ : inputMoveZ;

  if (state.grounded) {
    state.coyoteTimer = 0.14;
    state.isTumbling = false;
    state.tumbleSpin = 0;

    if (activeRuntime.collapsed) {
      state.grounded = false;
      state.isTumbling = true;
      state.vy = -2.0;
    }

    state.x +=
      activeRuntime.offsetX -
      prevRuntime.offsetX +
      (activeRuntime.glitchJitterX - prevRuntime.glitchJitterX);
    state.z += activeRuntime.offsetZ - prevRuntime.offsetZ;

    if (activeStepObj.hazard === 'turntable') {
      state.aimAngle += activeStepObj.hazardSpeed * 0.65 * simDt;
    }

    if (activeStepObj.hazard === 'conveyor') {
      state.x +=
        activeStepObj.conveyorDirX * activeStepObj.hazardSpeed * 0.42 * simDt;
      state.z +=
        activeStepObj.conveyorDirZ * activeStepObj.hazardSpeed * 0.42 * simDt;
    }

    if (activeStepObj.hazard === 'crumble') {
      state.crumbleTimer += simDt;
      if (state.crumbleTimer >= 1.65) {
        state.grounded = false;
        state.isTumbling = true;
        state.vy = -2.2;
      }
    } else {
      state.crumbleTimer = 0;
    }

    if (activeStepObj.hazard === 'glitch' && state.glitchTimer <= 0.1) {
      state.glitchTimer = 2.2;
      result.triggeredGlitch = true;
    }

    if (
      !state.isCharging &&
      (Math.abs(effMoveX) > 0.01 || Math.abs(effMoveZ) > 0.01)
    ) {
      const riverSlowdown = state.inRiverWater ? 0.58 : 1.0;
      const accel = (activeStepObj.friction < 0.35 ? 6.8 : 16.8) * riverSlowdown;
      state.vx += effMoveX * GROUND_NUDGE_SPEED * accel * simDt;
      state.vz += effMoveZ * GROUND_NUDGE_SPEED * accel * simDt;
    }

    const damping = Math.exp(-activeStepObj.friction * 9.0 * simDt);
    state.vx *= damping;
    state.vz *= damping;

    const platCenterX = activeStepObj.x + activeRuntime.offsetX;
    const platCenterZ = activeStepObj.z + activeRuntime.offsetZ;
    let relX = state.x - platCenterX;
    let relZ = state.z - platCenterZ;
    const halfW = activeStepObj.width * 0.5;
    const halfD = activeStepObj.depth * 0.5;

    // Check Multi-Rune Puzzle Plates on current stage deck
    if (
      activeStepObj.requiresSwitch &&
      !state.unlockedGateSteps.includes(activeStepObj.stepNumber)
    ) {
      for (const rp of activeStepObj.runePlates) {
        if (!state.activatedRuneIds.includes(rp.id)) {
          const rDist = Math.hypot(relX - rp.relX, relZ - rp.relZ);
          if (rDist <= rp.radius) {
            state.activatedRuneIds.push(rp.id);
            result.activatedRunePlate = true;
          }
        }
      }
      if (isStepGateUnlocked(activeStepObj, state)) {
        state.unlockedGateSteps.push(activeStepObj.stepNumber);
        result.unlockedTrailGate = true;
      }
    }

    // Physical Path-Blocking NPC Collision on current terrace!
    if (activeStepObj.npc && state.grounded && !state.isCharging) {
      const npcPhys = computeNpcPhysicalState(activeStepObj, state, elapsedTime);
      if (npcPhys && npcPhys.isBlockingLane) {
        const dxNpc = state.x - npcPhys.worldX;
        const dzNpc = state.z - npcPhys.worldZ;
        const distNpc = Math.hypot(dxNpc, dzNpc);
        const minBodyRadius = 0.64;
        if (distNpc < minBodyRadius && distNpc > 0.001) {
          const nx = dxNpc / distNpc;
          const nz = dzNpc / distNpc;
          state.x = Math.max(
            platCenterX - halfW * 0.85,
            Math.min(
              platCenterX + halfW * 0.85,
              npcPhys.worldX + nx * minBodyRadius
            )
          );
          state.z = Math.max(
            platCenterZ - halfD * 0.85,
            Math.min(
              platCenterZ + halfD * 0.85,
              npcPhys.worldZ + nz * minBodyRadius
            )
          );
          state.vx = 0;
          state.vz = 0;
          result.blockedByNpc = true;
        }
      }
    }

    // Check Valley Landmarks when on Ground Floor (Step 0)
    if (state.currentStep <= 0 && state.grounded) {
      for (const lm of VALLEY_LANDMARKS) {
        const dLm = Math.hypot(state.x - lm.x, state.z - lm.z);
        if (dLm <= lm.radius) {
          if (!state.visitedLandmarks.includes(lm.id)) {
            state.visitedLandmarks.push(lm.id);
            result.discoveredLandmark = lm.title;
          }
          if (lm.kind === 'campfire_rest' && state.rageScore > 0) {
            state.rageScore = Math.max(0, state.rageScore - 25);
          }
        }
      }
    }

    if (activeStepObj.hazard === 'pusher') {
      const distToBoulder = Math.hypot(
        relX - activeRuntime.boulderRelX,
        relZ - activeRuntime.boulderRelZ
      );
      if (distToBoulder < 0.64) {
        const pushDirX = -activeStepObj.dirZ || 1;
        const pushDirZ = activeStepObj.dirX || 0;
        state.vx = pushDirX * 5.6;
        state.vz = pushDirZ * 5.6;
        state.vy = 2.6;
        state.grounded = false;
        state.isTumbling = true;
        state.isCharging = false;
        state.chargeRatio = 0;
        state.chargeHoldTime = 0;
        result.knockedByHazard = true;
      }
    } else if (activeStepObj.hazard === 'sweeper') {
      const barCos = Math.cos(activeRuntime.sweeperAngle);
      const barSin = Math.sin(activeRuntime.sweeperAngle);
      const dot = relX * barCos + relZ * barSin;
      const perp = Math.abs(-relX * barSin + relZ * barCos);
      if (Math.abs(dot) < halfW * 0.85 && perp < 0.34) {
        state.vx = -barSin * 5.2;
        state.vz = barCos * 5.2;
        state.vy = 2.4;
        state.grounded = false;
        state.isTumbling = true;
        state.isCharging = false;
        state.chargeRatio = 0;
        state.chargeHoldTime = 0;
        result.knockedByHazard = true;
      }
    }

    if (state.grounded) {
      // Sub-step horizontal movement into 2 sub-steps so high velocity can never tunnel through a block!
      const subSteps = 2;
      for (let s = 0; s < subSteps; s++) {
        state.x += (state.vx * simDt) / subSteps;
        state.z += (state.vz * simDt) / subSteps;

        if (state.currentStep <= 0 && !result.knockedByHazard) {
          // 1a. Resolve Solid Collisions against all Valley Buildings, Fences & Trees (1:1 unified coordinates)
          for (const col of VALLEY_SOLID_COLLIDERS) {
            const resolved = resolveCircleAabbCollision(
              state.x,
              state.z,
              PLAYER_COLLISION_RADIUS,
              col.x,
              col.z,
              col.halfW,
              col.halfD
            );
            if (resolved.collided) {
              state.x = resolved.x;
              state.z = resolved.z;
              const vn =
                state.vx * resolved.normalX + state.vz * resolved.normalZ;
              if (vn < 0) {
                state.vx -= vn * resolved.normalX;
                state.vz -= vn * resolved.normalZ;
              }
            }
          }

          // 1b. Also resolve solid collisions against the grounded cliff pillars of low stages (Stages 1-3)
          // so the player on Step 0 can NEVER walk through the underside rock block of Stage 1 or Stage 2!
          for (let lowIdx = 0; lowIdx < 3; lowIdx++) {
            const lowStep = LEVELS_500[lowIdx];
            if (!lowStep) continue;
            if (lowStep.y - lowStep.supportDepth <= GROUND_FLOOR_Y + 1.2) {
              const resPillar = resolveCircleAabbCollision(
                state.x,
                state.z,
                PLAYER_COLLISION_RADIUS,
                lowStep.x,
                lowStep.z,
                lowStep.width * 0.46,
                lowStep.depth * 0.46
              );
              if (resPillar.collided) {
                state.x = resPillar.x;
                state.z = resPillar.z;
                const vn =
                  state.vx * resPillar.normalX + state.vz * resPillar.normalZ;
                if (vn < 0) {
                  state.vx -= vn * resPillar.normalX;
                  state.vz -= vn * resPillar.normalZ;
                }
              }
            }
          }
        } else if (state.currentStep > 0) {
          // 1. Resolve Solid Collisions against all On-Deck Boulders, Logs, Totems, Trees & Oriented Locked Rune Gate
          enforceStageSolidObstacles(
            activeStepObj,
            platCenterX,
            platCenterZ,
            state,
            false
          );
        }
      }

      if (state.currentStep <= 0 && !result.knockedByHazard) {
        // 2. River & Bridge Physics in the Base Camp Valley
        const onBridge =
          state.x >= VALLEY_BRIDGE_BOUNDS.minX &&
          state.x <= VALLEY_BRIDGE_BOUNDS.maxX &&
          state.z >= VALLEY_BRIDGE_BOUNDS.minZ &&
          state.z <= VALLEY_BRIDGE_BOUNDS.maxZ;
        const inRiverBand =
          state.z >= VALLEY_RIVER_BOUNDS.minZ &&
          state.z <= VALLEY_RIVER_BOUNDS.maxZ;

        if (onBridge) {
          state.onRiverBridge = true;
          state.inRiverWater = false;
          state.y = VALLEY_BRIDGE_BOUNDS.deckY;
          if (
            state.z > VALLEY_RIVER_BOUNDS.minZ + 0.15 &&
            state.z < VALLEY_RIVER_BOUNDS.maxZ - 0.15
          ) {
            state.x = Math.max(
              VALLEY_BRIDGE_BOUNDS.minX + 0.18,
              Math.min(VALLEY_BRIDGE_BOUNDS.maxX - 0.18, state.x)
            );
          }
        } else if (inRiverBand) {
          if (!state.inRiverWater) {
            result.enteredRiverWater = true;
          }
          state.inRiverWater = true;
          state.onRiverBridge = false;
          state.y = VALLEY_RIVER_BOUNDS.waterSurfaceY;
          // Flowing river current pushes the player downstream (+X)!
          state.x += VALLEY_RIVER_BOUNDS.currentSpeedX * simDt;
        } else {
          state.inRiverWater = false;
          state.onRiverBridge = false;
          state.y = GROUND_FLOOR_Y;
        }

        state.x = Math.max(-14.5, Math.min(14.5, state.x));
        state.z = Math.max(-9.0, Math.min(9.0, state.z));
        state.teeterAmount = 0;
      } else {
        state.inRiverWater = false;
        state.onRiverBridge = false;

        relX = state.x - platCenterX;
        relZ = state.z - platCenterZ;

        // Smooth directional jump guidance: when walking on the stage without charging,
        // gently align aimAngle toward the next stage's center so the player always has clear jump direction!
        if (
          !state.isCharging &&
          (Math.abs(effMoveX) > 0.05 || Math.abs(effMoveZ) > 0.05) &&
          activeStepObj.stepNumber < TOTAL_LEVELS
        ) {
          const nextStepObj = LEVELS_500[activeStepObj.stepNumber];
          if (nextStepObj) {
            const nextRt = getStepRuntimeOffset(nextStepObj, elapsedTime + 0.5, 0);
            const targetAngle = Math.atan2(
              nextStepObj.z + nextRt.offsetZ - state.z,
              nextStepObj.x + nextRt.offsetX - state.x
            );
            const angleDiff = Math.atan2(
              Math.sin(targetAngle - state.aimAngle),
              Math.cos(targetAngle - state.aimAngle)
            );
            state.aimAngle += angleDiff * Math.min(1, simDt * 6.5);
          }
        }

        const normEdgeX = Math.abs(relX) / Math.max(0.1, halfW);
        const normEdgeZ = Math.abs(relZ) / Math.max(0.1, halfD);
        state.teeterAmount = Math.max(
          0,
          Math.min(1, (Math.max(normEdgeX, normEdgeZ) - 0.68) / 0.32)
        );

        const newRelX = Math.abs(state.x - platCenterX);
        const newRelZ = Math.abs(state.z - platCenterZ);
        if (newRelX > halfW + 0.16 || newRelZ > halfD + 0.16) {
          state.grounded = false;
          state.isTumbling = true;
        } else {
          state.y = activeStepObj.y;
        }
      }
    }
  } else {
    // ============================================================================
    // AIRBORNE & LOGICAL 3D GRAVITY FALL PHYSICS (With Full 3D Obstacle & Gate Collisions!)
    // ============================================================================
    state.coyoteTimer = Math.max(0, state.coyoteTimer - simDt);
    state.teeterAmount = 0;
    state.inRiverWater = false;
    state.onRiverBridge = false;

    if (state.isTumbling || state.vy < -4.2) {
      state.isTumbling = true;
      state.tumbleSpin += simDt * 9.0;
    }

    const airCtrl = state.isTumbling
      ? AIR_CONTROL_ACCEL * 0.45
      : AIR_CONTROL_ACCEL;
    state.vx += effMoveX * airCtrl * simDt;
    state.vz += effMoveZ * airCtrl * simDt;

    const wind = getLiveWindVector(elapsedTime, state.currentStep);
    if (wind.strength > 0) {
      state.vx += wind.windX * 0.5 * simDt;
      state.vz += wind.windZ * 0.5 * simDt;
    }

    state.vy += GRAVITY * simDt;
    state.x += state.vx * simDt;
    state.y += state.vy * simDt;
    state.z += state.vz * simDt;

    // 1. Mid-Air Solid Collision against Valley Buildings & Trees when flying low over Base Camp
    if (state.y < GROUND_FLOOR_Y + 3.4) {
      for (const col of VALLEY_SOLID_COLLIDERS) {
        if (state.y <= GROUND_FLOOR_Y + col.height) {
          const resCol = resolveCircleAabbCollision(
            state.x,
            state.z,
            PLAYER_COLLISION_RADIUS,
            col.x,
            col.z,
            col.halfW,
            col.halfD
          );
          if (resCol.collided) {
            state.x = resCol.x;
            state.z = resCol.z;
            const vn = state.vx * resCol.normalX + state.vz * resCol.normalZ;
            if (vn < 0) {
              state.vx -= 1.4 * vn * resCol.normalX;
              state.vz -= 1.4 * vn * resCol.normalZ;
              result.bouncedOffLedge = true;
            }
          }
        }
      }
    }

    const maxCheckIdx = Math.min(LEVELS_500.length - 1, state.peakStep + 8);
    for (let i = maxCheckIdx; i >= 0; i--) {
      const plat = LEVELS_500[i];
      if (Math.abs(plat.y - state.y) > 2.6) continue;

      const rt = getStepRuntimeOffset(plat, elapsedTime, 0);
      if (rt.collapsed) continue;

      const cx = plat.x + rt.offsetX;
      const cz = plat.z + rt.offsetZ;
      const halfW = plat.width * 0.5 + 0.14;
      const halfD = plat.depth * 0.5 + 0.14;
      const topY = plat.y;
      const bottomY = plat.y - plat.height;

      // 2. Mid-Air Collision against On-Deck Boulders, Totems, Trees & Locked Rune Gates!
      if (state.y >= topY - 0.12 && state.y <= topY + 1.35) {
        if (
          Math.abs(state.x - cx) <= halfW + 0.35 &&
          Math.abs(state.z - cz) <= halfD + 0.35
        ) {
          const hitMidAirObstacle = enforceStageSolidObstacles(
            plat,
            cx,
            cz,
            state,
            true
          );
          if (hitMidAirObstacle) {
            result.bouncedOffLedge = true;
          }
        }
      }

      // 3. Top Surface Touchdown Check
      if (state.vy <= 0.5 && prevY >= topY - 0.38 && state.y <= topY + 0.24) {
        if (
          Math.abs(state.x - cx) <= halfW &&
          Math.abs(state.z - cz) <= halfD
        ) {
          if (
            plat.hazard === 'bouncer' &&
            (Math.abs(state.x - cx) > halfW * 0.78 ||
              Math.abs(state.z - cz) > halfD * 0.78)
          ) {
            state.vy = Math.max(4.4, Math.abs(state.vy) * plat.restitution);
            state.vx += Math.sign(state.x - cx || 1) * 3.5;
            state.vz += Math.sign(state.z - cz || 1) * 3.5;
            state.isTumbling = true;
            result.knockedByHazard = true;
            break;
          }

          state.y = topY;
          state.vy = 0;
          state.vx *= plat.friction < 0.35 ? 0.78 : 0.25;
          state.vz *= plat.friction < 0.35 ? 0.25 : 0.25;
          state.grounded = true;
          state.isTumbling = false;
          state.tumbleSpin = 0;
          state.crumbleTimer = 0;

          // Ensure player is cleanly outside any on-deck obstacle or locked gate upon touchdown
          enforceStageSolidObstacles(plat, cx, cz, state, false);

          const prevBand = Math.floor(
            state.currentStep / CAMERA_SHIFT_INTERVAL_STEPS
          );
          const nextBand = Math.floor(
            plat.stepNumber / CAMERA_SHIFT_INTERVAL_STEPS
          );
          if (nextBand !== prevBand && plat.stepNumber > 0) {
            result.cameraShiftedTo = getAutoCameraModeForStep(plat.stepNumber);
          }

          const lost = Math.max(0, state.lastStableStep - plat.stepNumber);
          if (plat.stepNumber > state.peakStep) {
            state.peakStep = plat.stepNumber;
          }
          state.currentStep = plat.stepNumber;

          if (plat.stepNumber < TOTAL_LEVELS) {
            const nextStep = LEVELS_500[plat.stepNumber];
            const nextRt = getStepRuntimeOffset(nextStep, elapsedTime + 0.5, 0);
            state.aimAngle = Math.atan2(
              nextStep.z + nextRt.offsetZ - state.z,
              nextStep.x + nextRt.offsetX - state.x
            );
          }

          if (lost >= 1) {
            state.fallsCount += 1;
            if (lost > state.biggestFallLoss) {
              state.biggestFallLoss = lost;
            }
            state.rageScore = calculateRageScore(
              state.fallsCount,
              lost,
              state.rageScore
            );
            result.fellToLowerStep = true;
            result.stepsLost = lost;
          }

          state.lastStableStep = plat.stepNumber;
          result.landedStep = plat.stepNumber;

          if (plat.stepNumber === TOTAL_LEVELS) {
            state.won = true;
            result.reachedSummit = true;
          }
          break;
        }
      }

      // 4. Side-Wall Physical Bounce (Using exact Circle-vs-AABB resolution so no clipping into slab walls!)
      if (state.y < topY - 0.34 && state.y > bottomY) {
        const resWall = resolveCircleAabbCollision(
          state.x,
          state.z,
          PLAYER_COLLISION_RADIUS,
          cx,
          cz,
          plat.width * 0.5,
          plat.depth * 0.5
        );
        if (resWall.collided) {
          state.x = resWall.x;
          state.z = resWall.z;
          const vn = state.vx * resWall.normalX + state.vz * resWall.normalZ;
          if (vn < 0) {
            state.vx -= 1.45 * vn * resWall.normalX;
            state.vz -= 1.45 * vn * resWall.normalZ;
          }
          state.isTumbling = true;
          result.bouncedOffLedge = true;
        }
      }
    }

    // Physical Ground Floor / Valley Touchdown at y <= GROUND_FLOOR_Y (-1.35m)
    if (!state.grounded && state.y <= GROUND_FLOOR_Y) {
      const lost = Math.max(0, state.lastStableStep - 0);

      state.x = Math.max(-14.0, Math.min(14.0, state.x));
      state.z = Math.max(-8.5, Math.min(8.5, state.z));

      // Push out of any valley building/tree/stage-pillar if falling directly onto one
      for (const col of VALLEY_SOLID_COLLIDERS) {
        const resCol = resolveCircleAabbCollision(
          state.x,
          state.z,
          PLAYER_COLLISION_RADIUS,
          col.x,
          col.z,
          col.halfW,
          col.halfD
        );
        if (resCol.collided) {
          state.x = resCol.x;
          state.z = resCol.z;
        }
      }

      const inRiverBand =
        state.z >= VALLEY_RIVER_BOUNDS.minZ &&
        state.z <= VALLEY_RIVER_BOUNDS.maxZ;
      const onBridge =
        state.x >= VALLEY_BRIDGE_BOUNDS.minX &&
        state.x <= VALLEY_BRIDGE_BOUNDS.maxX &&
        state.z >= VALLEY_BRIDGE_BOUNDS.minZ &&
        state.z <= VALLEY_BRIDGE_BOUNDS.maxZ;

      state.y = onBridge
        ? VALLEY_BRIDGE_BOUNDS.deckY
        : inRiverBand
        ? VALLEY_RIVER_BOUNDS.waterSurfaceY
        : GROUND_FLOOR_Y;
      state.inRiverWater = inRiverBand && !onBridge;
      state.onRiverBridge = onBridge;

      state.vx = 0;
      state.vy = 0;
      state.vz = 0;
      state.grounded = true;
      state.isTumbling = false;
      state.tumbleSpin = 0;
      state.isCharging = false;
      state.chargeRatio = 0;
      state.chargeHoldTime = 0;
      state.crumbleTimer = 0;
      state.currentStep = 0;
      state.lastStableStep = 0;

      const nextStep = LEVELS_500[0];
      state.aimAngle = Math.atan2(
        nextStep.z - state.z,
        nextStep.x - state.x
      );

      if (lost >= 1) {
        state.fallsCount += 1;
        if (lost > state.biggestFallLoss) {
          state.biggestFallLoss = lost;
        }
        state.rageScore = calculateRageScore(
          state.fallsCount,
          lost,
          state.rageScore
        );
        result.fellToLowerStep = true;
        result.stepsLost = lost;
      }
      result.landedStep = 0;
    }
  }

  return result;
}

export type WeatherStyle =
  | 'pollen'
  | 'sparks'
  | 'mist'
  | 'dust'
  | 'snow'
  | 'stardust'
  | 'glitch_ether'
  | 'embers'
  | 'storm_rain'
  | 'celestial_shards';

export interface BiomeWeatherProfile {
  biome: number;
  atmosphericLayer: AtmosphericLayerId;
  style: WeatherStyle;
  label: string;
  primaryColorHex: number;
  secondaryColorHex: number;
  skyColorHex: number;
  fogColorHex: number;
  fogDensity: number;
  vyBase: number;
  vxDrift: number;
  vzDrift: number;
  swayAmp: number;
  swayFreq: number;
  particleScale: [number, number, number];
}

// Atmospheric progression from Sunlit Pine Valley (1-50) -> Cloud Deck (51-100) -> Stratosphere (101-200) -> Thermosphere Aurora (201-350) -> Deep Space (351-500)
const BIOME_WEATHER_PROFILES: Record<number, BiomeWeatherProfile> = {
  1: {
    biome: 1,
    atmosphericLayer: 'troposphere_valley',
    style: 'pollen',
    label: 'Troposphere · Sunlit Pine Pollen & Golden Breeze',
    primaryColorHex: 0xfef08a,
    secondaryColorHex: 0xa3e635,
    skyColorHex: 0x7ec8e3,
    fogColorHex: 0x7ec8e3,
    fogDensity: 0.0022,
    vyBase: -0.45,
    vxDrift: 0.35,
    vzDrift: -0.25,
    swayAmp: 0.65,
    swayFreq: 1.4,
    particleScale: [0.09, 0.09, 0.09],
  },
  2: {
    biome: 2,
    atmosphericLayer: 'alpine_cloud_deck',
    style: 'sparks',
    label: 'Alpine Cloud Rim · Falling Maple Leaves & Cloud Mist',
    primaryColorHex: 0xf59e0b,
    secondaryColorHex: 0xea580c,
    skyColorHex: 0x6ba3be,
    fogColorHex: 0x6ba3be,
    fogDensity: 0.0024,
    vyBase: -0.65,
    vxDrift: 0.45,
    vzDrift: 0.25,
    swayAmp: 0.85,
    swayFreq: 1.8,
    particleScale: [0.11, 0.06, 0.11],
  },
  3: {
    biome: 3,
    atmosphericLayer: 'stratosphere',
    style: 'mist',
    label: 'Lower Stratosphere (100+) · Cobalt Sky & Ice Crystals',
    primaryColorHex: 0x7dd3fc,
    secondaryColorHex: 0xe0f2fe,
    skyColorHex: 0x1d4ed8,
    fogColorHex: 0x1e3a8a,
    fogDensity: 0.0018,
    vyBase: -0.55,
    vxDrift: 0.6,
    vzDrift: -0.4,
    swayAmp: 0.7,
    swayFreq: 1.6,
    particleScale: [0.09, 0.12, 0.09],
  },
  4: {
    biome: 4,
    atmosphericLayer: 'stratosphere',
    style: 'dust',
    label: 'Upper Stratosphere · High Jetstream Ion Motes',
    primaryColorHex: 0x93c5fd,
    secondaryColorHex: 0xfde047,
    skyColorHex: 0x1e1b4b,
    fogColorHex: 0x1e1b4b,
    fogDensity: 0.0015,
    vyBase: -0.25,
    vxDrift: 1.25,
    vzDrift: -0.65,
    swayAmp: 0.5,
    swayFreq: 1.9,
    particleScale: [0.1, 0.08, 0.08],
  },
  5: {
    biome: 5,
    atmosphericLayer: 'thermosphere_aurora',
    style: 'snow',
    label: 'Mesosphere Twilight · Cryo-Dust & First Stars',
    primaryColorHex: 0xe0f2fe,
    secondaryColorHex: 0x38bdf8,
    skyColorHex: 0x0f172a,
    fogColorHex: 0x0f172a,
    fogDensity: 0.0012,
    vyBase: -0.4,
    vxDrift: 0.45,
    vzDrift: 0.3,
    swayAmp: 0.95,
    swayFreq: 1.7,
    particleScale: [0.1, 0.1, 0.1],
  },
  6: {
    biome: 6,
    atmosphericLayer: 'thermosphere_aurora',
    style: 'stardust',
    label: 'Thermosphere · Shimmering Aurora Borealis Motes',
    primaryColorHex: 0x34d399,
    secondaryColorHex: 0xa78bfa,
    skyColorHex: 0x090d16,
    fogColorHex: 0x090d16,
    fogDensity: 0.001,
    vyBase: 0.25,
    vxDrift: -0.25,
    vzDrift: 0.25,
    swayAmp: 0.85,
    swayFreq: 1.4,
    particleScale: [0.11, 0.11, 0.11],
  },
  7: {
    biome: 7,
    atmosphericLayer: 'thermosphere_aurora',
    style: 'glitch_ether',
    label: 'Orbital Thermosphere · Sub-Orbital Starlight',
    primaryColorHex: 0xc084fc,
    secondaryColorHex: 0x38bdf8,
    skyColorHex: 0x060913,
    fogColorHex: 0x060913,
    fogDensity: 0.0008,
    vyBase: 0.35,
    vxDrift: 0.2,
    vzDrift: -0.2,
    swayAmp: 0.85,
    swayFreq: 2.0,
    particleScale: [0.1, 0.1, 0.1],
  },
  8: {
    biome: 8,
    atmosphericLayer: 'deep_space',
    style: 'embers',
    label: 'Exosphere Edge of Space · Solar Wind & Starfields',
    primaryColorHex: 0xfacc15,
    secondaryColorHex: 0xf472b6,
    skyColorHex: 0x030712,
    fogColorHex: 0x030712,
    fogDensity: 0.0006,
    vyBase: 0.45,
    vxDrift: 0.35,
    vzDrift: -0.35,
    swayAmp: 0.75,
    swayFreq: 1.6,
    particleScale: [0.1, 0.12, 0.1],
  },
  9: {
    biome: 9,
    atmosphericLayer: 'deep_space',
    style: 'celestial_shards',
    label: 'Deep Space Nebula · Cosmic Stardust & Ringed Planets',
    primaryColorHex: 0xf472b6,
    secondaryColorHex: 0x38bdf8,
    skyColorHex: 0x02040a,
    fogColorHex: 0x02040a,
    fogDensity: 0.0005,
    vyBase: 0.2,
    vxDrift: 0.2,
    vzDrift: -0.2,
    swayAmp: 0.6,
    swayFreq: 1.4,
    particleScale: [0.11, 0.14, 0.11],
  },
  10: {
    biome: 10,
    atmosphericLayer: 'deep_space',
    style: 'celestial_shards',
    label: 'Astral Apex 500 · Pure Starlight Sanctuary',
    primaryColorHex: 0xfef08a,
    secondaryColorHex: 0xffffff,
    skyColorHex: 0x010308,
    fogColorHex: 0x010308,
    fogDensity: 0.0004,
    vyBase: 0.55,
    vxDrift: 0.18,
    vzDrift: -0.18,
    swayAmp: 0.75,
    swayFreq: 1.5,
    particleScale: [0.11, 0.16, 0.11],
  },
};

export function getBiomeWeatherProfile(biome: number): BiomeWeatherProfile {
  const clamped = Math.max(1, Math.min(10, Math.round(biome)));
  return BIOME_WEATHER_PROFILES[clamped] || BIOME_WEATHER_PROFILES[1];
}

export interface StepTransitionDynamics {
  traumaDelta: number;
  cameraKickX: number;
  cameraKickY: number;
  cameraKickZ: number;
  targetCamX: number;
  targetCamY: number;
  targetCamZ: number;
  lerpRateXZ: number;
  lerpRateY: number;
}

export function computeStepTransitionDynamics(
  player: PlayerState,
  nextStep: LevelStep,
  stepDelta: number,
  transitionBoost: number
): StepTransitionDynamics {
  let traumaDelta = 0;
  let cameraKickX = 0;
  let cameraKickY = 0;
  let cameraKickZ = 0;

  if (stepDelta > 0) {
    traumaDelta = Math.min(0.32, 0.18 + stepDelta * 0.04);
    cameraKickX = Math.cos(player.aimAngle) * 0.42;
    cameraKickY = -0.62;
    cameraKickZ = Math.sin(player.aimAngle) * 0.42;
  } else if (stepDelta < 0) {
    const lost = Math.abs(stepDelta);
    traumaDelta = Math.min(0.78, 0.35 + lost * 0.03);
    cameraKickY = -1.15;
  }

  const lookAheadWeight = player.grounded
    ? player.isCharging
      ? 0.34
      : 0.24
    : 0.14;
  const targetCamX = player.x + (nextStep.x - player.x) * lookAheadWeight;
  const targetCamY =
    player.y + 1.15 + (nextStep.y - player.y) * (lookAheadWeight * 0.65);
  const targetCamZ = player.z + (nextStep.z - player.z) * lookAheadWeight;

  const baseXZ = player.grounded ? 8.2 : 10.5;
  const baseY = player.grounded ? 6.8 : 5.4;
  const lerpRateXZ = baseXZ + transitionBoost * 5.5;
  const lerpRateY = baseY + transitionBoost * 4.8;

  return {
    traumaDelta,
    cameraKickX,
    cameraKickY,
    cameraKickZ,
    targetCamX,
    targetCamY,
    targetCamZ,
    lerpRateXZ,
    lerpRateY,
  };
}
