import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import {
  AtmosphericLayerId,
  BIOME_BLUEPRINTS,
  GROUND_FLOOR_Y,
  GROUND_SPAWN_X,
  GROUND_SPAWN_Z,
  GROUND_STEP_META,
  LEVELS_500,
  LevelStep,
  TOTAL_LEVELS,
  TrailNpcData,
  VALLEY_BRIDGE_BOUNDS,
  VALLEY_RIVER_BOUNDS,
  VALLEY_SOLID_COLLIDERS,
  getAtmosphericLayerForStep,
} from '../game/levels';
import {
  CAMERA_ANGLE_PRESETS,
  CAMERA_SHIFT_INTERVAL_STEPS,
  CameraAngleMode,
  LiveWindState,
  PlayerState,
  advanceChargeState,
  advancePlayerPhysics,
  clearBlockingNpcForStep,
  computeAimAlignment,
  computeIdealJumpToNextStep,
  computeJumpVelocity,
  computeNpcPhysicalState,
  computeNpcPovCameraRig,
  computePredictedLandingSpot,
  computeStepTransitionDynamics,
  createInitialPlayerState,
  findNearbyNpc,
  getAltitudeAwareNpcDialogue,
  getAutoCameraModeForStep,
  getBiomeWeatherProfile,
  getLiveWindVector,
  getStepRuntimeOffset,
  isStepGateUnlocked,
  selectPhilosophicalTaunt,
} from '../game/rules';
import { soundEngine } from '../game/audio';

export type ClimberSkinId = 'cauldron' | 'frog' | 'chicken' | 'astronaut';

export interface CharacterOutfit {
  id: ClimberSkinId;
  keyNum: string;
  name: string;
  swatch: string;
  trim: string;
  bodyColorHex: number;
  beakColorHex: number;
  combColorHex: number;
  legColorHex: number;
  hatColorHex: number;
}

export const CHARACTER_OUTFITS: CharacterOutfit[] = [
  {
    id: 'cauldron',
    keyNum: '1',
    name: 'Crimson',
    swatch: '#dc2626',
    trim: '#facc15',
    bodyColorHex: 0xdc2626,
    beakColorHex: 0x92400e,
    combColorHex: 0xfacc15,
    legColorHex: 0x334155,
    hatColorHex: 0xb91c1c,
  },
  {
    id: 'frog',
    keyNum: '2',
    name: 'Emerald',
    swatch: '#059669',
    trim: '#a7f3d0',
    bodyColorHex: 0x059669,
    beakColorHex: 0x78350f,
    combColorHex: 0x6ee7b7,
    legColorHex: 0x1e293b,
    hatColorHex: 0x047857,
  },
  {
    id: 'chicken',
    keyNum: '3',
    name: 'Gilded',
    swatch: '#d97706',
    trim: '#fef08a',
    bodyColorHex: 0xd97706,
    beakColorHex: 0x713f12,
    combColorHex: 0xfef08a,
    legColorHex: 0x451a03,
    hatColorHex: 0xb45309,
  },
  {
    id: 'astronaut',
    keyNum: '4',
    name: 'Astral',
    swatch: '#4f46e5',
    trim: '#38bdf8',
    bodyColorHex: 0x4f46e5,
    beakColorHex: 0x1e1b4b,
    combColorHex: 0x38bdf8,
    legColorHex: 0x0f172a,
    hatColorHex: 0x4338ca,
  },
];

export interface TelemetryPayload {
  currentStep: number;
  peakStep: number;
  fallsCount: number;
  biggestFallLoss: number;
  rageScore: number;
  chargeRatio: number;
  isCharging: boolean;
  grounded: boolean;
  inRiverWater: boolean;
  onRiverBridge: boolean;
  biomeIndex: number;
  biomeName: string;
  biomeSubtitle: string;
  biomeColor: string;
  atmosphericLayer: AtmosphericLayerId;
  stepTitle: string;
  stepTrapText: string;
  stepDifficulty: number;
  hazardType: string;
  surfaceTheme: string;
  crumbleWarning: number;
  glitchActive: boolean;
  won: boolean;
  aimErrorDeg: number;
  isAimAligned: boolean;
  idealChargePercent: number;
  clearGapMeters: number;
  vertRiseMeters: number;
  turnAngleDeg: number;
  liveWind: LiveWindState;
  spireMutations: number;
  nearbyNpc: TrailNpcData | null;
  nearbyNpcStep: number | null;
  nearbyNpcBark: string | null;
  nearbyNpcBlocking: boolean;
  activeRuneCount: number;
  totalRuneCount: number;
  stepGateUnlocked: boolean;
  cameraMode: CameraAngleMode;
  nextCameraShiftStep: number;
}

interface IsometricCanvasProps {
  onTelemetryUpdate: (payload: TelemetryPayload) => void;
  onTauntTriggered: (
    quote: string,
    author: string,
    stepsLost: number,
    fromStep: number,
    toStep: number
  ) => void;
  onMilestoneReached: (
    stepNumber: number,
    biomeName: string,
    subtitle: string,
    themeColor: string
  ) => void;
  onInteractNpc: (npc: TrailNpcData, stepNumber: number) => void;
  onAutoCameraShift?: (newMode: CameraAngleMode, stepNumber: number) => void;
  activeDialogueNpc: TrailNpcData | null;
  resetSignal: number;
  selectedOutfit: CharacterOutfit;
  cameraPreset: CameraAngleMode;
  vistaOverviewActive: boolean;
  isPaused: boolean;
  isTitlePreview?: boolean;
  initialStartStep?: number;
}

interface RuneVisualEntry {
  id: string;
  ringMesh: THREE.Mesh;
  crystalMesh: THREE.Mesh;
  ringMat: THREE.MeshStandardMaterial;
  crystalMat: THREE.MeshStandardMaterial;
  baseY: number;
}

interface StepMeshEntry {
  step: LevelStep;
  group: THREE.Group;
  blockMesh: THREE.Mesh;
  topCapMesh: THREE.Mesh;
  topMaterial: THREE.MeshStandardMaterial;
  launchCompassGroup: THREE.Group;
  pusherMesh?: THREE.Mesh;
  sweeperPivot?: THREE.Group;
  turntableDisc?: THREE.Mesh;
  gateBarrierGroup?: THREE.Group;
  gateEnergyMesh?: THREE.Mesh;
  gateEnergyMat?: THREE.MeshStandardMaterial;
  runeVisuals: RuneVisualEntry[];
  npcGroup?: THREE.Group;
  npcHeadGroup?: THREE.Group;
  npcArmLeft?: THREE.Mesh;
  npcArmRight?: THREE.Mesh;
}

interface ImpactParticle {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
}

// ============================================================================
// STUDIO PAINTERLY LIGHTING & RIM SHADER (Smooth Vertical Ambient Gradient,
// Warm Sun Bounce vs Cool Sky Fill Normals, Clean Cliff Strata & Fresnel Rim —
// ZERO Random Noise Speckles!)
// ============================================================================
interface StylizedShaderOptions {
  noiseScale?: number;
  noiseStrength?: number;
  strataStrength?: number;
  rimColorHex?: number;
  rimPower?: number;
  rimStrength?: number;
  bottomShadeStrength?: number;
  localYMin?: number;
  localYSpan?: number;
}

function enhanceWithStylizedShader(
  material: THREE.MeshStandardMaterial,
  opts: StylizedShaderOptions = {}
): THREE.MeshStandardMaterial {
  // Default strataStrength is 0.0 so ONLY explicit cliff columns get horizontal sedimentary bands
  const strataStrength = opts.strataStrength ?? 0.0;
  const rimColor = new THREE.Color(opts.rimColorHex ?? 0xfff3c7);
  const rimPower = opts.rimPower ?? 2.6;
  const rimStrength = opts.rimStrength ?? 0.34;
  const bottomShadeStrength = opts.bottomShadeStrength ?? 0.34;
  const localYMin = opts.localYMin ?? -0.8;
  const localYSpan = Math.max(0.1, opts.localYSpan ?? 1.4);

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uStylizedStrataStrength = { value: strataStrength };
    shader.uniforms.uStylizedRimColor = { value: rimColor };
    shader.uniforms.uStylizedRimPower = { value: rimPower };
    shader.uniforms.uStylizedRimStrength = { value: rimStrength };
    shader.uniforms.uStylizedBottomShade = { value: bottomShadeStrength };
    shader.uniforms.uStylizedYMin = { value: localYMin };
    shader.uniforms.uStylizedYSpan = { value: localYSpan };

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vStylizedWorldPos;
        varying vec3 vStylizedLocalPos;
        varying vec3 vStylizedWorldNormal;`
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vStylizedLocalPos = position;
        vec4 wsPos = modelMatrix * vec4(transformed, 1.0);
        vStylizedWorldPos = wsPos.xyz;
        vStylizedWorldNormal = normalize(mat3(modelMatrix) * objectNormal);`
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vStylizedWorldPos;
        varying vec3 vStylizedLocalPos;
        varying vec3 vStylizedWorldNormal;
        uniform float uStylizedStrataStrength;
        uniform vec3 uStylizedRimColor;
        uniform float uStylizedRimPower;
        uniform float uStylizedRimStrength;
        uniform float uStylizedBottomShade;
        uniform float uStylizedYMin;
        uniform float uStylizedYSpan;`
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        // 1. Smooth Vertical Ambient Gradient (Rich Cool Base -> Warm Sunlit Crown)
        float hGrad = clamp((vStylizedLocalPos.y - uStylizedYMin) / uStylizedYSpan, 0.0, 1.0);
        float smoothGrad = smoothstep(0.0, 1.0, hGrad);
        vec3 coolBaseTint = vec3(0.28, 0.34, 0.52);

        diffuseColor.rgb *= mix(1.0 - uStylizedBottomShade * 0.78, 1.08, smoothGrad);
        diffuseColor.rgb = mix(
          diffuseColor.rgb,
          diffuseColor.rgb * coolBaseTint * 1.65,
          (1.0 - smoothGrad) * uStylizedBottomShade * 0.55
        );

        // 2. Clean Horizontal Sedimentary Strata ONLY on Deep Cliff Columns (Zero Speckles)
        if (uStylizedStrataStrength > 0.16) {
          float strataWave = sin(vStylizedWorldPos.y * 3.2);
          float strataBand = smoothstep(-0.4, 0.4, strataWave) * 2.0 - 1.0;
          diffuseColor.rgb *= (1.0 + strataBand * uStylizedStrataStrength * 0.45);
        }`
      )
      .replace(
        '#include <opaque_fragment>',
        `// 3. Painterly Warm/Cool Normal Wrap + Grazing Fresnel Rim Highlight
        vec3 viewDirStylized = normalize(vViewPosition);
        vec3 worldN = normalize(vStylizedWorldNormal);
        vec3 sunDirWorld = normalize(vec3(0.55, 0.82, 0.45));
        float sunNdotL = dot(worldN, sunDirWorld);

        // Smooth Half-Lambert Warm Sun / Cool Sky Temperature Shift
        float halfLambert = clamp(sunNdotL * 0.5 + 0.5, 0.0, 1.0);
        vec3 coolSkyShadow = vec3(0.44, 0.50, 0.74);
        vec3 warmSunCrown = vec3(1.12, 1.04, 0.92);
        outgoingLight *= mix(coolSkyShadow, warmSunCrown, smoothstep(0.18, 0.82, halfLambert));

        // Subtle Grazing-Angle Fresnel Rim Light
        float ndotv = clamp(dot(normal, viewDirStylized), 0.0, 1.0);
        float fresnelRim = pow(1.0 - ndotv, uStylizedRimPower);
        float upwardRimMask = smoothstep(-0.2, 0.65, worldN.y);
        outgoingLight += uStylizedRimColor * fresnelRim * uStylizedRimStrength * (0.55 + 0.45 * upwardRimMask);
        #include <opaque_fragment>`
      );
  };

  material.needsUpdate = true;
  return material;
}

function createProceduralSurfaceTextures(): {
  stoneBump: THREE.CanvasTexture;
  woodGrain: THREE.CanvasTexture;
  contactShadowTex: THREE.CanvasTexture;
} {
  // Smooth neutral stone micro-relief without random 3x3 dot speckles
  const stoneCanvas = document.createElement('canvas');
  stoneCanvas.width = 64;
  stoneCanvas.height = 64;
  const sCtx = stoneCanvas.getContext('2d')!;
  sCtx.fillStyle = '#808080';
  sCtx.fillRect(0, 0, 64, 64);
  const stoneBump = new THREE.CanvasTexture(stoneCanvas);
  stoneBump.wrapS = THREE.RepeatWrapping;
  stoneBump.wrapT = THREE.RepeatWrapping;

  const woodCanvas = document.createElement('canvas');
  woodCanvas.width = 128;
  woodCanvas.height = 128;
  const wCtx = woodCanvas.getContext('2d')!;
  wCtx.fillStyle = '#7e7e7e';
  wCtx.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 128; y += 4) {
    const wave = Math.round(122 + Math.sin(y * 0.2) * 8);
    wCtx.fillStyle = `rgb(${wave},${wave},${wave})`;
    wCtx.fillRect(0, y, 128, 2);
  }
  const woodGrain = new THREE.CanvasTexture(woodCanvas);
  woodGrain.wrapS = THREE.RepeatWrapping;
  woodGrain.wrapT = THREE.RepeatWrapping;
  woodGrain.repeat.set(1, 2);

  // Soft Radial Ground Contact Shadow Texture
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 128;
  shadowCanvas.height = 128;
  const shCtx = shadowCanvas.getContext('2d')!;
  const grad = shCtx.createRadialGradient(64, 64, 6, 64, 64, 60);
  grad.addColorStop(0.0, 'rgba(10, 6, 18, 0.72)');
  grad.addColorStop(0.48, 'rgba(14, 10, 26, 0.36)');
  grad.addColorStop(1.0, 'rgba(14, 10, 26, 0.0)');
  shCtx.fillStyle = grad;
  shCtx.fillRect(0, 0, 128, 128);
  const contactShadowTex = new THREE.CanvasTexture(shadowCanvas);

  return { stoneBump, woodGrain, contactShadowTex };
}

//Reusable module-scope vectors to avoid per-frame GC allocations
const _camDir = new THREE.Vector3();
const _unitScale = new THREE.Vector3(1, 1, 1);

export const IsometricCanvas: React.FC<IsometricCanvasProps> = ({
  onTelemetryUpdate,
  onTauntTriggered,
  onMilestoneReached,
  onInteractNpc,
  onAutoCameraShift,
  activeDialogueNpc,
  resetSignal,
  selectedOutfit,
  cameraPreset,
  vistaOverviewActive,
  isPaused,
  isTitlePreview = false,
  initialStartStep = 0,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<PlayerState>(
    createInitialPlayerState(initialStartStep)
  );
  const keysRef = useRef<{
    left: boolean;
    right: boolean;
    up: boolean;
    down: boolean;
  }>({
    left: false,
    right: false,
    up: false,
    down: false,
  });

  const outfitMaterialsRef = useRef<{
    bodyMat: THREE.MeshStandardMaterial | null;
    beakMat: THREE.MeshStandardMaterial | null;
    combMat: THREE.MeshStandardMaterial | null;
    legMat: THREE.MeshStandardMaterial | null;
    hatMat: THREE.MeshStandardMaterial | null;
  }>({
    bodyMat: null,
    beakMat: null,
    combMat: null,
    legMat: null,
    hatMat: null,
  });

  const activeCameraPresetRef = useRef<CameraAngleMode>(cameraPreset);
  const vistaOverviewRef = useRef<boolean>(vistaOverviewActive);
  const isPausedRef = useRef<boolean>(isPaused);
  const isTitlePreviewRef = useRef<boolean>(isTitlePreview);
  const activeDialogueNpcRef = useRef<TrailNpcData | null>(activeDialogueNpc);
  const outfitCelebrationRef = useRef<number>(0);

  const onTelemetryUpdateRef = useRef(onTelemetryUpdate);
  const onTauntTriggeredRef = useRef(onTauntTriggered);
  const onMilestoneReachedRef = useRef(onMilestoneReached);
  const onInteractNpcRef = useRef(onInteractNpc);
  const onAutoCameraShiftRef = useRef(onAutoCameraShift);

  useEffect(() => {
    onTelemetryUpdateRef.current = onTelemetryUpdate;
    onTauntTriggeredRef.current = onTauntTriggered;
    onMilestoneReachedRef.current = onMilestoneReached;
    onInteractNpcRef.current = onInteractNpc;
    onAutoCameraShiftRef.current = onAutoCameraShift;
  }, [
    onTelemetryUpdate,
    onTauntTriggered,
    onMilestoneReached,
    onInteractNpc,
    onAutoCameraShift,
  ]);

  useEffect(() => {
    activeCameraPresetRef.current = cameraPreset;
  }, [cameraPreset]);

  useEffect(() => {
    vistaOverviewRef.current = vistaOverviewActive;
  }, [vistaOverviewActive]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    isTitlePreviewRef.current = isTitlePreview;
  }, [isTitlePreview]);

  useEffect(() => {
    activeDialogueNpcRef.current = activeDialogueNpc;
  }, [activeDialogueNpc]);

  useEffect(() => {
    const mats = outfitMaterialsRef.current;
    if (mats.bodyMat) mats.bodyMat.color.setHex(selectedOutfit.bodyColorHex);
    if (mats.beakMat) mats.beakMat.color.setHex(selectedOutfit.beakColorHex);
    if (mats.combMat) mats.combMat.color.setHex(selectedOutfit.combColorHex);
    if (mats.legMat) mats.legMat.color.setHex(selectedOutfit.legColorHex);
    if (mats.hatMat) mats.hatMat.color.setHex(selectedOutfit.hatColorHex);
    outfitCelebrationRef.current = 1.0;
  }, [selectedOutfit]);

  useEffect(() => {
    if (resetSignal > 0) {
      playerRef.current = createInitialPlayerState(initialStartStep);
      const startMode = getAutoCameraModeForStep(initialStartStep);
      activeCameraPresetRef.current = startMode;
      onAutoCameraShiftRef.current?.(startMode, initialStartStep);
    }
  }, [resetSignal, initialStartStep]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Detect Software WebGL (SwiftShader/llvmpipe) per Three.js Skill §2.1 & §2.3
    const isSoftwareGl = (() => {
      const probeCanvas = document.createElement('canvas');
      const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const scene = new THREE.Scene();
    const skyColor = new THREE.Color(0x56b4d3);
    scene.background = skyColor;
    const sceneFog = new THREE.FogExp2(0x68c2df, 0.0016);
    scene.fog = sceneFog;

    const aspect = container.clientWidth / Math.max(1, container.clientHeight);
    const frustumSize = 14.2;
    const camera = new THREE.OrthographicCamera(
      (-frustumSize * aspect) / 2,
      (frustumSize * aspect) / 2,
      frustumSize / 2,
      -frustumSize / 2,
      0.5,
      360
    );

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2)
    );
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = isSoftwareGl
      ? THREE.PCFShadowMap
      : THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Studio PBR Environment Reflections via PMREMGenerator + RoomEnvironment
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    scene.environmentIntensity = 0.16;
    pmremGenerator.dispose();

    // Cinematic Post-Processing Pipeline (EffectComposer + UnrealBloomPass on Hardware GPUs)
    let composer: EffectComposer | null = null;
    let bloomPass: UnrealBloomPass | null = null;
    if (!isSoftwareGl) {
      composer = new EffectComposer(renderer);
      const renderPass = new RenderPass(scene, camera);
      composer.addPass(renderPass);

      bloomPass = new UnrealBloomPass(
        new THREE.Vector2(
          Math.max(1, Math.floor(container.clientWidth * 0.5)),
          Math.max(1, Math.floor(container.clientHeight * 0.5))
        ),
        0.28, // calibrated warm bloom strength
        0.42, // radius
        0.84 // threshold so only campfire flames, lanterns, runes & sun disc bloom
      );
      composer.addPass(bloomPass);
    }

    const { stoneBump, woodGrain, contactShadowTex } =
      createProceduralSurfaceTextures();

    const makeContactShadow = (
      radiusX: number,
      radiusZ: number,
      yOffset = 0.015
    ): THREE.Mesh => {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(radiusX * 2, radiusZ * 2),
        new THREE.MeshBasicMaterial({
          map: contactShadowTex,
          transparent: true,
          depthWrite: false,
          opacity: 0.85,
        })
      );
      m.rotation.x = -Math.PI / 2;
      m.position.y = yOffset;
      return m;
    };

    // ============================================================================
    // ART-DIRECTED THREE-POINT WARM/COOL STUDIO LIGHTING & DIRECTIONAL SHADOWS
    // ============================================================================
    const ambientLight = new THREE.AmbientLight(0xffedd5, 0.15);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0x7dd3fc, 0x1e1b4b, 0.52);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffe8b8, 2.85);
    dirLight.position.set(20, 34, 16);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = isSoftwareGl ? 512 : 1024;
    dirLight.shadow.mapSize.height = isSoftwareGl ? 512 : 1024;
    dirLight.shadow.camera.near = 1.0;
    dirLight.shadow.camera.far = 95;
    const shadowSpan = 16;
    dirLight.shadow.camera.left = -shadowSpan;
    dirLight.shadow.camera.right = shadowSpan;
    dirLight.shadow.camera.top = shadowSpan;
    dirLight.shadow.camera.bottom = -shadowSpan;
    dirLight.shadow.bias = -0.0005;
    dirLight.shadow.normalBias = 0.025;
    scene.add(dirLight);
    scene.add(dirLight.target);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.35);
    rimLight.position.set(-22, 16, -24);
    scene.add(rimLight);

    // ============================================================================
    // CUSTOM GLSL ATMOSPHERIC SKY BACKDROP SHADER (Painterly Golden Hour, Clouds, Aurora, Stars)
    // ============================================================================
    const skyShaderUniforms = {
      uTime: { value: 0 },
      uZenithColor: { value: new THREE.Color(0x0f4c81) },
      uHorizonColor: { value: new THREE.Color(0xfde68a) },
      uSunColor: { value: new THREE.Color(0xfff7ed) },
      uSpaceFactor: { value: 0.0 },
      uAuroraFactor: { value: 0.0 },
    };

    const skyBackdropMat = new THREE.ShaderMaterial({
      uniforms: skyShaderUniforms,
      depthWrite: false,
      depthTest: true,
      fog: false,
      side: THREE.DoubleSide,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform float uTime;
        uniform vec3 uZenithColor;
        uniform vec3 uHorizonColor;
        uniform vec3 uSunColor;
        uniform float uSpaceFactor;
        uniform float uAuroraFactor;

        float hash21(vec2 p) {
          p = fract(p * vec2(234.34, 435.345));
          p += dot(p, p + 34.23);
          return fract(p.x * p.y);
        }

        float noise2D(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          float a = hash21(i);
          float b = hash21(i + vec2(1.0, 0.0));
          float c = hash21(i + vec2(0.0, 1.0));
          float d = hash21(i + vec2(1.0, 1.0));
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }

        void main() {
          float y = clamp(vUv.y, 0.0, 1.0);
          vec3 sky = mix(uHorizonColor, uZenithColor, pow(y, 0.65));

          // Smooth Golden-Apricot Horizon Atmospheric Scattering
          float horizonBand = exp(-abs(y - 0.34) * 5.2);
          sky += vec3(1.0, 0.72, 0.38) * horizonBand * 0.30 * (1.0 - uSpaceFactor * 0.7);

          vec2 sunPos = vec2(0.76, 0.72);
          vec2 deltaSun = (vUv - sunPos) * vec2(1.45, 1.0);
          float sunDist = length(deltaSun);
          float sunDisc = smoothstep(0.068, 0.050, sunDist);
          float sunHalo = exp(-sunDist * 4.4) * 0.48 + exp(-sunDist * 13.0) * 0.32;
          sky += uSunColor * (sunDisc * 0.95 + sunHalo) * (1.0 - uSpaceFactor * 0.45);

          // Procedural Layered Clouds
          vec2 cloudUv = vec2(vUv.x * 4.5 + uTime * 0.025, vUv.y * 6.0);
          float c1 = noise2D(cloudUv);
          float c2 = noise2D(cloudUv * 2.2 + 3.7);
          float cloudShape = smoothstep(0.54, 0.78, c1 * 0.65 + c2 * 0.35);
          float cloudHeightMask = smoothstep(0.22, 0.45, y) * smoothstep(0.88, 0.55, y);
          vec3 cloudCol = mix(vec3(0.96, 0.88, 0.82), vec3(1.0, 0.99, 0.96), smoothstep(0.5, 0.8, c1));
          sky = mix(sky, cloudCol, cloudShape * cloudHeightMask * 0.52 * (1.0 - uSpaceFactor * 0.8));

          // Shimmering Aurora Borealis Waves
          if (uAuroraFactor > 0.01) {
            float wave = sin(vUv.x * 14.0 + uTime * 0.7 + noise2D(vUv * 4.0) * 3.0);
            float ribbon = smoothstep(0.18, 0.0, abs(y - 0.65 - wave * 0.06));
            vec3 auroraCol = mix(vec3(0.15, 0.95, 0.65), vec3(0.68, 0.32, 0.98), sin(vUv.x * 6.0 + uTime) * 0.5 + 0.5);
            sky += auroraCol * ribbon * uAuroraFactor * 0.65;
          }

          // Twinkling Deep-Space Starfield
          if (uSpaceFactor > 0.05) {
            vec2 starGrid = floor(vUv * vec2(110.0, 75.0));
            float starRand = hash21(starGrid);
            if (starRand > 0.965) {
              float twinkle = 0.55 + 0.45 * sin(uTime * 3.5 + starRand * 60.0);
              sky += vec3(0.95, 0.97, 1.0) * twinkle * uSpaceFactor * smoothstep(0.2, 0.6, y);
            }
          }

          gl_FragColor = vec4(sky, 1.0);
        }
      `,
    });

    const skyBackdropMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(34, 20),
      skyBackdropMat
    );
    scene.add(skyBackdropMesh);

    // ============================================================================
    // SCULPTED MULTI-TIER ALPINE SPRUCE & BIRCH TREE BUILDER (With Flared Roots!)
    // ============================================================================
    const sharedTrunkMat = enhanceWithStylizedShader(
      new THREE.MeshStandardMaterial({
        color: 0x5c361c,
        roughness: 0.85,
        bumpMap: woodGrain,
        bumpScale: 0.025,
      }),
      {
        noiseScale: 3.2,
        noiseStrength: 0.18,
        localYMin: 0,
        localYSpan: 0.9,
      }
    );

    const sharedFoliageMats = new Map<number, THREE.MeshStandardMaterial>();
    const getSharedFoliageMat = (
      leafColor: number,
      biome: number
    ): THREE.MeshStandardMaterial => {
      const key = leafColor * 16 + (biome >= 6 ? 1 : 0);
      let mat = sharedFoliageMats.get(key);
      if (!mat) {
        mat = enhanceWithStylizedShader(
          new THREE.MeshStandardMaterial({
            color: leafColor,
            roughness: 0.56,
            metalness: biome >= 6 ? 0.35 : 0.06,
            flatShading: true,
          }),
          {
            noiseScale: 2.5,
            noiseStrength: 0.2,
            rimColorHex: biome === 2 ? 0xfef08a : 0xd9f99d,
            rimStrength: 0.44,
            localYMin: -0.4,
            localYSpan: 0.8,
          }
        );
        sharedFoliageMats.set(key, mat);
      }
      return mat;
    };

    const sharedCrownMats = new Map<number, THREE.MeshStandardMaterial>();
    const getSharedCrownMat = (capColor: number): THREE.MeshStandardMaterial => {
      let mat = sharedCrownMats.get(capColor);
      if (!mat) {
        mat = enhanceWithStylizedShader(
          new THREE.MeshStandardMaterial({
            color: capColor,
            roughness: 0.45,
            flatShading: true,
          }),
          { rimStrength: 0.52 }
        );
        sharedCrownMats.set(capColor, mat);
      }
      return mat;
    };

    const buildSculptedTree = (
      biome: number,
      scale = 1.0,
      variant = 0,
      castDynamicShadow = true
    ): THREE.Group => {
      const g = new THREE.Group();
      g.add(makeContactShadow(0.78 * scale, 0.78 * scale, 0.015));

      // Flared Organic Tree Trunk & Root Base
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(
          0.09 * scale,
          0.24 * scale,
          0.86 * scale,
          9
        ),
        sharedTrunkMat
      );
      trunk.position.y = 0.42 * scale;
      trunk.castShadow = castDynamicShadow;
      trunk.receiveShadow = true;
      g.add(trunk);

      const leafColor =
        biome === 2
          ? variant % 2 === 0
            ? 0xea580c
            : 0xf59e0b
          : biome === 5
          ? 0x7dd3fc
          : biome >= 6
          ? 0x38bdf8
          : variant % 2 === 0
          ? 0x15803d
          : 0x16a34a;

      const foliageMat = getSharedFoliageMat(leafColor, biome);

      const tiers = 4;
      for (let t = 0; t < tiers; t++) {
        const radius = (0.74 - t * 0.14) * scale;
        const height = (0.68 - t * 0.07) * scale;
        const cone = new THREE.Mesh(
          new THREE.ConeGeometry(radius, height, 9),
          foliageMat
        );
        cone.position.y = (0.7 + t * 0.36) * scale;
        cone.rotation.y = t * 0.48;
        cone.rotation.z = (t % 2 === 0 ? 1 : -1) * 0.03;
        cone.castShadow = castDynamicShadow && t === 0;
        cone.receiveShadow = true;
        g.add(cone);
      }

      const capColor =
        biome === 5 ? 0xf8fafc : biome === 2 ? 0xfde047 : 0x86efac;
      const crownCap = new THREE.Mesh(
        new THREE.ConeGeometry(0.27 * scale, 0.36 * scale, 9),
        getSharedCrownMat(capColor)
      );
      crownCap.position.y = 1.94 * scale;
      g.add(crownCap);

      return g;
    };

    // ============================================================================
    // SCULPTED ORGANIC NPC BUILDER (Shader-Enhanced, Expressive Heads & Gear)
    // ============================================================================
    const sharedNpcMats = new Map<number, THREE.MeshStandardMaterial>();
    const getSharedNpcMat = (
      hex: number,
      roughness: number
    ): THREE.MeshStandardMaterial => {
      const key = hex * 100 + Math.round(roughness * 100);
      let mat = sharedNpcMats.get(key);
      if (!mat) {
        mat = enhanceWithStylizedShader(
          new THREE.MeshStandardMaterial({
            color: hex,
            roughness,
          }),
          {
            rimColorHex: 0xfffbeb,
            rimStrength: 0.45,
            localYMin: 0.05,
            localYSpan: 0.85,
          }
        );
        sharedNpcMats.set(key, mat);
      }
      return mat;
    };

    const buildNpcCharacterMesh = (npc: TrailNpcData) => {
      const npcGroup = new THREE.Group();
      npcGroup.add(makeContactShadow(0.38, 0.38, 0.015));

      const bodyColors: Record<string, number> = {
        bear: 0x6b3e1e,
        goat: 0xf1f5f9,
        crow: 0x1e293b,
        fox: 0xea580c,
        tortoise: 0x15803d,
      };
      const shirtColors: Record<string, number> = {
        bear: 0x166534,
        goat: 0x2563eb,
        crow: 0x7c3aed,
        fox: 0xf59e0b,
        tortoise: 0xd97706,
      };
      const furHex = bodyColors[npc.species] || 0x78350f;
      const tunicHex = shirtColors[npc.species] || 0x2563eb;

      const furMat = getSharedNpcMat(furHex, 0.58);
      const tunicMat = getSharedNpcMat(tunicHex, 0.48);

      const torso = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.22, 0.25, 10, 16),
        tunicMat
      );
      torso.position.y = 0.35;
      torso.castShadow = true;
      torso.receiveShadow = true;
      npcGroup.add(torso);

      const belt = new THREE.Mesh(
        new THREE.CylinderGeometry(0.225, 0.23, 0.06, 16),
        new THREE.MeshStandardMaterial({ color: 0x29170b, roughness: 0.5 })
      );
      belt.position.y = 0.28;
      npcGroup.add(belt);

      const scarf = new THREE.Mesh(
        new THREE.TorusGeometry(0.185, 0.058, 10, 18),
        getSharedNpcMat(npc.behavior === 'blocker' ? 0xe11d48 : 0xfacc15, 0.42)
      );
      scarf.rotation.x = Math.PI / 2;
      scarf.position.y = 0.53;
      npcGroup.add(scarf);

      const headGroup = new THREE.Group();
      headGroup.position.set(0, 0.69, 0);
      npcGroup.add(headGroup);

      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.215, 18, 16),
        furMat
      );
      head.scale.set(1.06, 0.96, 1.0);
      head.castShadow = true;
      headGroup.add(head);

      const snout = new THREE.Mesh(
        new THREE.ConeGeometry(0.095, 0.19, 12),
        new THREE.MeshStandardMaterial({
          color: npc.species === 'crow' ? 0xf59e0b : 0xfef3c7,
          roughness: 0.42,
        })
      );
      snout.rotation.x = Math.PI / 2;
      snout.position.set(0, -0.02, 0.22);
      headGroup.add(snout);

      const eyeMat = new THREE.MeshStandardMaterial({
        color: 0x090d16,
        roughness: 0.1,
        metalness: 0.2,
      });
      const glintMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      for (const side of [-1, 1]) {
        const eye = new THREE.Mesh(
          new THREE.SphereGeometry(0.038, 10, 10),
          eyeMat
        );
        eye.position.set(side * 0.082, 0.052, 0.182);
        const glint = new THREE.Mesh(
          new THREE.SphereGeometry(0.013, 6, 6),
          glintMat
        );
        glint.position.set(side * 0.088, 0.064, 0.212);
        headGroup.add(eye, glint);
      }

      if (npc.species === 'bear' || npc.species === 'fox') {
        const earGeo =
          npc.species === 'fox'
            ? new THREE.ConeGeometry(0.075, 0.17, 10)
            : new THREE.SphereGeometry(0.075, 10, 10);
        const earL = new THREE.Mesh(earGeo, furMat);
        earL.position.set(-0.145, 0.185, 0);
        const earR = new THREE.Mesh(earGeo, furMat);
        earR.position.set(0.145, 0.185, 0);
        headGroup.add(earL, earR);
      } else if (npc.species === 'goat') {
        const hornMat = new THREE.MeshStandardMaterial({
          color: 0xe7e5e4,
          roughness: 0.35,
        });
        const hornL = new THREE.Mesh(
          new THREE.ConeGeometry(0.048, 0.24, 10),
          hornMat
        );
        hornL.position.set(-0.115, 0.22, -0.03);
        hornL.rotation.z = 0.28;
        const hornR = new THREE.Mesh(
          new THREE.ConeGeometry(0.048, 0.24, 10),
          hornMat
        );
        hornR.position.set(0.115, 0.22, -0.03);
        hornR.rotation.z = -0.28;
        headGroup.add(hornL, hornR);
      }

      if (npc.species === 'bear') {
        const brim = new THREE.Mesh(
          new THREE.CylinderGeometry(0.29, 0.29, 0.032, 18),
          new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.65 })
        );
        brim.position.y = 0.19;
        const crown = new THREE.Mesh(
          new THREE.ConeGeometry(0.165, 0.19, 14),
          new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.65 })
        );
        crown.position.y = 0.285;
        headGroup.add(brim, crown);
      }

      const armGeo = new THREE.CapsuleGeometry(0.058, 0.19, 8, 12);
      const armL = new THREE.Mesh(armGeo, furMat);
      armL.position.set(-0.27, 0.36, 0);
      armL.castShadow = true;
      const armR = new THREE.Mesh(armGeo, furMat);
      armR.position.set(0.27, 0.36, 0);
      armR.castShadow = true;
      npcGroup.add(armL, armR);

      return { npcGroup, headGroup, armL, armR };
    };

    // ============================================================================
    // BASE CAMP VALLEY, GROUNDED MOUNTAIN RANGE & ORGANIC SANCTUARY ARCHITECTURE
    // ============================================================================
    const baseCampGroup = new THREE.Group();
    scene.add(baseCampGroup);

    const bankGrassMat = enhanceWithStylizedShader(
      new THREE.MeshStandardMaterial({
        color: 0x55962a,
        roughness: 0.82,
        bumpMap: stoneBump,
        bumpScale: 0.02,
      }),
      {
        noiseScale: 0.85,
        noiseStrength: 0.22,
        strataStrength: 0.08,
        rimColorHex: 0xd9f99d,
        rimStrength: 0.25,
        bottomShadeStrength: 0.45,
        localYMin: -1.2,
        localYSpan: 2.4,
      }
    );

    const cliffRockMat = enhanceWithStylizedShader(
      new THREE.MeshStandardMaterial({
        color: 0x57534e,
        roughness: 0.84,
        bumpMap: stoneBump,
        bumpScale: 0.045,
        flatShading: true,
      }),
      {
        strataStrength: 0.0,
        rimColorHex: 0xfde68a,
        rimStrength: 0.36,
        bottomShadeStrength: 0.44,
        localYMin: -2.5,
        localYSpan: 5.0,
      }
    );

    // Continuous Grounded Subterranean Bedrock Table so NOTHING floats at the horizon!
    const bedrockBase = new THREE.Mesh(
      new THREE.CylinderGeometry(86, 94, 14.0, 28),
      cliffRockMat
    );
    bedrockBase.position.set(0, GROUND_FLOOR_Y - 8.2, -4);
    baseCampGroup.add(bedrockBase);

    // South Bank (Expansive rounded organic meadow terrace reaching all the way to the horizon foothills; north river lip stays at z = -2.4)
    const southBank = new THREE.Mesh(
      new RoundedBoxGeometry(112, 4.2, 52.0, 4, 0.28),
      bankGrassMat
    );
    southBank.position.set(0, GROUND_FLOOR_Y - 2.1, 23.6);
    southBank.receiveShadow = true;
    baseCampGroup.add(southBank);

    // North Bank (South river lip stays at z = -5.1, extending north to the mountain range)
    const northBank = new THREE.Mesh(
      new RoundedBoxGeometry(112, 4.2, 52.0, 4, 0.28),
      bankGrassMat
    );
    northBank.position.set(0, GROUND_FLOOR_Y - 2.1, -31.1);
    northBank.receiveShadow = true;
    baseCampGroup.add(northBank);

    // Grounded Distant Mountain Range with Wide Foothill Buttresses (Anchored in the northern/western/eastern horizon arc so nothing blocks the southern camera!)
    const mountainBackdropPositions: [number, number, number, number][] = [
      [-28.5, GROUND_FLOOR_Y - 0.8, -26.5, 13.5],
      [-16.8, GROUND_FLOOR_Y - 0.8, -31.2, 15.6],
      [0.5, GROUND_FLOOR_Y - 0.8, -33.5, 16.8],
      [18.5, GROUND_FLOOR_Y - 0.8, -30.4, 14.8],
      [29.4, GROUND_FLOOR_Y - 0.8, -24.5, 12.8],
      [-31.2, GROUND_FLOOR_Y - 0.8, -8.5, 12.2],
    ];
    const snowPeakMat = enhanceWithStylizedShader(
      new THREE.MeshStandardMaterial({
        color: 0xf8fafc,
        roughness: 0.45,
        flatShading: true,
      }),
      { rimColorHex: 0xbae6fd, rimStrength: 0.5 }
    );
    for (const [mx, my, mz, mh] of mountainBackdropPositions) {
      const mGroup = new THREE.Group();
      mGroup.position.set(mx, my, mz);

      // Wide Grounded Grassy Foothill Skirt blending into the meadow
      const foothill = new THREE.Mesh(
        new THREE.CylinderGeometry(mh * 0.48, mh * 0.95, mh * 0.36, 10),
        bankGrassMat
      );
      foothill.position.y = mh * 0.16;
      foothill.receiveShadow = true;
      mGroup.add(foothill);

      // Main Sculpted Ridge Peak
      const baseCone = new THREE.Mesh(
        new THREE.ConeGeometry(mh * 0.64, mh, 9),
        cliffRockMat
      );
      baseCone.position.y = mh * 0.5;
      baseCone.receiveShadow = true;
      mGroup.add(baseCone);

      const snowCap = new THREE.Mesh(
        new THREE.ConeGeometry(mh * 0.31, mh * 0.44, 9),
        snowPeakMat
      );
      snowCap.position.y = mh * 0.79;
      snowCap.rotation.y = 0.3;
      mGroup.add(snowCap);
      baseCampGroup.add(mGroup);
    }

    // ============================================================================
    // CUSTOM GLSL ANIMATED CAUSTIC RIVER WATER SHADER (Wave Displacement + Foam)
    // ============================================================================
    const riverBed = new THREE.Mesh(
      new THREE.BoxGeometry(112, 1.8, 3.2),
      new THREE.MeshStandardMaterial({ color: 0x0c4a6e, roughness: 0.9 })
    );
    riverBed.position.set(0, VALLEY_RIVER_BOUNDS.waterSurfaceY - 0.98, -3.75);
    baseCampGroup.add(riverBed);

    const riverUniforms = {
      uTime: { value: 0 },
    };
    const riverShaderMat = new THREE.ShaderMaterial({
      uniforms: riverUniforms,
      transparent: true,
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vWorldPos;
        uniform float uTime;
        void main() {
          vUv = uv;
          vec3 pos = position;
          float wave = sin(pos.x * 1.8 - uTime * 3.6) * 0.028 + cos(pos.y * 4.5 + uTime * 2.4) * 0.018;
          pos.z += wave;
          vec4 ws = modelMatrix * vec4(pos, 1.0);
          vWorldPos = ws.xyz;
          gl_Position = projectionMatrix * viewMatrix * ws;
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        varying vec3 vWorldPos;
        uniform float uTime;

        float waterNoise(vec2 p) {
          return sin(p.x * 3.2 + sin(p.y * 2.7 + uTime * 1.8)) * cos(p.y * 3.5 + cos(p.x * 2.4 - uTime * 2.1));
        }

        void main() {
          float bankDist = abs(vUv.y - 0.5) * 2.0;

          vec3 deepWater = vec3(0.02, 0.42, 0.64);
          vec3 shallowWater = vec3(0.12, 0.78, 0.86);
          vec3 waterCol = mix(deepWater, shallowWater, smoothstep(0.15, 0.92, bankDist));

          vec2 flowUv1 = vec2(vWorldPos.x * 1.15 - uTime * 0.95, vWorldPos.z * 1.65);
          vec2 flowUv2 = vec2(vWorldPos.x * 1.65 - uTime * 1.35 + 4.1, vWorldPos.z * 2.2 - 1.9);
          float c1 = waterNoise(flowUv1);
          float c2 = waterNoise(flowUv2);
          float causticNet = smoothstep(0.32, 0.72, c1 * 0.55 + c2 * 0.45);
          waterCol += vec3(0.48, 0.96, 1.0) * causticNet * 0.38;

          float glint = smoothstep(0.78, 0.92, c1 * c2);
          waterCol += vec3(1.0, 0.98, 0.88) * glint * 0.55;

          float foamWave = sin(vWorldPos.x * 3.8 - uTime * 4.2) * 0.045;
          float shoreFoam = smoothstep(0.76 + foamWave, 0.94 + foamWave, bankDist);
          waterCol = mix(waterCol, vec3(0.94, 0.99, 1.0), shoreFoam * 0.88);

          gl_FragColor = vec4(waterCol, 0.91);
        }
      `,
    });

    const riverWaterMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(112, 2.86, 64, 8),
      riverShaderMat
    );
    riverWaterMesh.rotation.x = -Math.PI / 2;
    riverWaterMesh.position.set(
      0,
      VALLEY_RIVER_BOUNDS.waterSurfaceY - 0.02,
      -3.75
    );
    baseCampGroup.add(riverWaterMesh);

    // Riverbank Rounded Cobblestones & Mossy Boulders
    const cobbleMat = enhanceWithStylizedShader(
      new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        roughness: 0.72,
        flatShading: true,
      }),
      { noiseScale: 3.0, noiseStrength: 0.2, rimStrength: 0.4 }
    );
    for (let i = -14; i <= 14; i += 1.35) {
      if (
        i >= VALLEY_BRIDGE_BOUNDS.minX - 0.35 &&
        i <= VALLEY_BRIDGE_BOUNDS.maxX + 0.35
      )
        continue;
      const stoneS = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.32, 1),
        cobbleMat
      );
      stoneS.scale.set(1.35, 0.62, 1.05);
      stoneS.position.set(i, GROUND_FLOOR_Y - 0.06, -2.32);
      baseCampGroup.add(stoneS);

      const stoneN = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.32, 1),
        cobbleMat
      );
      stoneN.scale.set(1.35, 0.62, 1.05);
      stoneN.position.set(i + 0.35, GROUND_FLOOR_Y - 0.06, -5.18);
      baseCampGroup.add(stoneN);
    }

    // ============================================================================
    // ARCHED CEDAR BRIDGE WITH STONE ABUTMENTS & LANTERN POSTS
    // ============================================================================
    const bridgeCenterX =
      (VALLEY_BRIDGE_BOUNDS.minX + VALLEY_BRIDGE_BOUNDS.maxX) * 0.5;
    const bridgeCenterZ =
      (VALLEY_BRIDGE_BOUNDS.minZ + VALLEY_BRIDGE_BOUNDS.maxZ) * 0.5;
    const bridgeWidth = VALLEY_BRIDGE_BOUNDS.maxX - VALLEY_BRIDGE_BOUNDS.minX;
    const bridgeSpan = VALLEY_BRIDGE_BOUNDS.maxZ - VALLEY_BRIDGE_BOUNDS.minZ;

    const bridgeGroup = new THREE.Group();
    bridgeGroup.position.set(bridgeCenterX, 0, bridgeCenterZ);
    baseCampGroup.add(bridgeGroup);

    const cedarDeckMat = enhanceWithStylizedShader(
      new THREE.MeshStandardMaterial({
        color: 0xa35c2d,
        roughness: 0.68,
        bumpMap: woodGrain,
        bumpScale: 0.03,
      }),
      { noiseScale: 2.8, noiseStrength: 0.16, rimStrength: 0.38 }
    );

    const bridgeDeck = new THREE.Mesh(
      new RoundedBoxGeometry(bridgeWidth, 0.22, bridgeSpan, 3, 0.05),
      cedarDeckMat
    );
    bridgeDeck.position.set(0, VALLEY_BRIDGE_BOUNDS.deckY - 0.11, 0);
    bridgeDeck.castShadow = true;
    bridgeDeck.receiveShadow = true;
    bridgeGroup.add(bridgeDeck);

    const plankCount = 9;
    for (let pIdx = 0; pIdx < plankCount; pIdx++) {
      const zOff =
        -bridgeSpan * 0.44 + (pIdx / (plankCount - 1)) * (bridgeSpan * 0.88);
      const plank = new THREE.Mesh(
        new RoundedBoxGeometry(bridgeWidth * 0.96, 0.045, 0.26, 2, 0.015),
        cedarDeckMat
      );
      plank.position.set(0, VALLEY_BRIDGE_BOUNDS.deckY + 0.015, zOff);
      plank.castShadow = true;
      plank.receiveShadow = true;
      bridgeGroup.add(plank);
    }

    const railMat = enhanceWithStylizedShader(
      new THREE.MeshStandardMaterial({
        color: 0x5c361c,
        roughness: 0.76,
      }),
      { rimStrength: 0.35 }
    );

    const lanternGlowMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.5,
      roughness: 0.2,
    });

    for (const side of [-1, 1]) {
      const rx = side * (bridgeWidth * 0.5 - 0.1);
      const topRail = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, bridgeSpan, 10),
        railMat
      );
      topRail.rotation.x = Math.PI / 2;
      topRail.position.set(rx, VALLEY_BRIDGE_BOUNDS.deckY + 0.52, 0);
      topRail.castShadow = true;
      bridgeGroup.add(topRail);

      for (let zOff = -1.4; zOff <= 1.41; zOff += 0.7) {
        const isEndPost = Math.abs(zOff) > 1.3;
        const post = new THREE.Mesh(
          new THREE.CylinderGeometry(
            isEndPost ? 0.095 : 0.065,
            isEndPost ? 0.12 : 0.075,
            isEndPost ? 0.85 : 0.65,
            10
          ),
          isEndPost ? cliffRockMat : railMat
        );
        post.position.set(
          rx,
          VALLEY_BRIDGE_BOUNDS.deckY + (isEndPost ? 0.32 : 0.22),
          zOff
        );
        post.castShadow = true;
        bridgeGroup.add(post);

        if (isEndPost) {
          const lantern = new THREE.Mesh(
            new THREE.OctahedronGeometry(0.12, 0),
            lanternGlowMat
          );
          lantern.position.set(rx, VALLEY_BRIDGE_BOUNDS.deckY + 0.84, zOff);
          bridgeGroup.add(lantern);
        }
      }
    }

    // Stepping Stones / Trail Path from Spawn across Bridge to Stage 1
    const trailStoneMat = enhanceWithStylizedShader(
      new THREE.MeshStandardMaterial({
        color: 0xd6d3d1,
        roughness: 0.72,
      }),
      { rimStrength: 0.35 }
    );
    const trailPathCoords: [number, number][] = [
      [0.0, 2.2],
      [0.3, 1.1],
      [0.6, 0.0],
      [0.85, -1.2],
      [0.85, -5.8],
    ];
    for (const [px, pz] of trailPathCoords) {
      const pad = new THREE.Mesh(
        new THREE.CylinderGeometry(0.56, 0.64, 0.09, 12),
        trailStoneMat
      );
      pad.position.set(px, GROUND_FLOOR_Y - 0.01, pz);
      pad.receiveShadow = true;
      baseCampGroup.add(pad);
    }

    // ============================================================================
    // ORGANIC THREE.JS VALLEY ARCHITECTURE (100% Unified with VALLEY_SOLID_COLLIDERS!)
    // ============================================================================
    const findCollider = (id: string) =>
      VALLEY_SOLID_COLLIDERS.find((c) => c.id === id)!;

    // 1. A-Frame Alpine Timber Chalet Lodge (ExtrudeGeometry Gable Roof + Rounded Logs + Cobble Chimney)
    const cabinCol = findCollider('collider-cabin');
    const cabinGroup = new THREE.Group();
    cabinGroup.position.set(cabinCol.x, GROUND_FLOOR_Y, cabinCol.z);
    cabinGroup.add(makeContactShadow(cabinCol.halfW * 1.18, cabinCol.halfD * 1.18, 0.02));

    const cabinFoundation = new THREE.Mesh(
      new RoundedBoxGeometry(
        cabinCol.halfW * 2,
        0.38,
        cabinCol.halfD * 2,
        3,
        0.08
      ),
      cliffRockMat
    );
    cabinFoundation.position.y = 0.19;
    cabinFoundation.castShadow = true;
    cabinFoundation.receiveShadow = true;
    cabinGroup.add(cabinFoundation);

    const cabinWallMat = enhanceWithStylizedShader(
      new THREE.MeshStandardMaterial({
        color: 0x8c4f27,
        roughness: 0.74,
        bumpMap: woodGrain,
        bumpScale: 0.035,
      }),
      { localYMin: 0, localYSpan: 2.2, rimStrength: 0.38 }
    );
    const cabinBody = new THREE.Mesh(
      new RoundedBoxGeometry(
        cabinCol.halfW * 1.84,
        1.82,
        cabinCol.halfD * 1.82,
        4,
        0.12
      ),
      cabinWallMat
    );
    cabinBody.position.y = 1.08;
    cabinBody.castShadow = true;
    cabinBody.receiveShadow = true;
    cabinGroup.add(cabinBody);

    // True Pitched A-Frame Alpine Chalet Roof using ExtrudeGeometry with Bevels!
    const roofShape = new THREE.Shape();
    const rw = cabinCol.halfW * 1.12;
    roofShape.moveTo(-rw, 0);
    roofShape.lineTo(0, 1.55);
    roofShape.lineTo(rw, 0);
    roofShape.closePath();
    const roofExtrudeGeo = new THREE.ExtrudeGeometry(roofShape, {
      depth: cabinCol.halfD * 2.04,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.06,
      bevelThickness: 0.06,
    });
    roofExtrudeGeo.center();
    const cabinRoofMat = enhanceWithStylizedShader(
      new THREE.MeshStandardMaterial({
        color: 0x1e3a5f,
        roughness: 0.52,
        flatShading: true,
      }),
      { rimColorHex: 0xbae6fd, rimStrength: 0.48, localYMin: -0.7, localYSpan: 1.6 }
    );
    const cabinRoof = new THREE.Mesh(roofExtrudeGeo, cabinRoofMat);
    cabinRoof.position.set(0, 2.52, 0);
    cabinRoof.castShadow = true;
    cabinGroup.add(cabinRoof);

    // River-Cobble Stone Chimney built of Sculpted Dodecahedrons + Chimney Cap
    const chimneyGroup = new THREE.Group();
    chimneyGroup.position.set(-cabinCol.halfW * 0.72, 0.3, -cabinCol.halfD * 0.45);
    for (let cy = 0; cy < 6; cy++) {
      const cStone = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.32 - cy * 0.015, 1),
        cliffRockMat
      );
      cStone.scale.set(1.1, 0.85, 1.1);
      cStone.position.y = cy * 0.44;
      cStone.castShadow = true;
      chimneyGroup.add(cStone);
    }
    cabinGroup.add(chimneyGroup);

    const cabinWindowMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.45,
    });
    for (const wx of [-0.68, 0.68]) {
      const winFrame = new THREE.Mesh(
        new RoundedBoxGeometry(0.68, 0.58, 0.12, 2, 0.03),
        cabinWindowMat
      );
      winFrame.position.set(wx, 1.18, cabinCol.halfD * 0.92);
      cabinGroup.add(winFrame);
    }
    baseCampGroup.add(cabinGroup);

    // 2. Blazing Campfire Ring with Crossed Timber Logs & Inner Flame Core
    const fireCol = findCollider('collider-campfire');
    const fireGroup = new THREE.Group();
    fireGroup.position.set(fireCol.x, GROUND_FLOOR_Y, fireCol.z);
    fireGroup.add(makeContactShadow(0.85, 0.85, 0.015));

    for (let s = 0; s < 8; s++) {
      const ang = (s / 8) * Math.PI * 2;
      const rStone = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.18, 1),
        cobbleMat
      );
      rStone.position.set(Math.cos(ang) * 0.52, 0.1, Math.sin(ang) * 0.52);
      rStone.castShadow = true;
      fireGroup.add(rStone);
    }

    for (let l = 0; l < 3; l++) {
      const logMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.065, 0.075, 0.82, 8),
        railMat
      );
      logMesh.rotation.z = Math.PI / 2 - 0.18;
      logMesh.rotation.y = (l * Math.PI) / 3;
      logMesh.position.y = 0.12;
      fireGroup.add(logMesh);
    }

    const outerFlameMesh = new THREE.Mesh(
      new THREE.ConeGeometry(0.34, 0.84, 8),
      new THREE.MeshStandardMaterial({
        color: 0xf97316,
        emissive: 0xea580c,
        emissiveIntensity: 1.6,
      })
    );
    outerFlameMesh.position.y = 0.42;
    const innerFlameMesh = new THREE.Mesh(
      new THREE.ConeGeometry(0.19, 0.56, 8),
      new THREE.MeshStandardMaterial({
        color: 0xfef08a,
        emissive: 0xfacc15,
        emissiveIntensity: 2.0,
      })
    );
    innerFlameMesh.position.y = 0.34;
    fireGroup.add(outerFlameMesh, innerFlameMesh);

    // Warm Flickering Hearth PointLight casting real golden-amber light across Base Camp!
    const campfirePointLight = new THREE.PointLight(0xff7b29, 3.8, 10.5, 1.5);
    campfirePointLight.position.set(0, 0.85, 0);
    fireGroup.add(campfirePointLight);

    // Warm Cabin Window & Bridge Lantern PointLights for Cozy Sanctuary Depth
    const cabinPorchLight = new THREE.PointLight(0xfbbf24, 2.1, 8.0, 1.6);
    cabinPorchLight.position.set(
      cabinCol.x,
      GROUND_FLOOR_Y + 1.35,
      cabinCol.z + cabinCol.halfD * 1.15
    );
    baseCampGroup.add(cabinPorchLight);

    const bridgeLanternLight = new THREE.PointLight(0xfde047, 2.3, 9.0, 1.6);
    bridgeLanternLight.position.set(
      (VALLEY_BRIDGE_BOUNDS.minX + VALLEY_BRIDGE_BOUNDS.maxX) * 0.5,
      VALLEY_BRIDGE_BOUNDS.deckY + 1.35,
      -2.2
    );
    baseCampGroup.add(bridgeLanternLight);

    baseCampGroup.add(fireGroup);

    // 3. Streamlined Vintage Airstream Caravan (RoundedBoxGeometry + Capsule Shell + Portholes)
    const camperCol = findCollider('collider-camper');
    const camperGroup = new THREE.Group();
    camperGroup.position.set(camperCol.x, GROUND_FLOOR_Y, camperCol.z);
    camperGroup.add(makeContactShadow(camperCol.halfW * 1.1, camperCol.halfD * 1.15, 0.02));

    const camperLower = new THREE.Mesh(
      new RoundedBoxGeometry(
        camperCol.halfW * 1.92,
        0.92,
        camperCol.halfD * 1.82,
        5,
        0.22
      ),
      enhanceWithStylizedShader(
        new THREE.MeshStandardMaterial({
          color: 0x0284c7,
          roughness: 0.28,
          metalness: 0.22,
        }),
        { rimStrength: 0.5 }
      )
    );
    camperLower.position.y = 0.62;
    camperLower.castShadow = true;
    camperLower.receiveShadow = true;
    camperGroup.add(camperLower);

    const camperTop = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.88, 1.55, 12, 20),
      enhanceWithStylizedShader(
        new THREE.MeshStandardMaterial({
          color: 0xfef3c7,
          roughness: 0.32,
          metalness: 0.16,
        }),
        { rimStrength: 0.48 }
      )
    );
    camperTop.rotation.z = Math.PI / 2;
    camperTop.position.y = 1.24;
    camperTop.castShadow = true;
    camperGroup.add(camperTop);

    // Caravan Wheels
    const wheelMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.7,
    });
    for (const wx of [-0.75, 0.75]) {
      for (const wz of [-camperCol.halfD * 0.88, camperCol.halfD * 0.88]) {
        const wheel = new THREE.Mesh(
          new THREE.CylinderGeometry(0.28, 0.28, 0.16, 14),
          wheelMat
        );
        wheel.rotation.x = Math.PI / 2;
        wheel.position.set(wx, 0.28, wz);
        camperGroup.add(wheel);
      }
    }
    baseCampGroup.add(camperGroup);

    // 4. Curved LatheGeometry Lighthouse / Fire Lookout Watchtower
    const towerCol = findCollider('collider-watchtower');
    const towerGroup = new THREE.Group();
    towerGroup.position.set(towerCol.x, GROUND_FLOOR_Y, towerCol.z);
    towerGroup.add(makeContactShadow(towerCol.halfW * 1.25, towerCol.halfD * 1.25, 0.02));

    const towerLathePoints = [
      new THREE.Vector2(1.18, 0.0),
      new THREE.Vector2(1.02, 0.6),
      new THREE.Vector2(0.84, 1.6),
      new THREE.Vector2(0.74, 2.6),
      new THREE.Vector2(0.88, 3.2),
      new THREE.Vector2(1.12, 3.35),
    ];
    const towerBase = new THREE.Mesh(
      new THREE.LatheGeometry(towerLathePoints, 14),
      railMat
    );
    towerBase.castShadow = true;
    towerBase.receiveShadow = true;
    towerGroup.add(towerBase);

    const towerLanternRoom = new THREE.Mesh(
      new THREE.CylinderGeometry(0.92, 0.92, 0.95, 12),
      cabinWindowMat
    );
    towerLanternRoom.position.y = 3.78;
    towerGroup.add(towerLanternRoom);

    const towerRoof = new THREE.Mesh(
      new THREE.ConeGeometry(1.38, 1.05, 12),
      enhanceWithStylizedShader(
        new THREE.MeshStandardMaterial({
          color: 0xb91c1c,
          roughness: 0.48,
          flatShading: true,
        }),
        { rimColorHex: 0xfde047, rimStrength: 0.48 }
      )
    );
    towerRoof.position.y = 4.68;
    towerRoof.castShadow = true;
    towerGroup.add(towerRoof);
    baseCampGroup.add(towerGroup);

    // 5. Expedition Canvas Dome Tent
    const tentCol = findCollider('collider-tent');
    const tentMesh = new THREE.Mesh(
      new THREE.ConeGeometry(tentCol.halfW * 1.15, 1.85, 6),
      enhanceWithStylizedShader(
        new THREE.MeshStandardMaterial({
          color: 0xd97706,
          roughness: 0.65,
          flatShading: true,
        }),
        { rimColorHex: 0xfef08a, rimStrength: 0.48 }
      )
    );
    tentMesh.position.set(tentCol.x, GROUND_FLOOR_Y + 0.9, tentCol.z);
    tentMesh.castShadow = true;
    baseCampGroup.add(tentMesh);

    // 6. Ancient Hawk Stone Arch (LatheGeometry Sculpted Columns + Curved Lintel)
    const archLeft = findCollider('collider-shrine-left');
    const archRight = findCollider('collider-shrine-right');
    const pillarLathePts = [
      new THREE.Vector2(0.46, 0),
      new THREE.Vector2(0.38, 0.4),
      new THREE.Vector2(0.34, 2.0),
      new THREE.Vector2(0.44, 2.45),
    ];
    const archPillarGeo = new THREE.LatheGeometry(pillarLathePts, 10);
    for (const col of [archLeft, archRight]) {
      const pillar = new THREE.Mesh(archPillarGeo, cliffRockMat);
      pillar.position.set(col.x, GROUND_FLOOR_Y, col.z);
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      baseCampGroup.add(pillar);
    }
    const archLintel = new THREE.Mesh(
      new RoundedBoxGeometry(2.7, 0.48, 0.76, 3, 0.08),
      cliffRockMat
    );
    archLintel.position.set(
      (archLeft.x + archRight.x) * 0.5,
      GROUND_FLOOR_Y + 2.52,
      archLeft.z
    );
    archLintel.castShadow = true;
    baseCampGroup.add(archLintel);

    // 7. Trailhead Signpost & Split-Rail Fence (Matched 1:1 to VALLEY_SOLID_COLLIDERS)
    const signCol = findCollider('collider-signpost');
    const signPost = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.14, 1.68, 10),
      railMat
    );
    signPost.position.set(signCol.x, GROUND_FLOOR_Y + 0.84, signCol.z);
    signPost.castShadow = true;
    baseCampGroup.add(signPost);
    const signBoard = new THREE.Mesh(
      new RoundedBoxGeometry(0.98, 0.44, 0.14, 2, 0.03),
      cedarDeckMat
    );
    signBoard.position.set(signCol.x, GROUND_FLOOR_Y + 1.4, signCol.z);
    signBoard.castShadow = true;
    baseCampGroup.add(signBoard);

    const fenceCol = findCollider('collider-fence-south');
    const fenceBeam = new THREE.Mesh(
      new RoundedBoxGeometry(fenceCol.halfW * 2, 0.72, fenceCol.halfD * 1.8, 2, 0.05),
      railMat
    );
    fenceBeam.position.set(fenceCol.x, GROUND_FLOOR_Y + 0.36, fenceCol.z);
    fenceBeam.castShadow = true;
    baseCampGroup.add(fenceBeam);

    // 8. Valley Pine Trees (Exact coordinates from VALLEY_SOLID_COLLIDERS, casting dynamic sun shadows & gentle breeze sway)
    const valleyTrees: { group: THREE.Group; phase: number }[] = [];
    for (let idx = 0; idx < VALLEY_SOLID_COLLIDERS.length; idx++) {
      const col = VALLEY_SOLID_COLLIDERS[idx];
      if (col.kind !== 'tree') continue;
      const tree = buildSculptedTree(1, 1.18 + (idx % 3) * 0.16, idx, true);
      tree.position.set(col.x, GROUND_FLOOR_Y, col.z);
      baseCampGroup.add(tree);
      valleyTrees.push({ group: tree, phase: idx * 1.37 });
    }

    // 9. Base Camp Ranger Barnaby NPC (Step 0)
    const baseCampNpcObj = GROUND_STEP_META.npc!;
    const baseCampNpcBuilt = buildNpcCharacterMesh(baseCampNpcObj);
    baseCampNpcBuilt.npcGroup.position.set(
      baseCampNpcObj.relX,
      GROUND_FLOOR_Y,
      baseCampNpcObj.relZ
    );
    baseCampGroup.add(baseCampNpcBuilt.npcGroup);

    // ============================================================================
    // LIVING SANCTUARY CHOREOGRAPHY: SOARING 3D ALPINE HAWKS, CAMPFIRE EMBERS &
    // CABIN CHIMNEY SMOKE PLUMES
    // ============================================================================
    interface SoaringHawkEntry {
      group: THREE.Group;
      leftWingPivot: THREE.Group;
      rightWingPivot: THREE.Group;
      orbitCenterX: number;
      orbitCenterY: number;
      orbitCenterZ: number;
      radiusX: number;
      radiusZ: number;
      speed: number;
      phase: number;
    }
    const hawkFlock: SoaringHawkEntry[] = [];
    const hawkPlumageMat = enhanceWithStylizedShader(
      new THREE.MeshStandardMaterial({
        color: 0x451a03,
        roughness: 0.55,
      }),
      { rimColorHex: 0xfde68a, rimStrength: 0.55 }
    );
    const hawkCrestMat = new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      roughness: 0.45,
    });
    const hawkBeakMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.3,
    });

    const hawkConfigs = [
      { cx: -0.5, cy: GROUND_FLOOR_Y + 3.45, cz: -0.8, rx: 4.2, rz: 3.1, spd: 0.72, ph: 0.0 },
      { cx: 1.8, cy: GROUND_FLOOR_Y + 4.35, cz: -3.2, rx: 5.4, rz: 3.8, spd: 0.58, ph: 2.1 },
      { cx: -2.4, cy: GROUND_FLOOR_Y + 5.1, cz: -1.8, rx: 4.8, rz: 4.2, spd: 0.64, ph: 4.2 },
    ];
    for (const hc of hawkConfigs) {
      const hGroup = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.09, 0.34, 8, 12),
        hawkPlumageMat
      );
      body.rotation.x = Math.PI / 2;
      hGroup.add(body);

      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.088, 10, 10),
        hawkCrestMat
      );
      head.position.set(0, 0.04, 0.22);
      const beak = new THREE.Mesh(
        new THREE.ConeGeometry(0.045, 0.14, 8),
        hawkBeakMat
      );
      beak.rotation.x = Math.PI / 2;
      beak.position.set(0, 0.02, 0.32);
      hGroup.add(head, beak);

      const tail = new THREE.Mesh(
        new THREE.ConeGeometry(0.16, 0.28, 5),
        hawkPlumageMat
      );
      tail.rotation.x = -Math.PI / 2;
      tail.scale.set(1.2, 0.25, 1.0);
      tail.position.set(0, 0.0, -0.26);
      hGroup.add(tail);

      const leftWingPivot = new THREE.Group();
      leftWingPivot.position.set(0.06, 0.02, 0.02);
      const leftWing = new THREE.Mesh(
        new RoundedBoxGeometry(0.62, 0.03, 0.22, 2, 0.01),
        hawkPlumageMat
      );
      leftWing.position.set(0.3, 0, -0.02);
      leftWing.rotation.y = -0.14;
      leftWingPivot.add(leftWing);

      const rightWingPivot = new THREE.Group();
      rightWingPivot.position.set(-0.06, 0.02, 0.02);
      const rightWing = new THREE.Mesh(
        new RoundedBoxGeometry(0.62, 0.03, 0.22, 2, 0.01),
        hawkPlumageMat
      );
      rightWing.position.set(-0.3, 0, -0.02);
      rightWing.rotation.y = 0.14;
      rightWingPivot.add(rightWing);

      hGroup.add(leftWingPivot, rightWingPivot);
      baseCampGroup.add(hGroup);
      hawkFlock.push({
        group: hGroup,
        leftWingPivot,
        rightWingPivot,
        orbitCenterX: hc.cx,
        orbitCenterY: hc.cy,
        orbitCenterZ: hc.cz,
        radiusX: hc.rx,
        radiusZ: hc.rz,
        speed: hc.spd,
        phase: hc.ph,
      });
    }

    // Pooled Campfire Ember Sparks & Cabin Chimney Smoke Plumes
    const emberGeo = new THREE.OctahedronGeometry(0.048, 0);
    const campfireEmbers: { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; phase: number; speed: number; radius: number }[] = [];
    for (let eIdx = 0; eIdx < 18; eIdx++) {
      const mat = new THREE.MeshBasicMaterial({
        color: eIdx % 2 === 0 ? 0xfef08a : 0xf97316,
        transparent: true,
        opacity: 0.9,
      });
      const mesh = new THREE.Mesh(emberGeo, mat);
      fireGroup.add(mesh);
      campfireEmbers.push({
        mesh,
        mat,
        phase: (eIdx / 18) * Math.PI * 2,
        speed: 0.55 + (eIdx % 5) * 0.12,
        radius: 0.12 + (eIdx % 4) * 0.07,
      });
    }

    const smokeGeo = new THREE.DodecahedronGeometry(0.18, 1);
    const chimneySmokePuffs: { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; phase: number }[] = [];
    for (let sIdx = 0; sIdx < 9; sIdx++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xf1f5f9,
        transparent: true,
        opacity: 0.35,
      });
      const mesh = new THREE.Mesh(smokeGeo, mat);
      chimneyGroup.add(mesh);
      chimneySmokePuffs.push({
        mesh,
        mat,
        phase: sIdx / 9,
      });
    }

    // ============================================================================
    // ATMOSPHERIC LAYER & DEEP SPACE VISTAS (Stages 50-500: Clouds, Auroras, Stars, Planets)
    // ============================================================================
    const atmosphereGroup = new THREE.Group();
    scene.add(atmosphereGroup);

    const cloudMat = enhanceWithStylizedShader(
      new THREE.MeshStandardMaterial({
        color: 0xf8fafc,
        roughness: 0.5,
        transparent: true,
        opacity: 0.86,
        flatShading: true,
      }),
      { rimColorHex: 0xfef08a, rimStrength: 0.48 }
    );
    for (let i = 0; i < 28; i++) {
      const stepRef =
        LEVELS_500[Math.min(TOTAL_LEVELS - 1, 50 + i * 2)] || LEVELS_500[60];
      const angle = (i / 28) * Math.PI * 4;
      const radius = 10 + (i % 4) * 4.5;
      const cloudCluster = new THREE.Group();
      for (let c = 0; c < 3; c++) {
        const puff = new THREE.Mesh(
          new THREE.DodecahedronGeometry(1.6 - c * 0.35, 1),
          cloudMat
        );
        puff.scale.set(1.5, 0.55, 1.2);
        puff.position.set((c - 1) * 1.2, (c % 2) * 0.25, 0);
        cloudCluster.add(puff);
      }
      cloudCluster.position.set(
        stepRef.x + Math.cos(angle) * radius,
        stepRef.y - 1.5,
        stepRef.z + Math.sin(angle) * radius
      );
      atmosphereGroup.add(cloudCluster);
    }

    const auroraMeshes: THREE.Mesh[] = [];
    for (let i = 0; i < 12; i++) {
      const stepRef =
        LEVELS_500[Math.min(TOTAL_LEVELS - 1, 185 + i * 14)] || LEVELS_500[220];
      const auroraMat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0x34d399 : 0xa855f7,
        transparent: true,
        opacity: 0.28,
        side: THREE.DoubleSide,
      });
      const ribbon = new THREE.Mesh(
        new THREE.CylinderGeometry(14, 16, 8, 24, 1, true, 0, Math.PI * 0.85),
        auroraMat
      );
      ribbon.position.set(stepRef.x, stepRef.y + 2.0, stepRef.z);
      ribbon.rotation.y = i * 0.8;
      atmosphereGroup.add(ribbon);
      auroraMeshes.push(ribbon);
    }

    const starCount = 1200;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const stepRef =
        LEVELS_500[
          Math.min(TOTAL_LEVELS - 1, 100 + Math.floor((i / starCount) * 399))
        ];
      const theta = i * 1.618 * Math.PI * 2;
      const dist = 16 + (i % 19) * 2.2;
      starPositions[i * 3] = stepRef.x + Math.cos(theta) * dist;
      starPositions[i * 3 + 1] = stepRef.y + ((i % 11) - 5) * 3.5;
      starPositions[i * 3 + 2] = stepRef.z + Math.sin(theta) * dist;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(starPositions, 3)
    );
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 4.5,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.9,
    });
    const starPoints = new THREE.Points(starGeo, starMat);
    atmosphereGroup.add(starPoints);

    const step400 = LEVELS_500[399] || LEVELS_500[TOTAL_LEVELS - 1];
    const planetGroup = new THREE.Group();
    planetGroup.position.set(step400.x - 16, step400.y + 8, step400.z - 16);
    const planetSphere = new THREE.Mesh(
      new THREE.SphereGeometry(5.2, 24, 24),
      enhanceWithStylizedShader(
        new THREE.MeshStandardMaterial({
          color: 0x6366f1,
          emissive: 0x312e81,
          emissiveIntensity: 0.35,
          roughness: 0.55,
        }),
        { rimColorHex: 0x38bdf8, rimStrength: 0.65 }
      )
    );
    const planetRing = new THREE.Mesh(
      new THREE.RingGeometry(6.8, 10.5, 36),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.55,
      })
    );
    planetRing.rotation.x = Math.PI * 0.38;
    planetGroup.add(planetSphere, planetRing);
    atmosphereGroup.add(planetGroup);

    // ============================================================================
    // BUILD ALL 500 GROUNDED MOUNTAIN CLIFF STAGES (Varied Permutations, Organic
    // Three.js Geometries, Deep Grounded Support Columns & Launch Compass!)
    // ============================================================================
    const stepEntries: StepMeshEntry[] = [];
    const spireGroup = new THREE.Group();
    scene.add(spireGroup);

    const runeRingGeo = new THREE.CylinderGeometry(0.42, 0.46, 0.06, 18);
    const runeCrystalGeo = new THREE.OctahedronGeometry(0.17, 0);
    const buttressGeo = new THREE.DodecahedronGeometry(0.34, 1);

    // Shared LatheGeometry for Ancient Carved Hawk Totem Monoliths
    const totemLathePoints = [
      new THREE.Vector2(0.38, 0.0),
      new THREE.Vector2(0.31, 0.25),
      new THREE.Vector2(0.35, 0.52),
      new THREE.Vector2(0.26, 0.78),
      new THREE.Vector2(0.33, 0.94),
      new THREE.Vector2(0.0, 1.05),
    ];
    const sharedTotemGeo = new THREE.LatheGeometry(totemLathePoints, 10);

    // Shared 3D Chevron Geometry for the Directional Launch Compass on every stage
    const chevronShape = new THREE.Shape();
    chevronShape.moveTo(-0.22, -0.28);
    chevronShape.lineTo(0.24, 0.0);
    chevronShape.lineTo(-0.22, 0.28);
    chevronShape.lineTo(-0.08, 0.0);
    chevronShape.closePath();
    const sharedChevronGeo = new THREE.ExtrudeGeometry(chevronShape, {
      depth: 0.04,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.015,
      bevelThickness: 0.015,
    });
    sharedChevronGeo.rotateX(Math.PI / 2);

    const launchCompassMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.15,
      roughness: 0.2,
    });

    // Shared Per-Biome Stylized Materials for the 500 Terraces
    const biomeSideMaterials = new Map<number, THREE.MeshStandardMaterial>();
    const biomeTrimMaterials = new Map<number, THREE.MeshStandardMaterial>();
    const biomeTopMaterials = new Map<number, THREE.MeshStandardMaterial>();
    for (let b = 1; b <= 10; b++) {
      const sampleStep =
        LEVELS_500.find((s) => s.biome === b) || LEVELS_500[0];
      biomeSideMaterials.set(
        b,
        enhanceWithStylizedShader(
          new THREE.MeshStandardMaterial({
            color: sampleStep.sideColorHex,
            roughness: 0.8,
            metalness: b >= 7 ? 0.32 : 0.08,
            bumpMap: stoneBump,
            bumpScale: 0.04,
            flatShading: true,
          }),
          {
            strataStrength: 0.0,
            rimColorHex: sampleStep.accentHex,
            rimStrength: 0.38,
            bottomShadeStrength: 0.52,
            localYMin: -6.0,
            localYSpan: 6.2,
          }
        )
      );
      biomeTrimMaterials.set(
        b,
        enhanceWithStylizedShader(
          new THREE.MeshStandardMaterial({
            color: sampleStep.accentHex,
            roughness: 0.52,
            metalness: b >= 6 ? 0.4 : 0.15,
            flatShading: true,
          }),
          {
            noiseScale: 2.4,
            noiseStrength: 0.16,
            rimColorHex: 0xfffbeb,
            rimStrength: 0.45,
          }
        )
      );
    }

    for (let sIdx = 0; sIdx < LEVELS_500.length; sIdx++) {
      const step = LEVELS_500[sIdx];
      const nextStepObj =
        LEVELS_500[Math.min(TOTAL_LEVELS - 1, sIdx + 1)] || step;

      const group = new THREE.Group();
      group.position.set(step.x, step.y, step.z);

      const sideMat =
        biomeSideMaterials.get(step.biome) || biomeSideMaterials.get(1)!;
      const trimMat =
        biomeTrimMaterials.get(step.biome) || biomeTrimMaterials.get(1)!;

      const minDim = Math.min(step.width, step.depth);
      const scaleX = step.width / minDim;
      const scaleZ = step.depth / minDim;

      // Tier 1A: Sculpted Upper Cliff Crown directly beneath the deck
      const rockUndersideGeo = new THREE.CylinderGeometry(
        minDim * 0.52,
        minDim * 0.42,
        step.height * 1.15,
        11
      );
      const blockMesh = new THREE.Mesh(rockUndersideGeo, sideMat);
      blockMesh.scale.set(scaleX, 1, scaleZ);
      blockMesh.position.y = -(step.height * 1.15) / 2 - 0.08;
      blockMesh.castShadow = true;
      blockMesh.receiveShadow = true;
      group.add(blockMesh);

      // Tier 1B: Deep Grounded Mountain Cliff Column / Buttress (Eliminates Floating Islands!)
      const pillarTopR = minDim * 0.41;
      const pillarBotR =
        step.stepNumber <= 300 ? minDim * 0.56 : minDim * 0.18;
      const deepColumnGeo = new THREE.CylinderGeometry(
        pillarTopR,
        pillarBotR,
        step.supportDepth,
        9
      );
      const deepColumnMesh = new THREE.Mesh(deepColumnGeo, sideMat);
      deepColumnMesh.scale.set(scaleX * 0.92, 1, scaleZ * 0.92);
      deepColumnMesh.position.y =
        -step.height * 1.05 - step.supportDepth * 0.5;
      deepColumnMesh.receiveShadow = true;
      group.add(deepColumnMesh);

      // Tier 1C: Diagonal Mountain Trestle / Rock Strut connecting back toward previous cliff face
      if (step.stepNumber > 1 && step.stepNumber <= 320) {
        const prevStepObj = LEVELS_500[sIdx - 1];
        const backDx = prevStepObj.x - step.x;
        const backDy = prevStepObj.y - step.y;
        const backDz = prevStepObj.z - step.z;
        const backDist = Math.hypot(backDx, backDy, backDz);
        if (backDist < 12) {
          const strutMesh = new THREE.Mesh(
            new THREE.CylinderGeometry(0.24, 0.36, backDist * 0.85, 7),
            step.stepNumber <= 100 ? railMat : sideMat
          );
          strutMesh.position.set(
            backDx * 0.42,
            backDy * 0.42 - 0.95,
            backDz * 0.42
          );
          strutMesh.quaternion.setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            new THREE.Vector3(backDx, backDy - 0.8, backDz).normalize()
          );
          group.add(strutMesh);
        }
      }

      // Tier 2: Organic Crag Boulders & Strata Ledges around the Cliff Rim
      for (let bIdx = 0; bIdx < 4; bIdx++) {
        const ang = (bIdx / 4) * Math.PI * 2 + 0.35;
        const buttress = new THREE.Mesh(
          buttressGeo,
          bIdx % 2 === 0 ? sideMat : trimMat
        );
        buttress.scale.set(1.15, 1.45, 1.15);
        buttress.position.set(
          Math.cos(ang) * (step.width * 0.44),
          -0.32,
          Math.sin(ang) * (step.depth * 0.44)
        );
        buttress.castShadow = true;
        group.add(buttress);
      }

      // Tier 3: Rounded Organic Top Terrace Deck (RoundedBoxGeometry — Zero Sharp Minecraft Cubes!)
      const topKey = step.topColorHex * 4 + (step.hazard === 'ice' ? 1 : 0);
      let topMaterial = biomeTopMaterials.get(topKey);
      if (!topMaterial) {
        topMaterial = enhanceWithStylizedShader(
          new THREE.MeshStandardMaterial({
            color: step.topColorHex,
            roughness: step.hazard === 'ice' ? 0.14 : 0.56,
            metalness: step.hazard === 'ice' ? 0.42 : 0.1,
            bumpMap: stoneBump,
            bumpScale: step.hazard === 'ice' ? 0.005 : 0.024,
          }),
          {
            noiseScale: 2.1,
            noiseStrength: 0.18,
            strataStrength: 0.08,
            rimColorHex: step.accentHex,
            rimStrength: 0.38,
            localYMin: -0.15,
            localYSpan: 0.3,
          }
        );
        biomeTopMaterials.set(topKey, topMaterial);
      }

      const topCapMesh = new THREE.Mesh(
        new RoundedBoxGeometry(step.width, 0.22, step.depth, 4, 0.065),
        topMaterial
      );
      topCapMesh.position.y = -0.09;
      topCapMesh.castShadow = true;
      topCapMesh.receiveShadow = true;
      group.add(topCapMesh);

      // Organic Corner Rim Boulders instead of square blocks
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          const rimRock = new THREE.Mesh(
            new THREE.DodecahedronGeometry(0.19, 1),
            trimMat
          );
          rimRock.scale.set(1.25, 0.55, 1.25);
          rimRock.position.set(
            sx * (step.width * 0.45),
            0.02,
            sz * (step.depth * 0.45)
          );
          rimRock.receiveShadow = true;
          group.add(rimRock);
        }
      }

      // ============================================================================
      // 3D DIRECTIONAL JUMP COMPASS & TWIN CHEVRON ARROWS POINTING AT NEXT STAGE!
      // ============================================================================
      const launchCompassGroup = new THREE.Group();
      const idealNextAngle = Math.atan2(
        nextStepObj.z - step.z,
        nextStepObj.x - step.x
      );
      const launchEdgeDist = Math.min(
        step.width * 0.38,
        step.depth * 0.38
      );
      launchCompassGroup.position.set(
        Math.cos(idealNextAngle) * launchEdgeDist,
        0.025,
        Math.sin(idealNextAngle) * launchEdgeDist
      );
      launchCompassGroup.rotation.y = -idealNextAngle;

      const chev1 = new THREE.Mesh(sharedChevronGeo, launchCompassMat);
      chev1.position.set(-0.12, 0.02, 0);
      const chev2 = new THREE.Mesh(sharedChevronGeo, launchCompassMat);
      chev2.scale.setScalar(0.76);
      chev2.position.set(0.18, 0.02, 0);
      launchCompassGroup.add(chev1, chev2);
      group.add(launchCompassGroup);

      // ============================================================================
      // ON-DECK ORGANIC SCULPTED OBSTACLES (Mossy Boulders, Fallen Logs, Lathe Totems)
      // ============================================================================
      for (let oIdx = 0; oIdx < step.deckObstacles.length; oIdx++) {
        const obs = step.deckObstacles[oIdx];
        if (obs.kind === 'tree') {
          const tree = buildSculptedTree(
            step.biome,
            0.88,
            step.stepNumber + oIdx
          );
          tree.position.set(obs.relX, 0, obs.relZ);
          group.add(tree);
        } else if (obs.kind === 'crystal') {
          const crystalGroup = new THREE.Group();
          crystalGroup.position.set(obs.relX, 0, obs.relZ);
          crystalGroup.add(
            makeContactShadow(obs.halfW * 1.4, obs.halfD * 1.4, 0.012)
          );
          const cMat = new THREE.MeshStandardMaterial({
            color: step.accentHex,
            emissive: step.accentHex,
            emissiveIntensity: 0.65,
            roughness: 0.14,
            metalness: 0.65,
            flatShading: true,
          });
          for (let c = 0; c < 3; c++) {
            const spire = new THREE.Mesh(
              new THREE.OctahedronGeometry(
                obs.halfW * (c === 0 ? 1.05 : 0.65),
                0
              ),
              cMat
            );
            spire.scale.set(
              0.82,
              obs.height * (c === 0 ? 2.1 : 1.35),
              0.82
            );
            spire.position.set(
              (c - 1) * 0.14,
              obs.height * (c === 0 ? 0.5 : 0.32),
              (c % 2) * 0.1
            );
            spire.rotation.z = (c - 1) * 0.22;
            spire.castShadow = true;
            crystalGroup.add(spire);
          }
          group.add(crystalGroup);
        } else if (obs.kind === 'totem') {
          // Sculpted LatheGeometry Ancient Hawk Totem Obelisk + Glowing Ring
          const totemGroup = new THREE.Group();
          totemGroup.position.set(obs.relX, 0, obs.relZ);
          totemGroup.add(
            makeContactShadow(obs.halfW * 1.45, obs.halfD * 1.45, 0.012)
          );
          const totemMesh = new THREE.Mesh(sharedTotemGeo, sideMat);
          totemMesh.scale.set(
            obs.halfW * 2.4,
            obs.height,
            obs.halfD * 2.4
          );
          totemMesh.castShadow = true;
          totemMesh.receiveShadow = true;

          const totemRing = new THREE.Mesh(
            new THREE.TorusGeometry(obs.halfW * 0.82, 0.045, 8, 18),
            launchCompassMat
          );
          totemRing.rotation.x = Math.PI / 2;
          totemRing.position.y = obs.height * 0.62;
          totemGroup.add(totemMesh, totemRing);
          group.add(totemGroup);
        } else if (obs.kind === 'pillar') {
          // Composite Mossy Alpine Crag Boulder Cluster (Zero Boxy Cubes!)
          const bGroup = new THREE.Group();
          bGroup.position.set(obs.relX, 0, obs.relZ);
          bGroup.add(
            makeContactShadow(obs.halfW * 1.5, obs.halfD * 1.5, 0.012)
          );

          const mainRock = new THREE.Mesh(
            new THREE.DodecahedronGeometry(obs.halfW * 1.08, 1),
            sideMat
          );
          mainRock.scale.set(1.0, obs.height / (obs.halfW * 1.75), 1.0);
          mainRock.position.y = obs.height * 0.45;
          mainRock.rotation.set(0.2, oIdx * 1.1, 0.15);
          mainRock.castShadow = true;
          mainRock.receiveShadow = true;

          const mossCap = new THREE.Mesh(
            new THREE.DodecahedronGeometry(obs.halfW * 0.78, 1),
            topMaterial
          );
          mossCap.scale.set(1.12, 0.42, 1.12);
          mossCap.position.y = obs.height * 0.82;
          mossCap.castShadow = true;

          const sideBoulder = new THREE.Mesh(
            new THREE.DodecahedronGeometry(obs.halfW * 0.58, 0),
            trimMat
          );
          sideBoulder.position.set(obs.halfW * 0.48, 0.22, obs.halfD * 0.35);
          bGroup.add(mainRock, mossCap, sideBoulder);
          group.add(bGroup);
        } else {
          // Sculpted Fallen Gnarled Cedar Log & Moss Barrier (Replaces Boxy Brown Walls!)
          const logGroup = new THREE.Group();
          logGroup.position.set(obs.relX, 0, obs.relZ);
          logGroup.add(
            makeContactShadow(obs.halfW * 1.45, obs.halfD * 1.45, 0.012)
          );

          const logTrunk = new THREE.Mesh(
            new THREE.CylinderGeometry(
              obs.height * 0.44,
              obs.height * 0.5,
              Math.max(obs.halfW, obs.halfD) * 2.1,
              10
            ),
            sharedTrunkMat
          );
          logTrunk.rotation.z = Math.PI / 2;
          logTrunk.rotation.y =
            Math.atan2(step.dirZ, step.dirX) + Math.PI * 0.5;
          logTrunk.position.y = obs.height * 0.46;
          logTrunk.castShadow = true;
          logTrunk.receiveShadow = true;

          const mossPatch = new THREE.Mesh(
            new THREE.CapsuleGeometry(
              obs.height * 0.26,
              Math.max(obs.halfW, obs.halfD) * 1.1,
              6,
              10
            ),
            topMaterial
          );
          mossPatch.rotation.z = Math.PI / 2;
          mossPatch.rotation.y = logTrunk.rotation.y;
          mossPatch.position.y = obs.height * 0.76;

          logGroup.add(logTrunk, mossPatch);
          group.add(logGroup);
        }
      }

      // Multi-Plate Rune Puzzle Nodes & Physical Front Launch Gate
      const runeVisuals: RuneVisualEntry[] = [];
      let gateBarrierGroup: THREE.Group | undefined;
      let gateEnergyMesh: THREE.Mesh | undefined;
      let gateEnergyMat: THREE.MeshStandardMaterial | undefined;

      if (step.requiresSwitch && step.runePlates.length > 0) {
        for (const rp of step.runePlates) {
          const ringMat = new THREE.MeshStandardMaterial({
            color: 0xf59e0b,
            emissive: 0xd97706,
            emissiveIntensity: 0.85,
            roughness: 0.25,
          });
          const ringMesh = new THREE.Mesh(runeRingGeo, ringMat);
          ringMesh.position.set(rp.relX, 0.03, rp.relZ);
          group.add(ringMesh);

          const crystalMat = new THREE.MeshStandardMaterial({
            color: 0xfef08a,
            emissive: 0xf59e0b,
            emissiveIntensity: 1.25,
            roughness: 0.15,
          });
          const crystalMesh = new THREE.Mesh(runeCrystalGeo, crystalMat);
          crystalMesh.position.set(rp.relX, 0.34, rp.relZ);
          group.add(crystalMesh);

          runeVisuals.push({
            id: rp.id,
            ringMesh,
            crystalMesh,
            ringMat,
            crystalMat,
            baseY: 0.34,
          });
        }

        // Physical Launch Gate Barrier across the front launch edge (Matches OBB in rules.ts!)
        gateBarrierGroup = new THREE.Group();
        const gateCenterRelX = step.dirX * (step.width * 0.31);
        const gateCenterRelZ = step.dirZ * (step.depth * 0.31);
        gateBarrierGroup.position.set(gateCenterRelX, 0, gateCenterRelZ);
        gateBarrierGroup.rotation.y = -Math.atan2(step.dirZ, step.dirX);

        for (const s of [-1, 1]) {
          const post = new THREE.Mesh(sharedTotemGeo, sideMat);
          post.scale.set(0.45, 1.05, 0.45);
          post.position.set(0, 0, s * (step.depth * 0.36));
          post.castShadow = true;
          gateBarrierGroup.add(post);
        }

        gateEnergyMat = new THREE.MeshStandardMaterial({
          color: 0xf43f5e,
          emissive: 0xe11d48,
          emissiveIntensity: 1.2,
          transparent: true,
          opacity: 0.78,
          roughness: 0.15,
        });
        gateEnergyMesh = new THREE.Mesh(
          new RoundedBoxGeometry(0.16, 0.78, step.depth * 0.68, 2, 0.04),
          gateEnergyMat
        );
        gateEnergyMesh.position.set(0, 0.45, 0);
        gateBarrierGroup.add(gateEnergyMesh);
        group.add(gateBarrierGroup);
      }

      // Dynamic Stage Hazards (Sculpted Rolling Boulder, Rotating Beam, Compass Turntable)
      let pusherMesh: THREE.Mesh | undefined;
      if (step.hazard === 'pusher') {
        pusherMesh = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.4, 1),
          cliffRockMat
        );
        pusherMesh.position.set(0, 0.4, 0);
        pusherMesh.castShadow = true;
        group.add(pusherMesh);
      }

      let sweeperPivot: THREE.Group | undefined;
      if (step.hazard === 'sweeper') {
        sweeperPivot = new THREE.Group();
        sweeperPivot.position.set(0, 0.24, 0);
        const hub = new THREE.Mesh(
          new THREE.CylinderGeometry(0.24, 0.28, 0.4, 12),
          trimMat
        );
        const beam = new THREE.Mesh(
          new THREE.CylinderGeometry(0.09, 0.09, step.width * 0.84, 10),
          new THREE.MeshStandardMaterial({
            color: 0xdc2626,
            emissive: 0x991b1b,
            emissiveIntensity: 0.35,
            roughness: 0.35,
          })
        );
        beam.rotation.z = Math.PI / 2;
        beam.castShadow = true;
        sweeperPivot.add(hub, beam);
        group.add(sweeperPivot);
      }

      let turntableDisc: THREE.Mesh | undefined;
      if (step.hazard === 'turntable') {
        turntableDisc = new THREE.Mesh(
          new THREE.CylinderGeometry(
            minDim * 0.36,
            minDim * 0.36,
            0.055,
            20
          ),
          trimMat
        );
        turntableDisc.position.y = 0.028;
        group.add(turntableDisc);
      }

      // Trail NPC on Milestone / Outpost Stages
      let npcGroup: THREE.Group | undefined;
      let npcHeadGroup: THREE.Group | undefined;
      let npcArmLeft: THREE.Mesh | undefined;
      let npcArmRight: THREE.Mesh | undefined;
      if (step.npc) {
        const built = buildNpcCharacterMesh(step.npc);
        npcGroup = built.npcGroup;
        npcHeadGroup = built.headGroup;
        npcArmLeft = built.armL;
        npcArmRight = built.armR;
        npcGroup.position.set(step.npc.relX, 0, step.npc.relZ);
        group.add(npcGroup);
      }

      // Summit 500 Astral Sanctuary Arch
      if (step.stepNumber === TOTAL_LEVELS) {
        const crownMat = new THREE.MeshStandardMaterial({
          color: 0xfacc15,
          emissive: 0xeab308,
          emissiveIntensity: 1.1,
          metalness: 0.85,
          roughness: 0.15,
        });
        const torusArch = new THREE.Mesh(
          new THREE.TorusGeometry(1.65, 0.15, 16, 40, Math.PI),
          crownMat
        );
        torusArch.position.y = 0.25;
        group.add(torusArch);
      }

      spireGroup.add(group);
      stepEntries.push({
        step,
        group,
        blockMesh,
        topCapMesh,
        topMaterial,
        launchCompassGroup,
        pusherMesh,
        sweeperPivot,
        turntableDisc,
        gateBarrierGroup,
        gateEnergyMesh,
        gateEnergyMat,
        runeVisuals,
        npcGroup,
        npcHeadGroup,
        npcArmLeft,
        npcArmRight,
      });
    }

    // ============================================================================
    // SCULPTED STUDIO-GRADE HERO WAYFARER (Shader-Enhanced, Contact Shadow, Plume)
    // ============================================================================
    const playerGroup = new THREE.Group();
    const playerVisual = new THREE.Group();
    playerGroup.add(playerVisual);
    scene.add(playerGroup);

    const heroContactShadow = makeContactShadow(0.42, 0.42, 0.02);
    playerGroup.add(heroContactShadow);

    const bodyMat = enhanceWithStylizedShader(
      new THREE.MeshStandardMaterial({
        color: selectedOutfit.bodyColorHex,
        roughness: 0.42,
        metalness: 0.12,
      }),
      {
        rimColorHex: 0xfffbeb,
        rimStrength: 0.52,
        localYMin: 0.15,
        localYSpan: 0.65,
      }
    );
    const beakMat = enhanceWithStylizedShader(
      new THREE.MeshStandardMaterial({
        color: selectedOutfit.beakColorHex,
        roughness: 0.48,
      }),
      { rimStrength: 0.38 }
    );
    const combMat = enhanceWithStylizedShader(
      new THREE.MeshStandardMaterial({
        color: selectedOutfit.combColorHex,
        roughness: 0.38,
      }),
      { rimStrength: 0.55 }
    );
    const legMat = enhanceWithStylizedShader(
      new THREE.MeshStandardMaterial({
        color: selectedOutfit.legColorHex,
        roughness: 0.58,
      }),
      { rimStrength: 0.35 }
    );
    const hatMat = enhanceWithStylizedShader(
      new THREE.MeshStandardMaterial({
        color: selectedOutfit.hatColorHex,
        roughness: 0.45,
      }),
      { rimColorHex: 0xfef08a, rimStrength: 0.5 }
    );

    outfitMaterialsRef.current = {
      bodyMat,
      beakMat,
      combMat,
      legMat,
      hatMat,
    };

    const legL = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.058, 0.16, 8, 12),
      legMat
    );
    legL.position.set(-0.095, 0.14, 0);
    legL.castShadow = true;
    const legR = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.058, 0.16, 8, 12),
      legMat
    );
    legR.position.set(0.095, 0.14, 0);
    legR.castShadow = true;
    playerVisual.add(legL, legR);

    const ponchoMesh = new THREE.Mesh(
      new THREE.ConeGeometry(0.29, 0.48, 16),
      bodyMat
    );
    ponchoMesh.position.set(0, 0.43, 0);
    ponchoMesh.castShadow = true;
    ponchoMesh.receiveShadow = true;
    playerVisual.add(ponchoMesh);

    const ponchoHem = new THREE.Mesh(
      new THREE.TorusGeometry(0.275, 0.026, 8, 20),
      combMat
    );
    ponchoHem.rotation.x = Math.PI / 2;
    ponchoHem.position.set(0, 0.21, 0);
    playerVisual.add(ponchoHem);

    const scarfRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.165, 0.052, 10, 18),
      combMat
    );
    scarfRing.rotation.x = Math.PI / 2;
    scarfRing.position.set(0, 0.62, 0);
    playerVisual.add(scarfRing);

    const scarfTail = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.042, 0.24, 8, 10),
      combMat
    );
    scarfTail.position.set(-0.19, 0.5, -0.06);
    scarfTail.rotation.z = 0.48;
    scarfTail.castShadow = true;
    playerVisual.add(scarfTail);

    const packMesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.135, 0.17, 10, 14),
      beakMat
    );
    packMesh.position.set(-0.185, 0.43, 0);
    packMesh.castShadow = true;
    const bedrollMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.065, 0.065, 0.29, 12),
      hatMat
    );
    bedrollMesh.rotation.x = Math.PI / 2;
    bedrollMesh.position.set(-0.195, 0.59, 0);
    bedrollMesh.castShadow = true;
    playerVisual.add(packMesh, bedrollMesh);

    const heroHead = new THREE.Mesh(
      new THREE.SphereGeometry(0.185, 18, 16),
      enhanceWithStylizedShader(
        new THREE.MeshStandardMaterial({ color: 0xfde68a, roughness: 0.42 }),
        { rimStrength: 0.45 }
      )
    );
    heroHead.position.set(0, 0.74, 0);
    heroHead.castShadow = true;
    playerVisual.add(heroHead);

    const heroEyeMat = new THREE.MeshStandardMaterial({
      color: 0x090d16,
      roughness: 0.08,
    });
    const heroGlintMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (const side of [-1, 1]) {
      const hEye = new THREE.Mesh(
        new THREE.SphereGeometry(0.032, 10, 10),
        heroEyeMat
      );
      hEye.position.set(0.155, 0.76, side * 0.068);
      const hGlint = new THREE.Mesh(
        new THREE.SphereGeometry(0.011, 6, 6),
        heroGlintMat
      );
      hGlint.position.set(0.178, 0.772, side * 0.064);
      playerVisual.add(hEye, hGlint);
    }

    const hatBrim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.27, 0.27, 0.028, 18),
      hatMat
    );
    hatBrim.position.set(0, 0.88, 0);
    hatBrim.castShadow = true;
    const hatCrown = new THREE.Mesh(
      new THREE.ConeGeometry(0.175, 0.19, 14),
      hatMat
    );
    hatCrown.position.set(0, 0.975, 0);
    hatCrown.castShadow = true;
    const hatPlume = new THREE.Mesh(
      new THREE.ConeGeometry(0.045, 0.22, 8),
      combMat
    );
    hatPlume.position.set(-0.08, 1.04, -0.08);
    hatPlume.rotation.z = 0.42;
    playerVisual.add(hatBrim, hatCrown, hatPlume);

    const staffPole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.024, 0.028, 0.74, 8),
      railMat
    );
    staffPole.position.set(0.14, 0.42, 0.19);
    staffPole.rotation.z = -0.14;
    staffPole.castShadow = true;
    const staffGem = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.068, 0),
      new THREE.MeshStandardMaterial({
        color: 0x7dd3fc,
        emissive: 0x0284c7,
        emissiveIntensity: 1.5,
        roughness: 0.15,
      })
    );
    staffGem.position.set(0.19, 0.82, 0.19);
    playerVisual.add(staffPole, staffGem);

    // ============================================================================
    // 3D WORLD-SPACE DIRECTIONAL JUMP COMPASS, CHARGE RING & BALLISTIC ARC
    // ============================================================================
    const chargeRingMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.0,
    });
    const chargeRingMesh = new THREE.Mesh(
      new THREE.RingGeometry(0.36, 0.52, 32),
      chargeRingMat
    );
    chargeRingMesh.rotation.x = -Math.PI / 2;
    chargeRingMesh.position.y = 0.03;
    playerGroup.add(chargeRingMesh);

    const aimArrowGroup = new THREE.Group();
    const aimPointerMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.92,
    });
    const aimChevronMesh = new THREE.Mesh(sharedChevronGeo, aimPointerMat);
    aimChevronMesh.position.set(0.68, 0.04, 0);
    aimArrowGroup.add(aimChevronMesh);
    playerGroup.add(aimArrowGroup);

    const arcDotsGroup = new THREE.Group();
    scene.add(arcDotsGroup);
    const arcDotMeshes: THREE.Mesh[] = [];
    const arcDotMat = new THREE.MeshBasicMaterial({
      color: 0x34d399,
      transparent: true,
      opacity: 0.88,
    });
    for (let i = 0; i < 12; i++) {
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.056, 8, 8),
        arcDotMat
      );
      dot.visible = false;
      arcDotsGroup.add(dot);
      arcDotMeshes.push(dot);
    }

    const landingReticleMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.88,
    });
    const landingReticle = new THREE.Mesh(
      new THREE.RingGeometry(0.28, 0.44, 28),
      landingReticleMat
    );
    landingReticle.rotation.x = -Math.PI / 2;
    landingReticle.visible = false;
    scene.add(landingReticle);

    // Impact Dust Particles
    const impactParticles: ImpactParticle[] = [];
    const particleGeo = new THREE.DodecahedronGeometry(0.06, 0);
    const particleMat = new THREE.MeshBasicMaterial({
      color: 0xfef3c7,
      transparent: true,
      opacity: 0.85,
    });
    const spawnBurst = (x: number, y: number, z: number, count = 10) => {
      for (let i = 0; i < count; i++) {
        const mesh = new THREE.Mesh(particleGeo, particleMat.clone());
        mesh.position.set(x, y + 0.08, z);
        scene.add(mesh);
        const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
        const speed = 1.2 + Math.random() * 2.2;
        impactParticles.push({
          mesh,
          vx: Math.cos(angle) * speed,
          vy: 1.5 + Math.random() * 2.2,
          vz: Math.sin(angle) * speed,
          life: 0,
          maxLife: 0.38 + Math.random() * 0.2,
        });
      }
    };

    // ============================================================================
    // INPUT LISTENERS (Pure Jumping + Camera-Relative Steering + NPC POV Talk [E])
    // ============================================================================
    const beginCharge = () => {
      if (
        isTitlePreviewRef.current ||
        isPausedRef.current ||
        activeDialogueNpcRef.current
      )
        return;
      const p = playerRef.current;
      if (p.won) return;
      if (p.grounded || p.coyoteTimer > 0) {
        if (!p.isCharging) {
          p.isCharging = true;
          p.chargeRatio = 0.08;
          p.chargeDirection = 1;
          p.chargeHoldTime = 0;
          soundEngine.playChargeTick(0.1);
        }
      } else {
        p.jumpBufferTimer = 0.16;
      }
    };

    const releaseJump = () => {
      if (isTitlePreviewRef.current || isPausedRef.current) return;
      const p = playerRef.current;
      if (!p.isCharging) return;
      p.isCharging = false;

      if (p.grounded || p.coyoteTimer > 0) {
        const ratio = Math.max(0.12, p.chargeRatio);
        const vel = computeJumpVelocity(ratio, p.aimAngle);
        p.vx = vel.vx;
        p.vy = vel.vy;
        p.vz = vel.vz;
        p.grounded = false;
        p.coyoteTimer = 0;
        p.chargeRatio = 0;
        p.chargeHoldTime = 0;
        soundEngine.playJumpLaunch(ratio);
        spawnBurst(p.x, p.y, p.z, 9);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTitlePreviewRef.current) return;
      const code = e.code;
      if (code === 'ArrowLeft' || code === 'KeyA') keysRef.current.left = true;
      if (code === 'ArrowRight' || code === 'KeyD')
        keysRef.current.right = true;
      if (code === 'ArrowUp' || code === 'KeyW') keysRef.current.up = true;
      if (code === 'ArrowDown' || code === 'KeyS') keysRef.current.down = true;

      if (code === 'Space') {
        e.preventDefault();
        beginCharge();
      } else if (code === 'KeyE') {
        e.preventDefault();
        const p = playerRef.current;
        const near = findNearbyNpc(p, performance.now() * 0.001);
        if (near) {
          onInteractNpcRef.current(near.npc, near.stepNumber);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const code = e.code;
      if (code === 'ArrowLeft' || code === 'KeyA') keysRef.current.left = false;
      if (code === 'ArrowRight' || code === 'KeyD')
        keysRef.current.right = false;
      if (code === 'ArrowUp' || code === 'KeyW') keysRef.current.up = false;
      if (code === 'ArrowDown' || code === 'KeyS') keysRef.current.down = false;

      if (code === 'Space') {
        e.preventDefault();
        releaseJump();
      }
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (
        isTitlePreviewRef.current ||
        isPausedRef.current ||
        activeDialogueNpcRef.current
      )
        return;
      if (e.button !== 0) return;
      beginCharge();
    };

    const handlePointerUp = () => {
      releaseJump();
    };

    let pointerNormX = 0;
    let pointerNormY = 0;
    let dampedPointerX = 0;
    let dampedPointerY = 0;

    const handlePointerMove = (e: PointerEvent) => {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        pointerNormX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointerNormY = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('pointermove', handlePointerMove);
    const domElem = renderer.domElement;
    domElem.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointerup', handlePointerUp);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = Math.max(1, container.clientHeight);
      const asp = w / h;
      camera.left = (-frustumSize * asp) / 2;
      camera.right = (frustumSize * asp) / 2;
      camera.top = frustumSize / 2;
      camera.bottom = -frustumSize / 2;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      if (composer) composer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    let frameId = 0;
    let lastTime = performance.now();
    let elapsedTime = 0;
    let lastTelemetryEmit = 0;
    let camFocusX = playerRef.current.x;
    let camFocusY = playerRef.current.y + 1.1;
    let camFocusZ = playerRef.current.z;
    let currentCamPosX = camFocusX + 14.5;
    let currentCamPosY = camFocusY + 14.8;
    let currentCamPosZ = camFocusZ + 14.5;

    // ============================================================================
    // QA DETERMINISTIC TEST HOOKS (window.__gameTestHooks & window.advanceTime)
    // ============================================================================
    (window as unknown as Record<string, unknown>).__gameTestHooks = {
      getState: () => ({ ...playerRef.current }),
      teleportToStep: (stepNum: number) => {
        const nextPlayer = createInitialPlayerState(stepNum);
        playerRef.current = nextPlayer;
        const autoCam = getAutoCameraModeForStep(stepNum);
        activeCameraPresetRef.current = autoCam;
        const preset =
          CAMERA_ANGLE_PRESETS[autoCam] || CAMERA_ANGLE_PRESETS.isometric;
        camFocusX = nextPlayer.x;
        camFocusY = nextPlayer.y + 1.15;
        camFocusZ = nextPlayer.z;
        currentCamPosX = camFocusX + preset.offsetX;
        currentCamPosY = camFocusY + preset.offsetY;
        currentCamPosZ = camFocusZ + preset.offsetZ;
        onAutoCameraShiftRef.current?.(autoCam, stepNum);
      },
      performIdealVault: () => {
        const p = playerRef.current;
        const ideal = computeIdealJumpToNextStep(
          p.currentStep,
          performance.now() * 0.001
        );
        p.aimAngle = ideal.aimAngle;
        const vel = computeJumpVelocity(ideal.chargeRatio, ideal.aimAngle);
        p.vx = vel.vx;
        p.vy = vel.vy;
        p.vz = vel.vz;
        p.grounded = false;
      },
      unlockCurrentStepGate: () => {
        const p = playerRef.current;
        if (p.currentStep > 0) {
          const st = LEVELS_500[p.currentStep - 1];
          if (st) {
            for (const rp of st.runePlates) {
              if (!p.activatedRuneIds.includes(rp.id)) {
                p.activatedRuneIds.push(rp.id);
              }
            }
            if (!p.unlockedGateSteps.includes(st.stepNumber)) {
              p.unlockedGateSteps.push(st.stepNumber);
            }
          }
        }
      },
      clearCurrentStepNpc: () => {
        clearBlockingNpcForStep(playerRef.current);
      },
    };

    const stepSimulation = (dt: number) => {
      if (isPausedRef.current) return;
      elapsedTime += dt;
      const p = playerRef.current;

      if (isTitlePreviewRef.current) {
        p.x = GROUND_SPAWN_X;
        p.y = GROUND_FLOOR_Y;
        p.z = GROUND_SPAWN_Z;
        p.grounded = true;
        return;
      }

      const nextStepIdx = Math.max(
        0,
        Math.min(TOTAL_LEVELS - 1, p.currentStep)
      );
      const nextStep = LEVELS_500[nextStepIdx] || LEVELS_500[0];
      const curStepObj =
        p.currentStep <= 0
          ? GROUND_STEP_META
          : LEVELS_500[
              Math.max(0, Math.min(TOTAL_LEVELS - 1, p.currentStep - 1))
            ];

      let rawInX = 0;
      let rawInZ = 0;
      if (keysRef.current.left) rawInX -= 1;
      if (keysRef.current.right) rawInX += 1;
      if (keysRef.current.up) rawInZ -= 1;
      if (keysRef.current.down) rawInZ += 1;

      let worldMoveX = 0;
      let worldMoveZ = 0;

      if (p.isCharging) {
        if (rawInX !== 0) {
          p.aimAngle += rawInX * 1.85 * dt;
        }
        const chargeStep = advanceChargeState(
          p.chargeRatio,
          p.chargeDirection,
          p.chargeHoldTime,
          dt,
          curStepObj.chargeSpeedMultiplier
        );
        p.chargeRatio = chargeStep.chargeRatio;
        p.chargeDirection = chargeStep.chargeDirection;
        p.chargeHoldTime = chargeStep.chargeHoldTime;

        if (chargeStep.overcharged) {
          releaseJump();
        }
      } else if (rawInX !== 0 || rawInZ !== 0) {
        const preset =
          CAMERA_ANGLE_PRESETS[activeCameraPresetRef.current] ||
          CAMERA_ANGLE_PRESETS.isometric;
        const fwdLen = Math.hypot(preset.offsetX, preset.offsetZ) || 1;
        const camFwdX = -preset.offsetX / fwdLen;
        const camFwdZ = -preset.offsetZ / fwdLen;
        const camRightX = -camFwdZ;
        const camRightZ = camFwdX;

        worldMoveX = camRightX * rawInX + camFwdX * -rawInZ;
        worldMoveZ = camRightZ * rawInX + camFwdZ * -rawInZ;
        const mLen = Math.hypot(worldMoveX, worldMoveZ);
        if (mLen > 0.001) {
          worldMoveX /= mLen;
          worldMoveZ /= mLen;
          if (!p.grounded) {
            p.aimAngle = Math.atan2(worldMoveZ, worldMoveX);
          } else {
            const walkAngle = Math.atan2(worldMoveZ, worldMoveX);
            const diff = Math.atan2(
              Math.sin(walkAngle - p.aimAngle),
              Math.cos(walkAngle - p.aimAngle)
            );
            p.aimAngle += diff * Math.min(1, dt * 10);
          }
        }
      } else if (p.grounded && p.currentStep < TOTAL_LEVELS) {
        const rtNext = getStepRuntimeOffset(nextStep, elapsedTime + 0.5, 0);
        const idealAngle = Math.atan2(
          nextStep.z + rtNext.offsetZ - p.z,
          nextStep.x + rtNext.offsetX - p.x
        );
        const diff = Math.atan2(
          Math.sin(idealAngle - p.aimAngle),
          Math.cos(idealAngle - p.aimAngle)
        );
        if (Math.abs(diff) < 0.85) {
          p.aimAngle += diff * Math.min(1, dt * 5.2);
        }
      }

      const prevStepBefore = p.currentStep;
      const physResult = advancePlayerPhysics(
        p,
        dt,
        elapsedTime,
        worldMoveX,
        worldMoveZ
      );

      if (physResult.activatedRunePlate) {
        soundEngine.playChargeTick(0.85);
        spawnBurst(p.x, p.y, p.z, 10);
      }
      if (physResult.unlockedTrailGate) {
        soundEngine.playStepLand(true);
        spawnBurst(p.x, p.y + 0.3, p.z, 16);
      }
      if (physResult.bouncedOffLedge) {
        soundEngine.playLedgeBonk();
      }
      if (physResult.cameraShiftedTo) {
        activeCameraPresetRef.current = physResult.cameraShiftedTo;
        onAutoCameraShiftRef.current?.(
          physResult.cameraShiftedTo,
          p.currentStep
        );
      }

      if (physResult.landedStep !== null) {
        soundEngine.playStepLand(!physResult.fellToLowerStep);
        spawnBurst(p.x, p.y, p.z, physResult.fellToLowerStep ? 16 : 9);

        if (physResult.fellToLowerStep && physResult.stepsLost >= 2) {
          const taunt = selectPhilosophicalTaunt(
            physResult.stepsLost,
            p.fallsCount
          );
          soundEngine.playCatastrophicFall(physResult.stepsLost, taunt.quote);
          onTauntTriggeredRef.current(
            taunt.quote,
            taunt.author,
            physResult.stepsLost,
            prevStepBefore,
            physResult.landedStep
          );
        } else if (
          physResult.landedStep > prevStepBefore &&
          (physResult.landedStep === 1 ||
            physResult.landedStep % 12 === 0 ||
            physResult.landedStep % 50 === 0)
        ) {
          const bIdx = Math.min(10, Math.ceil(physResult.landedStep / 50));
          const bp = BIOME_BLUEPRINTS[bIdx - 1] || BIOME_BLUEPRINTS[0];
          soundEngine.playStepLand(true);
          onMilestoneReachedRef.current(
            physResult.landedStep,
            bp.name,
            physResult.cameraShiftedTo
              ? `Camera shifted to ${CAMERA_ANGLE_PRESETS[physResult.cameraShiftedTo].label}!`
              : bp.subtitle,
            bp.themeColor
          );
        }

        if (p.jumpBufferTimer > 0) {
          p.jumpBufferTimer = 0;
          beginCharge();
        }
      }
    };

    const renderScene = (dt: number) => {
      const p = playerRef.current;
      const curBiome =
        p.currentStep <= 0
          ? 1
          : Math.min(10, Math.ceil(p.currentStep / 50));
      const weather = getBiomeWeatherProfile(curBiome);

      riverUniforms.uTime.value = elapsedTime;
      skyShaderUniforms.uTime.value = elapsedTime;

      const targetSkyColor = new THREE.Color(weather.skyColorHex);
      skyColor.lerp(targetSkyColor, Math.min(1, dt * 2.5));
      sceneFog.color.copy(skyColor);
      sceneFog.density =
        weather.fogDensity * (vistaOverviewRef.current ? 0.35 : 0.8);

      const spaceProg = Math.max(0, Math.min(1, (p.currentStep - 95) / 220));
      const auroraProg =
        p.currentStep >= 150 && p.currentStep <= 380 ? 1.0 : 0.0;
      skyShaderUniforms.uSpaceFactor.value +=
        (spaceProg - skyShaderUniforms.uSpaceFactor.value) *
        Math.min(1, dt * 2.5);
      skyShaderUniforms.uAuroraFactor.value +=
        (auroraProg - skyShaderUniforms.uAuroraFactor.value) *
        Math.min(1, dt * 2.5);

      const zenithTarget = new THREE.Color(weather.skyColorHex).multiplyScalar(
        0.58
      );
      const horizonTarget = new THREE.Color(weather.skyColorHex).lerp(
        new THREE.Color(0xfef08a),
        0.38 * (1 - spaceProg)
      );
      skyShaderUniforms.uZenithColor.value.lerp(
        zenithTarget,
        Math.min(1, dt * 3.0)
      );
      skyShaderUniforms.uHorizonColor.value.lerp(
        horizonTarget,
        Math.min(1, dt * 3.0)
      );

      // Flickering Campfire Flames, Warm Hearth Light, Rising Embers & Chimney Smoke
      const fireFlicker =
        1.0 +
        Math.sin(elapsedTime * 15.0) * 0.14 +
        Math.cos(elapsedTime * 23.0) * 0.08;
      outerFlameMesh.scale.set(
        1 + Math.sin(elapsedTime * 11) * 0.08,
        fireFlicker,
        1 + Math.cos(elapsedTime * 13) * 0.08
      );
      innerFlameMesh.scale.set(1, 0.9 + fireFlicker * 0.15, 1);
      campfirePointLight.intensity = 3.5 + Math.sin(elapsedTime * 17.0) * 0.55;

      // Update Rising Campfire Embers
      for (let eIdx = 0; eIdx < campfireEmbers.length; eIdx++) {
        const em = campfireEmbers[eIdx];
        const cycle = (elapsedTime * em.speed + em.phase) % 1.0;
        const heightY = 0.28 + cycle * 2.35;
        const swirlAngle = elapsedTime * 2.4 + em.phase * 6.28;
        const spiralR = em.radius * (0.45 + cycle * 1.45);
        em.mesh.position.set(
          Math.cos(swirlAngle) * spiralR,
          heightY,
          Math.sin(swirlAngle) * spiralR
        );
        const scale = Math.sin(cycle * Math.PI) * 1.15;
        em.mesh.scale.setScalar(Math.max(0.05, scale));
        em.mat.opacity = Math.sin(cycle * Math.PI) * 0.92;
      }

      // Update Cabin Chimney Smoke Plumes
      for (let sIdx = 0; sIdx < chimneySmokePuffs.length; sIdx++) {
        const sp = chimneySmokePuffs[sIdx];
        const cycle = (elapsedTime * 0.28 + sp.phase) % 1.0;
        sp.mesh.position.set(
          Math.sin(elapsedTime * 1.2 + sIdx) * (0.1 + cycle * 0.35),
          2.65 + cycle * 2.4,
          Math.cos(elapsedTime * 0.9 + sIdx) * (0.1 + cycle * 0.25)
        );
        const puffScale = 0.45 + cycle * 1.35;
        sp.mesh.scale.setScalar(puffScale);
        sp.mat.opacity = (1.0 - cycle) * 0.36;
      }

      // Update Wind-Swaying Valley Pine Trees
      for (let tIdx = 0; tIdx < valleyTrees.length; tIdx++) {
        const vt = valleyTrees[tIdx];
        vt.group.rotation.z =
          Math.sin(elapsedTime * 1.55 + vt.phase) * 0.026;
        vt.group.rotation.x =
          Math.cos(elapsedTime * 1.25 + vt.phase * 0.7) * 0.018;
      }

      // Update Soaring 3D Alpine Hawks over Base Camp & Lower Terraces
      for (let hIdx = 0; hIdx < hawkFlock.length; hIdx++) {
        const hk = hawkFlock[hIdx];
        const t = elapsedTime * hk.speed + hk.phase;
        const hx = hk.orbitCenterX + Math.cos(t) * hk.radiusX;
        const hz = hk.orbitCenterZ + Math.sin(t) * hk.radiusZ;
        const hy = hk.orbitCenterY + Math.sin(t * 2.0) * 0.38;

        const nextT = t + 0.05;
        const nx = hk.orbitCenterX + Math.cos(nextT) * hk.radiusX;
        const nz = hk.orbitCenterZ + Math.sin(nextT) * hk.radiusZ;
        const headingYaw = Math.atan2(nx - hx, nz - hz);

        hk.group.position.set(hx, hy, hz);
        hk.group.rotation.set(
          Math.cos(t * 2.0) * 0.08,
          headingYaw,
          -Math.sin(t) * 0.28
        );

        const flap = Math.sin(elapsedTime * 8.5 + hk.phase * 2.0) * 0.44;
        hk.leftWingPivot.rotation.z = flap;
        hk.rightWingPivot.rotation.z = -flap;
      }

      for (let i = 0; i < auroraMeshes.length; i++) {
        auroraMeshes[i].rotation.y += dt * 0.12 * (i % 2 === 0 ? 1 : -1);
        auroraMeshes[i].position.y += Math.sin(elapsedTime * 1.4 + i) * 0.005;
      }
      planetGroup.rotation.y += dt * 0.08;

      const baseNpcPhys = computeNpcPhysicalState(
        GROUND_STEP_META,
        p,
        elapsedTime
      );
      if (baseNpcPhys) {
        baseCampNpcBuilt.npcGroup.position.set(
          baseNpcPhys.worldX,
          GROUND_FLOOR_Y + baseNpcPhys.hopOffsetY,
          baseNpcPhys.worldZ
        );
        baseCampNpcBuilt.npcGroup.rotation.y =
          -baseNpcPhys.facingAngleRad + Math.PI / 2;
        baseCampNpcBuilt.armL.rotation.z = baseNpcPhys.armWaveRad;
        baseCampNpcBuilt.armR.rotation.z = -baseNpcPhys.armWaveRad;
      }

      baseCampGroup.visible = p.y < 36 || isTitlePreviewRef.current;
      atmosphereGroup.visible = p.currentStep >= 32 && !isTitlePreviewRef.current;

      // Update Visible Stages around Player (and Starting Mountain Steps during Title Sweep with foreground-pillar culling!)
      const titleSweepProgress = isTitlePreviewRef.current
        ? 0.5 - 0.5 * Math.cos(elapsedTime * 0.28)
        : 0;
      const titleFocusStep = isTitlePreviewRef.current
        ? Math.round(titleSweepProgress * 4)
        : p.currentStep;

      const minVis = Math.max(1, p.currentStep - 12);
      const maxVis = Math.min(
        TOTAL_LEVELS,
        isTitlePreviewRef.current
          ? titleFocusStep + 3
          : p.currentStep + (vistaOverviewRef.current ? 48 : 7)
      );

      const refX = isTitlePreviewRef.current ? camFocusX : p.x;
      const refZ = isTitlePreviewRef.current ? camFocusZ : p.z;

      for (let i = 0; i < stepEntries.length; i++) {
        const entry = stepEntries[i];
        const sNum = entry.step.stepNumber;
        let isVis = sNum >= minVis && sNum <= maxVis;
        if (
          isVis &&
          !vistaOverviewRef.current &&
          sNum > titleFocusStep + 2
        ) {
          const toCamX = currentCamPosX - refX;
          const toCamZ = currentCamPosZ - refZ;
          const toStepX = entry.step.x - refX;
          const toStepZ = entry.step.z - refZ;
          const dotCam = toCamX * toStepX + toCamZ * toStepZ;
          if (dotCam > 10.0) {
            isVis = false;
          }
        }
        entry.group.visible = isVis;
        if (!isVis) continue;

        const crumbleProg = sNum === p.currentStep ? p.crumbleTimer : 0;
        const rt = getStepRuntimeOffset(entry.step, elapsedTime, crumbleProg);
        entry.group.position.set(
          entry.step.x + rt.offsetX + rt.glitchJitterX,
          entry.step.y - (rt.collapsed ? 12 : 0),
          entry.step.z + rt.offsetZ
        );

        // Gently pulse the Directional Launch Compass on the player's current stage
        const compassScale =
          sNum === p.currentStep
            ? 1.08 + Math.sin(elapsedTime * 5.0) * 0.12
            : 0.9;
        entry.launchCompassGroup.scale.setScalar(compassScale);

        if (entry.pusherMesh) {
          entry.pusherMesh.position.set(rt.boulderRelX, 0.4, rt.boulderRelZ);
          entry.pusherMesh.rotation.x += dt * 3.5;
          entry.pusherMesh.rotation.z += dt * 2.5;
        }
        if (entry.sweeperPivot) {
          entry.sweeperPivot.rotation.y = rt.sweeperAngle;
        }
        if (entry.turntableDisc) {
          entry.turntableDisc.rotation.y = rt.turntableAngle;
        }

        if (entry.step.requiresSwitch) {
          const gateUnlocked = isStepGateUnlocked(entry.step, p);
          for (const rv of entry.runeVisuals) {
            const isLit =
              gateUnlocked || p.activatedRuneIds.includes(rv.id);
            rv.ringMat.color.setHex(isLit ? 0x10b981 : 0xf59e0b);
            rv.ringMat.emissive.setHex(isLit ? 0x059669 : 0xd97706);
            rv.crystalMat.color.setHex(isLit ? 0x6ee7b7 : 0xfef08a);
            rv.crystalMat.emissive.setHex(isLit ? 0x10b981 : 0xf59e0b);
            rv.crystalMesh.position.y = isLit
              ? 0.14
              : rv.baseY + Math.sin(elapsedTime * 3.5) * 0.06;
            rv.crystalMesh.rotation.y += dt * (isLit ? 4.0 : 1.8);
          }

          if (entry.gateEnergyMesh && entry.gateEnergyMat) {
            const targetY = gateUnlocked ? -0.45 : 0.45;
            entry.gateEnergyMesh.position.y +=
              (targetY - entry.gateEnergyMesh.position.y) * Math.min(1, dt * 8);
            entry.gateEnergyMat.opacity = gateUnlocked ? 0.0 : 0.78;
          }
        }

        if (entry.npcGroup && entry.step.npc) {
          const npcPhys = computeNpcPhysicalState(entry.step, p, elapsedTime);
          if (npcPhys) {
            entry.npcGroup.position.set(
              npcPhys.relX,
              npcPhys.hopOffsetY,
              npcPhys.relZ
            );
            entry.npcGroup.rotation.y =
              -npcPhys.facingAngleRad + Math.PI / 2;
            if (entry.npcArmLeft && entry.npcArmRight) {
              entry.npcArmLeft.rotation.z = npcPhys.armWaveRad;
              entry.npcArmRight.rotation.z = -npcPhys.armWaveRad;
            }
            if (
              entry.npcHeadGroup &&
              activeDialogueNpcRef.current?.id === entry.step.npc.id
            ) {
              entry.npcHeadGroup.rotation.z =
                Math.sin(elapsedTime * 6.5) * 0.12;
              entry.npcHeadGroup.position.y =
                0.69 + Math.abs(Math.sin(elapsedTime * 7.5)) * 0.04;
            }
          }
        }
      }

      // Update Hero Wayfarer Position, Walk Stride, Title Warm-Ups & Squash/Stretch
      playerGroup.position.set(p.x, p.y, p.z);
      heroContactShadow.visible = p.grounded;

      if (outfitCelebrationRef.current > 0) {
        if (outfitCelebrationRef.current === 1.0 && elapsedTime > 0.25) {
          spawnBurst(p.x, p.y + 0.15, p.z, 12);
        }
        outfitCelebrationRef.current = Math.max(
          0,
          outfitCelebrationRef.current - dt * 2.4
        );
      }

      if (isTitlePreviewRef.current) {
        // Active Title Screen Hero Choreography: Warm-up hops, looking around at the hawks & Barnaby, and outfit-switch celebration!
        const celebHop =
          Math.sin(outfitCelebrationRef.current * Math.PI) * 0.42;
        const idleHop =
          Math.max(0, Math.sin(elapsedTime * 3.4)) * 0.11 + celebHop;
        playerVisual.position.y = idleHop;
        playerVisual.rotation.y =
          0.65 +
          Math.sin(elapsedTime * 0.95) * 0.52 +
          dampedPointerX * 0.35;
        const hopSquash = 1.0 + Math.sin(elapsedTime * 6.8) * 0.045;
        playerVisual.scale.set(1 / Math.sqrt(hopSquash), hopSquash, 1 / Math.sqrt(hopSquash));
        legL.rotation.z = Math.sin(elapsedTime * 3.4) * 0.22;
        legR.rotation.z = -Math.sin(elapsedTime * 3.4) * 0.22;
        staffPole.rotation.z = -0.14 + Math.sin(elapsedTime * 2.6) * 0.16;
      } else {
        playerVisual.rotation.y = -p.aimAngle;
        staffPole.rotation.z = -0.14;

        if (p.isCharging) {
          const squash = 1 - p.chargeRatio * 0.28;
          const stretchW = 1 + p.chargeRatio * 0.16;
          playerVisual.scale.set(stretchW, squash, stretchW);
        } else if (!p.grounded) {
          const stretchY = 1 + Math.min(0.22, Math.abs(p.vy) * 0.02);
          playerVisual.scale.set(
            1 / Math.sqrt(stretchY),
            stretchY,
            1 / Math.sqrt(stretchY)
          );
        } else {
          playerVisual.scale.lerp(_unitScale, Math.min(1, dt * 14));
        }

        const speedHoriz = Math.hypot(p.vx, p.vz);
        if (p.grounded && speedHoriz > 0.2) {
          const stride = Math.sin(elapsedTime * 14) * 0.35;
          legL.rotation.z = stride;
          legR.rotation.z = -stride;
          playerVisual.position.y = Math.abs(Math.cos(elapsedTime * 14)) * 0.05;
        } else {
          legL.rotation.z = 0;
          legR.rotation.z = 0;
          playerVisual.position.y = 0;
        }
      }

      // ============================================================================
      // 3D DIRECTIONAL JUMP GUIDE ARC & TARGET RETICLE (Hidden on Title & NPC POV Dialogue)
      // ============================================================================
      const showGameplayReticle =
        !isTitlePreviewRef.current &&
        !activeDialogueNpcRef.current &&
        p.grounded;
      aimArrowGroup.rotation.y = -p.aimAngle;
      aimArrowGroup.visible = showGameplayReticle;

      const nextStepIdx = Math.max(
        0,
        Math.min(TOTAL_LEVELS - 1, p.currentStep)
      );
      const nextStep = LEVELS_500[nextStepIdx] || LEVELS_500[0];

      if (showGameplayReticle) {
        const alignNow = computeAimAlignment(
          p.x,
          p.y,
          p.z,
          p.aimAngle,
          nextStep,
          elapsedTime
        );
        const previewCharge = p.isCharging
          ? p.chargeRatio
          : alignNow.idealChargePercent / 100;

        const pred = computePredictedLandingSpot(
          p.x,
          p.y,
          p.z,
          previewCharge,
          p.aimAngle,
          nextStep,
          elapsedTime
        );

        if (p.isCharging) {
          chargeRingMat.opacity = 0.92;
          const scale = 0.85 + p.chargeRatio * 0.68;
          chargeRingMesh.scale.set(scale, scale, 1);

          const ringColor = pred.isOnTarget
            ? 0x10b981
            : p.chargeRatio > 0.85
            ? 0xf43f5e
            : 0x38bdf8;
          chargeRingMat.color.setHex(ringColor);
          landingReticleMat.color.setHex(ringColor);
          landingReticleMat.opacity = 0.92;
          arcDotMat.color.setHex(ringColor);
          arcDotMat.opacity = 0.92;
        } else {
          // Subtle always-on directional guide toward Next Stage even before pressing Space!
          chargeRingMat.opacity = 0.0;
          landingReticleMat.color.setHex(
            alignNow.isAimAligned ? 0xfacc15 : 0x38bdf8
          );
          landingReticleMat.opacity = 0.48;
          arcDotMat.color.setHex(alignNow.isAimAligned ? 0xfef08a : 0x7dd3fc);
          arcDotMat.opacity = 0.42;
        }

        landingReticle.visible = true;
        landingReticle.position.set(pred.x, pred.y + 0.04, pred.z);
        const pulseScale = pred.isOnTarget
          ? 1.0 + Math.sin(elapsedTime * 8) * 0.12
          : 0.92;
        landingReticle.scale.set(pulseScale, pulseScale, 1);

        const vel = computeJumpVelocity(previewCharge, p.aimAngle);
        for (let i = 0; i < arcDotMeshes.length; i++) {
          const t = ((i + 1) / (arcDotMeshes.length + 1)) * pred.flightTime;
          const dx = p.x + vel.vx * t;
          const dy = p.y + 0.25 + vel.vy * t - 0.5 * 22.0 * t * t;
          const dz = p.z + vel.vz * t;
          arcDotMeshes[i].position.set(dx, dy, dz);
          arcDotMeshes[i].visible = true;
        }
      } else {
        chargeRingMat.opacity = 0;
        landingReticle.visible = false;
        for (let i = 0; i < arcDotMeshes.length; i++) {
          arcDotMeshes[i].visible = false;
        }
      }

      // Update Dust Particles
      for (let i = impactParticles.length - 1; i >= 0; i--) {
        const pt = impactParticles[i];
        pt.life += dt;
        if (pt.life >= pt.maxLife) {
          scene.remove(pt.mesh);
          impactParticles.splice(i, 1);
          continue;
        }
        pt.mesh.position.x += pt.vx * dt;
        pt.mesh.position.y += pt.vy * dt;
        pt.mesh.position.z += pt.vz * dt;
        pt.vy -= 9.8 * dt;
        const alpha = 1 - pt.life / pt.maxLife;
        (pt.mesh.material as THREE.MeshBasicMaterial).opacity = alpha * 0.8;
      }

      // ============================================================================
      // CAMERA RIG: Dynamic Title Screen Spline Tour / NPC POV / Auto-Shifting Gameplay
      // ============================================================================
      dampedPointerX += (pointerNormX - dampedPointerX) * Math.min(1, dt * 4.5);
      dampedPointerY += (pointerNormY - dampedPointerY) * Math.min(1, dt * 4.5);

      if (isTitlePreviewRef.current) {
        // Cinematic Camera Sweep Across the Starting Mountain Steps (Base Camp -> Bridge -> Stages 1..4)
        // Smooth cosine-eased ascent and descent showcasing the scale & isolation of Hawk Peak
        const sweepWaypoints = [
          { x: GROUND_SPAWN_X + 0.2, y: GROUND_FLOOR_Y + 0.85, z: GROUND_SPAWN_Z - 1.1 },
          { x: LEVELS_500[0].x * 0.75, y: LEVELS_500[0].y + 0.45, z: LEVELS_500[0].z * 0.85 },
          { x: LEVELS_500[1].x * 0.85, y: LEVELS_500[1].y + 0.55, z: LEVELS_500[1].z * 0.85 },
          { x: LEVELS_500[2].x * 0.85, y: LEVELS_500[2].y + 0.65, z: LEVELS_500[2].z * 0.85 },
          { x: LEVELS_500[3].x * 0.85, y: LEVELS_500[3].y + 0.75, z: LEVELS_500[3].z * 0.85 },
        ];
        const sweepProgress = 0.5 - 0.5 * Math.cos(elapsedTime * 0.28);
        const scaledIdx = sweepProgress * (sweepWaypoints.length - 1);
        const idxA = Math.floor(scaledIdx);
        const idxB = Math.min(sweepWaypoints.length - 1, idxA + 1);
        const localT = scaledIdx - idxA;
        const segEase = localT * localT * (3 - 2 * localT);

        const wpA = sweepWaypoints[idxA];
        const wpB = sweepWaypoints[idxB];
        const targetSweepX = wpA.x + (wpB.x - wpA.x) * segEase + dampedPointerX * 0.85;
        const targetSweepY = wpA.y + (wpB.y - wpA.y) * segEase - dampedPointerY * 0.35;
        const targetSweepZ = wpA.z + (wpB.z - wpA.z) * segEase;

        camFocusX += (targetSweepX - camFocusX) * Math.min(1, dt * 4.2);
        camFocusY += (targetSweepY - camFocusY) * Math.min(1, dt * 4.2);
        camFocusZ += (targetSweepZ - camFocusZ) * Math.min(1, dt * 4.2);

        const tourPhase = elapsedTime * 0.34;
        const orbitX = Math.sin(tourPhase) * 1.65 + dampedPointerX * 1.15;
        const orbitY = Math.cos(tourPhase * 0.75) * 0.35 - dampedPointerY * 0.4;
        const orbitZ = Math.cos(tourPhase) * 1.05;

        currentCamPosX = camFocusX + 8.8 + orbitX;
        currentCamPosY = camFocusY + 5.8 + sweepProgress * 1.4 + orbitY;
        currentCamPosZ = camFocusZ + 9.6 + orbitZ;

        camera.position.set(currentCamPosX, currentCamPosY, currentCamPosZ);
        camera.lookAt(camFocusX, camFocusY, camFocusZ);

        // Zoom out gently as the camera sweeps up the starting mountain steps to reveal peak scale & isolation
        const targetSweepZoom = 2.36 - sweepProgress * 0.52;
        camera.zoom += (targetSweepZoom - camera.zoom) * Math.min(1, dt * 4.2);
        camera.updateProjectionMatrix();
      } else if (activeDialogueNpcRef.current) {
        const near = findNearbyNpc(p, elapsedTime);
        const npcPhys =
          near?.phys ||
          computeNpcPhysicalState(
            p.currentStep <= 0
              ? GROUND_STEP_META
              : LEVELS_500[Math.max(0, p.currentStep - 1)],
            p,
            elapsedTime
          );
        const npcStepY =
          near?.stepY ??
          (p.currentStep <= 0
            ? GROUND_FLOOR_Y
            : LEVELS_500[Math.max(0, p.currentStep - 1)].y);

        if (npcPhys) {
          // Turn the player to face the NPC for the Witcher-3 over-the-shoulder two-shot
          const faceNpcAngle = Math.atan2(
            npcPhys.worldZ - p.z,
            npcPhys.worldX - p.x
          );
          playerVisual.rotation.y = -faceNpcAngle;
          playerVisual.position.y = Math.abs(Math.sin(elapsedTime * 2.4)) * 0.025;

          const pov = computeNpcPovCameraRig(p, npcPhys, npcStepY, elapsedTime);
          const snapDist = Math.hypot(
            pov.camPosX - currentCamPosX,
            pov.camPosZ - currentCamPosZ
          );
          const camRate = snapDist > 3.5 ? 1.0 : Math.min(1, dt * 16);
          currentCamPosX += (pov.camPosX - currentCamPosX) * camRate;
          currentCamPosY += (pov.camPosY - currentCamPosY) * camRate;
          currentCamPosZ += (pov.camPosZ - currentCamPosZ) * camRate;
          camFocusX += (pov.lookAtX - camFocusX) * camRate;
          camFocusY += (pov.lookAtY - camFocusY) * camRate;
          camFocusZ += (pov.lookAtZ - camFocusZ) * camRate;

          camera.position.set(currentCamPosX, currentCamPosY, currentCamPosZ);
          camera.lookAt(camFocusX, camFocusY, camFocusZ);
          camera.zoom += (pov.zoom - camera.zoom) * camRate;
          camera.updateProjectionMatrix();
        }
      } else {
        const dyn = computeStepTransitionDynamics(p, nextStep, 0, 0);
        const preset =
          CAMERA_ANGLE_PRESETS[activeCameraPresetRef.current] ||
          CAMERA_ANGLE_PRESETS.isometric;
        const vistaScale = vistaOverviewRef.current ? 1.85 : 1.0;

        if (
          Math.hypot(dyn.targetCamY - camFocusY, dyn.targetCamX - camFocusX) >
          22
        ) {
          camFocusX = dyn.targetCamX;
          camFocusY = dyn.targetCamY;
          camFocusZ = dyn.targetCamZ;
          currentCamPosX = camFocusX + preset.offsetX * vistaScale;
          currentCamPosY = camFocusY + preset.offsetY * vistaScale;
          currentCamPosZ = camFocusZ + preset.offsetZ * vistaScale;
        } else {
          camFocusX +=
            (dyn.targetCamX - camFocusX) * Math.min(1, dt * dyn.lerpRateXZ);
          camFocusY +=
            (dyn.targetCamY - camFocusY) * Math.min(1, dt * dyn.lerpRateY);
          camFocusZ +=
            (dyn.targetCamZ - camFocusZ) * Math.min(1, dt * dyn.lerpRateXZ);

          const desiredPosX = camFocusX + preset.offsetX * vistaScale;
          const desiredPosY = camFocusY + preset.offsetY * vistaScale;
          const desiredPosZ = camFocusZ + preset.offsetZ * vistaScale;

          currentCamPosX +=
            (desiredPosX - currentCamPosX) * Math.min(1, dt * 5.2);
          currentCamPosY +=
            (desiredPosY - currentCamPosY) * Math.min(1, dt * 5.2);
          currentCamPosZ +=
            (desiredPosZ - currentCamPosZ) * Math.min(1, dt * 5.2);
        }

        camera.position.set(currentCamPosX, currentCamPosY, currentCamPosZ);
        camera.lookAt(camFocusX, camFocusY, camFocusZ);

        // Subtle cinematic dolly-in while charging a jump!
        const chargeZoomBoost = p.isCharging ? p.chargeRatio * 0.08 : 0;
        const targetZoom = vistaOverviewRef.current
          ? 0.56
          : preset.zoomMultiplier + chargeZoomBoost;
        camera.zoom += (targetZoom - camera.zoom) * Math.min(1, dt * 5.5);
        camera.updateProjectionMatrix();
      }

      // Position Atmospheric Sky Backdrop Plane behind Camera View Ray
      camera.getWorldDirection(_camDir);
      skyBackdropMesh.position
        .copy(camera.position)
        .addScaledVector(_camDir, 185);
      skyBackdropMesh.quaternion.copy(camera.quaternion);
      skyBackdropMesh.scale.setScalar(1 / Math.max(0.45, camera.zoom));

      // Update Directional Sun Shadow Target & MatrixWorld so Shadows Track Camera Sweep or Player!
      const shadowAnchorX = isTitlePreviewRef.current ? camFocusX : p.x;
      const shadowAnchorY = isTitlePreviewRef.current ? camFocusY : p.y;
      const shadowAnchorZ = isTitlePreviewRef.current ? camFocusZ : p.z;
      dirLight.position.set(
        shadowAnchorX + 18,
        shadowAnchorY + 30,
        shadowAnchorZ + 15
      );
      dirLight.target.position.set(
        shadowAnchorX,
        shadowAnchorY,
        shadowAnchorZ
      );
      dirLight.target.updateMatrixWorld();

      if (composer && !isSoftwareGl) {
        composer.render();
      } else {
        renderer.render(scene, camera);
      }

      // Emit HUD Telemetry at 15Hz
      const now = performance.now();
      if (now - lastTelemetryEmit >= 65) {
        lastTelemetryEmit = now;
        const curStepObj =
          p.currentStep <= 0
            ? GROUND_STEP_META
            : LEVELS_500[
                Math.max(0, Math.min(TOTAL_LEVELS - 1, p.currentStep - 1))
              ];
        const bIdx = Math.min(
          10,
          Math.max(1, p.currentStep <= 0 ? 1 : Math.ceil(p.currentStep / 50))
        );
        const bp = BIOME_BLUEPRINTS[bIdx - 1] || BIOME_BLUEPRINTS[0];
        const align = computeAimAlignment(
          p.x,
          p.y,
          p.z,
          p.aimAngle,
          nextStep,
          elapsedTime
        );
        const liveWind = getLiveWindVector(
          elapsedTime,
          Math.max(1, p.currentStep)
        );
        const nearNpc = findNearbyNpc(p, elapsedTime);
        let nearbyBark: string | null = null;
        let nearbyBlocking = false;
        if (nearNpc) {
          const dlg = getAltitudeAwareNpcDialogue(nearNpc.npc, p, elapsedTime);
          nearbyBark = dlg.liveBark;
          nearbyBlocking = dlg.isBlockingNow;
        }

        const totalRuneCount = curStepObj.runePlates.length;
        const activeRuneCount = curStepObj.runePlates.filter((rp) =>
          p.activatedRuneIds.includes(rp.id)
        ).length;
        const stepGateUnlocked = isStepGateUnlocked(curStepObj, p);
        const nextCameraShiftStep =
          (Math.floor(p.currentStep / CAMERA_SHIFT_INTERVAL_STEPS) + 1) *
          CAMERA_SHIFT_INTERVAL_STEPS;

        onTelemetryUpdateRef.current({
          currentStep: p.currentStep,
          peakStep: p.peakStep,
          fallsCount: p.fallsCount,
          biggestFallLoss: p.biggestFallLoss,
          rageScore: p.rageScore,
          chargeRatio: p.chargeRatio,
          isCharging: p.isCharging,
          grounded: p.grounded,
          inRiverWater: p.inRiverWater,
          onRiverBridge: p.onRiverBridge,
          biomeIndex: bIdx,
          biomeName: bp.name,
          biomeSubtitle: bp.subtitle,
          biomeColor: bp.themeColor,
          atmosphericLayer: getAtmosphericLayerForStep(p.currentStep),
          stepTitle: curStepObj.title,
          stepTrapText: curStepObj.psychologicalTrap,
          stepDifficulty: curStepObj.difficultyRating,
          hazardType: curStepObj.hazard,
          surfaceTheme: curStepObj.surfaceTheme,
          crumbleWarning:
            curStepObj.hazard === 'crumble'
              ? Math.min(1, p.crumbleTimer / 1.65)
              : 0,
          glitchActive: p.glitchTimer > 0,
          won: p.won,
          aimErrorDeg: align.angleErrorDeg,
          isAimAligned: align.isAimAligned,
          idealChargePercent: align.idealChargePercent,
          clearGapMeters: nextStep.clearGap,
          vertRiseMeters: nextStep.vertRise,
          turnAngleDeg: nextStep.turnAngleDeg,
          liveWind,
          spireMutations: p.spireMutations,
          nearbyNpc: nearNpc?.npc ?? null,
          nearbyNpcStep: nearNpc?.stepNumber ?? null,
          nearbyNpcBark: nearbyBark,
          nearbyNpcBlocking: nearbyBlocking,
          activeRuneCount,
          totalRuneCount,
          stepGateUnlocked,
          cameraMode: activeCameraPresetRef.current,
          nextCameraShiftStep,
        });
      }
    };

    (window as unknown as Record<string, unknown>).advanceTime = (
      ms: number
    ) => {
      const steps = Math.max(1, Math.round(ms / (1000 / 60)));
      const stepDt = ms / 1000 / steps;
      for (let i = 0; i < steps; i++) {
        stepSimulation(stepDt);
      }
      renderScene(0.016);
    };

    // Software-WebGL Fence Sync Pacer per Three.js Skill §2.3
    function afterDraw(cb: (now: number) => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (gl && typeof gl.fenceSync === 'function') {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(() => cb(performance.now()), 80);
          }
        };
        frameId = window.setTimeout(poll, 5);
      } else {
        frameId = window.setTimeout(() => cb(performance.now()), 80);
      }
    }

    const tick = (now: number) => {
      const rawDt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;
      stepSimulation(rawDt);
      renderScene(rawDt);
      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };
    frameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('resize', handleResize);
      domElem.removeEventListener('pointerdown', handlePointerDown);
      envTex.dispose();
      composer?.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full select-none overflow-hidden cursor-pointer ${
        isTitlePreview ? 'title-cinematic-canvas-sweep' : ''
      }`}
    />
  );
};
