import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  GROUND_FLOOR_Y,
  GROUND_SPAWN_X,
  GROUND_SPAWN_Z,
  GROUND_STEP_META,
  LEVELS_500,
  LevelStep,
  PHILOSOPHICAL_ENDING_QUOTE,
  TOTAL_LEVELS,
  currentSpireSeed,
} from '../game/levels';
import {
  GRAVITY,
  PlayerState,
  advancePlayerPhysics,
  computeAimAlignment,
  computeJumpVelocity,
  computePredictedLandingSpot,
  createInitialPlayerState,
  getLiveWindVector,
  getStepRuntimeOffset,
  selectPhilosophicalTaunt,
} from '../game/rules';
import { soundEngine } from '../game/audio';
import { ClimberSkin } from '../firebase';

export type GameShellState = 'title' | 'playing' | 'paused' | 'gameover';

export interface TelemetryUpdate {
  currentStep: number;
  peakStep: number;
  fallsCount: number;
  biggestFallLoss: number;
  rageScore: number;
  coinsCollected: number;
  chargeRatio: number;
  chargeHoldTime: number;
  isOvercharging: boolean;
  isOnTarget: boolean;
  isCharging: boolean;
  isTumbling: boolean;
  glitchActive: boolean;
  idealChargePercent: number;
  angleErrorDeg: number;
  isAimAligned: boolean;
  altitude: number;
  elapsedSeconds: number;
  spireSeed: number;
  spireMutations: number;
  windLabel: string;
  windStrength: number;
  windAngleRad: number;
  activeStepMeta: LevelStep;
  taunt: { quote: string; author: string; stepsLost: number } | null;
  won: boolean;
}

interface IsometricCanvasProps {
  shellState: GameShellState;
  playerSkin: ClimberSkin;
  resetSignal: number;
  seedSignal: number;
  warpStepSignal: { step: number; seq: number };
  touchMoveDir: { x: number; y: number };
  touchCharging: boolean;
  onTelemetryChange: (t: TelemetryUpdate) => void;
  onReachSummit: (finalTelemetry: TelemetryUpdate) => void;
}

interface StepSceneEntry {
  group: THREE.Group;
  railTrackGroup: THREE.Group; // Stationary rail track in world space for 'log' gliding gondolas
  blockMesh: THREE.Mesh;
  blockMat: THREE.MeshStandardMaterial;
  corniceMesh: THREE.Mesh;
  corniceMat: THREE.MeshStandardMaterial;
  padMesh: THREE.Mesh;
  padMat: THREE.MeshStandardMaterial;
  checkerGroup: THREE.Group;
  checkerMat: THREE.MeshStandardMaterial;
  chevronGroup: THREE.Group;
  chevronMat: THREE.MeshStandardMaterial;
  turntableGroup: THREE.Group;
  conveyorGroup: THREE.Group;
  treeLeftGroup: THREE.Group;
  treeRightGroup: THREE.Group;
  obeliskGroup: THREE.Group;
  decoyGroup: THREE.Group;
  pusherHousingGroup: THREE.Group;
  pusherMesh: THREE.Mesh;
  pusherMat: THREE.MeshStandardMaterial;
  sweeperHubMesh: THREE.Mesh;
  sweeperMesh: THREE.Mesh;
}

interface PooledParticle {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  scale: number;
  colorHex: number;
}

const PARTICLE_POOL_SIZE = 72;
const _vec3A = new THREE.Vector3();
const _dummyObj = new THREE.Object3D();
const _colorScratch = new THREE.Color();

function buildSanctuaryTree(
  unitBox: THREE.BoxGeometry,
  variant: 'emerald' | 'autumn' = 'emerald'
): THREE.Group {
  const g = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({
    color: 0x5c3a21,
    roughness: 0.85,
  });
  const foliageDarkMat = new THREE.MeshStandardMaterial({
    color: variant === 'autumn' ? 0xd97706 : 0x1b4332,
    roughness: 0.68,
  });
  const foliageLightMat = new THREE.MeshStandardMaterial({
    color: variant === 'autumn' ? 0xfbbf24 : 0x40916c,
    roughness: 0.62,
  });

  const trunk = new THREE.Mesh(unitBox, trunkMat);
  trunk.scale.set(0.16, 0.32, 0.16);
  trunk.position.y = 0.16;
  g.add(trunk);

  const tier1 = new THREE.Mesh(unitBox, foliageDarkMat);
  tier1.scale.set(0.48, 0.28, 0.48);
  tier1.position.y = 0.42;
  g.add(tier1);

  const tier2 = new THREE.Mesh(unitBox, foliageLightMat);
  tier2.scale.set(0.34, 0.28, 0.34);
  tier2.position.y = 0.68;
  g.add(tier2);

  const spire = new THREE.Mesh(unitBox, foliageDarkMat);
  spire.scale.set(0.18, 0.24, 0.18);
  spire.position.y = 0.92;
  g.add(spire);

  return g;
}

export const IsometricCanvas: React.FC<IsometricCanvasProps> = ({
  shellState,
  playerSkin,
  resetSignal,
  seedSignal,
  warpStepSignal,
  touchMoveDir,
  touchCharging,
  onTelemetryChange,
  onReachSummit,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const shellStateRef = useRef<GameShellState>(shellState);
  shellStateRef.current = shellState;

  const playerSkinRef = useRef<ClimberSkin>(playerSkin);
  playerSkinRef.current = playerSkin;

  const touchMoveDirRef = useRef(touchMoveDir);
  touchMoveDirRef.current = touchMoveDir;

  const touchChargingRef = useRef(touchCharging);
  touchChargingRef.current = touchCharging;

  const onTelemetryRef = useRef(onTelemetryChange);
  onTelemetryRef.current = onTelemetryChange;

  const onReachSummitRef = useRef(onReachSummit);
  onReachSummitRef.current = onReachSummit;

  const playerRef = useRef<PlayerState>(createInitialPlayerState(0));
  const simTimeRef = useRef<number>(0);
  const traumaRef = useRef<number>(0);
  const hitstopRef = useRef<number>(0);
  const squashXRef = useRef<number>(1);
  const squashYRef = useRef<number>(1);
  const rebuildFlagRef = useRef<boolean>(false);
  const tauntTimerRef = useRef<number>(0);
  const latestTauntRef = useRef<{
    quote: string;
    author: string;
    stepsLost: number;
  } | null>(null);

  useEffect(() => {
    if (seedSignal > 0) {
      rebuildFlagRef.current = true;
    }
  }, [seedSignal]);

  useEffect(() => {
    if (resetSignal > 0) {
      const nextState = createInitialPlayerState(0);
      playerRef.current = nextState;
      simTimeRef.current = 0;
      traumaRef.current = 0;
      hitstopRef.current = 0;
      squashXRef.current = 1;
      squashYRef.current = 1;
      tauntTimerRef.current = 0;
      latestTauntRef.current = null;
      rebuildFlagRef.current = true;

      const align = computeAimAlignment(
        nextState.x,
        nextState.y,
        nextState.z,
        nextState.aimAngle,
        LEVELS_500[0],
        0
      );

      onTelemetryRef.current({
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
        idealChargePercent: align.idealChargePercent,
        angleErrorDeg: align.angleErrorDeg,
        isAimAligned: align.isAimAligned,
        altitude: 0,
        elapsedSeconds: 0,
        spireSeed: currentSpireSeed,
        spireMutations: 0,
        windLabel: 'CALM',
        windStrength: 0,
        windAngleRad: 0,
        activeStepMeta: GROUND_STEP_META,
        taunt: null,
        won: false,
      });
    }
  }, [resetSignal]);

  useEffect(() => {
    if (warpStepSignal.seq > 0) {
      const target = Math.max(1, Math.min(TOTAL_LEVELS, warpStepSignal.step));
      const prevFalls = playerRef.current.fallsCount;
      const prevRage = playerRef.current.rageScore;
      const prevCoins = playerRef.current.coinsCollected;
      const prevPeak = Math.max(playerRef.current.peakStep, target);
      const nextState = createInitialPlayerState(target);
      nextState.fallsCount = prevFalls;
      nextState.rageScore = prevRage;
      nextState.coinsCollected = prevCoins;
      nextState.peakStep = prevPeak;
      playerRef.current = nextState;
      tauntTimerRef.current = 0;
      latestTauntRef.current = null;

      const nextStepObj =
        LEVELS_500[Math.min(TOTAL_LEVELS - 1, target)] || LEVELS_500[0];
      const align = computeAimAlignment(
        nextState.x,
        nextState.y,
        nextState.z,
        nextState.aimAngle,
        nextStepObj,
        simTimeRef.current
      );
      const wind = getLiveWindVector(simTimeRef.current, target);
      const snapshot: TelemetryUpdate = {
        currentStep: nextState.currentStep,
        peakStep: nextState.peakStep,
        fallsCount: nextState.fallsCount,
        biggestFallLoss: nextState.biggestFallLoss,
        rageScore: nextState.rageScore,
        coinsCollected: nextState.coinsCollected,
        chargeRatio: 0,
        chargeHoldTime: 0,
        isOvercharging: false,
        isOnTarget: false,
        isCharging: false,
        isTumbling: false,
        glitchActive: false,
        idealChargePercent: align.idealChargePercent,
        angleErrorDeg: align.angleErrorDeg,
        isAimAligned: align.isAimAligned,
        altitude: Math.round(nextState.y * 10) / 10,
        elapsedSeconds: Math.floor(simTimeRef.current),
        spireSeed: currentSpireSeed,
        spireMutations: nextState.spireMutations,
        windLabel: wind.compassLabel,
        windStrength: wind.strength,
        windAngleRad: wind.angleRad,
        activeStepMeta: LEVELS_500[target - 1],
        taunt: null,
        won: target >= TOTAL_LEVELS,
      };
      onTelemetryRef.current(snapshot);
      if (target >= TOTAL_LEVELS) {
        soundEngine.playPhilosophicalEndingHollowChord(
          PHILOSOPHICAL_ENDING_QUOTE
        );
        onReachSummitRef.current(snapshot);
      }
    }
  }, [warpStepSignal]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2)
    );
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const initRect = container.getBoundingClientRect();
    const initW = Math.max(160, initRect.width || window.innerWidth);
    const initH = Math.max(160, initRect.height || window.innerHeight);
    renderer.setSize(initW, initH);
    renderer.domElement.setAttribute('data-testid', 'isometric-canvas');
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const skyColor = new THREE.Color(0x1d3557);
    scene.background = skyColor;
    scene.fog = new THREE.FogExp2(0x1d3557, 0.0075);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(
      new RoomEnvironment(),
      0.04
    ).texture;
    pmremGenerator.dispose();

    const getFrustumSize = (w: number, h: number) => {
      const minDim = Math.min(w, h);
      if (minDim < 280) return 19.5;
      if (w < 640) return 17.5;
      return 15.5;
    };

    let frustumSize = getFrustumSize(initW, initH);
    const aspect = initW / initH;
    const camera = new THREE.OrthographicCamera(
      (frustumSize * aspect) / -2,
      (frustumSize * aspect) / 2,
      frustumSize / 2,
      frustumSize / -2,
      -90,
      260
    );
    const camTarget = new THREE.Vector3(0, 1.5, 0);
    const isoOffset = new THREE.Vector3(16, 16.5, 16);
    camera.position.copy(camTarget).add(isoOffset);
    camera.lookAt(camTarget);

    const hemiLight = new THREE.HemisphereLight(0xfff3d6, 0x1b4332, 1.22);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffedd5, 2.3);
    keyLight.position.set(16, 34, 12);
    keyLight.castShadow = !isSoftwareGl;
    if (!isSoftwareGl) {
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.near = 1;
      keyLight.shadow.camera.far = 120;
      const d = 22;
      keyLight.shadow.camera.left = -d;
      keyLight.shadow.camera.right = d;
      keyLight.shadow.camera.top = d;
      keyLight.shadow.camera.bottom = -d;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);
    scene.add(keyLight.target);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.8);
    rimLight.position.set(-18, 12, -14);
    scene.add(rimLight);

    const unitBoxGeo = new THREE.BoxGeometry(1, 1, 1);

    // =========================================================================
    // RICH MULTI-LAYERED RIVER GORGE, STRIPED MEADOW BANKS, WINDMILL & CLOUDS
    // =========================================================================
    const valleyDioramaGroup = new THREE.Group();
    valleyDioramaGroup.position.y = -1.7;

    const riverWaterMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      roughness: 0.2,
      metalness: 0.3,
    });
    const riverBed = new THREE.Mesh(unitBoxGeo, riverWaterMat);
    riverBed.scale.set(84, 0.5, 84);
    riverBed.position.y = -0.45;
    valleyDioramaGroup.add(riverBed);

    const grassLightMat = new THREE.MeshStandardMaterial({
      color: 0x52b788,
      roughness: 0.78,
    });
    const grassDarkMat = new THREE.MeshStandardMaterial({
      color: 0x40916c,
      roughness: 0.78,
    });
    const cliffEarthMat = new THREE.MeshStandardMaterial({
      color: 0x7f5539,
      roughness: 0.85,
    });
    const foamMat = new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.35,
    });

    for (let s = -14; s <= 14; s++) {
      const isRiverChannel = (s >= -3 && s <= -1) || (s >= 4 && s <= 6);
      if (isRiverChannel) {
        for (let r = -6; r <= 6; r += 2) {
          const foam = new THREE.Mesh(unitBoxGeo, foamMat);
          foam.scale.set(0.9, 0.08, 0.28);
          foam.position.set(r * 2.2 + (s % 2) * 0.8, -0.18, s * 1.9);
          valleyDioramaGroup.add(foam);
        }
        continue;
      }

      const earthStrip = new THREE.Mesh(unitBoxGeo, cliffEarthMat);
      earthStrip.scale.set(46, 0.65, 1.88);
      earthStrip.position.set(0, -0.2, s * 1.9);
      valleyDioramaGroup.add(earthStrip);

      const turfStrip = new THREE.Mesh(
        unitBoxGeo,
        Math.abs(s) % 2 === 0 ? grassLightMat : grassDarkMat
      );
      turfStrip.scale.set(46, 0.22, 1.88);
      turfStrip.position.set(0, 0.22, s * 1.9);
      valleyDioramaGroup.add(turfStrip);
    }

    const woodBridgeMat = new THREE.MeshStandardMaterial({
      color: 0x9c6644,
      roughness: 0.8,
    });
    const bridgePostMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.5,
    });
    [-3.8, 9.5].forEach((bz) => {
      for (let p = -2; p <= 2; p++) {
        const plank = new THREE.Mesh(unitBoxGeo, woodBridgeMat);
        plank.scale.set(1.8, 0.16, 0.75);
        plank.position.set(-2.5, 0.42, bz + p * 0.9);
        valleyDioramaGroup.add(plank);
      }
      [-1.8, 1.8].forEach((pz) => {
        const post = new THREE.Mesh(unitBoxGeo, bridgePostMat);
        post.scale.set(0.22, 0.9, 0.22);
        post.position.set(-3.3, 0.65, bz + pz);
        valleyDioramaGroup.add(post);
      });
    });

    const lanternMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.3,
    });
    const ruinStoneMat = new THREE.MeshStandardMaterial({
      color: 0xa8a29e,
      roughness: 0.8,
    });

    const valleyProps = [
      [-6.5, -6.5],
      [-4.2, -7.8],
      [4.5, -7.2],
      [7.8, -5.8],
      [-8.2, -0.5],
      [-5.5, 1.8],
      [6.4, 1.6],
      [9.2, -1.2],
      [-7.2, 6.2],
      [-3.5, 7.2],
      [3.8, 7.0],
      [8.0, 5.5],
      [-9.5, -4.0],
      [9.8, 3.2],
      [-1.5, -8.5],
      [2.2, -8.8],
    ];
    valleyProps.forEach(([px, pz], idx) => {
      const tree = buildSanctuaryTree(
        unitBoxGeo,
        idx % 3 === 0 ? 'autumn' : 'emerald'
      );
      tree.scale.setScalar(1.25 + (idx % 3) * 0.22);
      tree.position.set(px, 0.32, pz);
      valleyDioramaGroup.add(tree);

      if (idx % 2 === 0) {
        const col = new THREE.Mesh(unitBoxGeo, ruinStoneMat);
        col.scale.set(0.55, 1.1 + (idx % 3) * 0.5, 0.55);
        col.position.set(px + 1.1, 0.8, pz - 0.6);
        valleyDioramaGroup.add(col);

        const gem = new THREE.Mesh(unitBoxGeo, lanternMat);
        gem.scale.set(0.26, 0.26, 0.26);
        gem.position.set(px + 1.1, 1.55 + (idx % 3) * 0.25, pz - 0.6);
        valleyDioramaGroup.add(gem);
      }
    });

    const windmillTower = new THREE.Group();
    windmillTower.position.set(-7.2, 0.32, -2.5);
    const towerBody = new THREE.Mesh(
      unitBoxGeo,
      new THREE.MeshStandardMaterial({ color: 0xe76f51, roughness: 0.7 })
    );
    towerBody.scale.set(1.6, 3.2, 1.6);
    towerBody.position.y = 1.6;
    windmillTower.add(towerBody);

    const towerRoof = new THREE.Mesh(
      unitBoxGeo,
      new THREE.MeshStandardMaterial({ color: 0x264653, roughness: 0.6 })
    );
    towerRoof.scale.set(1.9, 0.6, 1.9);
    towerRoof.position.y = 3.4;
    windmillTower.add(towerRoof);

    const windmillBlades = new THREE.Group();
    windmillBlades.position.set(0.88, 2.5, 0);
    const sailMat = new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      roughness: 0.5,
    });
    for (let b = 0; b < 4; b++) {
      const arm = new THREE.Mesh(unitBoxGeo, sailMat);
      arm.scale.set(0.12, 2.6, 0.34);
      arm.rotation.x = (b * Math.PI) / 2;
      windmillBlades.add(arm);
    }
    windmillTower.add(windmillBlades);
    valleyDioramaGroup.add(windmillTower);

    // Ground Floor Trailhead Base Camp Courtyard (flush with the valley meadow at y = GROUND_FLOOR_Y)
    const groundCourtyardGroup = new THREE.Group();
    groundCourtyardGroup.position.set(GROUND_SPAWN_X, 0.34, GROUND_SPAWN_Z);
    const courtyardRim = new THREE.Mesh(
      unitBoxGeo,
      new THREE.MeshStandardMaterial({
        color: 0xd97706,
        roughness: 0.45,
        metalness: 0.3,
      })
    );
    courtyardRim.scale.set(2.45, 0.04, 2.45);
    groundCourtyardGroup.add(courtyardRim);

    const courtyardStone = new THREE.Mesh(
      unitBoxGeo,
      new THREE.MeshStandardMaterial({
        color: 0xe7e5e4,
        roughness: 0.7,
      })
    );
    courtyardStone.scale.set(2.2, 0.05, 2.2);
    courtyardStone.position.y = 0.01;
    groundCourtyardGroup.add(courtyardStone);

    // Inlaid Ground Trailhead Chevron pointing toward Step 1
    const groundArrowGroup = new THREE.Group();
    groundArrowGroup.position.y = 0.045;
    groundArrowGroup.rotation.y = Math.atan2(
      -(LEVELS_500[0].z - GROUND_SPAWN_Z),
      LEVELS_500[0].x - GROUND_SPAWN_X
    );
    const groundArrowShaft = new THREE.Mesh(unitBoxGeo, lanternMat);
    groundArrowShaft.scale.set(0.75, 0.02, 0.18);
    groundArrowShaft.position.set(0.15, 0, 0);
    groundArrowGroup.add(groundArrowShaft);
    const groundWingL = new THREE.Mesh(unitBoxGeo, lanternMat);
    groundWingL.scale.set(0.38, 0.02, 0.14);
    groundWingL.position.set(0.45, 0, -0.15);
    groundWingL.rotation.y = -0.65;
    groundArrowGroup.add(groundWingL);
    const groundWingR = new THREE.Mesh(unitBoxGeo, lanternMat);
    groundWingR.scale.set(0.38, 0.02, 0.14);
    groundWingR.position.set(0.45, 0, 0.15);
    groundWingR.rotation.y = 0.65;
    groundArrowGroup.add(groundWingR);
    groundCourtyardGroup.add(groundArrowGroup);

    // Two low trailhead boundary bollards flanking the ground courtyard
    [-1.05, 1.05].forEach((bx) => {
      const bollard = new THREE.Mesh(unitBoxGeo, ruinStoneMat);
      bollard.scale.set(0.28, 0.45, 0.28);
      bollard.position.set(bx, 0.24, 0.95);
      groundCourtyardGroup.add(bollard);
      const cap = new THREE.Mesh(unitBoxGeo, lanternMat);
      cap.scale.set(0.18, 0.14, 0.18);
      cap.position.set(bx, 0.52, 0.95);
      groundCourtyardGroup.add(cap);
    });
    valleyDioramaGroup.add(groundCourtyardGroup);

    scene.add(valleyDioramaGroup);

    const skyCloudsGroup = new THREE.Group();
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.9,
      transparent: true,
      opacity: 0.88,
    });
    for (let c = 0; c < 65; c++) {
      const cloudCluster = new THREE.Group();
      const ang = c * 1.15;
      const rad = 12.5 + (c % 4) * 3.2;
      const altY = c * 6.2 - 1.0;
      cloudCluster.position.set(
        Math.cos(ang) * rad,
        altY,
        Math.sin(ang) * rad
      );

      const puff1 = new THREE.Mesh(unitBoxGeo, cloudMat);
      puff1.scale.set(2.4, 0.55, 1.5);
      cloudCluster.add(puff1);

      const puff2 = new THREE.Mesh(unitBoxGeo, cloudMat);
      puff2.scale.set(1.4, 0.48, 1.2);
      puff2.position.set(0.6, 0.32, 0.2);
      cloudCluster.add(puff2);

      skyCloudsGroup.add(cloudCluster);
    }
    scene.add(skyCloudsGroup);

    // =========================================================================
    // 500 ARCHITECTURAL MONOLITH STEPS WITH LOGICAL MECHANISMS & PATH CHEVRONS
    // =========================================================================
    const obeliskMat = new THREE.MeshStandardMaterial({
      color: 0x57534e,
      roughness: 0.75,
    });
    const obeliskTipMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.35,
      metalness: 0.6,
    });
    const sundialBrassMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.3,
      metalness: 0.7,
    });
    const conveyorRollerMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      roughness: 0.35,
      metalness: 0.55,
    });
    const decoyStoneMat = new THREE.MeshStandardMaterial({
      color: 0x7f1d1d,
      roughness: 0.65,
    });
    const decoyCrackMat = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      emissive: 0xe11d48,
      emissiveIntensity: 0.75,
    });
    const darkTrackGrooveMat = new THREE.MeshStandardMaterial({
      color: 0x1c1917,
      roughness: 0.85,
    });

    const stepEntries: StepSceneEntry[] = [];

    for (let i = 0; i < LEVELS_500.length; i++) {
      const step = LEVELS_500[i];
      const stepGroup = new THREE.Group();

      // Stationary rail track in world space for 'log' gliding aerial gondolas
      const railTrackGroup = new THREE.Group();
      const railBeam = new THREE.Mesh(unitBoxGeo, sundialBrassMat);
      railBeam.scale.set(0.14, 0.14, 3.2);
      railTrackGroup.add(railBeam);
      const stopLeft = new THREE.Mesh(unitBoxGeo, obeliskMat);
      stopLeft.scale.set(0.32, 0.36, 0.24);
      stopLeft.position.set(0, 0.08, -1.6);
      railTrackGroup.add(stopLeft);
      const stopRight = new THREE.Mesh(unitBoxGeo, obeliskMat);
      stopRight.scale.set(0.32, 0.36, 0.24);
      stopRight.position.set(0, 0.08, 1.6);
      railTrackGroup.add(stopRight);
      scene.add(railTrackGroup);

      const blockMat = new THREE.MeshStandardMaterial({
        color: step.sideColorHex,
        roughness: 0.75,
        metalness: 0.08,
      });
      const blockMesh = new THREE.Mesh(unitBoxGeo, blockMat);
      blockMesh.castShadow = !isSoftwareGl;
      blockMesh.receiveShadow = !isSoftwareGl;
      stepGroup.add(blockMesh);

      const corniceMat = new THREE.MeshStandardMaterial({
        color: step.accentHex,
        roughness: 0.5,
        metalness: 0.25,
      });
      const corniceMesh = new THREE.Mesh(unitBoxGeo, corniceMat);
      stepGroup.add(corniceMesh);

      const padMat = new THREE.MeshStandardMaterial({
        color: step.topColorHex,
        roughness: step.friction < 0.35 ? 0.14 : 0.62,
        metalness: 0.12,
        emissive: new THREE.Color(0x000000),
      });
      const padMesh = new THREE.Mesh(unitBoxGeo, padMat);
      padMesh.position.y = 0.02;
      stepGroup.add(padMesh);

      // 2x2 Checkerboard Inlay Tiles
      const checkerGroup = new THREE.Group();
      checkerGroup.position.y = 0.052;
      const checkerMat = new THREE.MeshStandardMaterial({
        color: step.topAltColorHex,
        roughness: step.friction < 0.35 ? 0.14 : 0.65,
      });
      const tileA = new THREE.Mesh(unitBoxGeo, checkerMat);
      tileA.scale.set(0.42, 0.015, 0.42);
      tileA.position.set(-0.22, 0, -0.22);
      checkerGroup.add(tileA);
      const tileB = new THREE.Mesh(unitBoxGeo, checkerMat);
      tileB.scale.set(0.42, 0.015, 0.42);
      tileB.position.set(0.22, 0, 0.22);
      checkerGroup.add(tileB);
      stepGroup.add(checkerGroup);

      // Directional Path Chevron inlaid on the platform pointing toward Step i + 1!
      const chevronGroup = new THREE.Group();
      chevronGroup.position.y = 0.062;
      const chevronMat = new THREE.MeshStandardMaterial({
        color: 0xfef08a,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.35,
        roughness: 0.35,
      });
      const shaftBar = new THREE.Mesh(unitBoxGeo, chevronMat);
      shaftBar.scale.set(0.48, 0.02, 0.12);
      shaftBar.position.set(0.18, 0, 0);
      chevronGroup.add(shaftBar);
      const wingL = new THREE.Mesh(unitBoxGeo, chevronMat);
      wingL.scale.set(0.26, 0.02, 0.1);
      wingL.position.set(0.38, 0, -0.1);
      wingL.rotation.y = -0.65;
      chevronGroup.add(wingL);
      const wingR = new THREE.Mesh(unitBoxGeo, chevronMat);
      wingR.scale.set(0.26, 0.02, 0.1);
      wingR.position.set(0.38, 0, 0.1);
      wingR.rotation.y = 0.65;
      chevronGroup.add(wingR);
      stepGroup.add(chevronGroup);

      // Rotating Sundial Turntable
      const turntableGroup = new THREE.Group();
      turntableGroup.position.y = 0.068;
      const dialPlate = new THREE.Mesh(unitBoxGeo, sundialBrassMat);
      dialPlate.scale.set(0.95, 0.04, 0.95);
      turntableGroup.add(dialPlate);
      const pointerBar = new THREE.Mesh(unitBoxGeo, obeliskMat);
      pointerBar.scale.set(1.15, 0.06, 0.14);
      pointerBar.position.y = 0.03;
      turntableGroup.add(pointerBar);
      stepGroup.add(turntableGroup);

      // Conveyor Roller Belt
      const conveyorGroup = new THREE.Group();
      conveyorGroup.position.y = 0.068;
      for (let r = -1; r <= 1; r++) {
        const roller = new THREE.Mesh(unitBoxGeo, conveyorRollerMat);
        roller.scale.set(0.16, 0.04, 0.9);
        roller.position.set(r * 0.38, 0, 0);
        conveyorGroup.add(roller);
      }
      stepGroup.add(conveyorGroup);

      const treeLeftGroup = buildSanctuaryTree(unitBoxGeo, 'emerald');
      stepGroup.add(treeLeftGroup);
      const treeRightGroup = buildSanctuaryTree(unitBoxGeo, 'autumn');
      stepGroup.add(treeRightGroup);

      const obeliskGroup = new THREE.Group();
      const obBase = new THREE.Mesh(unitBoxGeo, obeliskMat);
      obBase.scale.set(0.46, 0.56, 0.46);
      obBase.position.y = 0.28;
      obeliskGroup.add(obBase);
      const obCap = new THREE.Mesh(unitBoxGeo, obeliskTipMat);
      obCap.scale.set(0.28, 0.26, 0.28);
      obCap.position.y = 0.68;
      obeliskGroup.add(obCap);
      stepGroup.add(obeliskGroup);

      const decoyGroup = new THREE.Group();
      const decoyBody = new THREE.Mesh(unitBoxGeo, decoyStoneMat);
      decoyBody.scale.set(1.4, 0.42, 1.4);
      decoyBody.position.y = -0.21;
      decoyGroup.add(decoyBody);
      const decoyRune = new THREE.Mesh(unitBoxGeo, decoyCrackMat);
      decoyRune.scale.set(1.0, 0.04, 0.2);
      decoyRune.position.y = 0.02;
      decoyGroup.add(decoyRune);
      stepGroup.add(decoyGroup);

      // Recessed Hydraulic Piston Housing + Floor Track Slot ('pusher')
      const pusherHousingGroup = new THREE.Group();
      const housingWall = new THREE.Mesh(unitBoxGeo, obeliskMat);
      housingWall.scale.set(0.36, 0.56, 0.78);
      housingWall.position.set(-0.72, 0.28, 0);
      pusherHousingGroup.add(housingWall);
      const trackGroove = new THREE.Mesh(unitBoxGeo, darkTrackGrooveMat);
      trackGroove.scale.set(1.35, 0.03, 0.28);
      trackGroove.position.set(0, 0.058, 0);
      pusherHousingGroup.add(trackGroove);
      stepGroup.add(pusherHousingGroup);

      const pusherMat = new THREE.MeshStandardMaterial({
        color: 0xd97706,
        roughness: 0.32,
        metalness: 0.72,
        emissive: new THREE.Color(0x000000),
      });
      const pusherMesh = new THREE.Mesh(unitBoxGeo, pusherMat);
      pusherMesh.scale.set(0.46, 0.42, 0.62);
      pusherMesh.position.set(0, 0.25, 0);
      stepGroup.add(pusherMesh);

      // Central Clockwork Sweeper Hub + Rotating Beam ('sweeper')
      const sweeperHubMesh = new THREE.Mesh(unitBoxGeo, obeliskMat);
      sweeperHubMesh.scale.set(0.28, 0.36, 0.28);
      sweeperHubMesh.position.set(0, 0.18, 0);
      stepGroup.add(sweeperHubMesh);

      const sweeperMesh = new THREE.Mesh(unitBoxGeo, sundialBrassMat);
      sweeperMesh.position.set(0, 0.22, 0);
      stepGroup.add(sweeperMesh);

      scene.add(stepGroup);
      stepEntries.push({
        group: stepGroup,
        railTrackGroup,
        blockMesh,
        blockMat,
        corniceMesh,
        corniceMat,
        padMesh,
        padMat,
        checkerGroup,
        checkerMat,
        chevronGroup,
        chevronMat,
        turntableGroup,
        conveyorGroup,
        treeLeftGroup,
        treeRightGroup,
        obeliskGroup,
        decoyGroup,
        pusherHousingGroup,
        pusherMesh,
        pusherMat,
        sweeperHubMesh,
        sweeperMesh,
      });
    }

    const applyLevelGeometryToScene = () => {
      for (let i = 0; i < LEVELS_500.length; i++) {
        const step = LEVELS_500[i];
        const entry = stepEntries[i];

        entry.group.position.set(step.x, step.y, step.z);
        entry.blockMat.color.setHex(step.sideColorHex);
        entry.corniceMat.color.setHex(step.accentHex);
        entry.padMat.color.setHex(step.topColorHex);
        entry.padMat.roughness = step.friction < 0.35 ? 0.14 : 0.62;
        entry.checkerMat.color.setHex(step.topAltColorHex);

        entry.blockMesh.scale.set(step.width, step.height, step.depth);
        entry.blockMesh.position.y = -step.height / 2;

        entry.corniceMesh.scale.set(
          step.width * 1.04,
          0.14,
          step.depth * 1.04
        );
        entry.corniceMesh.position.y = -0.08;

        entry.padMesh.scale.set(step.width * 0.92, 0.06, step.depth * 0.92);
        entry.checkerGroup.scale.set(step.width, 1, step.depth);

        // Orient the Directional Path Chevron toward Step i + 1!
        if (i < LEVELS_500.length - 1) {
          const nextStep = LEVELS_500[i + 1];
          const toNextAngle = Math.atan2(
            -(nextStep.z - step.z),
            nextStep.x - step.x
          );
          entry.chevronGroup.visible = true;
          entry.chevronGroup.rotation.y = toNextAngle;
        } else {
          entry.chevronGroup.visible = false;
        }

        // Configure stationary rail track for 'log' gliding gondolas
        if (step.hazard === 'log') {
          entry.railTrackGroup.visible = true;
          entry.railTrackGroup.position.set(step.x, step.y - 0.52, step.z);
          entry.railTrackGroup.rotation.y = Math.atan2(-step.dirZ, step.dirX);
        } else {
          entry.railTrackGroup.visible = false;
        }

        entry.turntableGroup.visible = step.hazard === 'turntable';
        entry.conveyorGroup.visible = step.hazard === 'conveyor';
        if (step.hazard === 'conveyor') {
          entry.conveyorGroup.rotation.y = Math.atan2(
            -step.conveyorDirZ,
            step.conveyorDirX
          );
        }

        entry.treeLeftGroup.visible = step.hasTreeLeft;
        entry.treeLeftGroup.position.set(
          -step.width * 0.36,
          0.04,
          -step.depth * 0.36
        );

        entry.treeRightGroup.visible = step.hasTreeRight;
        entry.treeRightGroup.position.set(
          step.width * 0.36,
          0.04,
          step.depth * 0.36
        );

        entry.obeliskGroup.visible = step.hasBarrierCenter;

        if (step.decoyLedge) {
          entry.decoyGroup.visible = true;
          entry.decoyGroup.position.set(
            step.decoyLedge.x - step.x,
            step.decoyLedge.y - step.y,
            step.decoyLedge.z - step.z
          );
        } else {
          entry.decoyGroup.visible = false;
        }

        const isPusher = step.hazard === 'pusher';
        entry.pusherHousingGroup.visible = isPusher;
        entry.pusherMesh.visible = isPusher;
        if (isPusher) {
          const pushAngle = Math.atan2(-step.dirX, -step.dirZ);
          entry.pusherHousingGroup.rotation.y = pushAngle;
          entry.pusherMesh.rotation.y = pushAngle;
        }

        const isSweeper = step.hazard === 'sweeper';
        entry.sweeperHubMesh.visible = isSweeper;
        entry.sweeperMesh.visible = isSweeper;
        entry.sweeperMesh.scale.set(step.width * 0.9, 0.14, 0.14);
      }
    };

    applyLevelGeometryToScene();

    const summitEntry = stepEntries[TOTAL_LEVELS - 1];
    if (summitEntry) {
      const obeliskMat500 = new THREE.MeshStandardMaterial({
        color: 0xfacc15,
        roughness: 0.22,
        metalness: 0.78,
        emissive: 0xb45309,
        emissiveIntensity: 0.45,
      });
      const obelisk = new THREE.Mesh(
        new THREE.BoxGeometry(0.75, 2.8, 0.75),
        obeliskMat500
      );
      obelisk.position.set(0, 1.45, 0);
      summitEntry.group.add(obelisk);
    }

    // =========================================================================
    // 3D NEXT-STEP WAYPOINT BEACON (Marks Step N+1 so path is 100% obvious!)
    // =========================================================================
    const nextStepBeaconGroup = new THREE.Group();
    const beaconRimGroup = new THREE.Group();
    const beaconRimMat = new THREE.MeshBasicMaterial({
      color: 0x34d399,
      transparent: true,
      opacity: 0.85,
    });
    [
      [0, -0.5, 1.0, 0.05],
      [0, 0.5, 1.0, 0.05],
      [-0.5, 0, 0.05, 1.0],
      [0.5, 0, 0.05, 1.0],
    ].forEach(([rx, rz, sw, sd]) => {
      const rimBar = new THREE.Mesh(unitBoxGeo, beaconRimMat);
      rimBar.scale.set(sw, 0.04, sd);
      rimBar.position.set(rx, 0.05, rz);
      beaconRimGroup.add(rimBar);
    });
    nextStepBeaconGroup.add(beaconRimGroup);

    const beaconDiamondMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0x10b981,
      emissiveIntensity: 0.9,
      roughness: 0.2,
      metalness: 0.8,
    });
    const beaconDiamond = new THREE.Mesh(unitBoxGeo, beaconDiamondMat);
    beaconDiamond.scale.set(0.26, 0.44, 0.26);
    beaconDiamond.position.set(0, 1.25, 0);
    beaconDiamond.rotation.z = Math.PI / 4;
    beaconDiamond.rotation.x = Math.PI / 4;
    nextStepBeaconGroup.add(beaconDiamond);
    scene.add(nextStepBeaconGroup);

    // =========================================================================
    // ARTICULATED BLOCK-ART WAYFARER / ATLAS CLIMBER CHARACTER
    // (Voxel-Block Adventurer with Articulated Boots, Tunic, Flowing Cloak,
    //  Chained Runic Sisyphean Boulder Pack, Horned Wayfarer Helm & Great-Pick)
    // =========================================================================
    const playerGroup = new THREE.Group();
    const vesselBodyGroup = new THREE.Group();

    const armorSlateMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.42,
      metalness: 0.62,
    });
    const bootDarkMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.55,
      metalness: 0.4,
    });
    const leatherStrapMat = new THREE.MeshStandardMaterial({
      color: 0x78350f,
      roughness: 0.72,
    });
    const goldTrimMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.28,
      metalness: 0.82,
    });
    const bodySkinMat = new THREE.MeshStandardMaterial({
      color: 0xc2410c,
      roughness: 0.48,
      metalness: 0.22,
    });
    const cloakFabricMat = new THREE.MeshStandardMaterial({
      color: 0xea580c,
      roughness: 0.58,
      metalness: 0.12,
    });
    const coreGlowMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 1.45,
    });
    const boulderStoneMat = new THREE.MeshStandardMaterial({
      color: 0x292524,
      roughness: 0.78,
      metalness: 0.25,
    });
    const boulderInnerMat = new THREE.MeshStandardMaterial({
      color: 0x44403c,
      roughness: 0.72,
      metalness: 0.3,
    });
    const steelBladeMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.22,
      metalness: 0.88,
    });

    // 1. Articulated Left & Right Legs + Heavy Climbing Boots
    const buildClimberLeg = (sideZ: number) => {
      const legGroup = new THREE.Group();
      legGroup.position.set(0, 0.28, sideZ);

      const thighMesh = new THREE.Mesh(unitBoxGeo, armorSlateMat);
      thighMesh.scale.set(0.15, 0.18, 0.13);
      thighMesh.position.set(0, -0.07, 0);
      legGroup.add(thighMesh);

      const kneeGuard = new THREE.Mesh(unitBoxGeo, goldTrimMat);
      kneeGuard.scale.set(0.17, 0.06, 0.14);
      kneeGuard.position.set(0.02, -0.14, 0);
      legGroup.add(kneeGuard);

      const bootMesh = new THREE.Mesh(unitBoxGeo, bootDarkMat);
      bootMesh.scale.set(0.21, 0.11, 0.15);
      bootMesh.position.set(0.03, -0.22, 0);
      legGroup.add(bootMesh);

      const bootSole = new THREE.Mesh(unitBoxGeo, leatherStrapMat);
      bootSole.scale.set(0.22, 0.035, 0.16);
      bootSole.position.set(0.03, -0.265, 0);
      legGroup.add(bootSole);

      return legGroup;
    };

    const legLGroup = buildClimberLeg(-0.1);
    const legRGroup = buildClimberLeg(0.1);
    vesselBodyGroup.add(legLGroup);
    vesselBodyGroup.add(legRGroup);

    // 2. Layered Tunic, Belt & Armored Chest Cuirass
    const torsoLower = new THREE.Mesh(unitBoxGeo, bodySkinMat);
    torsoLower.scale.set(0.28, 0.16, 0.34);
    torsoLower.position.set(0, 0.35, 0);
    vesselBodyGroup.add(torsoLower);

    const beltMesh = new THREE.Mesh(unitBoxGeo, leatherStrapMat);
    beltMesh.scale.set(0.3, 0.06, 0.36);
    beltMesh.position.set(0, 0.4, 0);
    vesselBodyGroup.add(beltMesh);

    const beltBuckle = new THREE.Mesh(unitBoxGeo, goldTrimMat);
    beltBuckle.scale.set(0.04, 0.08, 0.1);
    beltBuckle.position.set(0.15, 0.4, 0);
    vesselBodyGroup.add(beltBuckle);

    const torsoChest = new THREE.Mesh(unitBoxGeo, armorSlateMat);
    torsoChest.scale.set(0.3, 0.26, 0.36);
    torsoChest.position.set(0, 0.54, 0);
    vesselBodyGroup.add(torsoChest);

    const chestPlaca = new THREE.Mesh(unitBoxGeo, bodySkinMat);
    chestPlaca.scale.set(0.32, 0.18, 0.24);
    chestPlaca.position.set(0.01, 0.55, 0);
    vesselBodyGroup.add(chestPlaca);

    const chestEmblem = new THREE.Mesh(unitBoxGeo, goldTrimMat);
    chestEmblem.scale.set(0.04, 0.1, 0.1);
    chestEmblem.position.set(0.165, 0.56, 0);
    vesselBodyGroup.add(chestEmblem);

    // Scarf Collar
    const scarfCollar = new THREE.Mesh(unitBoxGeo, cloakFabricMat);
    scarfCollar.scale.set(0.32, 0.08, 0.38);
    scarfCollar.position.set(0, 0.67, 0);
    vesselBodyGroup.add(scarfCollar);

    // 3. The Sisyphean Burden — Chained Runic Boulder Backpack on Back (-X)
    const boulderPackGroup = new THREE.Group();
    boulderPackGroup.position.set(-0.25, 0.58, 0);

    const boulderCore = new THREE.Mesh(unitBoxGeo, boulderStoneMat);
    boulderCore.scale.set(0.28, 0.34, 0.34);
    boulderPackGroup.add(boulderCore);

    const boulderBevel = new THREE.Mesh(unitBoxGeo, boulderInnerMat);
    boulderBevel.scale.set(0.34, 0.26, 0.26);
    boulderPackGroup.add(boulderBevel);

    const boulderCap = new THREE.Mesh(unitBoxGeo, boulderInnerMat);
    boulderCap.scale.set(0.22, 0.4, 0.24);
    boulderPackGroup.add(boulderCap);

    // Glowing Runic Veins carved into the Boulder Pack
    const boulderRuneV = new THREE.Mesh(unitBoxGeo, coreGlowMat);
    boulderRuneV.scale.set(0.35, 0.22, 0.05);
    boulderPackGroup.add(boulderRuneV);

    const boulderRuneH = new THREE.Mesh(unitBoxGeo, coreGlowMat);
    boulderRuneH.scale.set(0.35, 0.05, 0.22);
    boulderPackGroup.add(boulderRuneH);

    // Iron Binding Straps securing the boulder to the climber
    const strapTop = new THREE.Mesh(unitBoxGeo, goldTrimMat);
    strapTop.scale.set(0.32, 0.04, 0.36);
    strapTop.position.set(0.04, 0.1, 0);
    boulderPackGroup.add(strapTop);
    vesselBodyGroup.add(boulderPackGroup);

    // 4. Flowing Block-Art Wanderer Cloak Tails
    const buildCloakTail = (sideZ: number) => {
      const tailGroup = new THREE.Group();
      tailGroup.position.set(-0.16, 0.64, sideZ);
      const upperTail = new THREE.Mesh(unitBoxGeo, cloakFabricMat);
      upperTail.scale.set(0.05, 0.26, 0.11);
      upperTail.position.set(-0.04, -0.12, 0);
      tailGroup.add(upperTail);
      const lowerTip = new THREE.Mesh(unitBoxGeo, goldTrimMat);
      lowerTip.scale.set(0.05, 0.08, 0.11);
      lowerTip.position.set(-0.05, -0.27, 0);
      tailGroup.add(lowerTip);
      return tailGroup;
    };
    const shardL = buildCloakTail(-0.12);
    const shardR = buildCloakTail(0.12);
    vesselBodyGroup.add(shardL);
    vesselBodyGroup.add(shardR);

    // 5. Sculpted Block-Art Wayfarer Helm & Glowing Eyes
    const headGroup = new THREE.Group();
    headGroup.position.set(0.03, 0.81, 0);

    const faceBlock = new THREE.Mesh(unitBoxGeo, bootDarkMat);
    faceBlock.scale.set(0.24, 0.22, 0.24);
    headGroup.add(faceBlock);

    // Glowing Voxel Eyes on +X front face
    const eyeL = new THREE.Mesh(unitBoxGeo, coreGlowMat);
    eyeL.scale.set(0.04, 0.045, 0.055);
    eyeL.position.set(0.115, 0.01, -0.055);
    headGroup.add(eyeL);

    const eyeR = new THREE.Mesh(unitBoxGeo, coreGlowMat);
    eyeR.scale.set(0.04, 0.045, 0.055);
    eyeR.position.set(0.115, 0.01, 0.055);
    headGroup.add(eyeR);

    // Armored Wayfarer Hood / Helm Crown
    const helmCrown = new THREE.Mesh(unitBoxGeo, armorSlateMat);
    helmCrown.scale.set(0.28, 0.1, 0.28);
    helmCrown.position.set(-0.01, 0.1, 0);
    headGroup.add(helmCrown);

    const helmBack = new THREE.Mesh(unitBoxGeo, armorSlateMat);
    helmBack.scale.set(0.1, 0.22, 0.28);
    helmBack.position.set(-0.1, 0.0, 0);
    headGroup.add(helmBack);

    const helmBrow = new THREE.Mesh(unitBoxGeo, goldTrimMat);
    helmBrow.scale.set(0.06, 0.045, 0.29);
    helmBrow.position.set(0.12, 0.065, 0);
    headGroup.add(helmBrow);

    // Central Crest Plume & Winged Side Horns (Voxel Knight / Wayfarer silhouette)
    const haloRing = new THREE.Mesh(unitBoxGeo, goldTrimMat);
    haloRing.scale.set(0.22, 0.08, 0.06);
    haloRing.position.set(0.0, 0.17, 0);
    headGroup.add(haloRing);

    [-0.16, 0.16].forEach((hz) => {
      const hornBase = new THREE.Mesh(unitBoxGeo, goldTrimMat);
      hornBase.scale.set(0.08, 0.08, 0.06);
      hornBase.position.set(0.0, 0.06, hz);
      headGroup.add(hornBase);
      const hornTip = new THREE.Mesh(unitBoxGeo, steelBladeMat);
      hornTip.scale.set(0.07, 0.14, 0.05);
      hornTip.position.set(-0.03, 0.15, hz * 1.15);
      hornTip.rotation.z = 0.25;
      headGroup.add(hornTip);
    });
    vesselBodyGroup.add(headGroup);

    // 6. Articulated Left & Right Arms + Twin-Spiked Climbing Great-Pick
    const armLGroup = new THREE.Group();
    armLGroup.position.set(0.0, 0.6, -0.23);
    const pauldronL = new THREE.Mesh(unitBoxGeo, armorSlateMat);
    pauldronL.scale.set(0.16, 0.12, 0.12);
    armLGroup.add(pauldronL);
    const forearmL = new THREE.Mesh(unitBoxGeo, bodySkinMat);
    forearmL.scale.set(0.12, 0.18, 0.1);
    forearmL.position.set(0.02, -0.12, 0);
    armLGroup.add(forearmL);
    const gauntletL = new THREE.Mesh(unitBoxGeo, bootDarkMat);
    gauntletL.scale.set(0.13, 0.09, 0.11);
    gauntletL.position.set(0.03, -0.22, 0);
    armLGroup.add(gauntletL);
    vesselBodyGroup.add(armLGroup);

    const hammerPivot = new THREE.Group();
    hammerPivot.position.set(0.0, 0.6, 0.23);
    const pauldronR = new THREE.Mesh(unitBoxGeo, armorSlateMat);
    pauldronR.scale.set(0.16, 0.12, 0.12);
    hammerPivot.add(pauldronR);
    const forearmR = new THREE.Mesh(unitBoxGeo, bodySkinMat);
    forearmR.scale.set(0.12, 0.18, 0.1);
    forearmR.position.set(0.04, -0.12, 0);
    hammerPivot.add(forearmR);
    const gauntletR = new THREE.Mesh(unitBoxGeo, bootDarkMat);
    gauntletR.scale.set(0.13, 0.09, 0.11);
    gauntletR.position.set(0.06, -0.22, 0);
    hammerPivot.add(gauntletR);

    // Climber's Twin-Spiked Great-Pick / Alpenstock held in Right Gauntlet
    const shaftMesh = new THREE.Mesh(unitBoxGeo, leatherStrapMat);
    shaftMesh.scale.set(0.055, 0.86, 0.055);
    shaftMesh.position.set(0.18, 0.06, 0.02);
    shaftMesh.rotation.z = -0.32;
    hammerPivot.add(shaftMesh);

    const pickCollar = new THREE.Mesh(unitBoxGeo, goldTrimMat);
    pickCollar.scale.set(0.12, 0.1, 0.1);
    pickCollar.position.set(0.3, 0.42, 0.02);
    pickCollar.rotation.z = -0.32;
    hammerPivot.add(pickCollar);

    const pickBladeFront = new THREE.Mesh(unitBoxGeo, steelBladeMat);
    pickBladeFront.scale.set(0.28, 0.055, 0.06);
    pickBladeFront.position.set(0.41, 0.39, 0.02);
    pickBladeFront.rotation.z = -0.52;
    hammerPivot.add(pickBladeFront);

    const pickBladeBack = new THREE.Mesh(unitBoxGeo, steelBladeMat);
    pickBladeBack.scale.set(0.18, 0.05, 0.06);
    pickBladeBack.position.set(0.2, 0.45, 0.02);
    pickBladeBack.rotation.z = -0.12;
    hammerPivot.add(pickBladeBack);

    vesselBodyGroup.add(hammerPivot);

    playerGroup.add(vesselBodyGroup);

    const contactShadowGeo = new THREE.PlaneGeometry(0.68, 0.68);
    contactShadowGeo.rotateX(-Math.PI / 2);
    const contactShadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
    });
    const contactShadowMesh = new THREE.Mesh(
      contactShadowGeo,
      contactShadowMat
    );
    contactShadowMesh.position.y = 0.025;
    playerGroup.add(contactShadowMesh);

    scene.add(playerGroup);

    // =========================================================================
    // 3D PREDICTED LANDING TARGET RING & PARABOLIC ARC DOTS
    // =========================================================================
    const aimDotCount = 8;
    const aimDotMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    const aimDotsMesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.11, 0.11, 0.11),
      aimDotMat,
      aimDotCount
    );
    aimDotsMesh.frustumCulled = false;
    scene.add(aimDotsMesh);

    const targetRingGroup = new THREE.Group();
    const targetRingMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    [
      [0, -0.38, 0.84, 0.08],
      [0, 0.38, 0.84, 0.08],
      [-0.38, 0, 0.08, 0.84],
      [0.38, 0, 0.08, 0.84],
    ].forEach(([rx, rz, sw, sd]) => {
      const bar = new THREE.Mesh(unitBoxGeo, targetRingMat);
      bar.scale.set(sw, 0.06, sd);
      bar.position.set(rx, 0.06, rz);
      targetRingGroup.add(bar);
    });
    scene.add(targetRingGroup);

    // Pooled Particle Ring Buffer
    const particleGeo = new THREE.BoxGeometry(0.11, 0.11, 0.11);
    const particleMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const particleInstanced = new THREE.InstancedMesh(
      particleGeo,
      particleMat,
      PARTICLE_POOL_SIZE
    );
    particleInstanced.frustumCulled = false;
    scene.add(particleInstanced);

    const particlePool: PooledParticle[] = Array.from(
      { length: PARTICLE_POOL_SIZE },
      () => ({
        active: false,
        x: 0,
        y: -100,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 0.5,
        scale: 1,
        colorHex: 0xf59e0b,
      })
    );
    let particleCursor = 0;

    const spawnParticles = (
      x: number,
      y: number,
      z: number,
      count: number,
      speed: number,
      colorHex: number
    ) => {
      for (let i = 0; i < count; i++) {
        const pt = particlePool[particleCursor];
        particleCursor = (particleCursor + 1) % PARTICLE_POOL_SIZE;
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
        const spd = speed * (0.5 + Math.random() * 0.7);
        pt.active = true;
        pt.x = x;
        pt.y = y + 0.12;
        pt.z = z;
        pt.vx = Math.cos(angle) * spd;
        pt.vy = 1.6 + Math.random() * speed;
        pt.vz = Math.sin(angle) * spd;
        pt.life = 0;
        pt.maxLife = 0.35 + Math.random() * 0.25;
        pt.scale = 0.8 + Math.random() * 0.7;
        pt.colorHex = colorHex;
      }
    };

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    const keysHeld = new Set<string>();
    let spaceJustPressed = false;
    let spaceHeld = false;
    let pointerDownHeld = false;
    let lastChargeTickSound = 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement
      ) {
        return;
      }
      keysHeld.add(e.code);
      if (e.code === 'Space') {
        if (shellStateRef.current === 'playing') {
          e.preventDefault();
        }
        if (!spaceHeld) {
          spaceJustPressed = true;
        }
        spaceHeld = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysHeld.delete(e.code);
      if (e.code === 'Space') {
        spaceHeld = false;
      }
    };

    const clearInputs = () => {
      keysHeld.clear();
      spaceHeld = false;
      pointerDownHeld = false;
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (shellStateRef.current !== 'playing') return;
      if (e.button !== 0) return;
      pointerDownHeld = true;
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (shellStateRef.current !== 'playing') return;
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      const isoX = nx * 0.7071 - ny * 0.7071;
      const isoZ = -nx * 0.7071 - ny * 0.7071;
      if (Math.hypot(isoX, isoZ) > 0.08) {
        playerRef.current.aimAngle = Math.atan2(isoZ, isoX);
      }
    };

    const handlePointerUp = () => {
      pointerDownHeld = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', clearInputs);
    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    const updateSize = () => {
      if (!container) return;
      const r = container.getBoundingClientRect();
      const w = Math.max(160, r.width || window.innerWidth);
      const h = Math.max(160, r.height || window.innerHeight);
      frustumSize = getFrustumSize(w, h);
      const asp = w / h;
      camera.left = (frustumSize * asp) / -2;
      camera.right = (frustumSize * asp) / 2;
      camera.top = frustumSize / 2;
      camera.bottom = frustumSize / -2;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      renderer.render(scene, camera);
    };
    const resizeObs = new ResizeObserver(updateSize);
    resizeObs.observe(container);
    window.addEventListener('resize', updateSize);

    let frameId = 0;
    let disposed = false;
    let lastTime = performance.now();
    let hudSyncTimer = 0;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (disposed) return;
      if (rebuildFlagRef.current) {
        rebuildFlagRef.current = false;
        applyLevelGeometryToScene();
      }

      const now = performance.now();
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const frameDt = Math.min(Math.max(rawDt, 0.001), 0.16);
      const dt = Math.min(frameDt, 0.05);

      const mode = shellStateRef.current;
      const p = playerRef.current;

      if (tauntTimerRef.current > 0) {
        tauntTimerRef.current = Math.max(0, tauntTimerRef.current - frameDt);
        if (tauntTimerRef.current <= 0) {
          latestTauntRef.current = null;
        }
      }

      windmillBlades.rotation.x += frameDt * 0.95;

      const skin = playerSkinRef.current;
      if (skin === 'cauldron') {
        bodySkinMat.color.setHex(0xc2410c);
        cloakFabricMat.color.setHex(0xea580c);
        coreGlowMat.color.setHex(0x38bdf8);
        coreGlowMat.emissive.setHex(0x0284c7);
      } else if (skin === 'frog') {
        bodySkinMat.color.setHex(0x059669);
        cloakFabricMat.color.setHex(0x10b981);
        coreGlowMat.color.setHex(0x6ee7b7);
        coreGlowMat.emissive.setHex(0x059669);
      } else if (skin === 'astronaut') {
        bodySkinMat.color.setHex(0x4f46e5);
        cloakFabricMat.color.setHex(0x6366f1);
        coreGlowMat.color.setHex(0x38bdf8);
        coreGlowMat.emissive.setHex(0x0284c7);
      } else {
        bodySkinMat.color.setHex(0xd97706);
        cloakFabricMat.color.setHex(0xf59e0b);
        coreGlowMat.color.setHex(0xfef08a);
        coreGlowMat.emissive.setHex(0xd97706);
      }

      let isCurrentlyOnTarget = false;

      if (mode === 'title') {
        simTimeRef.current += frameDt;
        const tourT = simTimeRef.current * 0.35;
        const sampleIdx = Math.floor(((Math.sin(tourT) + 1) * 0.5) * 3);
        const targetStep =
          sampleIdx === 0
            ? GROUND_STEP_META
            : LEVELS_500[sampleIdx - 1] || LEVELS_500[0];
        _vec3A.set(targetStep.x, targetStep.y + 1.1, targetStep.z);
        camTarget.lerp(_vec3A, 1 - Math.exp(-3.5 * frameDt));

        camera.position.set(
          camTarget.x + isoOffset.x,
          camTarget.y + isoOffset.y,
          camTarget.z + isoOffset.z
        );
        camera.lookAt(camTarget);
      } else if (mode === 'playing') {
        if (hitstopRef.current > 0) {
          hitstopRef.current = Math.max(0, hitstopRef.current - frameDt);
        }
        traumaRef.current = Math.max(0, traumaRef.current - frameDt * 1.8);

        const totalSimDt = hitstopRef.current > 0 ? 0 : frameDt;
        simTimeRef.current += totalSimDt;

        let rawRight = touchMoveDirRef.current.x;
        let rawUp = touchMoveDirRef.current.y;
        if (keysHeld.has('KeyD') || keysHeld.has('ArrowRight')) rawRight += 1;
        if (keysHeld.has('KeyA') || keysHeld.has('ArrowLeft')) rawRight -= 1;
        if (keysHeld.has('KeyW') || keysHeld.has('ArrowUp')) rawUp += 1;
        if (keysHeld.has('KeyS') || keysHeld.has('ArrowDown')) rawUp -= 1;

        const moveX = rawRight * 0.7071 - rawUp * 0.7071;
        const moveZ = -rawRight * 0.7071 - rawUp * 0.7071;

        if (Math.hypot(moveX, moveZ) > 0.1) {
          const desiredAngle = Math.atan2(moveZ, moveX);
          const diff = Math.atan2(
            Math.sin(desiredAngle - p.aimAngle),
            Math.cos(desiredAngle - p.aimAngle)
          );
          const rotDir = p.glitchTimer > 0 ? -1 : 1;
          p.aimAngle += diff * rotDir * Math.min(1, frameDt * 12);
        }

        const activeStep =
          p.currentStep <= 0
            ? GROUND_STEP_META
            : LEVELS_500[
                Math.max(0, Math.min(TOTAL_LEVELS - 1, p.currentStep - 1))
              ];
        const holdingCharge =
          spaceHeld || pointerDownHeld || touchChargingRef.current;

        if (spaceJustPressed) {
          p.jumpBufferTimer = 0.14;
          spaceJustPressed = false;
        } else {
          p.jumpBufferTimer = Math.max(0, p.jumpBufferTimer - frameDt);
        }

        if ((p.grounded || p.coyoteTimer > 0) && holdingCharge) {
          if (!p.isCharging) {
            p.isCharging = true;
            p.chargeRatio = 0.25;
            p.chargeDirection = 1;
            p.chargeHoldTime = 0;
          }
          p.chargeHoldTime += frameDt;

          const rate = 0.85 * (activeStep.chargeSpeedMultiplier || 1.0);
          p.chargeRatio += p.chargeDirection * frameDt * rate;
          if (p.chargeRatio >= 1.0) {
            p.chargeRatio = 1.0;
            p.chargeDirection = -1;
          } else if (p.chargeRatio <= 0.22 && p.chargeDirection === -1) {
            p.chargeRatio = 0.22;
            p.chargeDirection = 1;
          }

          squashXRef.current = 1 + p.chargeRatio * 0.25;
          squashYRef.current = 1 - p.chargeRatio * 0.3;

          if (simTimeRef.current - lastChargeTickSound > 0.09) {
            lastChargeTickSound = simTimeRef.current;
            soundEngine.playChargeTick(p.chargeRatio);
          }

          if (p.chargeHoldTime >= 1.85) {
            const misfireAngle =
              p.aimAngle + (Math.random() < 0.5 ? 0.35 : -0.35);
            const vel = computeJumpVelocity(0.95, misfireAngle);
            p.vx = vel.vx;
            p.vy = vel.vy;
            p.vz = vel.vz;
            p.grounded = false;
            p.coyoteTimer = 0;
            p.isCharging = false;
            p.chargeRatio = 0;
            p.chargeHoldTime = 0;
            traumaRef.current = Math.min(1, traumaRef.current + 0.35);
            soundEngine.playGlitchZap();
            spawnParticles(p.x, p.y + 0.3, p.z, 14, 3.6, 0xf43f5e);
          }
        } else if (p.isCharging && !holdingCharge) {
          const launchRatio = Math.max(0.32, p.chargeRatio);
          const vel = computeJumpVelocity(launchRatio, p.aimAngle);
          p.vx = vel.vx;
          p.vy = vel.vy;
          p.vz = vel.vz;
          p.grounded = false;
          p.coyoteTimer = 0;
          p.isCharging = false;
          p.chargeRatio = 0;
          p.chargeHoldTime = 0;

          squashXRef.current = 0.76;
          squashYRef.current = 1.3;
          soundEngine.playJumpLaunch(launchRatio);
          spawnParticles(p.x, p.y, p.z, 9, 2.8, 0xf59e0b);
        }

        let remainingSim = totalSimDt;
        const maxSubStep = 0.025;
        while (remainingSim > 0.0001) {
          const stepDt = Math.min(remainingSim, maxSubStep);
          remainingSim -= stepDt;
          const physRes = advancePlayerPhysics(
            p,
            stepDt,
            simTimeRef.current - remainingSim,
            moveX,
            moveZ
          );

          if (physRes.triggeredGlitch) {
            soundEngine.playGlitchZap();
            spawnParticles(p.x, p.y + 0.4, p.z, 12, 3.4, 0xc084fc);
          }

          if (physRes.bouncedOffLedge) {
            soundEngine.playLedgeBonk();
            spawnParticles(p.x, p.y + 0.2, p.z, 8, 2.5, 0xf5efe6);
          }

          if (physRes.knockedByHazard) {
            hitstopRef.current = 0.055;
            traumaRef.current = Math.min(1, traumaRef.current + 0.65);
            soundEngine.playHazardHit();
            spawnParticles(p.x, p.y + 0.3, p.z, 18, 4.4, 0xf43f5e);
          }

          if (physRes.fellToLowerStep && physRes.stepsLost >= 1) {
            hitstopRef.current = 0.06;
            traumaRef.current = Math.min(
              1,
              0.38 + Math.min(0.6, physRes.stepsLost * 0.025)
            );
            squashXRef.current = 1.34;
            squashYRef.current = 0.66;

            const taunt = selectPhilosophicalTaunt(
              physRes.stepsLost,
              p.fallsCount
            );
            latestTauntRef.current = {
              ...taunt,
              stepsLost: physRes.stepsLost,
            };
            tauntTimerRef.current = 2.8;
            soundEngine.playCatastrophicFall(physRes.stepsLost, taunt.quote);
            spawnParticles(p.x, p.y, p.z, 24, 4.6, 0xd97706);
          } else if (physRes.landedStep !== null) {
            squashXRef.current = 1.22;
            squashYRef.current = 0.78;
            soundEngine.playStepLand(true);
            soundEngine.setBiome(
              LEVELS_500[Math.max(0, p.currentStep - 1)].biome
            );
            spawnParticles(p.x, p.y, p.z, 7, 2.2, 0x10b981);
          }

          if (physRes.reachedSummit) {
            soundEngine.playPhilosophicalEndingHollowChord(
              PHILOSOPHICAL_ENDING_QUOTE
            );
            const wind = getLiveWindVector(simTimeRef.current, TOTAL_LEVELS);
            const finalSnap: TelemetryUpdate = {
              currentStep: TOTAL_LEVELS,
              peakStep: TOTAL_LEVELS,
              fallsCount: p.fallsCount,
              biggestFallLoss: p.biggestFallLoss,
              rageScore: p.rageScore,
              coinsCollected: p.coinsCollected,
              chargeRatio: 0,
              chargeHoldTime: 0,
              isOvercharging: false,
              isOnTarget: false,
              isCharging: false,
              isTumbling: false,
              glitchActive: false,
              idealChargePercent: 50,
              angleErrorDeg: 0,
              isAimAligned: true,
              altitude: Math.round(p.y * 10) / 10,
              elapsedSeconds: Math.floor(simTimeRef.current),
              spireSeed: currentSpireSeed,
              spireMutations: p.spireMutations,
              windLabel: wind.compassLabel,
              windStrength: wind.strength,
              windAngleRad: wind.angleRad,
              activeStepMeta: LEVELS_500[TOTAL_LEVELS - 1],
              taunt: latestTauntRef.current,
              won: true,
            };
            onTelemetryRef.current(finalSnap);
            onReachSummitRef.current(finalSnap);
            break;
          }
        }

        const dampFactor = 1 - Math.exp(-12 * dt);
        squashXRef.current += (1 - squashXRef.current) * dampFactor;
        squashYRef.current += (1 - squashYRef.current) * dampFactor;

        _vec3A.set(p.x, p.y + 1.1, p.z);
        if (camTarget.distanceTo(_vec3A) > 8) {
          camTarget.copy(_vec3A);
        } else {
          camTarget.lerp(_vec3A, 1 - Math.exp(-7.5 * dt));
        }

        const shakeMag = traumaRef.current * traumaRef.current * 0.45;
        const shakeX = (Math.random() - 0.5) * 2 * shakeMag;
        const shakeY = (Math.random() - 0.5) * 2 * shakeMag;

        camera.position.set(
          camTarget.x + isoOffset.x + shakeX,
          camTarget.y + isoOffset.y + shakeY,
          camTarget.z + isoOffset.z
        );
        camera.lookAt(camTarget);

        keyLight.position.set(
          camTarget.x + 16,
          camTarget.y + 32,
          camTarget.z + 12
        );
        keyLight.target.position.copy(camTarget);
      }

      const minVisStep =
        mode === 'playing' ? Math.max(1, p.currentStep - 6) : 1;
      const maxVisStep = mode === 'playing' ? p.currentStep + 9 : 11;

      for (let i = 0; i < LEVELS_500.length; i++) {
        const step = LEVELS_500[i];
        const entry = stepEntries[i];

        if (
          step.stepNumber < minVisStep ||
          step.stepNumber > maxVisStep ||
          Math.abs(step.y - camTarget.y) > 28
        ) {
          entry.group.visible = false;
          entry.railTrackGroup.visible = false;
          continue;
        }

        const isCurrent = p.currentStep === step.stepNumber && p.grounded;
        const rt = getStepRuntimeOffset(
          step,
          simTimeRef.current,
          isCurrent ? p.crumbleTimer : 0
        );

        entry.railTrackGroup.visible = step.hazard === 'log';
        entry.group.visible = !rt.collapsed;
        if (!rt.collapsed) {
          const jitterX =
            rt.collapseWarning > 0
              ? (Math.random() - 0.5) * 0.09 * rt.collapseWarning
              : rt.glitchJitterX;
          entry.group.position.set(
            step.x + rt.offsetX + jitterX,
            step.y,
            step.z + rt.offsetZ
          );

          // Highlight the directional chevron on the player's current platform
          entry.chevronMat.emissiveIntensity = isCurrent ? 1.1 : 0.25;

          const warn = Math.max(rt.collapseWarning, rt.hazardWarning);
          if (warn > 0) {
            entry.padMat.emissive.setHex(
              step.hazard === 'glitch' || step.hazard === 'blinker'
                ? 0xc084fc
                : 0xf43f5e
            );
            entry.padMat.emissiveIntensity = warn * 0.55;
          } else {
            entry.padMat.emissiveIntensity = 0;
          }

          if (step.hazard === 'turntable') {
            entry.turntableGroup.rotation.y = -rt.turntableAngle;
          }

          if (step.hazard === 'pusher') {
            const slideOffset =
              (-0.55 + rt.pusherExtended * 1.1) * (step.width * 0.45);
            entry.pusherMesh.position.x = -step.dirZ * slideOffset;
            entry.pusherMesh.position.z = step.dirX * slideOffset;
            entry.pusherMat.emissive.setHex(0xf43f5e);
            entry.pusherMat.emissiveIntensity = rt.hazardWarning * 1.2;
          }
          if (step.hazard === 'sweeper') {
            entry.sweeperMesh.rotation.y = rt.sweeperAngle;
          }
        }
      }

      playerGroup.position.set(p.x, p.y, p.z);
      vesselBodyGroup.rotation.y = -p.aimAngle;
      vesselBodyGroup.rotation.z = p.isTumbling
        ? p.tumbleSpin
        : p.isCharging
        ? -p.chargeRatio * 0.16
        : 0;
      vesselBodyGroup.rotation.x = p.isTumbling ? p.tumbleSpin * 0.6 : 0;
      vesselBodyGroup.position.y = p.isCharging ? -p.chargeRatio * 0.1 : 0;
      vesselBodyGroup.scale.set(
        squashXRef.current,
        squashYRef.current,
        squashXRef.current
      );

      // Articulated Limb & Cloak Procedural Animation
      const groundSpeed = Math.hypot(p.vx, p.vz);
      const walkCycle =
        p.grounded && groundSpeed > 0.12
          ? Math.sin(simTimeRef.current * 15) *
            Math.min(0.65, groundSpeed * 0.25)
          : 0;

      if (!p.grounded) {
        legLGroup.rotation.z = 0.48;
        legRGroup.rotation.z = -0.38;
        armLGroup.rotation.z = -0.55;
      } else if (p.isCharging) {
        legLGroup.rotation.z = -p.chargeRatio * 0.35;
        legRGroup.rotation.z = p.chargeRatio * 0.35;
        armLGroup.rotation.z = -p.chargeRatio * 0.45;
      } else {
        legLGroup.rotation.z = walkCycle;
        legRGroup.rotation.z = -walkCycle;
        armLGroup.rotation.z = -walkCycle * 0.8;
      }

      coreGlowMat.emissiveIntensity = p.isCharging
        ? 1.5 + p.chargeRatio * 1.8
        : 1.35;

      const cloakFlutter =
        p.isCharging || !p.grounded
          ? 0.35 + Math.sin(simTimeRef.current * 20) * 0.22
          : 0.08 + Math.sin(simTimeRef.current * 4) * 0.06 + groundSpeed * 0.08;
      shardL.rotation.z = cloakFlutter;
      shardR.rotation.z =
        cloakFlutter + Math.cos(simTimeRef.current * 6) * 0.05;

      hammerPivot.rotation.z = p.isCharging
        ? p.chargeRatio * 0.95
        : !p.grounded
        ? -0.45
        : walkCycle * 0.7;
      contactShadowMesh.visible = p.grounded;

      // Update 3D Next-Step Waypoint Beacon + Predicted Landing Target Ring!
      const nextStepObj =
        LEVELS_500[Math.max(0, Math.min(TOTAL_LEVELS - 1, p.currentStep))] ||
        LEVELS_500[0];
      const nextRt = getStepRuntimeOffset(nextStepObj, simTimeRef.current, 0);

      if (
        mode === 'playing' &&
        p.currentStep < TOTAL_LEVELS &&
        !nextRt.collapsed
      ) {
        nextStepBeaconGroup.visible = true;
        nextStepBeaconGroup.position.set(
          nextStepObj.x + nextRt.offsetX,
          nextStepObj.y,
          nextStepObj.z + nextRt.offsetZ
        );
        beaconRimGroup.scale.set(nextStepObj.width, 1, nextStepObj.depth);
        beaconDiamond.position.y =
          1.15 + Math.sin(simTimeRef.current * 4.5) * 0.16;
        beaconDiamond.rotation.y = simTimeRef.current * 2.2;
      } else {
        nextStepBeaconGroup.visible = false;
      }

      const curStepObj =
        p.currentStep <= 0
          ? GROUND_STEP_META
          : LEVELS_500[
              Math.max(0, Math.min(TOTAL_LEVELS - 1, p.currentStep - 1))
            ] || LEVELS_500[0];
      const alignInfo = computeAimAlignment(
        p.grounded ? p.x : curStepObj.x,
        p.grounded ? p.y : curStepObj.y,
        p.grounded ? p.z : curStepObj.z,
        p.aimAngle,
        nextStepObj,
        simTimeRef.current
      );

      // When not charging, preview the arc at the ideal charge ratio along the player's current facing angle so they can see their aim line!
      const previewRatio = p.isCharging
        ? p.chargeRatio
        : alignInfo.idealChargePercent / 100;
      const previewVel = computeJumpVelocity(previewRatio, p.aimAngle);
      const predicted = computePredictedLandingSpot(
        p.grounded ? p.x : curStepObj.x,
        p.grounded ? p.y : curStepObj.y,
        p.grounded ? p.z : curStepObj.z,
        previewRatio,
        p.aimAngle,
        nextStepObj,
        simTimeRef.current
      );

      (window as unknown as { render_game_to_text?: () => string }).render_game_to_text = () =>
        JSON.stringify({
          mode,
          currentStep: p.currentStep,
          peakStep: p.peakStep,
          grounded: p.grounded,
          x: Number(p.x.toFixed(2)),
          y: Number(p.y.toFixed(2)),
          z: Number(p.z.toFixed(2)),
          chargeRatio: Number(p.chargeRatio.toFixed(2)),
          idealChargePercent: alignInfo.idealChargePercent,
          angleErrorDeg: alignInfo.angleErrorDeg,
          isAimAligned: alignInfo.isAimAligned,
          isOnTarget: predicted.isOnTarget,
        });
      isCurrentlyOnTarget = p.isCharging && predicted.isOnTarget;

      const reticleColorHex = isCurrentlyOnTarget
        ? 0x10b981
        : p.chargeDirection === -1
        ? 0xf43f5e
        : p.isCharging
        ? 0xfacc15
        : alignInfo.isAimAligned
        ? 0x38bdf8
        : 0xf97316;
      aimDotMat.color.setHex(reticleColorHex);
      targetRingMat.color.setHex(reticleColorHex);

      if (mode === 'playing' && p.grounded) {
        targetRingGroup.visible = true;
        targetRingGroup.position.set(predicted.x, nextStepObj.y, predicted.z);
        targetRingGroup.rotation.y = simTimeRef.current * 2.2;
        const ringPulse = isCurrentlyOnTarget
          ? 1.15 + Math.sin(simTimeRef.current * 14) * 0.12
          : p.isCharging
          ? 0.92
          : 0.75;
        targetRingGroup.scale.setScalar(ringPulse);
      } else {
        targetRingGroup.visible = false;
      }

      for (let i = 0; i < aimDotCount; i++) {
        if (mode === 'playing' && p.grounded) {
          const t = ((i + 1) / (aimDotCount + 1)) * predicted.flightTime;
          const dx = p.x + previewVel.vx * t;
          const dy = p.y + 0.18 + previewVel.vy * t + 0.5 * GRAVITY * t * t;
          const dz = p.z + previewVel.vz * t;
          _dummyObj.position.set(dx, dy, dz);
          const s = p.isCharging ? 1.15 - i * 0.08 : 0.68 - i * 0.04;
          _dummyObj.scale.setScalar(Math.max(0.22, s));
        } else {
          _dummyObj.position.set(0, -100, 0);
          _dummyObj.scale.setScalar(0.001);
        }
        _dummyObj.updateMatrix();
        aimDotsMesh.setMatrixAt(i, _dummyObj.matrix);
      }
      aimDotsMesh.instanceMatrix.needsUpdate = true;

      for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
        const pt = particlePool[i];
        if (pt.active) {
          pt.life += dt;
          if (pt.life >= pt.maxLife) {
            pt.active = false;
            _dummyObj.position.set(0, -100, 0);
            _dummyObj.scale.setScalar(0.001);
          } else {
            pt.vy += GRAVITY * 0.6 * dt;
            pt.x += pt.vx * dt;
            pt.y += pt.vy * dt;
            pt.z += pt.vz * dt;
            const fade = 1 - pt.life / pt.maxLife;
            _dummyObj.position.set(pt.x, pt.y, pt.z);
            _dummyObj.scale.setScalar(pt.scale * fade);
            _colorScratch.setHex(pt.colorHex);
            particleInstanced.setColorAt(i, _colorScratch);
          }
        } else {
          _dummyObj.position.set(0, -100, 0);
          _dummyObj.scale.setScalar(0.001);
        }
        _dummyObj.updateMatrix();
        particleInstanced.setMatrixAt(i, _dummyObj.matrix);
      }
      particleInstanced.instanceMatrix.needsUpdate = true;
      if (particleInstanced.instanceColor) {
        particleInstanced.instanceColor.needsUpdate = true;
      }

      hudSyncTimer += frameDt;
      if (hudSyncTimer >= 0.06) {
        hudSyncTimer = 0;
        const activeMeta =
          p.currentStep <= 0
            ? GROUND_STEP_META
            : LEVELS_500[
                Math.max(0, Math.min(TOTAL_LEVELS - 1, p.currentStep - 1))
              ];
        const wind = getLiveWindVector(
          simTimeRef.current,
          Math.max(1, p.currentStep)
        );
        onTelemetryRef.current({
          currentStep: p.currentStep,
          peakStep: p.peakStep,
          fallsCount: p.fallsCount,
          biggestFallLoss: p.biggestFallLoss,
          rageScore: p.rageScore,
          coinsCollected: p.coinsCollected,
          chargeRatio: p.chargeRatio,
          chargeHoldTime: p.chargeHoldTime,
          isOvercharging: p.chargeDirection === -1 || p.chargeHoldTime > 1.15,
          isOnTarget: isCurrentlyOnTarget,
          isCharging: p.isCharging,
          isTumbling: p.isTumbling,
          glitchActive: p.glitchTimer > 0,
          idealChargePercent: alignInfo.idealChargePercent,
          angleErrorDeg: alignInfo.angleErrorDeg,
          isAimAligned: alignInfo.isAimAligned,
          altitude: Math.max(0, Math.round((p.y - GROUND_FLOOR_Y) * 10) / 10),
          elapsedSeconds: Math.floor(simTimeRef.current),
          spireSeed: currentSpireSeed,
          spireMutations: p.spireMutations,
          windLabel: wind.compassLabel,
          windStrength: wind.strength,
          windAngleRad: wind.angleRad,
          activeStepMeta: activeMeta,
          taunt: latestTauntRef.current,
          won: p.won,
        });
      }

      renderer.render(scene, camera);
      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = window.requestAnimationFrame(tick);
      }
    }

    if (isSoftwareGl) {
      afterDraw(tick);
    } else {
      frameId = window.requestAnimationFrame(tick);
    }

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(frameId);
      resizeObs.disconnect();
      window.removeEventListener('resize', updateSize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', clearInputs);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="fixed inset-0 w-screen h-screen overflow-hidden select-none"
      aria-label="3D Isometric Monolith Sanctuary Viewport"
    />
  );
};
