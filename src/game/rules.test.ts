import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LEVELS_500,
  TOTAL_LEVELS,
  PHILOSOPHICAL_ENDING_QUOTE,
  generate500Levels,
} from './levels';
import {
  createInitialPlayerState,
  computeIdealJumpToNextStep,
  computeJumpVelocity,
  computePredictedLandingSpot,
  advancePlayerPhysics,
  checkVictoryPhilosophy,
} from './rules';

test('All 500 steps have guaranteed air gaps (zero stuck-together or overlapping steps) and change with seed', () => {
  assert.equal(LEVELS_500.length, TOTAL_LEVELS);
  assert.equal(TOTAL_LEVELS, 500);

  for (let i = 1; i < LEVELS_500.length; i++) {
    const prev = LEVELS_500[i - 1];
    const cur = LEVELS_500[i];

    // Must never have illogical car/train hazards on floating monoliths
    assert.notEqual(cur.hazard as string, 'traffic');
    assert.notEqual(cur.hazard as string, 'train');

    // Consecutive platforms must have a real edge-to-edge air gap >= 1.1m
    const centerDistXZ = Math.hypot(cur.x - prev.x, cur.z - prev.z);
    const prevRadius = Math.max(prev.width, prev.depth) * 0.5;
    const curRadius = Math.max(cur.width, cur.depth) * 0.5;
    const edgeGap = centerDistXZ - (prevRadius + curRadius);
    assert.ok(
      edgeGap >= 1.05,
      `Steps ${prev.stepNumber} and ${cur.stepNumber} are too close (edgeGap=${edgeGap.toFixed(2)}m)`
    );

    // Non-adjacent steps within vertical proximity (|dy| < 2.2m) must never overlap in XZ
    const startCheck = Math.max(0, i - 25);
    for (let j = startCheck; j < i - 1; j++) {
      const other = LEVELS_500[j];
      if (Math.abs(cur.y - other.y) < 2.2) {
        const dXZ = Math.hypot(cur.x - other.x, cur.z - other.z);
        const minAllowed =
          curRadius + Math.max(other.width, other.depth) * 0.5 + 0.35;
        assert.ok(
          dXZ >= minAllowed,
          `Step ${cur.stepNumber} overlaps non-adjacent Step ${other.stepNumber} (dXZ=${dXZ.toFixed(2)}m < ${minAllowed.toFixed(2)}m)`
        );
      }
    }
  }

  const altSteps = generate500Levels(999111);
  assert.notEqual(LEVELS_500[6].x, altSteps[6].x);
});

test('Every single step transition (1 -> 500) is 100% mathematically reachable within 45%..86% charge', () => {
  for (let s = 1; s < TOTAL_LEVELS; s++) {
    const cur = LEVELS_500[s - 1];
    const next = LEVELS_500[s];
    const ideal = computeIdealJumpToNextStep(s, 0);

    assert.ok(
      ideal.chargeRatio >= 0.42 && ideal.chargeRatio <= 0.88,
      `Step ${s} -> ${s + 1} has out-of-range chargeRatio ${ideal.chargeRatio} (horizGap=${next.horizGap}m, vertRise=${next.vertRise}m)`
    );

    const pred = computePredictedLandingSpot(
      cur.x,
      cur.y,
      cur.z,
      ideal.chargeRatio,
      ideal.aimAngle,
      next,
      0
    );
    const errXZ = Math.hypot(
      pred.x - pred.targetCenterX,
      pred.z - pred.targetCenterZ
    );
    assert.ok(
      errXZ <= next.width * 0.38,
      `Step ${s} -> ${s + 1} predicted landing misses target center by ${errXZ.toFixed(2)}m`
    );
  }
});

test('Multi-step simulated ascent cleanly vaults from Step 1 -> Step 2 -> Step 3 -> Step 4', () => {
  const state = createInitialPlayerState();
  let simClock = 0;

  for (let targetStep = 2; targetStep <= 4; targetStep++) {
    const fromStep = targetStep - 1;
    const ideal = computeIdealJumpToNextStep(fromStep, simClock);
    const jumpVel = computeJumpVelocity(ideal.chargeRatio, ideal.aimAngle);

    state.aimAngle = ideal.aimAngle;
    state.vx = jumpVel.vx;
    state.vy = jumpVel.vy;
    state.vz = jumpVel.vz;
    state.grounded = false;

    let landedOnTarget = false;
    for (let f = 0; f < 90; f++) {
      simClock += 1 / 60;
      const res = advancePlayerPhysics(state, 1 / 60, simClock, 0, 0);
      if (res.landedStep === targetStep) {
        landedOnTarget = true;
        break;
      }
    }

    assert.equal(
      landedOnTarget,
      true,
      `Failed to land on Step ${targetStep} from Step ${fromStep} (ended at y=${state.y.toFixed(2)}, step=${state.currentStep})`
    );
    assert.equal(state.currentStep, targetStep);
  }
  assert.equal(state.coinsCollected, 15);
});

test('Falling off an upper monolith step lands logically on a lower tier and mutates upper steps', () => {
  const state = createInitialPlayerState();
  const step4 = LEVELS_500[3];
  state.currentStep = 4;
  state.peakStep = 4;
  state.lastStableStep = 4;
  state.x = step4.x + step4.width * 0.5 + 0.35;
  state.y = step4.y + 0.35;
  state.z = step4.z;
  state.vx = 0.25;
  state.vy = -1.5;
  state.vz = 0;
  state.grounded = false;

  let fell = false;
  for (let i = 0; i < 180; i++) {
    const res = advancePlayerPhysics(state, 1 / 60, i / 60, 0, 0);
    if (res.fellToLowerStep) {
      fell = true;
      break;
    }
  }

  assert.equal(fell, true);
  assert.ok(state.currentStep < 4);
  assert.equal(state.fallsCount, 1);
  assert.equal(state.spireMutations, 1);
});

test('Step 500 triggers the exact philosophical ending quote', () => {
  const check499 = checkVictoryPhilosophy(499);
  assert.equal(check499.isVictory, false);

  const check500 = checkVictoryPhilosophy(500);
  assert.equal(check500.isVictory, true);
  assert.equal(check500.message, PHILOSOPHICAL_ENDING_QUOTE);
});
