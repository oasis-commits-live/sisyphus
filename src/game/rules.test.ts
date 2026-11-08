import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TOTAL_LEVELS,
  LEVELS_500,
  generate500Levels,
  getAtmosphericLayerForStep,
  VALLEY_SOLID_COLLIDERS,
  VALLEY_RIVER_BOUNDS,
  VALLEY_BRIDGE_BOUNDS,
  GROUND_FLOOR_Y,
  GROUND_STEP_META,
} from './levels';
import {
  createInitialPlayerState,
  advancePlayerPhysics,
  computeJumpVelocity,
  computeNpcPhysicalState,
  computeNpcPovCameraRig,
  getAutoCameraModeForStep,
  isStepGateUnlocked,
} from './rules';

test('generate500Levels generates 500 grounded multi-element stages with varied size archetypes ascending into space', () => {
  const levels = generate500Levels(42);
  assert.equal(levels.length, TOTAL_LEVELS);
  assert.equal(levels[0].stepNumber, 1);
  assert.equal(levels[499].stepNumber, 500);

  const archetypes = new Set<string>();
  let minWidth = Infinity;
  let maxWidth = 0;

  for (let i = 0; i < levels.length; i++) {
    archetypes.add(levels[i].stageArchetype);
    minWidth = Math.min(minWidth, levels[i].width);
    maxWidth = Math.max(maxWidth, levels[i].width);
    assert.ok(levels[i].supportDepth >= 3.8, `Step ${i + 1} should have deep grounded mountain support`);
    if (i > 0) {
      assert.ok(levels[i].y > levels[i - 1].y, `Step ${i + 1} should be higher than step ${i}`);
    }
  }

  assert.ok(archetypes.size >= 5, 'Stages should permute across at least 5 distinct size/shape archetypes');
  assert.ok(maxWidth - minWidth >= 2.2, 'Stages should have wide size variation between narrow ridges and grand sanctuaries');

  const puzzleStageCount = levels.filter((s) => s.requiresSwitch && s.runePlates.length > 0).length;
  const obstacleStageCount = levels.filter((s) => s.deckObstacles.length > 0).length;
  assert.ok(puzzleStageCount > 180, 'Many stages should feature multi-rune gate puzzles');
  assert.ok(obstacleStageCount > 300, 'Most stages should feature physical on-deck roadblocks');
});

test('getAtmosphericLayerForStep progresses from valley to deep space above step 100', () => {
  assert.equal(getAtmosphericLayerForStep(1), 'troposphere_valley');
  assert.equal(getAtmosphericLayerForStep(50), 'troposphere_valley');
  assert.equal(getAtmosphericLayerForStep(75), 'alpine_cloud_deck');
  assert.equal(getAtmosphericLayerForStep(120), 'stratosphere');
  assert.equal(getAtmosphericLayerForStep(250), 'thermosphere_aurora');
  assert.equal(getAtmosphericLayerForStep(420), 'deep_space');
});

test('getAutoCameraModeForStep automatically rotates camera perspective every 12 steps', () => {
  const mode0 = getAutoCameraModeForStep(0);
  const mode11 = getAutoCameraModeForStep(11);
  const mode12 = getAutoCameraModeForStep(12);
  const mode24 = getAutoCameraModeForStep(24);
  const mode36 = getAutoCameraModeForStep(36);

  assert.equal(mode0, 'isometric');
  assert.equal(mode11, 'isometric');
  assert.notEqual(mode12, mode0);
  assert.notEqual(mode24, mode12);
  assert.notEqual(mode36, mode24);
});

test('solid collision prevents walking or jumping through valley buildings, stage pillars, and on-deck obstacles', () => {
  const state = createInitialPlayerState(0);
  const cabin = VALLEY_SOLID_COLLIDERS.find((c) => c.id === 'collider-cabin') || VALLEY_SOLID_COLLIDERS[0];
  assert.ok(cabin, 'Valley cabin collider should exist');

  // 1. Place player just outside the front (+Z) edge of the cabin and walk toward -Z into it
  state.x = cabin.x;
  state.z = cabin.z + cabin.halfD + 0.4;
  state.y = GROUND_FLOOR_Y;

  for (let i = 0; i < 40; i++) {
    advancePlayerPhysics(state, 1 / 60, i / 60, 0, -1);
  }

  const minAllowedZ = cabin.z + cabin.halfD + 0.25;
  assert.ok(
    state.z >= minAllowedZ - 0.05,
    `Player should not walk through solid cabin (z=${state.z}, expected >= ${minAllowedZ})`
  );

  // 2. Test on-deck boulder/totem obstacle collision on a stage
  const stageWithObs = LEVELS_500.find((s) => s.deckObstacles.length > 0 && s.hazard === 'none') || LEVELS_500[1];
  const obs = stageWithObs.deckObstacles[0];
  const stageState = createInitialPlayerState(stageWithObs.stepNumber);
  stageState.x = stageWithObs.x + obs.relX;
  stageState.z = stageWithObs.z + obs.relZ + obs.halfD + 0.42;
  stageState.y = stageWithObs.y;

  for (let i = 0; i < 35; i++) {
    advancePlayerPhysics(stageState, 1 / 60, i / 60, 0, -1);
  }

  const distToObsZ = Math.abs(stageState.z - (stageWithObs.z + obs.relZ));
  assert.ok(
    distToObsZ >= obs.halfD + 0.25,
    `Player should be physically blocked by on-deck obstacle (distZ=${distToObsZ})`
  );
});

test('river water channel and arched bridge physics behave realistically', () => {
  const state = createInitialPlayerState(0);

  // 1. Place player on the cedar bridge
  state.x = (VALLEY_BRIDGE_BOUNDS.minX + VALLEY_BRIDGE_BOUNDS.maxX) * 0.5;
  state.z = (VALLEY_BRIDGE_BOUNDS.minZ + VALLEY_BRIDGE_BOUNDS.maxZ) * 0.5;
  state.y = VALLEY_BRIDGE_BOUNDS.deckY;
  advancePlayerPhysics(state, 1 / 60, 0.1, 0, 0);
  assert.equal(state.onRiverBridge, true);
  assert.equal(state.inRiverWater, false);
  assert.ok(state.y > GROUND_FLOOR_Y, 'Bridge deck should elevate player above valley floor');

  // 2. Place player in the river water away from the bridge
  state.x = -5.0;
  state.z = (VALLEY_RIVER_BOUNDS.minZ + VALLEY_RIVER_BOUNDS.maxZ) * 0.5;
  state.y = VALLEY_RIVER_BOUNDS.waterSurfaceY;
  const startX = state.x;
  for (let i = 0; i < 20; i++) {
    advancePlayerPhysics(state, 1 / 60, i / 60, 0, 0);
  }
  assert.equal(state.inRiverWater, true);
  assert.equal(state.onRiverBridge, false);
  assert.ok(state.x > startX + 0.2, 'River current should push wading player downstream along +X');
});

test('multi-rune stage gate blocks front launch edge until all runes on that stage are stepped on', () => {
  const lockedStep = LEVELS_500.find((s) => s.requiresSwitch && s.runePlates.length >= 2)!;
  assert.ok(lockedStep, 'Should find a multi-rune locked stage');

  const state = createInitialPlayerState(lockedStep.stepNumber);
  assert.equal(isStepGateUnlocked(lockedStep, state), false);

  // Step onto each rune plate on the stage
  for (const rune of lockedStep.runePlates) {
    state.x = lockedStep.x + rune.relX;
    state.z = lockedStep.z + rune.relZ;
    advancePlayerPhysics(state, 1 / 60, 0, 0, 0);
  }

  assert.equal(isStepGateUnlocked(lockedStep, state), true, 'Stage gate should unlock after activating all rune plates');
});

test('logical gravity fall lands naturally on lower surface without random teleportation', () => {
  const step10 = LEVELS_500[9];
  const state = createInitialPlayerState(10);

  // Position player in mid-air at a known (X, Z) away from upper terraces so they fall straight down to the valley floor
  state.x = 11.5;
  state.z = 6.5;
  state.y = step10.y;
  state.grounded = false;
  state.vx = 0;
  state.vz = 0;

  const expectedX = state.x;
  const expectedZ = state.z;

  for (let i = 0; i < 240; i++) {
    advancePlayerPhysics(state, 1 / 60, i / 60, 0, 0);
    if (state.grounded) break;
  }

  assert.equal(state.grounded, true);
  assert.equal(state.currentStep, 0);
  assert.ok(Math.abs(state.x - expectedX) < 0.8, 'Fall should preserve physical X coordinate instead of random teleport');
  assert.ok(Math.abs(state.z - expectedZ) < 0.8, 'Fall should preserve physical Z coordinate instead of random teleport');
});

test('pure jump vault launches player upward and computeNpcPovCameraRig frames NPC conversation', () => {
  const state = createInitialPlayerState(0);
  const vel = computeJumpVelocity(0.65, state.aimAngle);
  assert.ok(vel.vy > 4, 'Jump vault should impart positive vertical velocity');

  const npcPhys = computeNpcPhysicalState(GROUND_STEP_META, state, 1.0);
  assert.ok(npcPhys, 'Base camp NPC physical state should exist');
  const rig = computeNpcPovCameraRig(state, npcPhys!, GROUND_FLOOR_Y, 1.5);
  assert.ok(Number.isFinite(rig.camPosX) && Number.isFinite(rig.camPosY) && Number.isFinite(rig.camPosZ));
  assert.ok(Number.isFinite(rig.lookAtX) && Number.isFinite(rig.lookAtY) && Number.isFinite(rig.lookAtZ));
});
