import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TOTAL_LEVELS,
  LEVELS_500,
  MOUNTAIN_CORE_X,
  MOUNTAIN_CORE_Z,
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
  computeSpiralCameraOffset,
} from './rules';

test('generate500Levels generates 500 grounded mountain cliff stages spiraling 360 degrees around the central mountain core with random difficulty and stage puzzles', () => {
  const levels = generate500Levels(42);
  assert.equal(levels.length, TOTAL_LEVELS);
  assert.equal(levels[0].stepNumber, 1);
  assert.equal(levels[499].stepNumber, 500);

  const archetypes = new Set<string>();
  const difficultyValues = new Set<number>();
  const firstTenDiffs = new Set<number>();
  const puzzleTypes = new Set<string>();
  const spiralQuadrants = new Set<number>();
  let minWidth = Infinity;
  let maxWidth = 0;

  for (let i = 0; i < levels.length; i++) {
    archetypes.add(levels[i].stageArchetype);
    difficultyValues.add(levels[i].difficultyRating);
    puzzleTypes.add(levels[i].puzzleType);
    if (i < 10) firstTenDiffs.add(levels[i].difficultyRating);

    const dxCore = levels[i].x - MOUNTAIN_CORE_X;
    const dzCore = levels[i].z - MOUNTAIN_CORE_Z;
    const quad = (dxCore >= 0 ? 1 : 0) + (dzCore >= 0 ? 2 : 0);
    spiralQuadrants.add(quad);

    minWidth = Math.min(minWidth, levels[i].width);
    maxWidth = Math.max(maxWidth, levels[i].width);
    assert.ok(
      levels[i].supportDepth >= 8.0,
      `Step ${i + 1} should have deep grounded mountain cliff support`
    );
    assert.equal(
      levels[i].decoyLedge,
      undefined,
      `Step ${i + 1} should not have confusing floating decoy ledges`
    );
    if (i < 14) {
      assert.ok(
        levels[i].z <= -3.5,
        `Low-altitude Step ${i + 1} should stay north of Base Camp South Bank (z=${levels[i].z})`
      );
    }

    if (i > 0) {
      assert.ok(
        levels[i].y > levels[i - 1].y,
        `Step ${i + 1} should climb higher than step ${i}`
      );
      const stepDist = Math.hypot(
        levels[i].x - levels[i - 1].x,
        levels[i].z - levels[i - 1].z
      );
      assert.ok(
        stepDist >= 3.2 && stepDist <= 9.0 && levels[i].clearGap >= 0.8 && levels[i].clearGap <= 1.8,
        `Step ${i + 1} should have reachable non-linear spiral spacing (stepDist=${stepDist}, clearGap=${levels[i].clearGap})`
      );
    }
  }

  assert.equal(
    spiralQuadrants.size,
    4,
    'Stages should spiral 360 degrees around all 4 quadrants of the central mountain core'
  );
  assert.ok(
    puzzleTypes.has('boulder_socket') &&
      puzzleTypes.has('ordered_runes') &&
      puzzleTypes.has('timed_runes') &&
      puzzleTypes.has('crusher_gauntlet'),
    'Stages should feature boulder_socket, ordered_runes, timed_runes, and crusher_gauntlet puzzles'
  );

  assert.equal(
    difficultyValues.size,
    10,
    'Stages should randomly roll across all 10 difficulty ratings (1/10 to 10/10)'
  );
  assert.ok(
    firstTenDiffs.size >= 6 &&
      Math.max(...firstTenDiffs) >= 9 &&
      Math.min(...firstTenDiffs) <= 3,
    'Even the first 10 stages should feature random difficulty variation from calm breathers (<=3) to extreme gauntlets (>=9)'
  );
  assert.ok(
    archetypes.size >= 5,
    'Stages should permute across at least 5 distinct size/shape archetypes'
  );
  assert.ok(
    maxWidth - minWidth >= 2.2,
    'Stages should have wide size variation between narrow ridges and grand sanctuaries'
  );

  const puzzleStageCount = levels.filter(
    (s) => s.requiresSwitch && s.runePlates.length > 0
  ).length;
  const obstacleStageCount = levels.filter(
    (s) => s.deckObstacles.length > 0
  ).length;
  const rollingStoneCount = levels.filter((s) => s.hazard === 'pusher').length;
  assert.ok(puzzleStageCount >= 460, 'Almost all stages should feature interactive puzzles');
  assert.ok(obstacleStageCount > 300, 'Most stages should feature physical on-deck roadblocks');
  assert.ok(rollingStoneCount >= 80, 'Many stages should feature Sisyphean rolling boulders');
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

test('interactive stage puzzles (ordered_runes, boulder_socket, timed_runes) and radial spiral camera behave accurately', () => {
  // 1. Ordered Runes: stepping out of order resets runes; stepping in order 1 -> 2 -> ... unlocks gate
  const orderedStep = LEVELS_500.find(
    (s) => s.puzzleType === 'ordered_runes' && s.runePlates.length >= 2 && !s.requiresBoulderSocket
  )!;
  assert.ok(orderedStep, 'Should find an ordered_runes stage');

  const state = createInitialPlayerState(orderedStep.stepNumber);
  assert.equal(isStepGateUnlocked(orderedStep, state), false);

  // Step on the 2nd rune first (wrong order) -> should reset
  const secondRune = orderedStep.runePlates[1];
  state.x = orderedStep.x + secondRune.relX;
  state.z = orderedStep.z + secondRune.relZ;
  const wrongRes = advancePlayerPhysics(state, 1 / 60, 0, 0, 0);
  assert.equal(wrongRes.resetRunesWrongOrder, true, 'Stepping on rune #2 before #1 should trigger wrong-order reset');
  assert.equal(state.activatedRuneIds.includes(secondRune.id), false);

  // Now step onto each rune plate in exact sequence #1 -> #2 -> ...
  for (const rune of orderedStep.runePlates) {
    state.x = orderedStep.x + rune.relX;
    state.z = orderedStep.z + rune.relZ;
    advancePlayerPhysics(state, 1 / 60, 0, 0, 0);
  }
  assert.equal(isStepGateUnlocked(orderedStep, state), true, 'Stage gate should unlock after activating ordered runes in sequence');

  // 2. Sisyphus Boulder Socket Puzzle: pushing the boulder into the altar socket + stepping on rune unlocks gate
  const boulderStep = LEVELS_500.find((s) => s.puzzleType === 'boulder_socket' && s.requiresBoulderSocket)!;
  assert.ok(boulderStep, 'Should find a boulder_socket puzzle stage');
  const bState = createInitialPlayerState(boulderStep.stepNumber);
  for (const rune of boulderStep.runePlates) {
    bState.activatedRuneIds.push(rune.id);
  }
  assert.equal(isStepGateUnlocked(boulderStep, bState), false, 'Gate remains locked until Sisyphus boulder is pushed into altar socket');

  // Position boulder halfway up the slope and leave it unattended -> it should roll back toward its pedestal
  bState.puzzleBoulderStep = boulderStep.stepNumber;
  bState.puzzleBoulderRelX =
    (boulderStep.boulderStartRelX + boulderStep.boulderSocketRelX) * 0.5;
  bState.puzzleBoulderRelZ =
    (boulderStep.boulderStartRelZ + boulderStep.boulderSocketRelZ) * 0.5;
  const initialDistToStart = Math.hypot(
    bState.puzzleBoulderRelX - boulderStep.boulderStartRelX,
    bState.puzzleBoulderRelZ - boulderStep.boulderStartRelZ
  );
  // Stand away from the boulder midpoint (which is near 0,0) so we are not touching/pushing it
  bState.x = boulderStep.x + 1.1;
  bState.z = boulderStep.z - 1.1;
  advancePlayerPhysics(bState, 0.25, 0, 0, 0);
  const rolledDistToStart = Math.hypot(
    bState.puzzleBoulderRelX - boulderStep.boulderStartRelX,
    bState.puzzleBoulderRelZ - boulderStep.boulderStartRelZ
  );
  assert.ok(
    rolledDistToStart < initialDistToStart,
    'Unattended Sisyphus boulder should roll back downhill toward its pedestal before locking'
  );

  // Position boulder just beside the altar socket and push it in
  bState.puzzleBoulderStep = boulderStep.stepNumber;
  bState.puzzleBoulderRelX = boulderStep.boulderSocketRelX - 0.12;
  bState.puzzleBoulderRelZ = boulderStep.boulderSocketRelZ;
  bState.x = boulderStep.x + bState.puzzleBoulderRelX - 0.55;
  bState.z = boulderStep.z + bState.puzzleBoulderRelZ;
  const pushRes = advancePlayerPhysics(bState, 1 / 60, 0, 1, 0);
  assert.equal(pushRes.lockedBoulderInSocket, true, 'Pushing boulder into altar socket should lock it');
  assert.equal(isStepGateUnlocked(boulderStep, bState), true, 'Gate unlocks once boulder socket and rune are both active');

  // 3. Radial Spiral Camera Offset always points outward from the central mountain core
  const camNorth = computeSpiralCameraOffset(120, MOUNTAIN_CORE_X, MOUNTAIN_CORE_Z - 14, 'isometric');
  assert.ok(camNorth.offsetZ < -8, 'When stage is north of mountain core, camera should sit further north looking south');
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

test('computeWorldZoomMetrics, computeCameraRelativeWorldAngle, and applyControllerDeadzone support world scout zoom, mouse aim, and gamepad controls', async () => {
  const {
    computeWorldZoomMetrics,
    computeCameraRelativeWorldAngle,
    applyControllerDeadzone,
  } = await import('./rules');

  // 1. Zoom out to Whole-World View on Title Screen before starting the climb
  const defaultZoom = computeWorldZoomMetrics(1.0, 2.36, 0, true, 0);
  const wholeWorldZoom = computeWorldZoomMetrics(0.26, 2.36, 0, true, 0);
  assert.equal(defaultZoom.isWholeWorldOverview, false);
  assert.equal(wholeWorldZoom.isWholeWorldOverview, true);
  assert.ok(
    wholeWorldZoom.maxVisibleStep > defaultZoom.maxVisibleStep + 50,
    'Zooming out to Whole-World View should reveal dozens of mountain stages'
  );
  assert.ok(
    wholeWorldZoom.effectiveCameraZoom < defaultZoom.effectiveCameraZoom,
    'Zooming out should reduce effective orthographic zoom'
  );

  // 2. Camera-relative mouse/stick aim projection
  const angleRight = computeCameraRelativeWorldAngle(1, 0, 0, 14);
  const angleUp = computeCameraRelativeWorldAngle(0, 1, 0, 14);
  assert.notEqual(angleRight, angleUp);
  assert.ok(Math.abs(angleRight - 0) < 0.01, 'Screen-right with +Z camera offset should map to +X world angle (0 rad)');
  assert.ok(Math.abs(angleUp - -Math.PI / 2) < 0.01, 'Screen-up with +Z camera offset should map to -Z world angle (-PI/2 rad)');

  // 3. Controller deadzone filtering
  const insideDz = applyControllerDeadzone(0.08, -0.05, 0.16);
  assert.equal(insideDz.magnitude, 0);
  assert.equal(insideDz.x, 0);
  assert.equal(insideDz.y, 0);

  const outsideDz = applyControllerDeadzone(0.8, 0.0, 0.16);
  assert.ok(outsideDz.magnitude > 0.7 && outsideDz.magnitude <= 1.0);
  assert.ok(outsideDz.x > 0.7);
});

test('computeFallScreenShake and sampleScreenShakeOffset scale impact trauma with fall height and steps lost', async () => {
  const { computeFallScreenShake, sampleScreenShakeOffset } = await import('./rules');

  const noFall = computeFallScreenShake(0.3, 0);
  assert.equal(noFall.triggered, false);
  assert.equal(noFall.trauma, 0);

  const minorDrop = computeFallScreenShake(2.2, 1);
  assert.equal(minorDrop.triggered, true);
  assert.ok(minorDrop.trauma >= 0.28);

  const catastrophicDrop = computeFallScreenShake(14.5, 12);
  assert.equal(catastrophicDrop.triggered, true);
  assert.equal(catastrophicDrop.intensityLabel, 'CATASTROPHIC QUAKE');
  assert.ok(catastrophicDrop.trauma > minorDrop.trauma);
  assert.ok(catastrophicDrop.durationSec > minorDrop.durationSec);

  const shakeSample = sampleScreenShakeOffset(catastrophicDrop.trauma, 1.23);
  assert.ok(
    Math.abs(shakeSample.offsetX) > 0 || Math.abs(shakeSample.offsetY) > 0,
    'Active trauma should produce non-zero 3D camera & HUD screen-shake offsets'
  );
  assert.ok(
    Math.abs(shakeSample.hudTranslateX) > 0 || Math.abs(shakeSample.hudTranslateY) > 0
  );
});

test('Ghost / Phantom Climber system seeds rival ghosts, records player trajectories, and interpolates 3D playback', async () => {
  const {
    createSeededRivalGhostRuns,
    recordPlayerGhostRun,
    sampleGhostPoseAtTime,
  } = await import('./rules');

  const seeded = createSeededRivalGhostRuns();
  assert.ok(seeded.length >= 3, 'Should seed at least 3 rival phantom trajectories');

  const customRun = {
    id: 'player_attempt_1',
    label: 'Attempt 1',
    skin: 'cauldron' as const,
    isRival: false,
    fromStep: 0,
    toStep: 1,
    peakY: 2.4,
    duration: 0.9,
    outcome: 'landed' as const,
    samples: [
      { t: 0, x: 0, y: -1.35, z: 0, vy: 6.5, aimAngle: 0.5 },
      { t: 0.45, x: 0.8, y: 1.4, z: -0.6, vy: 0.2, aimAngle: 0.5 },
      { t: 0.9, x: 1.5, y: -0.5, z: -1.1, vy: -4.0, aimAngle: 0.5 },
    ],
  };

  const updated = recordPlayerGhostRun(seeded, customRun);
  assert.equal(updated.length, seeded.length + 1);
  assert.ok(updated.some((r) => r.id === 'player_attempt_1' && r.label.includes('Your Best Vault')));

  const poseMid = sampleGhostPoseAtTime(customRun, 0.45, 0);
  assert.ok(poseMid.y > 0.5, 'Mid-jump ghost pose should be elevated near apex');
  assert.ok(poseMid.opacity > 0.2, 'Active ghost pose should be visible');
});

test('buildOfflineFallRoast and buildOfflineNpcReply generate context-aware narrator roasts and persona replies', async () => {
  const { buildOfflineFallRoast, buildOfflineNpcReply } = await import('./rules');

  const roast = buildOfflineFallRoast({
    fromStep: 18,
    toStep: 2,
    stepsLost: 16,
    fallDropMeters: 13.8,
    rageScore: 74,
    fallsCount: 6,
  });
  assert.ok(roast.quote.includes('18') && roast.quote.includes('2'), 'Roast should mention exact steps');
  assert.ok(roast.quote.includes('13.8m'), 'Roast should mention exact fall drop height');

  const goatReply = buildOfflineNpcReply({
    npcName: 'Old Goat Billy',
    npcSpecies: 'goat',
    npcRole: 'Hermit Goat',
    question: 'How do I clear the icy ridge?',
    currentStep: 12,
    peakStep: 19,
    fallsCount: 4,
    rageScore: 42,
  });
  assert.ok(goatReply.includes('Baa-hah') && goatReply.includes('Stage 12'));

  const crowReply = buildOfflineNpcReply({
    npcName: 'Corvus the Watcher',
    npcSpecies: 'crow',
    npcRole: 'Cynical Crow',
    question: 'Why are you laughing at me?',
    currentStep: 8,
    peakStep: 14,
    fallsCount: 5,
    rageScore: 58,
  });
  assert.ok(crowReply.includes('Caw') && crowReply.includes('58'));
});

test('Full 500-stage audit verifies every stage 1..500 is valid, jump-solvable, and milestones 100/200/300/400/500 are stable sanctuaries', async () => {
  const { LEVELS_500, TOTAL_LEVELS } = await import('./levels');
  const {
    createInitialPlayerState,
    computeIdealJumpToNextStep,
    computePredictedLandingSpot,
    advancePlayerPhysics,
    computeJumpVelocity,
  } = await import('./rules');

  assert.equal(LEVELS_500.length, 500);
  assert.equal(TOTAL_LEVELS, 500);

  // Check every 100th milestone stage (100, 200, 300, 400, 500)
  for (const milestone of [100, 200, 300, 400, 500]) {
    const stepObj = LEVELS_500[milestone - 1];
    assert.equal(stepObj.stepNumber, milestone);
    assert.equal(
      stepObj.hazard,
      'none',
      `Milestone Stage ${milestone} should be a stable sanctuary (hazard: none)`
    );
    assert.ok(
      stepObj.npc,
      `Milestone Stage ${milestone} should have a Trail Guide NPC stationed`
    );
  }

  // Verify all 499 stage-to-stage transitions have valid ideal jump solutions
  for (let s = 0; s < TOTAL_LEVELS; s++) {
    const p = createInitialPlayerState(s);
    const nextStep = LEVELS_500[s];
    const ideal = computeIdealJumpToNextStep(s, 0, {
      x: p.x,
      y: p.y,
      z: p.z,
    });
    assert.ok(
      Number.isFinite(ideal.aimAngle) &&
        ideal.chargeRatio >= 0.2 &&
        ideal.chargeRatio <= 1.0,
      `Stage ${s} -> ${s + 1} should have a finite ideal jump solution`
    );
    const pred = computePredictedLandingSpot(
      p.x,
      p.y,
      p.z,
      ideal.chargeRatio,
      ideal.aimAngle,
      nextStep,
      0
    );
    assert.ok(
      Number.isFinite(pred.x) && Number.isFinite(pred.z),
      `Predicted landing spot for Stage ${s + 1} must be finite`
    );
  }

  // Simulate jumping from Stage 499 onto Stage 500 (Astral Summit) and triggering victory
  const p499 = createInitialPlayerState(499);
  p499.unlockedGateSteps.push(499);
  const st499 = LEVELS_500[498];
  for (const rp of st499.runePlates) {
    p499.activatedRuneIds.push(rp.id);
  }
  const ideal500 = computeIdealJumpToNextStep(499, 0, {
    x: p499.x,
    y: p499.y,
    z: p499.z,
  });
  const vel500 = computeJumpVelocity(ideal500.chargeRatio, ideal500.aimAngle);
  p499.aimAngle = ideal500.aimAngle;
  p499.vx = vel500.vx;
  p499.vy = vel500.vy;
  p499.vz = vel500.vz;
  p499.grounded = false;

  let reached500 = false;
  for (let frame = 0; frame < 120; frame++) {
    const res = advancePlayerPhysics(p499, 1 / 60, frame / 60, 0, 0);
    if (res.reachedSummit || p499.won || p499.currentStep === 500) {
      reached500 = true;
      break;
    }
  }
  assert.equal(reached500, true, 'Jumping from Stage 499 should land on Stage 500 and reach the summit');
  assert.equal(p499.won, true);
});

test('GDD Progression Seal repels player attempting to skip an unsolved stage puzzle, and allows progression once solved', async () => {
  const { LEVELS_500 } = await import('./levels');
  const {
    createInitialPlayerState,
    advancePlayerPhysics,
    getStageProgressionBrief,
    isStepGateUnlocked,
  } = await import('./rules');

  // Stage 1 has a rune lock that must be stepped on before jumping to Stage 2
  const stage1 = LEVELS_500[0];
  const stage2 = LEVELS_500[1];
  const p = createInitialPlayerState(1);

  assert.equal(isStepGateUnlocked(stage1, p), false, 'Stage 1 gate should start locked');
  const briefLocked = getStageProgressionBrief(stage1, p);
  assert.equal(briefLocked.readyToAdvance, false);
  assert.ok(briefLocked.checklist.length >= 2, 'Stage 1 should have progression checklist items');

  // Attempt to land directly onto Stage 2 WITHOUT solving Stage 1's rune plate
  p.x = stage2.x;
  p.z = stage2.z;
  p.y = stage2.y + 0.12;
  p.vy = -2.5;
  p.grounded = false;

  const repulseRes = advancePlayerPhysics(p, 1 / 60, 0.5, 0, 0);
  assert.equal(
    repulseRes.repulsedByLockedGate,
    true,
    'Attempting to land on Stage 2 while Stage 1 gate is locked must trigger Tartarus Seal Repulsion'
  );
  assert.equal(p.currentStep, 1, 'Player must remain on Stage 1 when repelled');
  assert.ok(p.stageFailStreak >= 1, 'Stage fail streak should increment on seal repulsion');

  // Now solve Stage 1's rune plate and land on Stage 2
  const pSolved = createInitialPlayerState(1);
  for (const r of stage1.runePlates) {
    pSolved.activatedRuneIds.push(r.id);
  }
  assert.equal(isStepGateUnlocked(stage1, pSolved), true, 'Stage 1 gate unlocks after runes activated');

  pSolved.x = stage2.x;
  pSolved.z = stage2.z;
  pSolved.y = stage2.y + 0.12;
  pSolved.vy = -2.5;
  pSolved.grounded = false;

  const landRes = advancePlayerPhysics(pSolved, 1 / 60, 0.6, 0, 0);
  assert.equal(landRes.repulsedByLockedGate, false);
  assert.equal(pSolved.currentStep, 2, 'Player advances to Stage 2 once Stage 1 puzzle gate is unlocked');
  assert.equal(pSolved.stageFailStreak, 0, 'Advancing to next stage resets stageFailStreak');
});

test('Sprint burst consumes stamina, boosts ground acceleration, and regenerates stamina when released', async () => {
  const { createInitialPlayerState, advancePlayerPhysics } = await import('./rules');

  const pWalk = createInitialPlayerState(0);
  const pSprint = createInitialPlayerState(0);

  for (let i = 0; i < 15; i++) {
    advancePlayerPhysics(pWalk, 1 / 60, i / 60, 1, 0, false);
    advancePlayerPhysics(pSprint, 1 / 60, i / 60, 1, 0, true);
  }

  assert.ok(
    pSprint.x > pWalk.x,
    `Sprinting player should cover more ground than walking player (${pSprint.x} > ${pWalk.x})`
  );
  assert.ok(pSprint.stamina < 100, 'Sprinting should consume stamina');
  assert.equal(pSprint.isSprinting, true);

  const staminaAfterSprint = pSprint.stamina;
  for (let i = 0; i < 20; i++) {
    advancePlayerPhysics(pSprint, 1 / 60, (15 + i) / 60, 0, 0, false);
  }
  assert.ok(
    pSprint.stamina > staminaAfterSprint,
    'Releasing sprint should regenerate stamina'
  );
});

test('Multi-stage consecutive jump physics (0 -> 1 -> 2 -> 3 -> 4 -> 5) lands cleanly without side-wall bounce or gate trapping', async () => {
  const { LEVELS_500 } = await import('./levels');
  const {
    createInitialPlayerState,
    computeIdealJumpToNextStep,
    computeJumpVelocity,
    advancePlayerPhysics,
  } = await import('./rules');

  const p = createInitialPlayerState(0);

  for (let targetStep = 1; targetStep <= 5; targetStep++) {
    // Unlock current stage gate & blocker NPC if on stage >= 1
    if (p.currentStep > 0) {
      const curSt = LEVELS_500[p.currentStep - 1];
      for (const rp of curSt.runePlates) {
        if (!p.activatedRuneIds.includes(rp.id)) p.activatedRuneIds.push(rp.id);
      }
      if (
        curSt.requiresBoulderSocket &&
        !p.boulderSocketUnlockedSteps.includes(curSt.stepNumber)
      ) {
        p.boulderSocketUnlockedSteps.push(curSt.stepNumber);
      }
      if (!p.unlockedGateSteps.includes(curSt.stepNumber)) {
        p.unlockedGateSteps.push(curSt.stepNumber);
      }
      if (!p.clearedNpcSteps.includes(curSt.stepNumber)) {
        p.clearedNpcSteps.push(curSt.stepNumber);
      }
    }

    const ideal = computeIdealJumpToNextStep(p.currentStep, 0, {
      x: p.x,
      y: p.y,
      z: p.z,
    });
    const vel = computeJumpVelocity(ideal.chargeRatio, ideal.aimAngle);
    p.aimAngle = ideal.aimAngle;
    p.vx = vel.vx;
    p.vy = vel.vy;
    p.vz = vel.vz;
    p.grounded = false;

    let landed = false;
    for (let f = 0; f < 90; f++) {
      const res = advancePlayerPhysics(p, 1 / 60, f / 60, 0, 0);
      if (res.landedStep === targetStep) {
        landed = true;
        break;
      }
    }

    assert.equal(
      landed,
      true,
      `Player should cleanly vault and land on Stage ${targetStep} (actual step=${p.currentStep}, grounded=${p.grounded})`
    );
    assert.equal(p.currentStep, targetStep);
    assert.equal(p.grounded, true);
  }
});





