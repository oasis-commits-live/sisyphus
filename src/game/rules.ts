import {
  GROUND_FLOOR_Y,
  GROUND_SPAWN_X,
  GROUND_SPAWN_Z,
  GROUND_STEP_META,
  LEVELS_500,
  LevelStep,
  PHILOSOPHICAL_ENDING_QUOTE,
  PHILOSOPHICAL_TAUNTS,
  TOTAL_LEVELS,
  currentSpireSeed,
  mutateUpperStepsOnFall,
} from './levels';

export interface PlayerState {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  grounded: boolean;
  isCharging: boolean;
  chargeRatio: number; // 0.0 to 1.0
  chargeDirection: 1 | -1; // 1 = rising, -1 = surging back
  chargeHoldTime: number;
  aimAngle: number; // radians in XZ plane
  currentStep: number; // 1 to 500
  peakStep: number; // 1 to 500
  lastStableStep: number;
  fallsCount: number;
  biggestFallLoss: number;
  rageScore: number; // 0 to 100
  coinsCollected: number;
  spireMutations: number;
  crumbleTimer: number;
  coyoteTimer: number;
  jumpBufferTimer: number;
  glitchTimer: number; // > 0 when controls are inverted by an Anomaly step
  teeterAmount: number; // 0..1 when standing perilously close to platform edge
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
export const MAX_JUMP_HORIZ_SPEED = 7.8;
export const MIN_JUMP_VERT_SPEED = 4.8;
export const MAX_JUMP_VERT_SPEED = 10.2;
export const CHARGE_FULL_DURATION = 0.88;
export const GROUND_NUDGE_SPEED = 2.65;
export const AIR_CONTROL_ACCEL = 3.2;

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
      coinsCollected: 0,
      spireMutations: 0,
      crumbleTimer: 0,
      coyoteTimer: 0.12,
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
  const initialAim = Math.atan2(nextObj.z - stepObj.z, nextObj.x - stepObj.x);

  return {
    x: stepObj.x,
    y: stepObj.y,
    z: stepObj.z,
    vx: 0,
    vy: 0,
    vz: 0,
    grounded: true,
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
    coinsCollected: 0,
    spireMutations: 0,
    crumbleTimer: 0,
    coyoteTimer: 0.12,
    jumpBufferTimer: 0,
    glitchTimer: 0,
    teeterAmount: 0,
    isTumbling: false,
    tumbleSpin: 0,
    won: stepObj.stepNumber >= TOTAL_LEVELS,
  };
}

export function getLiveWindVector(
  elapsedTime: number,
  stepNumber: number,
  seed = currentSpireSeed
): LiveWindState {
  const step = LEVELS_500[Math.max(0, Math.min(TOTAL_LEVELS - 1, stepNumber - 1))];
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
  const gustWave = 0.55 + 0.45 * Math.sin(elapsedTime * 1.35 + stepNumber * 0.5);
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
    turntableAngle = (elapsedTime * step.hazardSpeed + step.hazardPhase) % (Math.PI * 2);
    hazardWarning = 0.35;
  } else if (step.hazard === 'blinker') {
    const cycle = (elapsedTime * step.hazardSpeed + step.hazardPhase) % 4.2;
    if (cycle > 2.35 && cycle <= 3.15) {
      collapseWarning = (cycle - 2.35) / 0.8;
      hazardWarning = collapseWarning;
    } else if (cycle > 3.15 && cycle < 3.85) {
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
    if (crumbleProgress > 0 && crumbleProgress < 1.25) {
      collapseWarning = Math.min(1, crumbleProgress / 1.25);
    } else if (crumbleProgress >= 1.25 && crumbleProgress < 3.45) {
      collapsed = true;
    }
  } else if (step.hazard === 'pusher') {
    const cycle = (elapsedTime * step.hazardSpeed + step.hazardPhase) % 3.4;
    if (cycle > 1.75 && cycle <= 2.35) {
      hazardWarning = (cycle - 1.75) / 0.6;
    } else if (cycle > 2.35 && cycle <= 2.75) {
      pusherExtended = 1;
      hazardWarning = 1;
    } else if (cycle > 2.75 && cycle < 3.15) {
      pusherExtended = Math.max(0, 1 - (cycle - 2.75) / 0.4);
    }
  } else if (step.hazard === 'sweeper') {
    sweeperAngle = (elapsedTime * step.hazardSpeed + step.hazardPhase) % (Math.PI * 2);
  }

  return {
    offsetX,
    offsetZ,
    collapsed,
    collapseWarning,
    hazardWarning,
    pusherExtended,
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
  const isAimAligned = Math.abs(angleErrorDeg) <= 14;

  let bestCharge = 0.58;
  let bestDist = Infinity;
  for (let c = 0.32; c <= 0.95; c += 0.02) {
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
}

export function findLogicalLowerLandingStep(
  x: number,
  z: number,
  maxStepAllowed: number
): LevelStep {
  let bestStep = LEVELS_500[0];
  let bestDist = Infinity;
  const searchCap = Math.max(1, Math.min(LEVELS_500.length, maxStepAllowed));

  for (let i = 0; i < searchCap; i++) {
    const candidate = LEVELS_500[i];
    const d = Math.hypot(candidate.x - x, candidate.z - z);
    if (d < bestDist) {
      bestDist = d;
      bestStep = candidate;
    }
  }
  return bestStep;
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
  };

  if (state.won || simDt <= 0) return result;

  if (state.glitchTimer > 0) {
    state.glitchTimer = Math.max(0, state.glitchTimer - simDt);
  }

  const prevX = state.x;
  const prevY = state.y;
  const prevZ = state.z;

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
    state.coyoteTimer = 0.12;
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
      if (state.crumbleTimer >= 1.25) {
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
      const accel = activeStepObj.friction < 0.35 ? 6.5 : 16.0;
      state.vx += effMoveX * GROUND_NUDGE_SPEED * accel * simDt;
      state.vz += effMoveZ * GROUND_NUDGE_SPEED * accel * simDt;
    }

    const damping = Math.exp(-activeStepObj.friction * 9.0 * simDt);
    state.vx *= damping;
    state.vz *= damping;

    const platCenterX = activeStepObj.x + activeRuntime.offsetX;
    const platCenterZ = activeStepObj.z + activeRuntime.offsetZ;
    const relX = state.x - platCenterX;
    const relZ = state.z - platCenterZ;
    const halfW = activeStepObj.width * 0.5;
    const halfD = activeStepObj.depth * 0.5;

    if (activeStepObj.hasBarrierCenter) {
      const distCenter = Math.hypot(relX, relZ);
      if (distCenter < 0.46) {
        const pushAngle = Math.atan2(relZ || 0.1, relX || 0.1);
        state.vx += Math.cos(pushAngle) * 4.2;
        state.vz += Math.sin(pushAngle) * 4.2;
      }
    }

    const normEdgeX = Math.abs(relX) / Math.max(0.1, halfW);
    const normEdgeZ = Math.abs(relZ) / Math.max(0.1, halfD);
    state.teeterAmount = Math.max(
      0,
      Math.min(1, (Math.max(normEdgeX, normEdgeZ) - 0.65) / 0.35)
    );

    if (
      activeStepObj.hazard === 'pusher' &&
      activeRuntime.pusherExtended > 0.5
    ) {
      // Piston pushes along the track across the center strip of the platform
      const distFromCenter = Math.hypot(relX, relZ);
      if (distFromCenter < Math.max(halfW, halfD) * 0.78) {
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
      if (Math.abs(dot) < halfW * 0.88 && perp < 0.32) {
        state.vx = -barSin * 5.4;
        state.vz = barCos * 5.4;
        state.vy = 2.4;
        state.grounded = false;
        state.isTumbling = true;
        state.isCharging = false;
        state.chargeRatio = 0;
        state.chargeHoldTime = 0;
        result.knockedByHazard = true;
      }
    }

    state.x += state.vx * simDt;
    state.z += state.vz * simDt;

    if (state.currentStep <= 0 && !result.knockedByHazard) {
      // Standing on the Sanctuary Ground Floor: player can walk around the base courtyard freely
      state.x = Math.max(-7.5, Math.min(7.5, state.x));
      state.z = Math.max(-1.8, Math.min(6.2, state.z));
      state.y = GROUND_FLOOR_Y;
      state.teeterAmount = 0;
    } else {
      const newRelX = Math.abs(state.x - platCenterX);
      const newRelZ = Math.abs(state.z - platCenterZ);
      if (newRelX > halfW + 0.18 || newRelZ > halfD + 0.18) {
        state.grounded = false;
        state.isTumbling = true;
      } else {
        state.y = activeStepObj.y;
      }
    }
  } else {
    // AIRBORNE & TUMBLING CASCADE PHYSICS
    state.coyoteTimer = Math.max(0, state.coyoteTimer - simDt);
    state.teeterAmount = 0;

    if (state.isTumbling || state.vy < -3.5) {
      state.isTumbling = true;
      state.tumbleSpin += simDt * 9.5;
    }

    const airCtrl = state.isTumbling
      ? AIR_CONTROL_ACCEL * 0.45
      : AIR_CONTROL_ACCEL;
    state.vx += effMoveX * airCtrl * simDt;
    state.vz += effMoveZ * airCtrl * simDt;

    const wind = getLiveWindVector(elapsedTime, state.currentStep);
    if (wind.strength > 0) {
      state.vx += wind.windX * 0.55 * simDt;
      state.vz += wind.windZ * 0.55 * simDt;
    }

    state.vy += GRAVITY * simDt;
    state.x += state.vx * simDt;
    state.y += state.vy * simDt;
    state.z += state.vz * simDt;

    const maxCheckIdx = Math.min(LEVELS_500.length - 1, state.peakStep + 8);
    for (let i = maxCheckIdx; i >= 0; i--) {
      const plat = LEVELS_500[i];

      if (
        plat.decoyLedge &&
        state.vy <= 0 &&
        prevY >= plat.decoyLedge.y - 0.25 &&
        state.y <= plat.decoyLedge.y + 0.2
      ) {
        const dl = plat.decoyLedge;
        if (
          Math.abs(state.x - dl.x) <= dl.width * 0.5 + 0.14 &&
          Math.abs(state.z - dl.z) <= dl.depth * 0.5 + 0.14
        ) {
          state.vy = dl.trapType === 'repulsor' ? 6.2 : 2.2;
          state.vx = (plat.x - dl.x) * 1.4;
          state.vz = (plat.z - dl.z) * 1.4;
          state.isTumbling = true;
          result.knockedByHazard = true;
          break;
        }
      }

      if (Math.abs(plat.y - state.y) > 2.2) continue;

      const rt = getStepRuntimeOffset(plat, elapsedTime, 0);
      if (rt.collapsed) continue;

      const cx = plat.x + rt.offsetX;
      const cz = plat.z + rt.offsetZ;
      const halfW = plat.width * 0.5 + 0.18;
      const halfD = plat.depth * 0.5 + 0.18;
      const wallHalfW = plat.width * 0.5 - 0.06;
      const wallHalfD = plat.depth * 0.5 - 0.06;
      const topY = plat.y;
      const bottomY = plat.y - plat.height;

      if (state.vy <= 0.5 && prevY >= topY - 0.36 && state.y <= topY + 0.24) {
        if (
          Math.abs(state.x - cx) <= halfW &&
          Math.abs(state.z - cz) <= halfD
        ) {
          if (
            plat.hazard === 'bouncer' &&
            (Math.abs(state.x - cx) > halfW * 0.72 ||
              Math.abs(state.z - cz) > halfD * 0.72)
          ) {
            state.vy = Math.max(4.6, Math.abs(state.vy) * plat.restitution);
            state.vx += Math.sign(state.x - cx || 1) * 3.8;
            state.vz += Math.sign(state.z - cz || 1) * 3.8;
            state.isTumbling = true;
            result.knockedByHazard = true;
            break;
          }

          const edgeRatio = Math.max(
            Math.abs(state.x - cx) / halfW,
            Math.abs(state.z - cz) / halfD
          );
          if (state.vy < -14.5 && edgeRatio > 0.82 && plat.stepNumber > 1) {
            state.y = topY + 0.05;
            state.vy = Math.abs(state.vy) * 0.32;
            state.vx *= 0.75;
            state.vz *= 0.75;
            state.isTumbling = true;
            result.bouncedOffLedge = true;
            break;
          }

          state.y = topY;
          state.vy = 0;
          state.vx *= plat.friction < 0.35 ? 0.82 : 0.28;
          state.vz *= plat.friction < 0.35 ? 0.82 : 0.28;
          state.grounded = true;
          state.isTumbling = false;
          state.tumbleSpin = 0;
          state.crumbleTimer = 0;

          const lost = Math.max(0, state.lastStableStep - plat.stepNumber);
          if (plat.stepNumber > state.peakStep) {
            state.coinsCollected += (plat.stepNumber - state.peakStep) * 5;
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
            state.spireMutations += 1;
            if (lost > state.biggestFallLoss) {
              state.biggestFallLoss = lost;
            }
            state.rageScore = calculateRageScore(
              state.fallsCount,
              lost,
              state.rageScore
            );
            mutateUpperStepsOnFall(plat.stepNumber, state.fallsCount);
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

      if (
        state.y < topY - 0.38 &&
        state.y > bottomY &&
        Math.abs(state.x - cx) <= wallHalfW &&
        Math.abs(state.z - cz) <= wallHalfD
      ) {
        if (Math.abs(prevX - cx) > wallHalfW) {
          state.vx = -state.vx * 0.55;
          state.x = prevX;
          state.isTumbling = true;
          result.bouncedOffLedge = true;
        } else if (Math.abs(prevZ - cz) > wallHalfD) {
          state.vz = -state.vz * 0.55;
          state.z = prevZ;
          state.isTumbling = true;
          result.bouncedOffLedge = true;
        }
      }
    }

    // Sanctuary Ground Floor Collision at y <= GROUND_FLOOR_Y (-1.35m)
    if (!state.grounded && state.y <= GROUND_FLOOR_Y) {
      const landOnGround = state.lastStableStep <= 8;
      const catchStep = landOnGround
        ? GROUND_STEP_META
        : findLogicalLowerLandingStep(
            state.x,
            state.z,
            Math.min(12, Math.max(1, state.lastStableStep - 1))
          );
      const lost = Math.max(0, state.lastStableStep - catchStep.stepNumber);

      if (landOnGround) {
        // Land naturally on the solid Sanctuary Ground Floor
        state.x = Math.max(-7.5, Math.min(7.5, state.x));
        state.z = Math.max(-4.5, Math.min(6.2, state.z));
        state.y = GROUND_FLOOR_Y;
      } else {
        state.x = catchStep.x;
        state.y = catchStep.y;
        state.z = catchStep.z;
      }

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
      state.currentStep = catchStep.stepNumber;
      state.lastStableStep = catchStep.stepNumber;

      const nextStep =
        LEVELS_500[Math.min(TOTAL_LEVELS - 1, catchStep.stepNumber)];
      state.aimAngle = Math.atan2(
        nextStep.z - state.z,
        nextStep.x - state.x
      );

      if (lost >= 1) {
        state.fallsCount += 1;
        state.spireMutations += 1;
        if (lost > state.biggestFallLoss) {
          state.biggestFallLoss = lost;
        }
        state.rageScore = calculateRageScore(
          state.fallsCount,
          lost,
          state.rageScore
        );
        mutateUpperStepsOnFall(Math.max(1, catchStep.stepNumber), state.fallsCount);
        result.fellToLowerStep = true;
        result.stepsLost = lost;
      }
      result.landedStep = catchStep.stepNumber;
    }
  }

  return result;
}
